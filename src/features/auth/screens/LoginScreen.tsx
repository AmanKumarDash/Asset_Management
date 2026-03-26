import { Feather } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { appLogger } from "@/utils/appLogger";
import AuthButton from "../components/AuthButton";
import AuthCard from "../components/AuthCard";
import AuthInput from "../components/AuthInput";
import { useAuthSession } from "../hooks/useAuthSession";

export default function LoginScreen() {
  const { user, signIn } = useAuthSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) {
    return <Redirect href="/dashboard" />;
  }

  // Login stays intentionally simple here: it forwards the credentials to the
  // session provider, which decides whether this mock account is admin or employee.
  const handleSignIn = () => {
    const signedIn = signIn({ identifier, password });

    if (!signedIn) {
      appLogger.warn("LoginScreen", "Rejected sign-in attempt from login form.", {
        identifier,
      });
      setError("Account not found. Use alka@company.com or aman@company.com.");
      return;
    }

    appLogger.info("LoginScreen", "Routing to dashboard after successful sign-in.");
    setError("");
    router.replace("/dashboard");
  };

  return (
    <View className="flex-1 items-center justify-center bg-gray-100 px-4">
      <AuthCard>
        <View className="mb-6 flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <Feather name="grid" size={18} color="#ffffff" />
          </View>
          <Text className="text-xl font-semibold text-gray-800">AssetTrack</Text>
        </View>

        <Text className="mb-1 text-2xl font-semibold text-gray-800">
          Welcome back
        </Text>
        <Text className="mb-6 text-gray-500">
          Sign in to your account to continue
        </Text>

        <AuthInput
          label="Employee ID or email"
          placeholder="aman@company.com"
          value={identifier}
          onChangeText={setIdentifier}
        />
        <AuthInput
          label="Password"
          placeholder="********"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity className="mb-4 items-end">
          <Text className="text-sm text-blue-600">Forgot password?</Text>
        </TouchableOpacity>

        <AuthButton title="Sign In" onPress={handleSignIn} />

        {error ? (
          <View className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-600">{error}</Text>
          </View>
        ) : null}

        <View className="mt-6 rounded-lg bg-gray-100 p-4">
          <Text className="text-sm text-gray-600">
            Your role (Admin or Employee) is automatically detected. Contact
            your administrator if you need access.
          </Text>
          <Text className="mt-3 text-sm text-gray-600">
            Demo accounts: `alka@company.com` for Admin, `aman@company.com` for Employee.
          </Text>
        </View>
      </AuthCard>
    </View>
  );
}
