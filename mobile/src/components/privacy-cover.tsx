// The cover that goes over the app on its way out of the foreground.
//
// Issue #136: iOS photographs the app as it leaves the foreground, shows that
// picture as the card in the task switcher, and keeps it in the app's Snapshots
// directory on disk. unlock-gate.tsx re-locks on 'background', but that is the
// same moment the photograph is taken - a state change, a re-render and a
// native view update all have to land inside that window, and they do not
// reliably do it. What is left in the switcher, and on disk, is the journal.
//
// This is deliberately not part of the gate's state machine. It is mounted for
// the life of the app, it holds one boolean, and it flips on 'inactive', which
// iOS sends when the multitasking view begins to appear - earlier than
// 'background', so the re-render gets a longer run at the same race. Keeping it
// separate is what makes 'inactive' safe to use at all: the gate must not
// re-lock on 'inactive', because the OS's own unlock sheet raises that event
// too and locking on it would fight the prompt it just opened.
//
// Two things this is not:
//
//   - It is not a guarantee. The race is shorter, not gone. The version with no
//     race puts a native overlay on the UIWindow from
//     applicationWillResignActive, which means a config plugin and a
//     development build. #136 should stay open until someone has looked at the
//     switcher on a real phone.
//   - It is not Android's answer. Android does not raise 'inactive', and its
//     recents thumbnail is controlled by FLAG_SECURE rather than by anything
//     drawn in JavaScript. Covering on 'background' there is better than
//     nothing and no more than that.

import { useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';

import { isUnlockPromptOnScreen } from '@/lib/auth/unlock';

export function PrivacyCover() {
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    // Web has no task switcher to hide from, and per db/database.ts no journal
    // data to hide.
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        setCovered(false);
        return;
      }

      // Nothing else is worth reacting to: 'unknown' and 'extension' are not
      // the app being put away.
      if (next !== 'inactive' && next !== 'background') return;

      // Stay out of the way while the OS's unlock sheet is up. iOS reports that
      // sheet as the app going inactive as well, and covering for it risks the
      // worst outcome available here - there are reports of the matching
      // 'active' never arriving after an LAContext prompt, which would leave an
      // opaque view sitting over the lock screen with no button underneath it
      // and no way back. Skipping leaks nothing: the sheet only ever opens over
      // the lock screen, which has no journal on it to photograph.
      if (isUnlockPromptOnScreen()) return;

      setCovered(true);
    });

    return () => subscription.remove();
  }, []);

  if (!covered) return null;

  return (
    <View
      testID="privacy-cover"
      // A flat fill rather than a blur of what is underneath: a blurred page of
      // someone's handwriting is still recognisably their page.
      className="bg-background absolute inset-0"
      // If this ever does get stranded, taps should still reach the app rather
      // than land on an invisible wall.
      pointerEvents="none"
    />
  );
}
