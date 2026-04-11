import JobApplicationModal from "@/components/JobApplicationModal";
import SafeAreaWrapper from "@/components/SafeAreaWrapper";
import apiService from "@/services/apiService";
import theme from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function JobDetailsV2Screen() {
  const { id } = useLocalSearchParams(); // job_id from route params
  const [jobDetails, setJobDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userStatus, setUserStatus] = useState(null);

  // Application related state
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");

  useEffect(() => {
    loadUserContext();
  }, []);

  const loadUserContext = async () => {
    try {
      const storedId = await SecureStore.getItemAsync("user_id");
      const storedStatus = await SecureStore.getItemAsync("user_status");
      
      setUserId(storedId);
      setUserStatus(storedStatus);

      // REDIRECT LOGIC: If user is active (paid), they should use the standard job-details page
      if (storedStatus === "active") {
        console.log("🛡️ Paid user on V2 page - redirecting to standard details");
        router.replace(`/details/${id}`);
      }
    } catch (error) {
      console.error("Error loading user context:", error);
    }
  };

  useEffect(() => {
    if (userId && id && userStatus === "inactive") {
      loadJobDetails();
    }
  }, [userId, id, userStatus]);

  const loadJobDetails = async (showLoader = true) => {
    if (!userId || !id) return;

    try {
      if (showLoader) setLoading(true);
      setError(null);

      const params = {
        job_id: parseInt(id),
        user_id: parseInt(userId),
      };

      const response = await apiService.getJobDetailsV2(params);

      console.log("Job details params:", params);
      console.log("Job details response:", response);
      if (response.success) {
        setJobDetails(response.data);
      } else {
        setError(response.message || "Job not found or not accessible");
      }
    } catch (error) {
      console.error("Error loading job details:", error);
      setError("Failed to load job details. Please try again.");
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJobDetails(false);
  };

  const handleUpgradePress = () => {
    // Navigate to payment-existing
    router.push("/(auth)/payment-existing");
  };

  const handleApplyPress = () => {
    if (userStatus === "inactive") {
      handleUpgradePress();
      return;
    }

    if (jobDetails?.has_applied) {
      Alert.alert("Already Applied", "You have already applied for this job.");
      return;
    }
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!coverLetter.trim()) {
      Alert.alert(
        "Required",
        "Please provide a brief cover letter or message.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiService.submitJobApplicationV2({
        job_id: parseInt(id),
        user_id: parseInt(userId),
        cover_letter: coverLetter,
        expected_salary: expectedSalary,
        availability_date: availabilityDate,
      });

      if (response.success) {
        Alert.alert(
          "Success",
          "Your application has been submitted successfully!",
        );
        setShowApplicationModal(false);
        // Refresh job details to show applied status
        loadJobDetails(false);
      } else {
        Alert.alert(
          "Error",
          response.message || "Failed to submit application",
        );
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaWrapper>
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background.primary,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary.teal} />
          <Text
            style={{
              marginTop: theme.spacing.md,
              color: theme.colors.text.secondary,
            }}
          >
            Loading job details...
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (error && !jobDetails) {
    return (
      <SafeAreaWrapper>
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background.primary,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: theme.spacing.lg,
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={theme.colors.status.error}
          />
          <Text style={{ fontSize: 20, fontWeight: "bold", marginTop: 20 }}>
            Unable to Load Job
          </Text>
          <Text
            style={{
              textAlign: "center",
              marginTop: 10,
              color: theme.colors.text.secondary,
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => loadJobDetails(true)}
            style={{
              marginTop: 20,
              backgroundColor: theme.colors.primary.teal,
              paddingHorizontal: 30,
              paddingVertical: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!jobDetails) return null;

  // Helper to render bullet points
  const ListSection = ({ title, items, icon, iconColor }) => {
    if (!items || items.length === 0) return null;
    return (
      <View style={{ marginTop: 30 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 15,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: iconColor + "15",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: theme.colors.text.primary,
            }}
          >
            {title}
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          {items.map((item, index) => (
            <View key={index} style={{ flexDirection: "row" }}>
              <Text style={{ color: iconColor, marginRight: 10, fontSize: 16 }}>
                •
              </Text>
              <Text
                style={{
                  flex: 1,
                  color: theme.colors.text.secondary,
                  lineHeight: 22,
                }}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaWrapper>
      <View
        style={{ flex: 1, backgroundColor: theme.colors.background.primary }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 15,
            alignItems: "center",
            backgroundColor: "white",
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border.light,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginLeft: 15 }}>
            Job Details
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Hero Section */}
          <LinearGradient
            colors={["rgba(27, 163, 163, 0.12)", "white"]}
            style={{ padding: theme.spacing.lg }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  backgroundColor: theme.colors.background.accent,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "rgba(27, 163, 163, 0.2)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                {jobDetails?.company?.company_logo ? (
                  <Image
                    source={{ uri: jobDetails.company.company_logo }}
                    style={{ width: 60, height: 60, borderRadius: 12 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: "bold",
                      color: theme.colors.primary.teal,
                    }}
                  >
                    {(jobDetails?.company?.company_name || "M")?.charAt(0)}
                  </Text>
                )}
              </View>
              <View style={{ marginLeft: 20, flex: 1 }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color: theme.colors.text.primary,
                    marginBottom: 4,
                  }}
                >
                  {jobDetails?.job_title}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: theme.colors.primary.teal,
                    fontWeight: "600",
                  }}
                >
                  {jobDetails?.company?.company_name}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                marginTop: 25,
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(27, 163, 163, 0.1)",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="sparkles"
                  size={14}
                  color={theme.colors.primary.teal}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: theme.colors.primary.teal,
                    fontWeight: "bold",
                    fontSize: 13,
                  }}
                >
                  {jobDetails?.match_percentage}% Match
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#f3f4f6",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="location-outline"
                  size={14}
                  color="#6b7280"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{ color: "#6b7280", fontSize: 13, fontWeight: "500" }}
                >
                  {jobDetails?.location}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#f3f4f6",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={14}
                  color="#6b7280"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{ color: "#6b7280", fontSize: 13, fontWeight: "500" }}
                >
                  {jobDetails?.experience_range}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Job Info Grid */}
          <View
            style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: 20 }}
          >
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.colors.border.light,
                flexDirection: "row",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              <View style={{ width: "45%" }}>
                <Text
                  style={{
                    color: theme.colors.text.tertiary,
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  Employment Type
                </Text>
                <Text
                  style={{
                    fontWeight: "600",
                    color: theme.colors.text.primary,
                  }}
                >
                  {jobDetails?.employment_type
                    ?.replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
              </View>
              <View style={{ width: "45%" }}>
                <Text
                  style={{
                    color: theme.colors.text.tertiary,
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  Salary Range
                </Text>
                <Text
                  style={{
                    fontWeight: "600",
                    color: theme.colors.primary.teal,
                  }}
                >
                  {jobDetails?.salary_range || "Market Rate"}
                </Text>
              </View>
              <View style={{ width: "45%" }}>
                <Text
                  style={{
                    color: theme.colors.text.tertiary,
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  Work Mode
                </Text>
                <Text
                  style={{
                    fontWeight: "600",
                    color: theme.colors.text.primary,
                  }}
                >
                  {jobDetails?.work_mode
                    ?.replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
              </View>
              <View style={{ width: "45%" }}>
                <Text
                  style={{
                    color: theme.colors.text.tertiary,
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  Posted
                </Text>
                <Text
                  style={{
                    fontWeight: "600",
                    color: theme.colors.text.primary,
                  }}
                >
                  {jobDetails?.posted_time}
                </Text>
              </View>
            </View>

            {/* Content Sections */}
            <View style={{ marginTop: 30 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 12,
                  color: theme.colors.text.primary,
                }}
              >
                Description
              </Text>
              <Text
                style={{ color: theme.colors.text.secondary, lineHeight: 24 }}
              >
                {jobDetails?.job_description}
              </Text>
            </View>

            <ListSection
              title="Responsibilities"
              items={jobDetails?.job_responsibilities}
              icon="list-outline"
              iconColor={theme.colors.primary.teal}
            />
            <ListSection
              title="Requirements"
              items={jobDetails?.job_requirements}
              icon="checkmark-shield-outline"
              iconColor={theme.colors.primary.orange}
            />
            <ListSection
              title="Benefits & Perks"
              items={jobDetails?.benefits}
              icon="gift-outline"
              iconColor="#8b5cf6"
            />

            {/* About Company */}
            <View
              style={{
                marginTop: 40,
                padding: 20,
                backgroundColor: "rgba(27, 163, 163, 0.03)",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(27, 163, 163, 0.1)",
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 12,
                  color: theme.colors.text.primary,
                }}
              >
                About {jobDetails?.company?.company_name}
              </Text>
              <Text
                style={{
                  color: theme.colors.text.secondary,
                  lineHeight: 22,
                  fontSize: 14,
                }}
              >
                {jobDetails?.company?.company_description ||
                  `Join ${jobDetails?.company?.company_name} in their quest for excellence in the ${jobDetails?.company?.industry} industry.`}
              </Text>
              {jobDetails?.company?.industry && (
                <View
                  style={{
                    marginTop: 15,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 13, color: theme.colors.text.tertiary }}
                  >
                    Industry:{" "}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: theme.colors.text.primary,
                    }}
                  >
                    {jobDetails?.company?.industry}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Footer Action */}
        <View
          style={{
            padding: theme.spacing.lg,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border.light,
            backgroundColor: "white",
            paddingBottom: theme.spacing.xl,
          }}
        >
          {userStatus === "inactive" && (
            <Text style={{ 
              textAlign: "center", 
              marginBottom: 12, 
              color: theme.colors.text.secondary,
              fontSize: 13,
              fontFamily: theme.typography.fonts.medium
            }}>
              Unlock full features and Apply by upgrading
            </Text>
          )}

          <TouchableOpacity
            onPress={handleApplyPress}
            style={{
              backgroundColor: jobDetails?.has_applied && userStatus !== "inactive"
                ? "#e5e7eb"
                : theme.colors.primary.teal,
              paddingVertical: 16,
              borderRadius: 15,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              shadowColor: theme.colors.primary.teal,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: (jobDetails?.has_applied && userStatus !== "inactive") ? 0 : 0.2,
              shadowRadius: 8,
              elevation: (jobDetails?.has_applied && userStatus !== "inactive") ? 0 : 4,
            }}
            disabled={(jobDetails?.has_applied && userStatus !== "inactive") || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text
                  style={{
                    color: (jobDetails?.has_applied && userStatus !== "inactive") ? "#9ca3af" : "white",
                    fontWeight: "bold",
                    fontSize: 16,
                    marginRight: 8,
                  }}
                >
                  {userStatus === "inactive" 
                    ? "Upgrade to Premium" 
                    : (jobDetails?.has_applied ? "Already Applied" : "Easy Apply Now")}
                </Text>
                {userStatus === "inactive" ? (
                  <Ionicons name="lock-closed" size={18} color="white" />
                ) : (!jobDetails?.has_applied && (
                  <Ionicons name="flash" size={18} color="white" />
                ))}
              </>
            )}
          </TouchableOpacity>
        </View>

        <JobApplicationModal
          visible={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          onSubmit={handleSubmitApplication}
          coverLetter={coverLetter}
          setCoverLetter={setCoverLetter}
          expectedSalary={expectedSalary}
          setExpectedSalary={setExpectedSalary}
          availabilityDate={availabilityDate}
          setAvailabilityDate={setAvailabilityDate}
          submitting={submitting}
        />
      </View>
    </SafeAreaWrapper>
  );
}
