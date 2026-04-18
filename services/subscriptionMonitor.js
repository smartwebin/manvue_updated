import { useEffect, useState } from "react";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Alert, AppState } from "react-native";
import apiService from "./apiService";

/**
 * Subscription Monitor Hook
 * Checks subscription status periodically and when app comes to foreground
 * Redirects to payment if subscription expired
 */

let lastCheckTime = 0;
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const CHECK_ON_FOREGROUND = true;

class SubscriptionMonitor {
  constructor() {
    this.appStateSubscription = null;
    this.checkInterval = null;
    this.isChecking = false;
  }

  // Start monitoring subscription
  startMonitoring() {
    if (__DEV__) {
      console.log("📡 Subscription monitoring started");
    }

    // Check immediately on start (with a delay to allow session to stabilize)
    setTimeout(() => {
      this.checkSubscriptionStatus();
    }, 2000);

    // Set up periodic checking
    this.checkInterval = setInterval(() => {
      this.checkSubscriptionStatus();
    }, CHECK_INTERVAL);

    // Listen for app state changes (foreground/background)
    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (nextAppState === "active" && CHECK_ON_FOREGROUND) {
          // App came to foreground - check subscription
          this.checkSubscriptionStatus();
        }
      },
    );
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (__DEV__) {
      console.log("📡 Subscription monitoring stopped");
    }
  }

  // Check subscription status
  async checkSubscriptionStatus() {
    // Prevent multiple simultaneous checks
    if (this.isChecking) {
      return;
    }

    // Rate limiting - don't check too frequently
    const now = Date.now();
    if (now - lastCheckTime < 60000) {
      // At least 1 minute between checks
      return;
    }

    try {
      this.isChecking = true;
      lastCheckTime = now;

      // Get user data
      const userId = await SecureStore.getItemAsync("user_id");
      const userType = await SecureStore.getItemAsync("user_type");
      const userStatus = await SecureStore.getItemAsync("user_status");

      if (!userId || userType !== "jobseeker") {
        // Only check for jobseekers
        return;
      }

      if (__DEV__) {
        console.log("🔍 Checking subscription status for user:", userId);
      }

      // Call API to check subscription
      const response = await apiService.checkSubscriptionStatus();

      if (response.success && response.data) {
        const { subscription } = response.data;

        if (__DEV__) {
          console.log("📊 Subscription status:", subscription);
        }

        // Check if subscription is expired or inactive
        if (
          !subscription.has_active_subscription ||
          subscription.is_expired ||
          subscription.needs_renewal ||
          subscription.subscription_status !== "active"
        ) {
          if (__DEV__) {
            console.log("⚠️ Subscription not active, updating SecureStore");
          }

          // Update SecureStore so the Layout can react
          await SecureStore.setItemAsync("subscription_status", "inactive");
          await SecureStore.setItemAsync("user_status", "inactive");

          this.handleExpiredSubscription(subscription);
        } else {
          // Verify it's active
          await SecureStore.setItemAsync("subscription_status", "active");
          await SecureStore.setItemAsync("user_status", "active");
        }
      }
    } catch (error) {
      console.error("❌ Error checking subscription:", error);
      // Don't interrupt user experience for check errors
    } finally {
      this.isChecking = false;
    }
  }

  // Handle expired subscription
  handleExpiredSubscription(subscription) {
    // Stop monitoring to prevent multiple alerts
    this.stopMonitoring();

    const expiryDate = subscription.end_date || "recently";
    const message = subscription.is_expired
      ? `Your subscription expired on ${expiryDate}. Please renew to continue using ManVue.`
      : `Your subscription is ${subscription.subscription_status}. Please renew to continue.`;

    // 🛡️ Bug #9: Don't show alert if already on landing-matches (Lobby)
    // This prevents the loop on the Lobby screen.
    if (global.currentPathname?.includes("/landing-matches")) {
      return;
    }

    Alert.alert(
      "Subscription Required",
      message,
      [
        {
          text: "View Plans",
          onPress: () => {
            // We just trigger an alert. The Layout Guard will handle the 
            // literal screen movement once SecureStore is updated above.
          },
        },
      ],
      {
        cancelable: true,
      },
    );
  }

  // Handle subscription expiring soon
  handleExpiringSoon(subscription) {
    // Only show this warning once per session
    const warningShown = global.expiryWarningShown || false;

    if (warningShown) {
      return;
    }

    global.expiryWarningShown = true;

    Alert.alert(
      "Subscription Expiring Soon",
      `Your subscription will expire in ${subscription.days_remaining} day${subscription.days_remaining > 1 ? "s" : ""}. Consider renewing to avoid interruption.`,
      [
        {
          text: "Remind Me Later",
          style: "cancel",
        },
        {
          text: "Renew Now",
          onPress: () => {
            router.push("/(auth)/payment-existing");
          },
        },
      ],
    );
  }

  // Handle logout
  async handleLogout() {
    try {
      // Clear all stored data
      await SecureStore.deleteItemAsync("user_id");
      await SecureStore.deleteItemAsync("user_type");
      await SecureStore.deleteItemAsync("jwt_token");
      await SecureStore.deleteItemAsync("company_id");
      await SecureStore.deleteItemAsync("device_push_token");

      if (__DEV__) {
        console.log("🚪 User logged out due to expired subscription");
      }
    } catch (error) {
      console.error("❌ Error during logout:", error);
    }
  }
}

// Export singleton instance
const subscriptionMonitor = new SubscriptionMonitor();
export default subscriptionMonitor;

// React Hook for easy usage in components
export const useSubscriptionMonitor = (enabled = true) => {
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const startMonitoring = async () => {
      const userType = await SecureStore.getItemAsync("user_type");

      if (userType === "jobseeker") {
        subscriptionMonitor.startMonitoring();
        setIsMonitoring(true);
      }
    };

    startMonitoring();

    // Cleanup on unmount
    return () => {
      subscriptionMonitor.stopMonitoring();
      setIsMonitoring(false);
    };
  }, [enabled]);

  return { isMonitoring };
};

// Manual check function (can be called anywhere)
export const checkSubscriptionNow = async () => {
  await subscriptionMonitor.checkSubscriptionStatus();
};
