import "../../global.css";
import { Stack } from "expo-router";
import { AuthSessionProvider } from "@/features/auth/context/AuthSessionProvider";

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthSessionProvider>
  );
}
