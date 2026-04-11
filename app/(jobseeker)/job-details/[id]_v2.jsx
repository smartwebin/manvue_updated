import JobApplicationModal from "@/components/JobApplicationModal";
import SafeAreaWrapper from "@/components/SafeAreaWrapper";
import apiService from "@/services/apiService";
import theme from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
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
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [error, setError] = useState(null);

  // Application modal
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId && id) {
      loadJobDetails();
    }
  }, [userId, id]);

  const loadUserId = async () => {
    try {
      const storedUserId = await SecureStore.getItemAsync("user_id");
      if (!storedUserId) {
        setError("User not found. Please log in again.");
        router.replace("/(auth)/login");
        return;
      }
      setUserId(storedUserId);
    } catch (error) {
      setError("Failed to load user data.");
    }
  };

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

      if (response.success) {
        setJobDetails(response.data);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError("Failed to load job details. Please try again.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadJobDetails(false);
    setRefreshing(false);
  }, [userId, id]);

  const handleApplyPress = () => {
    if (jobDetails?.has_applied) {
      Alert.alert(
        "Already Applied",
        `You have already applied for this position. Your application status is: ${jobDetails.application_status?.replace("_", " ")}`,
        [{ text: "OK" }]
      );
      return;
    }
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!coverLetter.trim()) {
      Alert.alert("Required", "Please enter a cover letter");
      return;
    }

    try {
      setSubmitting(true);

      const params = {
        job_id: parseInt(id),
        jobseeker_id: parseInt(userId),
        cover_letter: coverLetter.trim(),
        expected_salary: expectedSalary ? parseFloat(expectedSalary) : null,
        availability_date: availabilityDate || null,
      };

      const response = await apiService.submitJobApplicationV2(params);

      if (response.success) {
        setShowApplicationModal(false);
        setCoverLetter("");
        setExpectedSalary("");
        setAvailabilityDate("");

        Alert.alert(
          "Success!",
          "Your application has been submitted successfully.",
          [{ text: "OK", onPress: () => loadJobDetails(false) }]
        );
      } else if (response.status === 402) {
        // ANDROID PAYMENT REQUIRED
        Alert.alert(
          "Payment Required",
          "You need a premium subscription to apply for jobs. Would you like to upgrade now?",
          [
            { text: "Later", style: "cancel" },
            { text: "Go to Payment", onPress: () => router.push("/(jobseeker)/jobseeker/payment") }
          ]
        );
      } else if (response.status === 403 && response.code === "APPROVAL_PENDING") {
        // IOS APPROVAL PENDING
        Alert.alert(
          "Application Pending",
          "Your profile is currently under review. You can browse jobs, but applications will be enabled once your account is approved.",
          [{ text: "Got it" }]
        );
      } else {
        Alert.alert("Error", response.message || "Failed to submit application");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background.primary, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.primary.teal} />
        <Text style={{ marginTop: theme.spacing.md, color: theme.colors.text.secondary }}>Loading job details...</Text>
      </View>
    );
  }

  if (error && !jobDetails) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background.primary, justifyContent: "center", alignItems: "center", paddingHorizontal: theme.spacing.lg }}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.colors.status.error} />
        <Text style={{ fontSize: 20, fontWeight: "bold", marginTop: 20 }}>Unable to Load Job</Text>
        <Text style={{ textAlign: "center", marginTop: 10, color: theme.colors.text.secondary }}>{error}</Text>
        <TouchableOpacity onPress={() => loadJobDetails(true)} style={{ marginTop: 20, backgroundColor: theme.colors.primary.teal, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 }}>
          <Text style={{ color: "white", fontWeight: "bold" }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
        {/* Header */}
        <View style={{ backgroundColor: "white", padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border.light, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginLeft: 15 }}>Job Details</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* Hero Section */}
          <LinearGradient colors={["rgba(27, 163, 163, 0.05)", "white"]} style={{ padding: theme.spacing.lg }}>
             <View style={{ flexDirection: "row", alignItems: "center" }}>
               <View style={{ width: 70, height: 70, borderRadius: 15, backgroundColor: theme.colors.background.accent, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(27, 163, 163, 0.2)" }}>
                 {jobDetails.company_logo ? (
                   <Image source={{ uri: jobDetails.company_logo }} style={{ width: 50, height: 50, borderRadius: 10 }} />
                 ) : (
                   <Text style={{ fontSize: 28, fontWeight: "bold", color: theme.colors.primary.teal }}>{jobDetails.company_name?.charAt(0)}</Text>
                 )}
               </View>
               <View style={{ marginLeft: 15, flex: 1 }}>
                 <Text style={{ fontSize: 22, fontWeight: "bold", color: theme.colors.text.primary }}>{jobDetails.job_title}</Text>
                 <Text style={{ fontSize: 16, color: theme.colors.primary.teal, fontWeight: "600" }}>{jobDetails.company_name}</Text>
               </View>
             </View>

             <View style={{ flexDirection: "row", marginTop: 20, gap: 10, flexWrap: "wrap" }}>
                <View style={{ backgroundColor: "rgba(27, 163, 163, 0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                   <Text style={{ color: theme.colors.primary.teal, fontWeight: "bold", fontSize: 13 }}>{jobDetails.match_percentage}% Match</Text>
                </View>
                <View style={{ backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                   <Text style={{ color: "#6b7280", fontSize: 13 }}>{jobDetails.location}</Text>
                </View>
                <View style={{ backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                   <Text style={{ color: "#6b7280", fontSize: 13 }}>{jobDetails.experience_range}</Text>
                </View>
             </View>
          </LinearGradient>

          {/* Details */}
          <View style={{ padding: theme.spacing.lg }}>
             <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Description</Text>
             <Text style={{ color: theme.colors.text.secondary, lineHeight: 24, marginBottom: 20 }}>{jobDetails.job_description}</Text>

             <View style={{ backgroundColor: "white", borderRadius: 15, padding: 20, borderWidth: 1, borderColor: theme.colors.border.light }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
                   <Text style={{ color: theme.colors.text.tertiary }}>Employment Type</Text>
                   <Text style={{ fontWeight: "600" }}>{jobDetails.employment_type?.replace("_", " ")}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
                   <Text style={{ color: theme.colors.text.tertiary }}>Salary</Text>
                   <Text style={{ fontWeight: "600", color: theme.colors.primary.teal }}>{jobDetails.salary_range || "Market Rate"}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                   <Text style={{ color: theme.colors.text.tertiary }}>Posted</Text>
                   <Text style={{ fontWeight: "600" }}>{jobDetails.posted_time}</Text>
                </View>
             </View>
          </View>
        </ScrollView>

        {/* Footer Action */}
        <View style={{ padding: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border.light, backgroundColor: "white" }}>
           <TouchableOpacity
             onPress={handleApplyPress}
             style={{
               backgroundColor: jobDetails.has_applied ? "#9ca3af" : theme.colors.primary.teal,
               paddingVertical: 16,
               borderRadius: 15,
               alignItems: "center",
               flexDirection: "row",
               justifyContent: "center"
             }}
             disabled={jobDetails.has_applied || submitting}
           >
             {submitting ? (
               <ActivityIndicator color="white" />
             ) : (
               <>
                 <Text style={{ color: "white", fontWeight: "bold", fontSize: 16, marginRight: 8 }}>
                   {jobDetails.has_applied ? "Already Applied" : "Apply for this Job"}
                 </Text>
                 {!jobDetails.has_applied && <Ionicons name="arrow-forward" size={18} color="white" />}
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
