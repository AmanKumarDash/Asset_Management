import { Feather } from "@expo/vector-icons";
import { Href, router, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { mobileNavItems } from "../config/navItems";
import { adminTheme } from "@/theme/adminTheme";

export default function AppBottomNav() {
  const pathname = usePathname();

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
                color={isActive ? adminTheme.primary : adminTheme.muted}
              />
              <Text
                className={`mt-1 text-xs ${isActive ? "font-medium" : ""}`}
                style={{ color: isActive ? adminTheme.primary : adminTheme.muted }}
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
