import { View } from "react-native";

export default function AuthCard({ children }: any) {
  return (
    <View className="bg-white rounded-2xl p-6 shadow-md w-full max-w-md">
      {children}
    </View>
  );
}