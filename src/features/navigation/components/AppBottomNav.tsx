import { Feather } from "@expo/vector-icons";
import { Href, router, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { getMobileNavItems } from "../config/navItems";
import { adminTheme } from "@/theme/adminTheme";

export default function AppBottomNav() {
  const { user } = useAuthSession();
  const pathname = usePathname();

  if (!user) {
    return null;
  }

  const mobileNavItems = getMobileNavItems(user.role);
  const activeColor =
    user.role === "admin" ? adminTheme.primary : adminTheme.employeePrimary;

  return (
    <View
      className="border-t bg-white px-2 pb-3 pt-2"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <View className="flex-row justify-between">
        {mobileNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as Href)}
              className="flex-1 items-center py-2"
            >
              <Feather
                name={item.icon}
                size={18}
                color={isActive ? activeColor : adminTheme.muted}
              />
              <Text
                className={`mt-1 text-xs ${isActive ? "font-medium" : ""}`}
                style={{ color: isActive ? activeColor : adminTheme.muted }}
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
