import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import { api, exchangeAuthToken, refreshSession } from '@/lib/api';
import { storage } from '@/lib/storage';
import type { AuthResponse, User } from '@/lib/types';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  /** Store the tokens + user returned by the backend after an OAuth exchange. */
  completeSignIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore a previous session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const access = await storage.getAccessToken();
        const refresh = await storage.getRefreshToken();
        const storedUser = await storage.getUser();

        if (cancelled) return;

        if (!access && !refresh) {
          setUser(null);
          return;
        }

        // If we have a user cached, show it immediately (optimistic).
        if (storedUser) setUser(storedUser);

        if (!access && refresh) {
          // Only a refresh token — try to rotate it.
          const ok = await refreshSession();
          if (!ok && !cancelled) {
            await storage.clear();
            setUser(null);
          }
          return;
        }

        // Validate the access token (api.me auto-refreshes on 401).
        try {
          const me = await api.me();
          if (!cancelled) {
            setUser(me);
            await storage.setUser(me);
          }
        } catch {
          if (!cancelled) {
            await storage.clear();
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completeSignIn = useCallback(async (auth: AuthResponse) => {
    await storage.setAccessToken(auth.accessToken);
    await storage.setRefreshToken(auth.refreshToken);
    await storage.setUser(auth.user);
    setUser(auth.user);
  }, []);

  const signOut = useCallback(async () => {
    // Best-effort native provider sign-out (keeps the SDK session clean).
    try {
      if (Platform.OS !== 'web') {
        const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
        if (GoogleSignin.getCurrentUser()) {
          await GoogleSignin.signOut();
        }
      }
    } catch {
      // ignore
    }
    await storage.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, completeSignIn, signOut }),
    [user, isLoading, completeSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Platform-specific OAuth helpers used by the sign-in screen.
// (Dynamic imports keep these native modules out of the web bundle.)
// ---------------------------------------------------------------------------

export async function signInWithGoogleNative(): Promise<AuthResponse> {
  const { GoogleSignin, statusCodes } = await import('@react-native-google-signin/google-signin');

  GoogleSignin.configure({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  try {
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    if (!tokens.idToken) throw new Error('Google sign-in did not return an id token.');
    return exchangeAuthToken('google', { idToken: tokens.idToken });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) throw new Error('Google sign-in was cancelled.');
    if (code === statusCodes.IN_PROGRESS) throw new Error('Google sign-in is already in progress.');
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play services are not available on this device.');
    }
    throw error instanceof Error ? error : new Error('Google sign-in failed.');
  }
}

export async function signInWithAppleNative(): Promise<AuthResponse> {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only available on iOS.');
  }
  const AppleAuthentication = await import('expo-apple-authentication');

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }

  const fullName = credential.fullName
    ? {
        givenName: credential.fullName.givenName ?? undefined,
        familyName: credential.fullName.familyName ?? undefined,
      }
    : undefined;

  return exchangeAuthToken('apple', { identityToken: credential.identityToken, fullName });
}
