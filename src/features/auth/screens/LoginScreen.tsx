import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import AuthButton from "../components/AuthButton";
import AuthCard from "../components/AuthCard";
import AuthInput from "../components/AuthInput";

export default function LoginScreen() {
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
        />
        <AuthInput
          label="Password"
          placeholder="********"
          secureTextEntry
        />

        <TouchableOpacity className="mb-4 items-end">
          <Text className="text-sm text-blue-600">Forgot password?</Text>
        </TouchableOpacity>

        <AuthButton
          title="Sign In"
          onPress={() => router.push("/dashboard")}
        />

        <View className="mt-6 rounded-lg bg-gray-100 p-4">
          <Text className="text-sm text-gray-600">
            Your role (Admin or Employee) is automatically detected. Contact
            your administrator if you need access.
          </Text>
        </View>
      </AuthCard>
    </View>
  );
}
