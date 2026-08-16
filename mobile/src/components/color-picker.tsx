import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '@/theme';

export const PRESET_COLORS = [
  '#000000',
  '#161616',
  '#08A045',
  '#067A35',
  '#1B6EF3',
  '#7C3AED',
  '#E5484D',
  '#F5A623',
  '#EC4899',
  '#0EA5E9',
] as const;

export type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  /** When true, an extra "transparent" swatch is offered (for the background). */
  allowTransparent?: boolean;
};

export function ColorPicker({ value, onChange, allowTransparent }: ColorPickerProps) {
  const swatches = allowTransparent
    ? (['#FFFFFF', ...PRESET_COLORS] as string[])
    : ([...PRESET_COLORS] as string[]);

  return (
    <View style={styles.row}>
      {swatches.map((c) => {
        const selected = value.toUpperCase() === c.toUpperCase();
        const isWhite = c.toUpperCase() === '#FFFFFF';
        return (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`Color ${c}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(c)}
            style={[
              styles.swatchOuter,
              selected && { borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: c },
                isWhite && { borderWidth: 1, borderColor: colors.borderStrong },
              ]}
            >
              {selected ? (
                <MaterialIcons
                  name="check"
                  size={14}
                  color={isWhite ? colors.primary : colors.white}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatchOuter: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 2,
  },
  swatch: {
    flex: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
