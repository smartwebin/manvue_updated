import apiService from "@/services/apiService";
import theme from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SafeAreaWrapper from "@/components/SafeAreaWrapper";

const { width, height } = Dimensions.get("window");

export default function LandingMatchesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [id, firstName, lastName, status] = await Promise.all([
        SecureStore.getItemAsync("user_id"),
        SecureStore.getItemAsync("user_first_name"),
        SecureStore.getItemAsync("user_last_name"),
        SecureStore.getItemAsync("subscription_status"),
      ]);

      if (!id) {
        setLoading(false);
        setError("Your session is being verified...");
        return;
      }

      setUserId(id);
      const fullName = `${firstName || ""} ${lastName || ""}`.trim();
      setUserName(fullName);
      if (status) setSubscriptionStatus(status);
      fetchMatches(id);
    } catch (err) {
      console.error("Initialization error:", err);
      setLoading(false);
      setError("Session expired. Please log in again.");
    }
  };

  const fetchMatches = async (id, isRefresh = false) => {
    if (!id) return;
    if (!isRefresh) setLoading(true);
    try {
      const response = await apiService.getMatchingJobsV2({
        user_id: id,
        limit: 10,
        offset: 0,
      });

      if (response.success) {
        setJobs(response.data.jobs || []);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError("Failed to load matches.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches(userId, true);
  };

  const renderJobCard = ({ item, index }) => {
    const slideAnim = new Animated.Value(50);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 20,
      friction: 7,
      delay: index * 100,
      useNativeDriver: true,
    }).start();

    return (
      <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => router.push(`/job-details-v2/${item.job_id}`)}
          style={{
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderRadius: theme.borderRadius.xxl,
            backgroundColor: theme.colors.background.card,
            ...theme.shadows.lg,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={["rgba(27, 163, 163, 0.05)", "rgba(255, 255, 255, 1)"]}
            style={{ padding: theme.spacing.lg }}
          >
            {/* Header: Company & Match */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: theme.spacing.md,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 15,
                    backgroundColor: theme.colors.background.accent,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: "rgba(27, 163, 163, 0.2)",
                  }}
                >
                  {item.company_logo ? (
                    <Image
                      source={{ uri: item.company_logo }}
                      style={{ width: 40, height: 40, borderRadius: 10 }}
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        color: theme.colors.primary.teal,
                      }}
                    >
                      {item.company_name?.charAt(0)}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: theme.typography.sizes.md,
                      fontFamily: theme.typography.fonts.bold,
                      color: theme.colors.text.primary,
                    }}
                    numberOfLines={1}
                  >
                    {item.job_title}
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.typography.sizes.sm,
                      fontFamily: theme.typography.fonts.medium,
                      color: theme.colors.text.secondary,
                    }}
                  >
                    {item.company_name}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: "rgba(27, 163, 163, 0.1)",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.primary.teal,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: theme.colors.primary.teal,
                  }}
                >
                  {item.match_percentage}% Match
                </Text>
              </View>
            </View>

            {/* Tags */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: theme.spacing.md,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.colors.background.secondary,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={theme.colors.primary.teal}
                />
                <Text
                  style={{
                    marginLeft: 4,
                    fontSize: 12,
                    color: theme.colors.text.secondary,
                  }}
                >
                  {item.location}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.colors.background.secondary,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={14}
                  color={theme.colors.primary.teal}
                />
                <Text
                  style={{
                    marginLeft: 4,
                    fontSize: 12,
                    color: theme.colors.text.secondary,
                  }}
                >
                  {item.experience_range}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.colors.background.secondary,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Ionicons
                  name="cash-outline"
                  size={14}
                  color={theme.colors.primary.teal}
                />
                <Text
                  style={{
                    marginLeft: 4,
                    fontSize: 12,
                    color: theme.colors.text.secondary,
                  }}
                >
                  {item.salary_range || "Market Rate"}
                </Text>
              </View>
            </View>

            {/* Action Bar */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderTopWidth: 1,
                borderTopColor: theme.colors.border.light,
                paddingTop: theme.spacing.md,
              }}
            >
              <Text style={{ fontSize: 10, color: theme.colors.text.tertiary }}>
                Posted {item.posted_time}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    color: theme.colors.primary.teal,
                    fontWeight: "bold",
                    fontSize: 14,
                    marginRight: 4,
                  }}
                >
                  View Details
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={theme.colors.primary.teal}
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaWrapper backgroundColor={theme.colors.background.primary}>
      <StatusBar barStyle="dark-content" />

      {/* Dynamic Header */}
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 16,
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fonts.medium,
              }}
            >
              Hello,
            </Text>
            <Text
              style={{
                fontSize: 24,
                color: theme.colors.text.primary,
                fontFamily: theme.typography.fonts.bold,
              }}
            >
              {userName}
            </Text>
          </View>
          <TouchableOpacity
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: "rgba(255, 59, 48, 0.1)",
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255, 59, 48, 0.2)",
            }}
            onPress={async () => {
              try {
                await apiService.logout();
                router.replace("/choose-path");
              } catch (error) {
                console.log("Lobby logout error:", error);
                router.replace("/choose-path");
              }
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color="#FF3B30"
              style={{ marginRight: 4 }}
            />
            <Text
              style={{ color: "#FF3B30", fontWeight: "bold", fontSize: 13 }}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => {
            if (subscriptionStatus !== "active") {
              router.push("/(auth)/payment-existing");
            }
          }}
        >
          <LinearGradient
            colors={
              subscriptionStatus === "active"
                ? [theme.colors.primary.orange, "#E67E22"]
                : [theme.colors.primary.teal, theme.colors.secondary.darkTeal]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 15,
              padding: 15,
              paddingBottom: 25, // Added padding for better mobile accessibility
              marginTop: 15,
              flexDirection: "row",
              alignItems: "center", // Vertically center everything
              ...theme.shadows.md
            }}
          >
            <View style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              padding: 8, 
              borderRadius: 10,
            }}>
              <Ionicons 
                name={subscriptionStatus === "active" ? "time" : "sparkles"} 
                size={20} 
                color="white" 
              />
            </View>
 
            <View style={{ flex: 1, marginLeft: 12, paddingRight: 10 }}>
              <Text style={{ 
                color: "white", 
                fontWeight: "bold", 
                fontSize: 15,
              }}>
                {subscriptionStatus === "active" 
                  ? "Profile Under Review" 
                  : "Premium Matches Preview"}
              </Text>
              <Text style={{ 
                color: "rgba(255, 255, 255, 0.9)", 
                fontSize: 12,
                marginTop: 2
              }}>
                {subscriptionStatus === "active" 
                  ? "Your payment is successful. Access will be granted shortly." 
                  : "Upgrade to Premium to apply and unlock full features."}
              </Text>
            </View>
 
            {subscriptionStatus !== "active" && (
              <Ionicons name="chevron-forward" size={20} color="white" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary.teal} />
          <Text style={{ marginTop: 10, color: theme.colors.text.secondary }}>
            Finding best matches for you...
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={jobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.job_id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          style={{ opacity: fadeAnim }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary.teal}
            />
          }
          ListHeaderComponent={() => (
            <View
              style={{
                paddingHorizontal: theme.spacing.lg,
                marginBottom: theme.spacing.md,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: theme.typography.fonts.bold,
                  color: theme.colors.text.primary,
                }}
              >
                Top Matches For You
              </Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={{ flex: 1, alignItems: "center", marginTop: 50, paddingHorizontal: theme.spacing.xl * 2 }}>
              <View style={{ 
                width: 100, 
                height: 100, 
                borderRadius: 50, 
                backgroundColor: 'rgba(27, 163, 163, 0.05)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20
              }}>
                <Ionicons
                  name="search-outline"
                  size={50}
                  color={theme.colors.primary.teal}
                />
              </View>
              <Text
                style={{ 
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: theme.colors.text.primary,
                  textAlign: 'center'
                }}
              >
                No matches found yet
              </Text>
              <Text
                style={{ 
                  marginTop: 8, 
                  color: theme.colors.text.secondary,
                  textAlign: 'center',
                  lineHeight: 20
                }}
              >
                Upgrade to Premium to explore all jobs, use advanced filters, and get priority visibility!
              </Text>
              
              <TouchableOpacity
                onPress={() => router.push("/(auth)/payment-existing")}
                style={{
                  marginTop: 24,
                  backgroundColor: theme.colors.primary.teal,
                  paddingHorizontal: 40,
                  paddingVertical: 16,
                  borderRadius: 15,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...theme.shadows.lg
                }}
              >
                <Ionicons name="card-outline" size={20} color="white" style={{ marginRight: 10 }} />
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                  Upgrade to Premium Now
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaWrapper>
  );
}
