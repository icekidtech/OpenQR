import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme';

function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '?';
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts[1]?.[0] ?? '';
  return `${first}${second}`.toUpperCase();
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { data: qrcodes } = useQuery({
    queryKey: ['qrcodes'],
    queryFn: () => api.listQRCodes(),
  });

  const displayName = user?.name ?? user?.email ?? 'OpenQR user';
  const email = user?.email ?? 'No email on file';

  return (
    <View style={styles.screen}>
      <Card padded={false}>
        <View style={styles.profileHeader}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(user?.name, user?.email)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{qrcodes?.length ?? '—'}</Text>
            <Text style={styles.statLabel}>QR codes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>Free</Text>
            <Text style={styles.statLabel}>Plan</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Account</Text>
        <Row icon="verified-user" label="Signed in with" value="Google / Apple" />
        <Row icon="person-outline" label="Member since" value={user ? new Date(user.createdAt).toLocaleDateString() : '—'} />
      </Card>

      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        onPress={() => signOut()}
      >
        <MaterialIcons name="logout" size={20} color={colors.danger} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      <Text style={styles.footer}>OpenQR · v1.0.0</Text>
    </View>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <MaterialIcons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.lg },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { ...typography.title, color: colors.primaryDark },
  name: { ...typography.subheading, color: colors.text },
  email: { ...typography.caption, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg, gap: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  statValue: { ...typography.heading, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted },
  cardTitle: { ...typography.subheading, color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  rowValue: { ...typography.captionStrong, color: colors.text, maxWidth: '55%' },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  pressed: { opacity: 0.85 },
  signOutText: { ...typography.button, color: colors.danger },
  footer: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
