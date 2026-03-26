import { ReactNode, useState } from "react";
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isDesktop = width >= 1024;
  const hideMobileNav =
    pathname === "/employees/new" ||
    pathname === "/reports" ||
    pathname === "/audits" ||
    pathname.startsWith("/audits/");
  const showMobileNav = !hideMobileNav;

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
        <AppSidebar
          isDesktop
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        />
        <View className="flex-1" style={{ backgroundColor: adminTheme.background }}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}
