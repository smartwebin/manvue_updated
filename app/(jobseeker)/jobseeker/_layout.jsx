import SafeAreaWrapper from "@/components/SafeAreaWrapper";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { useSubscriptionMonitor } from "@/services/subscriptionMonitor";
import theme from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, usePathname } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function JobSeekerLayout() {
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState({
    name: "Loading...",
    user_id: null,
  });

  // 🔔 Subscription Monitor - Automatically checks subscription status
  // Checks every 5 minutes and when app comes to foreground
  const { isMonitoring } = useSubscriptionMonitor();

  // Get notification count with real-time updates
  const { count: notificationCount, isLoading: isLoadingCount, refetch: refetchCount } = useNotificationCount({ 
    enabled: subscriptionStatus === "active" 
  });
  const [userStatus, setUserStatus] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Load user profile and status
  useEffect(() => {
    loadUserProfile();
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const [status, subStatus] = await Promise.all([
        SecureStore.getItemAsync("user_status"),
        SecureStore.getItemAsync("subscription_status"),
      ]);
      setUserStatus(status);
      setSubscriptionStatus(subStatus);
      setIsReady(true);
    } catch (error) {
      console.error("Error checking user status:", error);
      setIsReady(true);
    }
  };

  // 🛡️ Safe Browsing Guard - Access control based on subscription status
  useEffect(() => {
    if (!isReady || !userStatus || subscriptionStatus === null) return;

    const isLandingMatches = pathname.includes("/landing-matches");
    const isJobDetailsV2 = pathname.includes("/job-details-v2");

    if (subscriptionStatus === "active") {
      // Paid users can access the main app (Home). They should not see landing-matches.
      if (isLandingMatches) {
        console.log("🛡️ Paid user detected - redirecting to home");
        router.replace("/(jobseeker)/jobseeker/home");
      }
    } else {
      // Unpaid users (even if admin-approved) are restricted to landing-matches
      const isAllowedPage =
        isLandingMatches || isJobDetailsV2 || pathname.includes("/payment");

      if (!isAllowedPage) {
        console.log(
          "🛡️ Unpaid user blocked from",
          pathname,
          "- redirecting to landing-matches",
        );
        router.replace("/(jobseeker)/jobseeker/landing-matches");
      }
    }
  }, [pathname, userStatus, isReady]);

  // Refetch notification count when pathname changes (navigating back from notifications)
  useEffect(() => {
    if (
      pathname.includes("/jobseeker/") &&
      !pathname.includes("/notifications")
    ) {
      refetchCount();
    }
  }, [pathname]);

  // Log subscription monitoring status (development only)
  useEffect(() => {
    if (isMonitoring && __DEV__) {
      console.log("✅ Subscription monitoring is active for this session");
    }
  }, [isMonitoring]);

  const loadUserProfile = async () => {
    try {
      const userDataJson = await SecureStore.getItemAsync("user");
      if (userDataJson) {
        const userData = JSON.parse(userDataJson);
        setUserProfile({
          name: `${userData.first_name || "User"} ${userData.last_name || ""}`.trim(),
          user_id: userData.user_id,
        });
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  // Get current tab from pathname
  const getCurrentTab = () => {
    if (pathname.includes("/home")) return "home";
    if (pathname.includes("/matches")) return "matches";
    if (pathname.includes("/messages")) return "messages";
    if (pathname.includes("/interviews")) return "interviews";
    if (pathname.includes("/matching-jobs")) return "matching-jobs";
    if (pathname.includes("/profile")) return "profile";
    return "home";
  };

  const currentTab = getCurrentTab();

  // Get page title based on current tab
  const getPageTitle = () => {
    switch (currentTab) {
      case "home":
        return "Find your next opportunity";
      case "matches":
        return "Companies interested in you";
      case "messages":
        return "Chat with employers";
      case "interviews":
        return "Manage your interviews";
      case "matching-jobs":
        return "Browse matching jobs";
      case "profile":
        return "Your professional profile";
      default:
        return "Find your next opportunity";
    }
  };

  // Get welcome message based on current tab
  const getWelcomeMessage = () => {
    switch (currentTab) {
      case "home":
        return `Welcome back, ${userProfile.name}`;
      case "matches":
        return "Your Matches";
      case "messages":
        return "Messages";
      case "interviews":
        return "Interviews";
      case "matching-jobs":
        return "Matching Jobs";
      case "profile":
        return "Profile";
      default:
        return `Welcome back, ${userProfile.name}`;
    }
  };

  // Header Component
  const Header = () => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.background.card,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.light,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <Image
          source={require("@/assets/images/company/logo.png")}
          style={{
            width: 32,
            height: 32,
            marginRight: theme.spacing.sm,
          }}
          resizeMode="contain"
        />
        <View>
          <Text
            style={{
              fontSize: theme.typography.sizes.base,
              fontFamily: theme.typography.fonts.semiBold,
              color: theme.colors.text.primary,
            }}
          >
            {getWelcomeMessage()}
          </Text>
          <Text
            style={{
              fontSize: theme.typography.sizes.sm,
              fontFamily: theme.typography.fonts.regular,
              color: theme.colors.text.secondary,
            }}
          >
            {getPageTitle()}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        {/* Notifications - Only show for paid users */}
        {subscriptionStatus === "active" && (
          <TouchableOpacity
            onPress={() => {
              router.push("/(jobseeker)/(others)/notifications");
              // Refetch when returning from notifications page
              setTimeout(() => refetchCount(), 500);
            }}
            style={{
              padding: theme.spacing.sm,
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.background.accent,
              position: "relative",
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={theme.colors.primary.teal}
            />

            {/* Notification badge with count */}
            {isLoadingCount ? (
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: theme.colors.status.error,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: theme.colors.background.card,
                }}
              >
                <ActivityIndicator size="small" color="white" />
              </View>
            ) : notificationCount > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: theme.colors.status.error,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                  borderWidth: 2,
                  borderColor: theme.colors.background.card,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 10,
                    fontFamily: theme.typography.fonts.bold,
                  }}
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Bottom Tab Navigation
  const BottomTabs = () => {
    const tabs = [
      { id: "home", icon: "home", label: "Home", route: "/jobseeker/home" },
      {
        id: "matching-jobs",
        icon: "briefcase",
        label: "Matches",
        route: "/jobseeker/matching-jobs",
      },
      {
        id: "messages",
        icon: "chatbubbles",
        label: "Messages",
        route: "/jobseeker/messages",
      },
      {
        id: "interviews",
        icon: "videocam",
        label: "Interviews",
        route: "/jobseeker/interviews",
      },

      {
        id: "matches",
        icon: "heart",
        label: "Invitations",
        route: "/jobseeker/matches",
      },
      {
        id: "profile",
        icon: "person",
        label: "Profile",
        route: "/jobseeker/profile",
      },
    ];

    return (
      <View
        style={{
          flexDirection: "row",
          backgroundColor: theme.colors.background.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border.light,
          paddingBottom: theme.spacing.sm,
          paddingTop: theme.spacing.sm,
        }}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => router.push(tab.route)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: theme.spacing.xs,
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={currentTab === tab.id ? tab.icon : `${tab.icon}-outline`}
              size={24}
              color={
                currentTab === tab.id
                  ? theme.colors.primary.teal
                  : theme.colors.text.tertiary
              }
            />
            <Text
              style={{
                fontSize: theme.typography.sizes.xs,
                fontFamily:
                  currentTab === tab.id
                    ? theme.typography.fonts.semiBold
                    : theme.typography.fonts.regular,
                color:
                  currentTab === tab.id
                    ? theme.colors.primary.teal
                    : theme.colors.text.tertiary,
                marginTop: theme.spacing.xs,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!isReady || subscriptionStatus === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background.primary,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary.teal} />
        <Text
          style={{
            marginTop: 15,
            color: theme.colors.text.secondary,
            fontFamily: theme.typography.fonts.medium,
          }}
        >
          Verifying access...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.background.card}
      />

      <View
        style={{ flex: 1, backgroundColor: theme.colors.background.primary }}
      >
        <SafeAreaWrapper>
          {!pathname.includes("/landing-matches") && <Header />}

          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="home" />
              <Stack.Screen name="matches" />
              <Stack.Screen name="messages" />
              <Stack.Screen name="interviews" />
              <Stack.Screen name="matching-jobs" />
              <Stack.Screen name="profile" />
            </Stack>
          </View>

          {/* Hide Bottom Tabs for unpaid users */}
          {subscriptionStatus === "active" && <BottomTabs />}
        </SafeAreaWrapper>
      </View>
    </>
  );
}
