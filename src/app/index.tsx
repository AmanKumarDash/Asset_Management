import BrandSplashScreen from "@/features/splash/screens/BrandSplashScreen";
import { router } from "expo-router";
import { useCallback } from "react";

export default function Index() {
  const handleFinish = useCallback(() => {
    router.replace("/login");
  }, []);

  return <BrandSplashScreen onFinish={handleFinish} />;
}
