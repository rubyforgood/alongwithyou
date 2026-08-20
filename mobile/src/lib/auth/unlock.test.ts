import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { checkUnlockAvailability, isUnlockPromptOnScreen, requestUnlock } from './unlock';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  getEnrolledLevelAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
}));

const hasHardwareAsync = LocalAuthentication.hasHardwareAsync as jest.Mock;
const getEnrolledLevelAsync = LocalAuthentication.getEnrolledLevelAsync as jest.Mock;
const authenticateAsync = LocalAuthentication.authenticateAsync as jest.Mock;

const originalOS = Platform.OS;
function setPlatform(os: typeof Platform.OS) {
  (Platform as { OS: typeof Platform.OS }).OS = os;
}

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform('ios');
  hasHardwareAsync.mockResolvedValue(true);
  getEnrolledLevelAsync.mockResolvedValue(LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG);
  authenticateAsync.mockResolvedValue({ success: true });
});

afterAll(() => setPlatform(originalOS));

describe('checkUnlockAvailability', () => {
  it('reports biometric when one is enrolled', async () => {
    await expect(checkUnlockAvailability()).resolves.toEqual({ kind: 'biometric' });
  });

  it('reports biometric for a weak biometric too', async () => {
    getEnrolledLevelAsync.mockResolvedValue(LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK);
    await expect(checkUnlockAvailability()).resolves.toEqual({ kind: 'biometric' });
  });

  it('reports passcode when only a PIN or pattern is set', async () => {
    getEnrolledLevelAsync.mockResolvedValue(LocalAuthentication.SecurityLevel.SECRET);
    await expect(checkUnlockAvailability()).resolves.toEqual({ kind: 'passcode' });
  });

  it('distinguishes a device with no lock set from one that cannot lock at all', async () => {
    getEnrolledLevelAsync.mockResolvedValue(LocalAuthentication.SecurityLevel.NONE);

    hasHardwareAsync.mockResolvedValue(true);
    await expect(checkUnlockAvailability()).resolves.toEqual({ kind: 'none' });

    hasHardwareAsync.mockResolvedValue(false);
    await expect(checkUnlockAvailability()).resolves.toEqual({ kind: 'unsupported' });
  });

  it('is unsupported on web', async () => {
    setPlatform('web');
    await expect(checkUnlockAvailability()).resolves.toEqual({ kind: 'unsupported' });
    expect(hasHardwareAsync).not.toHaveBeenCalled();
  });

  // The realistic cause is the native module not being in the build at all,
  // which is what Expo Go looks like from here now that 0016 requires a
  // development build. It must not read as 'none': that one opens the app.
  it('reports unavailable, not none, when the hardware check throws', async () => {
    hasHardwareAsync.mockRejectedValueOnce(
      new Error("Cannot find native module 'ExpoLocalAuthentication'")
    );

    await expect(checkUnlockAvailability()).resolves.toEqual({ kind: 'unavailable' });
  });

  it('reports unavailable when the enrolled-level check throws', async () => {
    getEnrolledLevelAsync.mockRejectedValueOnce(new Error('boom'));

    await expect(checkUnlockAvailability()).resolves.toEqual({ kind: 'unavailable' });
  });
});

describe('requestUnlock', () => {
  it('unlocks on success', async () => {
    await expect(requestUnlock()).resolves.toEqual({ status: 'unlocked' });
  });

  it('leaves the OS passcode fallback enabled, as 0007 requires', async () => {
    await requestUnlock();

    const [options] = authenticateAsync.mock.calls[0];
    expect(options.disableDeviceFallback).toBeUndefined();
    expect(options.promptMessage).toBeTruthy();
  });

  it.each(['user_cancel', 'app_cancel', 'system_cancel'])(
    'treats %s as a cancellation rather than an error',
    async (error) => {
      authenticateAsync.mockResolvedValue({ success: false, error });
      await expect(requestUnlock()).resolves.toEqual({ status: 'cancelled' });
    }
  );

  it('reports lockout separately so the UI can say to wait', async () => {
    authenticateAsync.mockResolvedValue({ success: false, error: 'lockout' });
    await expect(requestUnlock()).resolves.toEqual({ status: 'locked-out' });
  });

  it('reports any other error as a failure, keeping the reason', async () => {
    authenticateAsync.mockResolvedValue({ success: false, error: 'authentication_failed' });
    await expect(requestUnlock()).resolves.toEqual({
      status: 'failed',
      reason: 'authentication_failed',
    });
  });

  // 'failed' is what the UI turns into "you can try again". None of these three
  // can be fixed by trying again - the phone has no lock to authenticate
  // against - so offering the retry was offering something that could not work.
  it.each(['passcode_not_set', 'not_enrolled', 'not_available'])(
    'reports %s as a missing device lock rather than a retryable failure',
    async (error) => {
      authenticateAsync.mockResolvedValue({ success: false, error });
      await expect(requestUnlock()).resolves.toEqual({ status: 'no-device-lock' });
    }
  );

  it('does not prompt when the device has nothing to prompt with', async () => {
    getEnrolledLevelAsync.mockResolvedValue(LocalAuthentication.SecurityLevel.NONE);

    await expect(requestUnlock()).resolves.toEqual({ status: 'no-device-lock' });
    expect(authenticateAsync).not.toHaveBeenCalled();
  });
});

// privacy-cover.tsx hides the app on 'inactive', and iOS raises 'inactive' for
// this prompt as well as for the task switcher. If the flag were ever left on
// after the sheet closed the cover would stop working; if it were left off
// while the sheet was up the cover could be stranded over the lock screen.
describe('isUnlockPromptOnScreen', () => {
  it('is true only while the OS sheet is actually up', async () => {
    expect(isUnlockPromptOnScreen()).toBe(false);

    let duringPrompt = false;
    authenticateAsync.mockImplementation(async () => {
      duringPrompt = isUnlockPromptOnScreen();
      return { success: true };
    });

    await requestUnlock();

    expect(duringPrompt).toBe(true);
    expect(isUnlockPromptOnScreen()).toBe(false);
  });

  it('clears even when the prompt throws', async () => {
    authenticateAsync.mockRejectedValue(new Error("Cannot find native module 'ExpoLocalAuthentication'"));

    // The throw is absorbed into an outcome rather than propagated, but the
    // flag still has to come back down: privacy-cover.tsx reads it to decide
    // whether it is looking at our own prompt, and a stuck true would leave the
    // app uncovered in the task switcher from here on.
    await expect(requestUnlock()).resolves.toEqual({ status: 'unavailable' });
    expect(isUnlockPromptOnScreen()).toBe(false);
  });
});
