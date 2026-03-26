import AppShell from "@/features/navigation/components/AppShell";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { Redirect, Slot } from "expo-router";

export default function AppLayout() {
  const { user } = useAuthSession();

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
