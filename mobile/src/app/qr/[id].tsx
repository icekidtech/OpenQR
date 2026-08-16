import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { ElementRef } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand-button';
import { Card } from '@/components/card';
import { QrPreview } from '@/components/qr-preview';
import { Toast } from '@/components/toast';
import { api } from '@/lib/api';
import { captureQrPng, copyText, downloadDataUri, pngDataUrlWeb, savePngToLibrary, sharePng, shareSvgString, svgString } from '@/lib/qr';
import type { QRSettings } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function QrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const captureRef = useRef<ElementRef<typeof View>>(null);
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);

  const { data: qr, isLoading, isError } = useQuery({
    queryKey: ['qrcode', id],
    queryFn: () => api.getQRCode(id!),
    enabled: !!id,
  });

  const settings: QRSettings = (qr?.settings as QRSettings) ?? {
    fgColor: '#000000',
    bgColor: '#FFFFFF',
    ecl: 'M',
    quietZone: 8,
    gradient: null,
    logo: null,
  };

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteQRCode(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['qrcodes'] });
      router.back();
    },
    onError: (e) => setToast({ message: messageOf(e), kind: 'error' }),
  });

  const confirmDelete = () => {
    Alert.alert('Delete QR code?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  const showToast = (message: string, kind: 'success' | 'error' = 'success') => setToast({ message, kind });

  const downloadPng = async () => {
    if (!qr) return;
    try {
      if (Platform.OS === 'web') {
        const dataUri = await pngDataUrlWeb(qr.url, settings);
        downloadDataUri(dataUri, `openqr-${qr.id}.png`);
        showToast('Downloaded');
      } else {
        if (!captureRef.current) throw new Error('Preview is not ready yet.');
        const uri = await captureQrPng(captureRef.current);
        await savePngToLibrary(uri);
        showToast('Saved to Photos');
      }
    } catch (e) {
      showToast(messageOf(e), 'error');
    }
  };

  const share = async () => {
    if (!qr) return;
    try {
      if (Platform.OS === 'web') {
        const dataUri = await pngDataUrlWeb(qr.url, settings);
        downloadDataUri(dataUri, `openqr-${qr.id}.png`);
        showToast('Downloaded');
      } else {
        if (!captureRef.current) throw new Error('Preview is not ready yet.');
        const uri = await captureQrPng(captureRef.current);
        await sharePng(uri);
      }
    } catch (e) {
      showToast(messageOf(e), 'error');
    }
  };

  const copySvg = async () => {
    if (!qr) return;
    try {
      const svg = await svgString(qr.url, settings);
      if (Platform.OS === 'web') {
        await copyText(svg);
        showToast('SVG copied to clipboard');
      } else {
        await shareSvgString(svg, `openqr-${qr.id}`);
      }
    } catch (e) {
      showToast(messageOf(e), 'error');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !qr) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Couldn’t load this QR code.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Toast message={toast?.message ?? null} kind={toast?.kind ?? 'success'} onHide={() => setToast(null)} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {qr.label ?? 'QR code'}
          </Text>
        </View>
        <Pressable onPress={confirmDelete} style={styles.delete} hitSlop={8}>
          <MaterialIcons name="delete-outline" size={24} color={colors.danger} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card padded={false}>
          <View
            ref={captureRef}
            collapsable={false}
            style={[styles.stage, { backgroundColor: settings.bgColor === '#FFFFFF' ? colors.surface : settings.bgColor }]}
          >
            <View style={styles.previewInner}>
              <QrPreview
                value={qr.url}
                size={260}
                color={settings.fgColor}
                backgroundColor={settings.bgColor}
                ecl={settings.ecl}
                quietZone={settings.quietZone}
                gradient={settings.gradient ?? null}
                logo={settings.logo ? { uri: settings.logo } : null}
              />
            </View>
          </View>
          <View style={styles.info}>
            <Text style={styles.url} selectable>
              {qr.url}
            </Text>
            <Text style={styles.meta}>
              {settings.ecl} error correction · created {new Date(qr.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </Card>

        <BrandButton label="Save to Photos" onPress={downloadPng} />
        <View style={styles.actionRow}>
          <Pressable style={styles.action} onPress={share}>
            <MaterialIcons name="share" size={20} color={colors.text} />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={copySvg}>
            <MaterialIcons name="code" size={20} color={colors.text} />
            <Text style={styles.actionText}>SVG</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewInner: {
    backgroundColor: colors.white,
    borderRadius: radius['2xl'],
    padding: spacing.lg,
    ...(shadow.pop as object),
  },
  info: { padding: spacing.lg, gap: spacing.xs },
  url: { ...typography.bodyStrong, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  actionText: { ...typography.button, color: colors.text },
  errorText: { ...typography.body, color: colors.textSecondary },
  backBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  backBtnText: { ...typography.button, color: colors.white },
});
