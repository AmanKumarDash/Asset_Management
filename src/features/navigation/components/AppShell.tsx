import { ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import { usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AppBottomNav from "./AppBottomNav";
import AppSidebar from "./AppSidebar";
import { adminTheme } from "@/theme/adminTheme";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isDesktop = width >= 1024;
  const showMobileNav = pathname !== "/employees/new";

  if (!isDesktop) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: adminTheme.background }}
        edges={["top", "bottom"]}
      >
        <View className="flex-1" style={{ backgroundColor: adminTheme.background }}>
          <View className="flex-1" style={{ backgroundColor: adminTheme.background }}>
            {children}
          </View>
          {showMobileNav ? <AppBottomNav /> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: adminTheme.background }}
      edges={["top", "bottom"]}
    >
      <View
        className="flex-1 flex-row"
        style={{ backgroundColor: adminTheme.background }}
      >
        <AppSidebar isDesktop />
        <View className="flex-1" style={{ backgroundColor: adminTheme.background }}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}
