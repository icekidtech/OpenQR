import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { QrPreview } from '@/components/qr-preview';
import { api } from '@/lib/api';
import { colors, radius, shadow, spacing, typography } from '@/theme';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LibraryScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['qrcodes'],
    queryFn: () => api.listQRCodes(),
  });

  return (
    <View style={styles.screen}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <EmptyState
            icon="error-outline"
            title="Couldn’t load your library"
            message="Check your connection and try again."
            action={
              <Pressable style={styles.retry} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            }
          />
        </View>
      ) : !data || data.length === 0 ? (
        <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
          <EmptyState
            icon="qr-code-2"
            title="No QR codes yet"
            message="Create your first QR code from the Create tab — it’ll show up here."
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          <Text style={styles.count}>{data.length} saved QR code{data.length === 1 ? '' : 's'}</Text>
          <View style={styles.grid}>
            {data.map((qr) => {
              const settings = qr.settings ?? {};
              return (
                <Pressable
                  key={qr.id}
                  style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
                  onPress={() => router.push(`/qr/${qr.id}`)}
                >
                  <View style={styles.previewWrap}>
                    <QrPreview
                      value={qr.url}
                      size={120}
                      color={(settings as { fgColor?: string }).fgColor ?? '#000000'}
                      backgroundColor={(settings as { bgColor?: string }).bgColor ?? '#FFFFFF'}
                      ecl={(settings as { ecl?: 'L' | 'M' | 'Q' | 'H' }).ecl ?? 'M'}
                      quietZone={4}
                      gradient={
                        (settings as { gradient?: { colors: [string, string] } | null }).gradient ?? null
                      }
                      logo={
                        (settings as { logo?: string | null }).logo ? { uri: (settings as { logo: string }).logo } : null
                      }
                    />
                  </View>
                  <View style={styles.meta}>
                    <Text style={styles.label} numberOfLines={1}>
                      {qr.label ?? 'Untitled QR code'}
                    </Text>
                    <Text style={styles.url} numberOfLines={1}>
                      {qr.url}
                    </Text>
                    <Text style={styles.date}>{formatDate(qr.createdAt)}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  count: { ...typography.captionStrong, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  pressed: { opacity: 0.85 },
  previewWrap: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meta: { flex: 1, gap: 2 },
  label: { ...typography.bodyStrong, color: colors.text },
  url: { ...typography.caption, color: colors.textSecondary },
  date: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  retry: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  retryText: { ...typography.button, color: colors.white },
});
