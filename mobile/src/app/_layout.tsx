// The Tailwind stylesheet has to be imported from the root layout so the styles
// exist before anything renders. Metro swaps this import for the compiled
// output; see metro.config.js.
import '@/global.css';

import { PortalHost } from '@rn-primitives/portal';
import { ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { PrivacyCover } from '@/components/privacy-cover';
import { UnlockGate } from '@/components/unlock-gate';
import { NAV_THEME } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={NAV_THEME[colorScheme === 'dark' ? 'dark' : 'light']}>
      <AnimatedSplashOverlay />
      {/* Inside ThemeProvider so the lock screen is themed like everything
          else, and around AppTabs rather than around the whole tree so it
          gates the app without gating the splash overlay above it. */}
      <UnlockGate>
        <AppTabs />
      </UnlockGate>
      {/* Where everything rendered through a Portal ends up - dialogs, dropdown
          menus, tooltips, popovers. It has to be the last child of the
          providers to sit on top of the rest of the tree.
          https://reactnativereusables.com/docs/installation/manual */}
      <PortalHost />
      {/* Last of all, so that what it hides from the task switcher includes
          anything a dialog put on top through the portal above. */}
      <PrivacyCover />
    </ThemeProvider>
  );
}
