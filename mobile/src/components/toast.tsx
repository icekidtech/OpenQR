import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/theme';

export type ToastProps = {
  message: string | null;
  kind?: 'success' | 'error';
  onHide?: () => void;
  duration?: number;
};

/** A small animated banner that auto-dismisses. */
export function Toast({ message, kind = 'success', onHide, duration = 2200 }: ToastProps) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHide?.());
    }, duration);
    return () => clearTimeout(timer);
  }, [message, opacity, onHide, duration]);

  if (!message) return null;

  const isError = kind === 'error';

  return (
    <Animated.View
      style={[styles.banner, { backgroundColor: isError ? colors.danger : colors.text, opacity }]}
    >
      <MaterialIcons name={isError ? 'error-outline' : 'check-circle'} size={18} color={colors.white} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    zIndex: 100,
    ...({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    } as object),
  },
  text: { ...typography.captionStrong, color: colors.white, flex: 1 },
});
