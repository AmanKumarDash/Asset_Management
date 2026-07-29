import BrandSplashScreen from "@/features/splash/screens/BrandSplashScreen";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";

export default function Index() {
  const { isHydrated, isAuthenticated } = useAuthSession();
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  useEffect(() => {
    if (!isHydrated || !isSplashFinished) {
      return;
    }

    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isHydrated, isSplashFinished, isAuthenticated]);

  const handleFinish = useCallback(() => {
    setIsSplashFinished(true);
  }, []);

  return <BrandSplashScreen onFinish={handleFinish} />;
}
