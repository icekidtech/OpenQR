import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { User } from '@/lib/types';

const ACCESS_KEY = 'openqr.access_token';
const REFRESH_KEY = 'openqr.refresh_token';
const USER_KEY = 'openqr.user';

const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const storage = {
  async getAccessToken(): Promise<string | null> {
    return getItem(ACCESS_KEY);
  },
  async setAccessToken(token: string): Promise<void> {
    await setItem(ACCESS_KEY, token);
  },
  async getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_KEY);
  },
  async setRefreshToken(token: string): Promise<void> {
    await setItem(REFRESH_KEY, token);
  },
  async getUser(): Promise<User | null> {
    const raw = await getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  async setUser(user: User | null): Promise<void> {
    if (user) {
      await setItem(USER_KEY, JSON.stringify(user));
    } else {
      await removeItem(USER_KEY);
    }
  },
  async clear(): Promise<void> {
    await removeItem(ACCESS_KEY);
    await removeItem(REFRESH_KEY);
    await removeItem(USER_KEY);
  },
};
