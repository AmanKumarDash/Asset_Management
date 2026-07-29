import { appLogger } from "@/utils/appLogger";
import { Feather } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AuthButton from "../components/AuthButton";
import AuthCard from "../components/AuthCard";
import AuthInput from "../components/AuthInput";
import { useAuthSession } from "../hooks/useAuthSession";

export default function LoginScreen() {
  const { isHydrated, isAuthenticated, signIn } = useAuthSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isHydrated) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/dashboard" />;
  }

  const handleSignIn = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError("Enter your email or employee ID and password.");
      return;
    }

    setIsSubmitting(true);
    const result = await signIn({ identifier, password });
    setIsSubmitting(false);

    if (!result.success) {
      appLogger.warn("LoginScreen", "Rejected sign-in attempt from login form.", {
        identifier,
      });
      setError(result.message ?? "Unable to sign in right now. Please try again.");
      return;
    }

    appLogger.info("LoginScreen", "Routing to dashboard after successful sign-in.");
    setError("");
    router.replace("/dashboard");
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-100"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingVertical: 32,
        }}
      >
        <View className="w-full items-center">
          <AuthCard>
            <View className="mb-6 flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <Feather name="grid" size={18} color="#ffffff" />
              </View>
              <Text className="text-xl font-semibold text-gray-800">AssetTrack</Text>
            </View>

            <Text className="mb-1 text-2xl font-semibold text-gray-800">Welcome</Text>
            <Text className="mb-6 text-gray-500">Sign in to your account to continue</Text>

            <AuthInput
              label="Email ID"
              placeholder="Enter your email ID"
              value={identifier}
              onChangeText={setIdentifier}
            />
            <AuthInput
              label="Password"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />

            <TouchableOpacity className="mb-4 items-end">
              <Text className="text-sm text-blue-600">Forgot password?</Text>
            </TouchableOpacity>

            <AuthButton
              title={isSubmitting ? "Signing In..." : "Sign In"}
              onPress={() => {
                void handleSignIn();
              }}
              disabled={isSubmitting}
            />

            {error ? (
              <View className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-600">{error}</Text>
              </View>
            ) : null}
          </AuthCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

