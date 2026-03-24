import AppShell from "@/features/navigation/components/AppShell";
import { Slot } from "expo-router";

export default function AppLayout() {
  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
