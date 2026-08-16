import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand-button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Toast } from '@/components/toast';
import { api } from '@/lib/api';
import { normalizeUrl } from '@/lib/qr';
import { DEFAULT_QR_SETTINGS } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BatchScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.listBatches(),
  });

  const urls = urlsText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const createMutation = useMutation({
    mutationFn: () =>
      api.createBatch({
        name: name.trim() || null,
        qrcodes: urls.map((u) => ({ url: normalizeUrl(u), settings: DEFAULT_QR_SETTINGS, format: 'png' })),
      }),
    onSuccess: () => {
      setName('');
      setUrlsText('');
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setToast({ message: 'Batch created', kind: 'success' });
    },
    onError: (e) => setToast({ message: messageOf(e), kind: 'error' }),
  });

  const canCreate = urls.length > 0;

  return (
    <View style={styles.screen}>
      <Toast message={toast?.message ?? null} kind={toast?.kind ?? 'success'} onHide={() => setToast(null)} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.cardTitle}>Create a batch</Text>
          <Field
            label="Batch name (optional)"
            placeholder="e.g. Menu QR codes"
            value={name}
            onChangeText={setName}
          />
          <Field
            label="One link per line"
            placeholder={'https://example.com/menu\nhttps://example.com/about'}
            value={urlsText}
            onChangeText={setUrlsText}
            multiline
            numberOfLines={6}
            style={styles.multiline}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>{urls.length} link{urls.length === 1 ? '' : 's'} ready</Text>
          <BrandButton
            label={createMutation.isPending ? 'Creating…' : `Generate batch (${urls.length})`}
            onPress={() => canCreate && createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!canCreate}
          />
        </Card>

        <Text style={styles.sectionTitle}>Your batches</Text>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          <EmptyState
            icon="error-outline"
            title="Couldn’t load batches"
            action={
              <Pressable style={styles.retry} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            }
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="layers"
            title="No batches yet"
            message="Generate several QR codes at once from a list of links."
          />
        ) : (
          <View style={styles.list}>
            {data.map((batch) => (
              <Pressable
                key={batch.id}
                style={({ pressed }) => [styles.batchCard, shadow.card, pressed && styles.pressed]}
                onPress={() => router.push(`/batch/${batch.id}`)}
              >
                <View style={styles.batchIcon}>
                  <MaterialIcons name="layers" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchName} numberOfLines={1}>
                    {batch.name ?? 'Untitled batch'}
                  </Text>
                  <Text style={styles.batchMeta}>
                    {batch.count} QR codes · {formatDate(batch.createdAt)}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  cardTitle: { ...typography.subheading, color: colors.text, marginBottom: spacing.sm },
  multiline: { textAlignVertical: 'top', minHeight: 140 },
  hint: { ...typography.caption, color: colors.textMuted },
  sectionTitle: {
    ...typography.captionStrong,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  list: { gap: spacing.md },
  batchCard: {
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
  batchIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchName: { ...typography.bodyStrong, color: colors.text },
  batchMeta: { ...typography.caption, color: colors.textMuted },
  retry: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  retryText: { ...typography.button, color: colors.white },
});
