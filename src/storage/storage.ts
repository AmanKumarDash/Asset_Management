import AsyncStorage from "@react-native-async-storage/async-storage";
import { appLogger } from "@/utils/appLogger";

async function getItem(key: string) {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    appLogger.error("Storage", "Failed to read a value from storage.", {
      key,
      error,
    });
    return null;
  }
}

async function setItem(key: string, value: string) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    appLogger.error("Storage", "Failed to write a value to storage.", {
      key,
      error,
    });
  }
}

async function removeItem(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    appLogger.error("Storage", "Failed to remove a value from storage.", {
      key,
      error,
    });
  }
}

async function getObject<T>(key: string) {
  const value = await getItem(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    appLogger.warn("Storage", "Discarded invalid JSON from storage.", {
      key,
      error,
    });
    await removeItem(key);
    return null;
  }
}

async function setObject<T>(key: string, value: T) {
  await setItem(key, JSON.stringify(value));
}

export const storage = {
  getItem,
  setItem,
  removeItem,
  getObject,
  setObject,
};
