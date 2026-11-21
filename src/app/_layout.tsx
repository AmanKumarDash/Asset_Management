import "../../global.css";
import { Stack, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { AuthSessionProvider } from "@/features/auth/context/AuthSessionProvider";
import { appLogger } from "@/utils/appLogger";

function NavigationDiagnostics() {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    appLogger.info("Navigation", "Route changed.", {
      from: previousPathRef.current,
      to: pathname,
    });
    previousPathRef.current = pathname;
  }, [pathname]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <NavigationDiagnostics />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthSessionProvider>
  );
}
