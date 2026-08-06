/**
 * The palette and spacing scale the StyleSheet-based screens use, in light and
 * dark mode.
 *
 * `Colors` is derived from THEME rather than holding its own hex values, so the
 * screens still on StyleSheet - and the native tab bar - pick up the theme
 * instead of drifting from everything in src/components/ui/. There is one
 * palette, in src/global.css.
 *
 * New UI is better off with the Tailwind class names directly: `bg-background`,
 * `text-muted-foreground` and the rest. What is left here that has no Tailwind
 * equivalent is `Fonts` and `Spacing`.
 */

import { Platform } from 'react-native';

import { THEME } from '@/lib/theme';

export const Colors = {
  light: {
    text: THEME.light.foreground,
    background: THEME.light.background,
    backgroundElement: THEME.light.muted,
    backgroundSelected: THEME.light.accent,
    textSecondary: THEME.light.mutedForeground,
    link: THEME.light.primary,
  },
  dark: {
    text: THEME.dark.foreground,
    background: THEME.dark.background,
    backgroundElement: THEME.dark.muted,
    backgroundSelected: THEME.dark.accent,
    textSecondary: THEME.dark.mutedForeground,
    link: THEME.dark.primary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/**
 * How much room a screen has to leave at the top on web.
 *
 * Web does not get the native tab bar; app-tabs.web.tsx draws a floating header
 * instead, and it is absolutely positioned, so content scrolls underneath it
 * unless the screen pads for it. Nothing was: the header is 78px tall, and the
 * screens variously left 0, 16 or 64, which is how the logo ended up behind it.
 *
 * app-tabs.web.tsx sets this as the header's own height rather than letting it
 * come out of its padding, so the two cannot drift apart. Zero everywhere else,
 * where the tab bar is at the bottom and `BottomTabInset` above covers it.
 */
export const WebHeaderInset = Platform.select({ web: 78 }) ?? 0;

export const MaxContentWidth = 800;
