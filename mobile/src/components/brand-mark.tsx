import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/theme';

export type BrandMarkProps = {
  size?: 'sm' | 'lg';
  showWordmark?: boolean;
};

export function BrandMark({ size = 'lg', showWordmark = true }: BrandMarkProps) {
  const box = size === 'lg' ? 64 : 40;
  const icon = size === 'lg' ? 34 : 22;
  return (
    <View style={styles.row}>
      <View style={[styles.box, { width: box, height: box, borderRadius: size === 'lg' ? radius['2xl'] : radius.lg }]}>
        <MaterialIcons name="qr-code" size={icon} color={colors.white} />
      </View>
      {showWordmark ? (
        <View>
          <Text style={styles.wordmark}>OpenQR</Text>
          <Text style={styles.tagline}>QR codes, made simple</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  box: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  wordmark: { ...typography.title, color: colors.text },
  tagline: { ...typography.caption, color: colors.textSecondary },
});
