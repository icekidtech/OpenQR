import { Platform } from 'react-native';

/**
 * OpenQR design system — a clean, friendly look inspired by chowdeck.com:
 * vibrant green primary, white surfaces, near-black text, rounded-2xl cards
 * and pill buttons.
 */

export const colors = {
  primary: '#08A045',
  primaryDark: '#067A35',
  primaryLight: '#E6F7EC',
  background: '#FFFFFF',
  surface: '#F7F7F5',
  surfaceAlt: '#F0F0EC',
  text: '#161616',
  textSecondary: '#5C5C56',
  textMuted: '#8A8A82',
  border: '#E8E8E2',
  borderStrong: '#D6D6CE',
  white: '#FFFFFF',
  danger: '#E5484D',
  dangerLight: '#FDECEC',
  success: '#08A045',
  successLight: '#E6F7EC',
  warning: '#F5A623',
  warningLight: '#FEF3E2',
  overlay: 'rgba(0, 0, 0, 0.5)',
  qrBlack: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  pill: 999,
} as const;

export const fonts = Platform.select({
  ios: {
    sans: 'System',
    mono: 'Menlo',
  },
  android: {
    sans: 'sans-serif',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    mono: 'monospace',
  },
}) as { sans: string; mono: string };

export const typography = {
  display: { fontSize: 34, fontWeight: '800' as const, lineHeight: 40 },
  title: { fontSize: 28, fontWeight: '800' as const, lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  subheading: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  captionStrong: { fontSize: 13, fontWeight: '700' as const, lineHeight: 18 },
  button: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22 },
} as const;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
    default: {},
  }),
  pop: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  }),
} as const;

export type ThemeColors = typeof colors;
export type ThemeSpacing = typeof spacing;
export type ThemeRadius = typeof radius;
