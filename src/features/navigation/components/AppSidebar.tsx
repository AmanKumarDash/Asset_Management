import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, router, usePathname } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { desktopNavItems } from "../config/navItems";
import { currentUser } from "@/features/profile/data/currentUser";
import { adminTheme } from "@/theme/adminTheme";

type AppSidebarProps = {
  isDesktop: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export default function AppSidebar({
  isDesktop,
  isCollapsed = false,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const handleLogout = () => router.replace("/login");

  if (!isDesktop) {
    return (
      <View
        className="border-b px-4 py-4"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: adminTheme.primary }}
            >
              <MaterialCommunityIcons name="view-grid" size={20} color="#ffffff" />
            </View>
            <Text className="text-lg font-semibold" style={{ color: adminTheme.slate }}>
              AssetTrack
            </Text>
          </View>
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: adminTheme.accentGoldSoft }}
          >
            <Text className="text-xs font-semibold" style={{ color: adminTheme.accentGold }}>
              Admin
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {desktopNavItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Pressable
                  key={item.href}
                  onPress={() => router.push(item.href as Href)}
                  className="flex-row items-center rounded-xl border px-4 py-3"
                  style={{
                    borderColor: isActive ? adminTheme.primary : adminTheme.border,
                    backgroundColor: isActive ? adminTheme.infoBg : adminTheme.surface,
                  }}
                >
                  <Feather
                    name={item.icon}
                    size={16}
                    color={isActive ? adminTheme.primary : adminTheme.muted}
                  />
                  <Text className="ml-2 text-sm font-medium" style={{ color: isActive ? adminTheme.primary : adminTheme.muted }}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      className="border-r"
      style={{
        width: isCollapsed ? 84 : 224,
        borderColor: adminTheme.border,
        backgroundColor: adminTheme.surface,
      }}
    >
      <View className="border-b px-4 py-4" style={{ borderColor: adminTheme.border }}>
        <View className="flex-row items-center justify-between">
          <View className={`flex-row items-center ${isCollapsed ? "justify-center" : ""}`}>
            <View
              className={`${isCollapsed ? "" : "mr-3"} h-10 w-10 items-center justify-center rounded-xl`}
              style={{ backgroundColor: adminTheme.primary }}
            >
              <MaterialCommunityIcons name="view-grid" size={20} color="#ffffff" />
            </View>
            {!isCollapsed ? (
              <Text className="text-[22px] font-semibold" style={{ color: adminTheme.slate }}>
                AssetTrack
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={onToggleCollapse}
            className="h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: adminTheme.surfaceAlt }}
          >
            <Feather
              name={isCollapsed ? "chevron-right" : "chevron-left"}
              size={18}
              color={adminTheme.slateSoft}
            />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/profile")}
        className="border-b px-4 py-4"
        style={{ borderColor: adminTheme.border }}
      >
        <View className={`flex-row items-center ${isCollapsed ? "justify-center" : ""}`}>
          <View
            className={`${isCollapsed ? "" : "mr-3"} h-10 w-10 items-center justify-center rounded-full`}
            style={{ backgroundColor: currentUser.avatarBg }}
          >
            <Text
              className="text-sm font-bold"
              style={{ color: currentUser.avatarText }}
            >
              {currentUser.initials}
            </Text>
          </View>
          {!isCollapsed ? (
            <View>
              <Text className="text-base font-medium" style={{ color: adminTheme.slate }}>
                {currentUser.name}
              </Text>
              <Text className="mt-1 text-xs font-medium" style={{ color: adminTheme.accentGold }}>
                {currentUser.role}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View className="flex-1 px-3 py-4">
        {desktopNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as Href)}
              className={`mb-1.5 flex-row rounded-2xl px-3 py-3 ${
                isCollapsed ? "justify-center" : "items-center"
              }`}
              style={{ backgroundColor: isActive ? adminTheme.infoBg : "transparent" }}
            >
              <Feather
                name={item.icon}
                size={16}
                color={isActive ? adminTheme.primary : adminTheme.muted}
              />
              {!isCollapsed ? (
                <Text
                  className={`ml-3 text-[16px] ${isActive ? "font-semibold" : ""}`}
                  style={{ color: isActive ? adminTheme.primary : adminTheme.slateSoft }}
                >
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View className="border-t px-3 py-4" style={{ borderColor: adminTheme.border }}>
        <Pressable
          onPress={handleLogout}
          className={`flex-row rounded-2xl px-3 py-3 ${
            isCollapsed ? "justify-center" : "items-center"
          }`}
          style={{ backgroundColor: "#FFF5F5" }}
        >
          <Feather name="log-out" size={16} color="#D64545" />
          {!isCollapsed ? (
            <Text className="ml-3 text-[16px] font-medium" style={{ color: "#D64545" }}>
              Logout
            </Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
