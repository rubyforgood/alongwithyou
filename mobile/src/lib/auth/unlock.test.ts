import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { checkUnlockAvailability, requestUnlock } from './unlock';

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

  it('does not prompt when the device has nothing to prompt with', async () => {
    getEnrolledLevelAsync.mockResolvedValue(LocalAuthentication.SecurityLevel.NONE);

    await expect(requestUnlock()).resolves.toEqual({ status: 'failed', reason: 'none' });
    expect(authenticateAsync).not.toHaveBeenCalled();
  });
});
