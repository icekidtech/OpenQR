import { forwardRef } from 'react';
import QRCode from 'react-native-qrcode-svg';
import type { ImageSourcePropType } from 'react-native';

export type Ecl = 'L' | 'M' | 'Q' | 'H';

export type QrPreviewProps = {
  value: string;
  size: number;
  color?: string;
  backgroundColor?: string;
  ecl?: Ecl;
  quietZone?: number;
  logo?: ImageSourcePropType | null;
  logoSize?: number;
  /** When set, the QR modules are rendered with a linear gradient. */
  gradient?: { colors: [string, string] } | null;
};

/**
 * Wrapper around react-native-qrcode-svg.
 *
 * Note: the underlying `toDataURL()` excludes the logo, so when a logo is
 * present we must capture the rendered view (react-native-view-shot) instead.
 */
export const QrPreview = forwardRef<unknown, QrPreviewProps>(function QrPreview(
  { value, size, color, backgroundColor, ecl, quietZone, logo, logoSize, gradient },
  ref,
) {
  const gradientProps =
    gradient && gradient.colors.length === 2
      ? {
          enableLinearGradient: true as const,
          linearGradient: gradient.colors,
          gradientDirection: ['0%', '0%', '100%', '100%'] as [string, string, string, string],
        }
      : {};

  const logoProps = logo
    ? {
        logo,
        logoSize: logoSize ?? Math.max(24, Math.round(size * 0.18)),
        logoBackgroundColor: backgroundColor ?? '#FFFFFF',
        logoMargin: 4,
        logoBorderRadius: 8,
      }
    : {};

  return (
    <QRCode
      ref={ref as never}
      value={value}
      size={size}
      color={color ?? '#000000'}
      backgroundColor={backgroundColor ?? '#FFFFFF'}
      ecl={ecl ?? 'M'}
      quietZone={quietZone ?? 8}
      {...gradientProps}
      {...logoProps}
    />
  );
});
