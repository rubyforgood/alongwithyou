// The app lock.
//
// 0007 decided this: no username, no password, no in-app PIN of our own - the
// device's own biometric with the OS's passcode fallback, because it is a
// mechanism people already understand from every other app on their phone, and
// because "keep technology in a supporting role" rules out inventing a second
// one.
//
// Note what this is and is not. It gates the *app*, not the database key (see
// the long comment in db/key.ts for why those are deliberately separate). A
// locked app with an extractable key is a weaker guarantee than binding the key
// to biometric enrollment, and that is a trade taken knowingly there.

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type UnlockAvailability =
  /** A biometric is enrolled; the OS will offer the passcode as a fallback. */
  | { readonly kind: 'biometric' }
  /** No biometric, but a device passcode/pattern is set and can be prompted. */
  | { readonly kind: 'passcode' }
  /**
   * The device has no lock at all. There is nothing for us to prompt, and the
   * data is protected only by the fact that the file is encrypted with a key
   * sitting in an unlocked keystore.
   *
   * 0007 does not say what to do here, because it was written about lockout
   * rather than about a device with no lock screen. 0018 is the open record
   * for that gap: refuse to open, open with a plain warning, or send the user
   * to Settings is a product call with no owner yet, so this type surfaces the
   * case honestly rather than picking one silently.
   */
  | { readonly kind: 'none' }
  /** No supported hardware or platform - the web build, mainly. */
  | { readonly kind: 'unsupported' }
  /**
   * The check itself failed, so we do not know what this device can do.
   *
   * Deliberately not folded into 'unsupported' or 'none'. Both of those send
   * the user to the 0018 screen, which lets them through - the right answer
   * when we know there is no lock to prompt with, and the wrong one when we
   * simply could not find out. Not knowing has to fail closed.
   *
   * The realistic cause is expo-local-authentication not being linked, which
   * is what running in Expo Go rather than the development build 0016 requires
   * looks like from in here.
   */
  | { readonly kind: 'unavailable' };

export type UnlockOutcome =
  | { readonly status: 'unlocked' }
  /** The user dismissed the prompt. Not an error; do not show one. */
  | { readonly status: 'cancelled' }
  /** Too many failed attempts; the OS has temporarily disabled the prompt. */
  | { readonly status: 'locked-out' }
  /**
   * There is no lock on this device to prompt with, so there is nothing to
   * retry. Separate from 'failed' because the two need opposite screens: a
   * failure invites another go, and this one cannot be fixed by having another
   * go - only by changing a phone setting, or by 0018 deciding otherwise.
   */
  | { readonly status: 'no-device-lock' }
  /**
   * We could not ask the device. Unlike 'failed' this is not about the user
   * having got it wrong, and unlike 'no-device-lock' it must not open the app.
   * @see UnlockAvailability - the 'unavailable' variant
   */
  | { readonly status: 'unavailable' }
  | { readonly status: 'failed'; readonly reason: string };

/**
 * True while the OS's own unlock sheet is on screen.
 *
 * The sheet takes focus, which iOS reports as the app becoming inactive - the
 * same signal privacy-cover.tsx uses to hide the app from the task switcher.
 * That component needs to tell the two apart, and this module is the only
 * place that knows which one is happening.
 */
let promptOnScreen = false;

/** @see promptOnScreen */
export function isUnlockPromptOnScreen(): boolean {
  return promptOnScreen;
}

/** What kind of lock, if any, this device can offer us. */
export async function checkUnlockAvailability(): Promise<UnlockAvailability> {
  if (Platform.OS === 'web') return { kind: 'unsupported' };

  // These reject, rather than reporting a level, when the native module is not
  // in the build at all. Mapping that to a value here keeps every caller of
  // this module dealing in outcomes rather than in exceptions.
  let hasHardware: boolean;
  let level: LocalAuthentication.SecurityLevel;
  try {
    hasHardware = await LocalAuthentication.hasHardwareAsync();
    level = await LocalAuthentication.getEnrolledLevelAsync();
  } catch {
    return { kind: 'unavailable' };
  }

  if (level === LocalAuthentication.SecurityLevel.NONE) {
    // No biometric *and* no passcode. Distinguish "this phone could never do
    // it" from "this phone could, but nothing is set up" - only the second is
    // something the user can fix from Settings.
    return hasHardware ? { kind: 'none' } : { kind: 'unsupported' };
  }

  if (level === LocalAuthentication.SecurityLevel.SECRET) return { kind: 'passcode' };

  return { kind: 'biometric' };
}

/**
 * Prompts for unlock.
 *
 * `disableDeviceFallback` is left at its default of false on purpose: that is
 * what maps to iOS's DeviceOwnerAuthentication policy and gives the passcode
 * fallback 0007 asks for. Setting it true would mean building our own fallback,
 * which 0007 explicitly rejected.
 */
export async function requestUnlock(): Promise<UnlockOutcome> {
  const availability = await checkUnlockAvailability();

  if (availability.kind === 'unavailable') return { status: 'unavailable' };

  if (availability.kind === 'unsupported' || availability.kind === 'none') {
    return { status: 'no-device-lock' };
  }

  let result: LocalAuthentication.LocalAuthenticationResult;
  try {
    promptOnScreen = true;
    result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock your journal',
      // Plain, and not a threat. Someone opening this app may be having a bad
      // day already.
      cancelLabel: 'Not now',
    });
  } catch {
    // Same reasoning as the availability check: a throw here means we could not
    // ask, which is not the same as the user failing and must not open the app.
    return { status: 'unavailable' };
  } finally {
    promptOnScreen = false;
  }

  if (result.success) return { status: 'unlocked' };

  switch (result.error) {
    case 'user_cancel':
    case 'app_cancel':
    case 'system_cancel':
      return { status: 'cancelled' };
    case 'lockout':
      return { status: 'locked-out' };
    // The device lost, or never had, anything to authenticate against. The
    // check above should have caught this, but it can also change underneath
    // us - someone removes their passcode while the app sits in the
    // background - and the OS reports it here. Sending these to 'failed' put
    // the user in front of "you can try again", which is not true of any of
    // them: another tap runs into the same missing lock.
    case 'passcode_not_set':
    case 'not_enrolled':
    case 'not_available':
      return { status: 'no-device-lock' };
    default:
      return { status: 'failed', reason: result.error };
  }
}
