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
   * rather than about a device with no lock screen. Someone needs to decide
   * whether the app refuses to open, opens with a plain warning, or asks the
   * user to set a device passcode - and that is a product call, so this type
   * surfaces the case honestly rather than picking one silently.
   */
  | { readonly kind: 'none' }
  /** No supported hardware or platform - the web build, mainly. */
  | { readonly kind: 'unsupported' };

export type UnlockOutcome =
  | { readonly status: 'unlocked' }
  /** The user dismissed the prompt. Not an error; do not show one. */
  | { readonly status: 'cancelled' }
  /** Too many failed attempts; the OS has temporarily disabled the prompt. */
  | { readonly status: 'locked-out' }
  | { readonly status: 'failed'; readonly reason: string };

/** What kind of lock, if any, this device can offer us. */
export async function checkUnlockAvailability(): Promise<UnlockAvailability> {
  if (Platform.OS === 'web') return { kind: 'unsupported' };

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const level = await LocalAuthentication.getEnrolledLevelAsync();

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

  if (availability.kind === 'unsupported' || availability.kind === 'none') {
    return { status: 'failed', reason: availability.kind };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock your journal',
    // Plain, and not a threat. Someone opening this app may be having a bad
    // day already.
    cancelLabel: 'Not now',
  });

  if (result.success) return { status: 'unlocked' };

  switch (result.error) {
    case 'user_cancel':
    case 'app_cancel':
    case 'system_cancel':
      return { status: 'cancelled' };
    case 'lockout':
      return { status: 'locked-out' };
    default:
      return { status: 'failed', reason: result.error };
  }
}
