import { View } from "react-native";

export default function AuthCard({ children }: any) {
  return (
    <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md">
      {children}
    </View>
  );
}
