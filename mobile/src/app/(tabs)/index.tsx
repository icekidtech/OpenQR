import { useMutation } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import type { ElementRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand-button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ColorPicker } from '@/components/color-picker';
import { Field } from '@/components/field';
import { QrPreview } from '@/components/qr-preview';
import { Toast } from '@/components/toast';
import { api } from '@/lib/api';
import { captureQrPng, copyText, downloadDataUri, isValidUrl, normalizeUrl, pngDataUrlWeb, savePngToLibrary, sharePng, shareSvgString, svgString } from '@/lib/qr';
import type { Ecl, QRSettings } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';

const ECL_OPTIONS: { value: Ecl; label: string; hint: string }[] = [
  { value: 'L', label: 'L', hint: '7% recovery' },
  { value: 'M', label: 'M', hint: '15% recovery' },
  { value: 'Q', label: 'Q', hint: '25% recovery' },
  { value: 'H', label: 'H', hint: '30% recovery' },
];

const SIZE_PRESETS = [
  { label: 'Small', value: 180 },
  { label: 'Medium', value: 240 },
  { label: 'Large', value: 300 },
];

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function CreateScreen() {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [ecl, setEcl] = useState<Ecl>('M');
  const [quietZone, setQuietZone] = useState(8);
  const [size, setSize] = useState(240);
  const [gradientOn, setGradientOn] = useState(false);
  const [gradientEnd, setGradientEnd] = useState('#1B6EF3');
  const [logo, setLogo] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);
  const captureRef = useRef<ElementRef<typeof View>>(null);

  const settings: QRSettings = {
    fgColor,
    bgColor,
    ecl,
    quietZone,
    gradient: gradientOn ? { colors: [fgColor, gradientEnd] } : null,
    logo,
  };

  const normalizedUrl = normalizeUrl(url);
  const urlValid = isValidUrl(url);
  const canExport = urlValid;

  const showToast = (message: string, kind: 'success' | 'error' = 'success') => setToast({ message, kind });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.createQRCode({
        url: normalizedUrl,
        label: label.trim() || null,
        settings,
        format: 'png',
      }),
    onSuccess: () => showToast('Saved to your library'),
    onError: (e) => showToast(messageOf(e), 'error'),
  });

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast('Photo library permission is required to pick a logo.', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.base64) {
      const mime = asset.mimeType ?? 'image/png';
      setLogo(`data:${mime};base64,${asset.base64}`);
    } else if (asset.uri) {
      setLogo(asset.uri);
    }
  };

  const requirePreview = () => {
    if (!captureRef.current) throw new Error('Preview is not ready yet.');
    return captureRef.current;
  };

  const downloadPng = async () => {
    if (!canExport) return;
    try {
      if (Platform.OS === 'web') {
        const dataUri = await pngDataUrlWeb(normalizedUrl, settings);
        downloadDataUri(dataUri, 'openqr.png');
        showToast('Downloaded');
      } else {
        const uri = await captureQrPng(requirePreview());
        await savePngToLibrary(uri);
        showToast('Saved to Photos');
      }
    } catch (e) {
      showToast(messageOf(e), 'error');
    }
  };

  const share = async () => {
    if (!canExport) return;
    try {
      if (Platform.OS === 'web') {
        const dataUri = await pngDataUrlWeb(normalizedUrl, settings);
        downloadDataUri(dataUri, 'openqr.png');
        showToast('Downloaded');
      } else {
        const uri = await captureQrPng(requirePreview());
        await sharePng(uri);
      }
    } catch (e) {
      showToast(messageOf(e), 'error');
    }
  };

  const copySvg = async () => {
    if (!canExport) return;
    try {
      const svg = await svgString(normalizedUrl, settings);
      if (Platform.OS === 'web') {
        await copyText(svg);
        showToast('SVG copied to clipboard');
      } else {
        await shareSvgString(svg, `openqr-${Date.now()}`);
      }
    } catch (e) {
      showToast(messageOf(e), 'error');
    }
  };

  return (
    <View style={styles.screen}>
      <Toast
        message={toast?.message ?? null}
        kind={toast?.kind ?? 'success'}
        onHide={() => setToast(null)}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Preview */}
        <Card padded={false} style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Preview</Text>
            <Text style={styles.previewSubtitle}>{urlValid ? normalizedUrl : 'Enter a link to start'}</Text>
          </View>
          <View
            ref={captureRef}
            collapsable={false}
            style={[
              styles.previewStage,
              { backgroundColor: bgColor === '#FFFFFF' ? colors.surface : bgColor },
            ]}
          >
            <View style={styles.previewInner}>
              <QrPreview
                value={normalizedUrl || 'https://openqr.app'}
                size={size}
                color={fgColor}
                backgroundColor={bgColor}
                ecl={ecl}
                quietZone={quietZone}
                gradient={gradientOn ? { colors: [fgColor, gradientEnd] } : null}
                logo={logo ? { uri: logo } : null}
                logoSize={Math.max(24, Math.round(size * 0.18))}
              />
            </View>
          </View>
        </Card>

        {/* Link */}
        <Card>
          <Text style={styles.cardTitle}>Link</Text>
          <Field
            label="Destination URL"
            placeholder="https://example.com"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={url.length > 0 && !urlValid ? 'Enter a valid web address' : undefined}
          />
          <Field
            label="Label (optional)"
            placeholder="e.g. My website"
            value={label}
            onChangeText={setLabel}
          />
        </Card>

        {/* Design */}
        <Card>
          <Text style={styles.cardTitle}>Design</Text>

          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Colour</Text>
            <ColorPicker value={fgColor} onChange={setFgColor} />
          </View>

          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Background</Text>
            <ColorPicker value={bgColor} onChange={setBgColor} allowTransparent />
          </View>

          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Error correction</Text>
            <View style={styles.chipRow}>
              {ECL_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={`${opt.value} · ${opt.hint}`}
                  selected={ecl === opt.value}
                  onPress={() => setEcl(opt.value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Size</Text>
            <View style={styles.chipRow}>
              {SIZE_PRESETS.map((preset) => (
                <Chip
                  key={preset.value}
                  label={preset.label}
                  selected={size === preset.value}
                  onPress={() => setSize(preset.value)}
                />
              ))}
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderValue}>{size}px</Text>
              <Slider
                style={styles.slider}
                minimumValue={140}
                maximumValue={360}
                step={4}
                value={size}
                onValueChange={setSize}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />
            </View>
          </View>

          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Quiet zone</Text>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderValue}>{quietZone}px</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={32}
                step={4}
                value={quietZone}
                onValueChange={setQuietZone}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />
            </View>
          </View>

          <View style={styles.controlBlock}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.controlLabel}>Gradient</Text>
                <Text style={styles.controlHint}>Fade the QR modules into a second colour</Text>
              </View>
              <Switch
                value={gradientOn}
                onValueChange={setGradientOn}
                trackColor={{ false: colors.borderStrong, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
            {gradientOn ? (
              <View style={styles.gradientEnd}>
                <Text style={styles.controlLabel}>Gradient end colour</Text>
                <ColorPicker value={gradientEnd} onChange={setGradientEnd} />
              </View>
            ) : null}
          </View>
        </Card>

        {/* Logo */}
        <Card>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Logo</Text>
              <Text style={styles.controlHint}>Place your brand mark in the centre</Text>
            </View>
            {logo ? (
              <Pressable onPress={() => setLogo(null)} style={styles.removeLogo}>
                <MaterialIcons name="close" size={16} color={colors.danger} />
                <Text style={styles.removeLogoText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
          {logo ? (
            <View style={styles.logoPreviewWrap}>
              <View style={styles.logoPreview}>
                <QrPreview
                  value={normalizedUrl || 'https://openqr.app'}
                  size={96}
                  color={fgColor}
                  backgroundColor={bgColor}
                  ecl={ecl}
                  quietZone={0}
                  logo={{ uri: logo }}
                  logoSize={24}
                />
              </View>
            </View>
          ) : null}
          <BrandButton label="Choose logo" variant="secondary" onPress={pickLogo} />
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <BrandButton
            label={saveMutation.isPending ? 'Saving…' : 'Save to library'}
            onPress={() => urlValid && saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!urlValid}
          />
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.action, !canExport && styles.actionDisabled]}
              disabled={!canExport}
              onPress={downloadPng}
            >
              <MaterialIcons name="download" size={20} color={canExport ? colors.text : colors.textMuted} />
              <Text style={[styles.actionText, !canExport && styles.actionTextDisabled]}>PNG</Text>
            </Pressable>
            <Pressable
              style={[styles.action, !canExport && styles.actionDisabled]}
              disabled={!canExport}
              onPress={share}
            >
              <MaterialIcons name="share" size={20} color={canExport ? colors.text : colors.textMuted} />
              <Text style={[styles.actionText, !canExport && styles.actionTextDisabled]}>Share</Text>
            </Pressable>
            <Pressable
              style={[styles.action, !canExport && styles.actionDisabled]}
              disabled={!canExport}
              onPress={copySvg}
            >
              <MaterialIcons name="code" size={20} color={canExport ? colors.text : colors.textMuted} />
              <Text style={[styles.actionText, !canExport && styles.actionTextDisabled]}>SVG</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  previewCard: { backgroundColor: colors.background },
  previewHeader: { padding: spacing.lg, gap: 2 },
  previewTitle: { ...typography.subheading, color: colors.text },
  previewSubtitle: { ...typography.caption, color: colors.textMuted },
  previewStage: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  previewInner: {
    backgroundColor: colors.white,
    borderRadius: radius['2xl'],
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: { ...typography.subheading, color: colors.text, marginBottom: spacing.sm },
  controlBlock: { marginTop: spacing.lg, gap: spacing.sm },
  controlLabel: { ...typography.captionStrong, color: colors.text },
  controlHint: { ...typography.caption, color: colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  slider: { flex: 1, height: 40 },
  sliderValue: { ...typography.captionStrong, color: colors.textSecondary, minWidth: 48 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gradientEnd: { marginTop: spacing.md, gap: spacing.sm },
  removeLogo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  removeLogoText: { ...typography.captionStrong, color: colors.danger },
  logoPreviewWrap: { alignItems: 'center', marginVertical: spacing.lg },
  logoPreview: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
  },
  actions: { gap: spacing.md },
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
  actionDisabled: { opacity: 0.5 },
  actionText: { ...typography.button, color: colors.text },
  actionTextDisabled: { color: colors.textMuted },
});
