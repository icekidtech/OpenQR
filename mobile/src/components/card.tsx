import { StyleSheet, View } from 'react-native';
import type { PropsWithChildren, ReactNode } from 'react';

import { colors, radius, shadow, spacing } from '@/theme';

export type CardProps = PropsWithChildren<{
  padded?: boolean;
  style?: object;
  header?: ReactNode;
}>;

export function Card({ children, padded = true, style, header }: CardProps) {
  return (
    <View style={[styles.card, shadow.card, style]}>
      {header ? <View style={styles.header}>{header}</View> : null}
      <View style={padded ? styles.padded : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  padded: {
    padding: spacing.lg,
  },
});
