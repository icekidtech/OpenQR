import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { Redirect } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { BrandMark } from '@/components/brand-mark';
import { Toast } from '@/components/toast';
import { exchangeAuthToken } from '@/lib/api';
import { signInWithAppleNative, signInWithGoogleNative, useAuth } from '@/lib/auth';
import { colors, radius, spacing, typography } from '@/theme';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function SignInScreen() {
  const { user } = useAuth();
  if (user) return <Redirect href="/(tabs)" />;
  return Platform.OS === 'web' ? <WebSignIn /> : <NativeSignIn />;
}

// ---------------------------------------------------------------------------
// Web — OAuth via expo-auth-session (redirect flow)
// ---------------------------------------------------------------------------

function WebSignIn() {
  const { completeSignIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'google' | 'apple'>(null);

  const redirectUri = AuthSession.makeRedirectUri();
  const googleConfigured = !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const appleDiscovery = {
    authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
    tokenEndpoint: 'https://appleid.apple.com/auth/token',
  };

  const onApple = async () => {
    setError(null);
    setBusy('apple');
    try {
      const request = new AuthSession.AuthRequest({
        clientId: process.env.EXPO_PUBLIC_APPLE_WEB_CLIENT_ID,
        scopes: ['name', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
      });
      const result = await request.promptAsync(appleDiscovery);
      if (result.type === 'success') {
        const idToken = result.params.id_token;
        if (!idToken) throw new Error('Apple sign-in did not return an identity token.');
        const auth = await exchangeAuthToken('apple', { identityToken: idToken });
        await completeSignIn(auth);
      }
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SignInShell error={error}>
      {googleConfigured ? (
        <WebGoogleButton redirectUri={redirectUri} busy={busy} onError={setError} onBusy={setBusy} />
      ) : (
        <Text style={styles.configNote}>
          Google sign-in will appear once EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set in .env.
        </Text>
      )}
      <BrandButton
        label="Continue with Apple"
        variant="apple"
        onPress={onApple}
        loading={busy === 'apple'}
        disabled={!!busy}
        icon={<MaterialIcons name="apple" size={22} color={colors.white} />}
      />
    </SignInShell>
  );
}

// Google's OAuth hooks must only run when a client ID is configured, otherwise
// useIdTokenAuthRequest throws `invariantClientId` at render time.
function WebGoogleButton({
  redirectUri,
  busy,
  onError,
  onBusy,
}: {
  redirectUri: string;
  busy: null | 'google' | 'apple';
  onError: (message: string | null) => void;
  onBusy: (busy: null | 'google' | 'apple') => void;
}) {
  const { completeSignIn } = useAuth();
  const [, googleResponse, googlePrompt] = useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
  });

  useEffect(() => {
    if (!googleResponse) return;
    let cancelled = false;
    (async () => {
      // Defer so we don't call setState synchronously within the effect.
      await Promise.resolve();
      if (cancelled) return;
      if (googleResponse.type !== 'success') {
        onBusy(null);
        return;
      }
      const idToken = googleResponse.params.id_token;
      if (!idToken) {
        onError('Google sign-in did not return an id token.');
        onBusy(null);
        return;
      }
      try {
        const auth = await exchangeAuthToken('google', { idToken });
        if (cancelled) return;
        await completeSignIn(auth);
      } catch (e) {
        if (!cancelled) {
          onError(messageOf(e));
          onBusy(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [googleResponse, completeSignIn, onError, onBusy]);

  const onGoogle = async () => {
    onError(null);
    onBusy('google');
    try {
      await googlePrompt();
    } catch (e) {
      onError(messageOf(e));
      onBusy(null);
    }
  };

  return (
    <BrandButton
      label="Continue with Google"
      variant="google"
      onPress={onGoogle}
      loading={busy === 'google'}
      disabled={!!busy}
      icon={<MaterialIcons name="g-mobiledata" size={22} color="#4285F4" />}
    />
  );
}

// ---------------------------------------------------------------------------
// Native — Google Sign-In SDK + Apple Authentication
// ---------------------------------------------------------------------------

function NativeSignIn() {
  const { completeSignIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'google' | 'apple'>(null);
  const isIos = Platform.OS === 'ios';

  const run = async (kind: 'google' | 'apple', fn: () => Promise<import('@/lib/types').AuthResponse>) => {
    setError(null);
    setBusy(kind);
    try {
      const auth = await fn();
      await completeSignIn(auth);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SignInShell error={error}>
      <BrandButton
        label="Continue with Google"
        variant="google"
        onPress={() => run('google', signInWithGoogleNative)}
        loading={busy === 'google'}
        disabled={!!busy}
        icon={<MaterialIcons name="g-mobiledata" size={22} color="#4285F4" />}
      />
      {isIos ? (
        <BrandButton
          label="Continue with Apple"
          variant="apple"
          onPress={() => run('apple', signInWithAppleNative)}
          loading={busy === 'apple'}
          disabled={!!busy}
          icon={<MaterialIcons name="apple" size={22} color={colors.white} />}
        />
      ) : null}
      {!isIos ? (
        <Text style={styles.androidNote}>
          Sign in with Apple isn’t available on this device yet.
        </Text>
      ) : null}
    </SignInShell>
  );
}

// ---------------------------------------------------------------------------
// Shared shell
// ---------------------------------------------------------------------------

function SignInShell({ error, children }: { error: string | null; children: React.ReactNode }) {
  return (
    <View style={styles.screen}>
      <Toast message={error} kind="error" onHide={() => undefined} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <BrandMark />
        </View>
        <Text style={styles.title}>Create beautiful QR codes</Text>
        <Text style={styles.subtitle}>
          Turn any link into a scannable, branded QR code — and keep them synced across your devices.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in to continue</Text>
          <View style={styles.buttons}>{children}</View>
          <View style={styles.divider} />
          <Text style={styles.legal}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
    gap: spacing.lg,
  },
  brand: { alignItems: 'center', marginBottom: spacing.lg },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  cardTitle: { ...typography.subheading, color: colors.text, textAlign: 'center' },
  buttons: { gap: spacing.md },
  divider: { height: 1, backgroundColor: colors.border },
  legal: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  androidNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  configNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
