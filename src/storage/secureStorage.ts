import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { appLogger } from "@/utils/appLogger";
import { storage } from "./storage";

async function getItem(key: string) {
  if (Platform.OS === "web") {
    return storage.getItem(key);
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    appLogger.error("SecureStorage", "Failed to read a secure value.", {
      key,
      error,
    });
    return null;
  }
}

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    await storage.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    appLogger.error("SecureStorage", "Failed to write a secure value.", {
      key,
      error,
    });
  }
}

async function removeItem(key: string) {
  if (Platform.OS === "web") {
    await storage.removeItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    appLogger.error("SecureStorage", "Failed to remove a secure value.", {
      key,
      error,
    });
  }
}

export const secureStorage = {
  getItem,
  setItem,
  removeItem,
};
