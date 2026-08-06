/**
 * The theme as plain colour strings.
 *
 * The same values as the CSS variables in src/global.css, which is where the
 * reasoning behind them lives - including why the light and dark primaries are
 * different shades of the brand teal. Change one, change both.
 *
 * Components should prefer the Tailwind class names (`bg-primary`,
 * `text-muted-foreground`). This file is for the places that take a colour
 * rather than a class name: navigation, the status bar, native components with
 * colour props, and src/constants/theme.ts.
 */

import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

/** rgb(35, 170, 172). The primary in dark mode, and --chart-1 in both. */
export const BRAND_TEAL = 'hsl(181 66% 41%)';

export const THEME = {
  light: {
    background: 'hsl(180 30% 99%)',
    foreground: 'hsl(196 28% 16%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(196 28% 16%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(196 28% 16%)',
    primary: 'hsl(181 66% 29%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(180 30% 95%)',
    secondaryForeground: 'hsl(194 30% 22%)',
    muted: 'hsl(180 28% 96%)',
    mutedForeground: 'hsl(196 14% 40%)',
    accent: 'hsl(181 40% 92%)',
    accentForeground: 'hsl(193 45% 22%)',
    destructive: 'hsl(352 58% 45%)',
    destructiveForeground: 'hsl(0 0% 100%)',
    border: 'hsl(185 22% 88%)',
    input: 'hsl(185 22% 85%)',
    ring: 'hsl(181 66% 29%)',
    radius: '0.875rem',
    chart1: BRAND_TEAL,
    chart2: 'hsl(196 55% 42%)',
    chart3: 'hsl(168 45% 38%)',
    chart4: 'hsl(210 45% 52%)',
    chart5: 'hsl(30 52% 55%)',
  },
  dark: {
    background: 'hsl(196 30% 8%)',
    foreground: 'hsl(180 18% 94%)',
    card: 'hsl(196 26% 11%)',
    cardForeground: 'hsl(180 18% 94%)',
    popover: 'hsl(196 26% 11%)',
    popoverForeground: 'hsl(180 18% 94%)',
    primary: BRAND_TEAL,
    primaryForeground: 'hsl(192 50% 8%)',
    secondary: 'hsl(196 22% 17%)',
    secondaryForeground: 'hsl(180 16% 92%)',
    muted: 'hsl(196 22% 16%)',
    mutedForeground: 'hsl(188 14% 68%)',
    accent: 'hsl(194 26% 22%)',
    accentForeground: 'hsl(180 16% 92%)',
    destructive: 'hsl(352 55% 48%)',
    destructiveForeground: 'hsl(0 0% 100%)',
    border: 'hsl(196 20% 20%)',
    input: 'hsl(196 20% 24%)',
    ring: BRAND_TEAL,
    radius: '0.875rem',
    chart1: 'hsl(181 62% 55%)',
    chart2: 'hsl(196 58% 58%)',
    chart3: 'hsl(168 45% 52%)',
    chart4: 'hsl(210 50% 64%)',
    chart5: 'hsl(30 55% 62%)',
  },
} as const;

/**
 * The same palette shaped for navigation, so headers and screen backgrounds
 * match what `bg-background` paints. Passed to `ThemeProvider` in
 * src/app/_layout.tsx.
 */
export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
