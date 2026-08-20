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
import { AccessibilityInfo, ActivityIndicator, AppState, Platform, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { checkUnlockAvailability, requestUnlock } from '@/lib/auth/unlock';
import { closeJournalDatabase } from '@/lib/db/database';

type GateState =
  | { status: 'checking' }
  | { status: 'locked'; message: string | null }
  | {
      status: 'unlocked';
      /**
       * True when the user got here by pressing Continue on the no-device-lock
       * screen rather than by unlocking. Remembered because the re-lock below
       * has to know: sending this user to "unlock with your phone" would be a
       * lie about the phone in their hand.
       */
      viaNoDeviceLock?: boolean;
    }
  /** Native device with no lock configured - see the note in unlock.ts. */
  | { status: 'no-device-lock' };

/**
 * Shown when we could not ask the device what lock it has, rather than when the
 * user failed a prompt. It does not guess at the cause, because it cannot know
 * it, and it offers another go because a transient failure is the one case the
 * user can do anything about.
 */
const COULD_NOT_CHECK = "We couldn't check your phone's lock. You can try again.";

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

    // No try/catch here on purpose. lib/auth/unlock.ts turns a native module
    // that is missing or throwing into an 'unavailable' outcome, so everything
    // this function has to handle arrives as a value. Letting an exception
    // reach here instead would leave the gate on 'checking' for ever: an
    // unlabelled spinner, no button, and no way to the journal, on every
    // launch - which is what running in Expo Go used to look like.
    try {
      const availability = await checkUnlockAvailability();
      if (!mounted.current) return;

      if (availability.kind === 'unavailable') {
        setState({ status: 'locked', message: COULD_NOT_CHECK });
        return;
      }

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
        case 'no-device-lock':
          // The lock went away between the check above and the prompt, or the
          // OS disagreed with the check. Either way there is nothing to retry.
          setState({ status: 'no-device-lock' });
          break;
        case 'unavailable':
          setState({ status: 'locked', message: COULD_NOT_CHECK });
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

  // The AppState listener is subscribed once and would otherwise close over the
  // state as it was at subscription time. A ref, rather than re-subscribing on
  // every state change.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  // Re-lock when the app leaves the foreground. Without this the gate is a
  // one-time splash rather than a lock: hand someone an already-open phone and
  // the journal is simply there.
  useEffect(() => {
    if (passthrough) return;

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        // Only ever the resume half of the no-device-lock case below; every
        // other path leaves a screen with a button on it rather than a
        // spinner, and attemptUnlock's own guard covers a check still in
        // flight.
        if (latest.current.status === 'checking') void attemptUnlock();
        return;
      }

      if (next !== 'background') return;

      const current = latest.current;

      // Only the unlocked state is re-locked. Anything already showing a lock
      // screen is left exactly as it was, because overwriting it threw the
      // message away: someone who backgrounded the app during a lockout came
      // back to a bare "Your journal is locked" with nothing left to say why
      // their last attempt had not worked.
      if (current.status === 'unlocked') {
        // Someone who came through the no-device-lock screen has no lock on
        // their phone, so "Unlock with your phone to open it" would be false
        // and its button could only fail - two taps and the same screen again,
        // on every single resume. Re-check instead of assuming: that screen
        // recommends setting a passcode, and going to Settings to do it is
        // precisely what backgrounds the app.
        setState(
          current.viaNoDeviceLock ? { status: 'checking' } : { status: 'locked', message: null }
        );
      }

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
    });

    return () => subscription.remove();
  }, [passthrough, attemptUnlock]);

  const failureMessage = state.status === 'locked' ? state.message : null;

  // accessibilityLiveRegion below is Android-only, which leaves the message
  // silent on iOS - where Face ID is, so where a refusal is most likely to need
  // explaining. This is the iOS half of the same job. It is a no-op when no
  // screen reader is running.
  useEffect(() => {
    if (Platform.OS !== 'ios' || !failureMessage) return;
    AccessibilityInfo.announceForAccessibility(failureMessage);
  }, [failureMessage]);

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
        // PLACEHOLDER, not a decision. 0018 is open: whether the app refuses to
        // open, explains and continues, nudges once, or hands the user a
        // shortcut into their phone's settings needs a named owner, and this
        // screen is only the least-bad of those chosen so something true could
        // be said in the meantime. Whoever settles 0018 should expect to
        // replace all of it - the copy, the Continue button, and the tests
        // covering them, which are written as "what the placeholder does"
        // rather than as a requirement.
        <>
          {/* variant h1 for the heading role and aria-level, as on the landing
              screen; the classes walk its size and weight back down. Without a
              variant this is a paragraph of text that happens to be large, and
              a screen reader has no heading to jump to on the one screen where
              there is nothing else to orient by. */}
          <Text variant="h1" className="text-center text-2xl font-semibold">
            Your phone has no lock set
          </Text>
          <Text className="text-center text-muted-foreground">
            Your journal is still encrypted on this phone. Setting a passcode or fingerprint in
            your phone&apos;s settings adds another layer, and we&apos;d recommend it.
          </Text>
          <Button
            className="min-h-12 w-full"
            accessibilityRole="button"
            onPress={() => setState({ status: 'unlocked', viaNoDeviceLock: true })}>
            <Text>Continue</Text>
          </Button>
        </>
      ) : (
        <>
          <Text variant="h1" className="text-center text-2xl font-semibold">
            Your journal is locked
          </Text>
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
