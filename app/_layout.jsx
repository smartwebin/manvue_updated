import notificationService from "@/services/notificationService";
import NetInfo from "@react-native-community/netinfo";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { Settings } from "react-native-fbsdk-next";
import "react-native-reanimated";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    "Outfit-Thin": require("../assets/fonts/Outfit-Thin.ttf"),
    "Outfit-ExtraLight": require("../assets/fonts/Outfit-ExtraLight.ttf"),
    "Outfit-Light": require("../assets/fonts/Outfit-Light.ttf"),
    "Outfit-Regular": require("../assets/fonts/Outfit-Regular.ttf"),
    "Outfit-Medium": require("../assets/fonts/Outfit-Medium.ttf"),
    "Outfit-SemiBold": require("../assets/fonts/Outfit-SemiBold.ttf"),
    "Outfit-Bold": require("../assets/fonts/Outfit-Bold.ttf"),
    "Outfit-ExtraBold": require("../assets/fonts/Outfit-ExtraBold.ttf"),
    "Outfit-Black": require("../assets/fonts/Outfit-Black.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Initialize Facebook SDK with iOS tracking permission
    const initFacebookSDK = async () => {
      if (Platform.OS === "ios") {
        try {
          const { requestTrackingPermissionsAsync } =
            await import("expo-tracking-transparency");

          // Note for Production: Consider moving this request to a dedicated onboarding screen
          // to reduce the risk of Apple rejecting the app for showing it too early without context.
          const { status } = await requestTrackingPermissionsAsync();

          Settings.setAdvertiserTrackingEnabled(status === "granted");
        } catch (error) {
          console.warn("⚠️ Tracking permission error:", error);
        }
      }

      // Explicitly initialize the SDK after handling permissions
      Settings.initializeSDK();
      if (__DEV__) {
        console.log("✅ Meta (Facebook) SDK Initialized");
        // Force a test event to verify network transmission
        AppEventsLogger.logEvent("SDK_Test_Event_Fired");
        console.log("📤 Test event sent to Meta");
      }
    };

    initFacebookSDK();

    // Setup online manager for React Native
    const unsubscribe = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(!!state.isConnected);
    });

    // Setup focus manager for React Native
    const subscription = AppState.addEventListener("change", (status) => {
      if (Platform.OS !== "web") {
        focusManager.setFocused(status === "active");
      }
    });

    // Initialize push notifications
    const initNotifications = async () => {
      try {
        await notificationService.registerForPushNotifications();
        notificationService.setupNotificationListeners();
        await notificationService.handleInitialNotification();
        if (__DEV__) {
          console.log("✅ Notification service initialized");
        }
      } catch (error) {
        console.error("❌ Error initializing notifications:", error);
      }
    };

    initNotifications();

    // Cleanup on unmount
    return () => {
      notificationService.removeNotificationListeners();
      unsubscribe();
      subscription.remove();
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </QueryClientProvider>
  );
}
