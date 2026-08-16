import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { QrPreview } from '@/components/qr-preview';
import { Toast } from '@/components/toast';
import { api } from '@/lib/api';
import { colors, radius, shadow, spacing, typography } from '@/theme';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function BatchDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['batch', id],
    queryFn: () => api.listQRCodes(id),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteBatch(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batches'] });
      router.back();
    },
    onError: (e) => setToast({ message: messageOf(e), kind: 'error' }),
  });

  const confirmDelete = () => {
    Alert.alert('Delete batch?', 'This will also delete all its QR codes.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Toast message={toast?.message ?? null} kind={toast?.kind ?? 'success'} onHide={() => setToast(null)} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name ?? 'Batch'}
          </Text>
        </View>
        <Pressable onPress={confirmDelete} style={styles.delete} hitSlop={8}>
          <MaterialIcons name="delete-outline" size={24} color={colors.danger} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn’t load this batch.</Text>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={styles.center}>
          <EmptyState icon="layers" title="No QR codes in this batch" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.count}>{data.length} QR code{data.length === 1 ? '' : 's'}</Text>
          <View style={styles.list}>
            {data.map((qr, index) => {
              const settings = qr.settings ?? {};
              return (
                <Pressable
                  key={qr.id}
                  style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
                  onPress={() => router.push(`/qr/${qr.id}`)}
                >
                  <Text style={styles.index}>#{index + 1}</Text>
                  <View style={styles.previewWrap}>
                    <QrPreview
                      value={qr.url}
                      size={72}
                      color={(settings as { fgColor?: string }).fgColor ?? '#000000'}
                      backgroundColor={(settings as { bgColor?: string }).bgColor ?? '#FFFFFF'}
                      ecl={(settings as { ecl?: 'L' | 'M' | 'Q' | 'H' }).ecl ?? 'M'}
                      quietZone={0}
                      gradient={(settings as { gradient?: { colors: [string, string] } | null }).gradient ?? null}
                      logo={(settings as { logo?: string | null }).logo ? { uri: (settings as { logo: string }).logo } : null}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.label} numberOfLines={1}>
                      {qr.label ?? `QR code ${index + 1}`}
                    </Text>
                    <Text style={styles.url} numberOfLines={2}>
                      {qr.url}
                    </Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { padding: spacing.xs },
  headerTitle: { ...typography.subheading, color: colors.text },
  delete: { padding: spacing.xs },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  count: { ...typography.captionStrong, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  list: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pressed: { opacity: 0.85 },
  index: { ...typography.captionStrong, color: colors.textMuted, minWidth: 32 },
  previewWrap: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  label: { ...typography.bodyStrong, color: colors.text },
  url: { ...typography.caption, color: colors.textSecondary },
  errorText: { ...typography.body, color: colors.textSecondary },
});
