import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, router, usePathname } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { desktopNavItems } from "../config/navItems";
import { currentUser } from "@/features/profile/data/currentUser";
import { adminTheme } from "@/theme/adminTheme";

type AppSidebarProps = {
  isDesktop: boolean;
};

export default function AppSidebar({ isDesktop }: AppSidebarProps) {
  const pathname = usePathname();

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
      className="w-[224px] border-r"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <View className="border-b px-4 py-4" style={{ borderColor: adminTheme.border }}>
        <View className="flex-row items-center">
          <View
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: adminTheme.primary }}
          >
            <MaterialCommunityIcons name="view-grid" size={20} color="#ffffff" />
          </View>
          <Text className="text-[22px] font-semibold" style={{ color: adminTheme.slate }}>
            AssetTrack
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/profile")}
        className="border-b px-4 py-4"
        style={{ borderColor: adminTheme.border }}
      >
        <View className="flex-row items-center">
          <View
            className="mr-3 h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: currentUser.avatarBg }}
          >
            <Text
              className="text-sm font-bold"
              style={{ color: currentUser.avatarText }}
            >
              {currentUser.initials}
            </Text>
          </View>
          <View>
            <Text className="text-base font-medium" style={{ color: adminTheme.slate }}>
              {currentUser.name}
            </Text>
            <Text className="mt-1 text-xs font-medium" style={{ color: adminTheme.accentGold }}>
              {currentUser.role}
            </Text>
          </View>
        </View>
      </Pressable>

      <View className="px-3 py-4">
        {desktopNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as Href)}
              className="mb-1.5 flex-row items-center rounded-2xl px-3 py-3"
              style={{ backgroundColor: isActive ? adminTheme.infoBg : "transparent" }}
            >
              <Feather
                name={item.icon}
                size={16}
                color={isActive ? adminTheme.primary : adminTheme.muted}
              />
              <Text
                className={`ml-3 text-[16px] ${isActive ? "font-semibold" : ""}`}
                style={{ color: isActive ? adminTheme.primary : adminTheme.slateSoft }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
