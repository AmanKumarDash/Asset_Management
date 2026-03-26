import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, router, usePathname } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { getDesktopNavItems } from "../config/navItems";
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
  const { user, signOut } = useAuthSession();
  const pathname = usePathname();
  const handleLogout = () => {
    signOut();
    router.replace("/login");
  };

  if (!user) {
    return null;
  }

  const desktopNavItems = getDesktopNavItems(user.role);
  const activeColor =
    user.role === "admin" ? adminTheme.primary : adminTheme.employeePrimary;
  const activeBg =
    user.role === "admin"
      ? adminTheme.infoBg
      : adminTheme.employeePrimarySoft;
  const roleBadgeBg =
    user.role === "admin"
      ? adminTheme.accentGoldSoft
      : adminTheme.employeePrimarySoft;
  const roleBadgeText =
    user.role === "admin"
      ? adminTheme.accentGold
      : adminTheme.employeePrimary;

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
              style={{ backgroundColor: activeColor }}
            >
              <MaterialCommunityIcons name="view-grid" size={20} color="#ffffff" />
            </View>
            <Text className="text-lg font-semibold" style={{ color: adminTheme.slate }}>
              AssetTrack
            </Text>
          </View>
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: roleBadgeBg }}
          >
            <Text className="text-xs font-semibold" style={{ color: roleBadgeText }}>
              {user.roleBadge}
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
                    borderColor: isActive ? activeColor : adminTheme.border,
                    backgroundColor: isActive ? activeBg : adminTheme.surface,
                  }}
                >
                  <Feather
                    name={item.icon}
                    size={16}
                    color={isActive ? activeColor : adminTheme.muted}
                  />
                  <Text className="ml-2 text-sm font-medium" style={{ color: isActive ? activeColor : adminTheme.muted }}>
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
              style={{ backgroundColor: activeColor }}
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
            style={{ backgroundColor: user.avatarBg }}
          >
            <Text
              className="text-sm font-bold"
              style={{ color: user.avatarText }}
            >
              {user.initials}
            </Text>
          </View>
          {!isCollapsed ? (
            <View>
              <Text className="text-base font-medium" style={{ color: adminTheme.slate }}>
                {user.name}
              </Text>
              <Text className="mt-1 text-xs font-medium" style={{ color: roleBadgeText }}>
                {user.roleBadge}
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
              style={{ backgroundColor: isActive ? activeBg : "transparent" }}
            >
              <Feather
                name={item.icon}
                size={16}
                color={isActive ? activeColor : adminTheme.muted}
              />
              {!isCollapsed ? (
                <Text
                  className={`ml-3 text-[16px] ${isActive ? "font-semibold" : ""}`}
                  style={{ color: isActive ? activeColor : adminTheme.slateSoft }}
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
