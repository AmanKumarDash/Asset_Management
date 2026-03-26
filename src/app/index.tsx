import BrandSplashScreen from "@/features/splash/screens/BrandSplashScreen";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { router } from "expo-router";
import { useCallback } from "react";

export default function Index() {
  const { user } = useAuthSession();

  const handleFinish = useCallback(() => {
    router.replace(user ? "/dashboard" : "/login");
  }, [user]);

  return <BrandSplashScreen onFinish={handleFinish} />;
}
