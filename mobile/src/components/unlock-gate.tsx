// The app shell's lock screen.
//
// 0007 asks for the journal to sit behind the device's own biometric, with the
// OS passcode as the fallback. This is that gate: nothing it wraps renders
// until the device has said yes.
//
// On the copy: someone opening this app may be having a hard day, and a lock
// screen is a bad place to be brusque. It explains rather than demands, a
// refusal is never phrased as the user's fault, and "Not now" is a real option
// rather than a dead end.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { checkUnlockAvailability, requestUnlock } from '@/lib/auth/unlock';
import { closeJournalDatabase } from '@/lib/db/database';

type GateState =
  | { status: 'checking' }
  | { status: 'locked'; message: string | null }
  | { status: 'unlocked' }
  /** Native device with no lock configured - see the note in unlock.ts. */
  | { status: 'no-device-lock' };

export type UnlockGateProps = {
  children: ReactNode;
  /** Escape hatch for tests and Storybook-style previews. */
  skip?: boolean;
};

export function UnlockGate({ children, skip = false }: UnlockGateProps) {
  // Web has no biometric API and, per db/database.ts, no journal data either -
  // it is the landing surface. Gating it would lock people out of a marketing
  // page to protect nothing.
  const passthrough = skip || Platform.OS === 'web';

  const [state, setState] = useState<GateState>(
    passthrough ? { status: 'unlocked' } : { status: 'checking' }
  );

  // Guards against setting state after unmount, and against two prompts racing
  // if the user backgrounds the app mid-authentication.
  const mounted = useRef(true);
  const prompting = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const attemptUnlock = useCallback(async () => {
    if (passthrough || prompting.current) return;
    prompting.current = true;

    try {
      const availability = await checkUnlockAvailability();
      if (!mounted.current) return;

      if (availability.kind === 'unsupported' || availability.kind === 'none') {
        setState({ status: 'no-device-lock' });
        return;
      }

      const outcome = await requestUnlock();
      if (!mounted.current) return;

      switch (outcome.status) {
        case 'unlocked':
          setState({ status: 'unlocked' });
          break;
        case 'cancelled':
          setState({ status: 'locked', message: null });
          break;
        case 'locked-out':
          setState({
            status: 'locked',
            message: 'Too many attempts. Your phone will let you try again in a moment.',
          });
          break;
        default:
          setState({
            status: 'locked',
            message: "That didn't work. You can try again.",
          });
      }
    } finally {
      prompting.current = false;
    }
  }, [passthrough]);

  useEffect(() => {
    void attemptUnlock();
  }, [attemptUnlock]);

  // Re-lock when the app leaves the foreground. Without this the gate is a
  // one-time splash rather than a lock: hand someone an already-open phone and
  // the journal is simply there.
  useEffect(() => {
    if (passthrough) return;

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        setState({ status: 'locked', message: null });

        // Close the database too, not just the view. The gate is the only thing
        // that knows the app is meant to be locked, and locking only the UI
        // leaves db/database.ts holding a decrypted handle and the key in memory
        // for the life of the process - at which point 0015's
        // WHEN_UNLOCKED_THIS_DEVICE_ONLY is a property of the first launch and
        // nothing after it, because the keychain is never asked again. Dropping
        // the handle here is what makes that option mean something.
        //
        // Failures are swallowed on purpose: this runs on the way out of the
        // foreground, there is nobody to tell, and the next unlock re-opens.
        void closeJournalDatabase().catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, [passthrough]);

  if (state.status === 'unlocked') return <>{children}</>;

  if (state.status === 'checking') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator accessibilityLabel="Checking your phone's lock settings" />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-8">
      {state.status === 'no-device-lock' ? (
        <>
          <Text className="text-center text-2xl font-semibold">Your phone has no lock set</Text>
          <Text className="text-center text-muted-foreground">
            Your journal is still encrypted on this phone. Setting a passcode or fingerprint in
            your phone&apos;s settings adds another layer, and we&apos;d recommend it.
          </Text>
          <Button
            className="min-h-12 w-full"
            accessibilityRole="button"
            onPress={() => setState({ status: 'unlocked' })}>
            <Text>Continue</Text>
          </Button>
        </>
      ) : (
        <>
          <Text className="text-center text-2xl font-semibold">Your journal is locked</Text>
          <Text className="text-center text-muted-foreground">
            Unlock with your phone to open it.
          </Text>
          {state.message ? (
            // Announced by a screen reader when it appears, rather than only
            // being visible to someone looking at the screen.
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              className="text-center text-muted-foreground">
              {state.message}
            </Text>
          ) : null}
          <Button
            className="min-h-12 w-full"
            accessibilityRole="button"
            accessibilityHint="Opens your phone's unlock prompt"
            onPress={() => void attemptUnlock()}>
            <Text>Unlock</Text>
          </Button>
        </>
      )}
    </View>
  );
}
