import { act, render, screen } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';

import { PrivacyCover } from './privacy-cover';
import { isUnlockPromptOnScreen } from '@/lib/auth/unlock';

jest.mock('@/lib/auth/unlock', () => ({
  isUnlockPromptOnScreen: jest.fn(() => false),
}));

const promptOnScreen = isUnlockPromptOnScreen as jest.Mock;

const originalOS = Platform.OS;
function setPlatform(os: typeof Platform.OS) {
  (Platform as { OS: typeof Platform.OS }).OS = os;
}

/** Lets a test drive AppState by hand; the real one needs a running app. */
function captureAppState() {
  const listeners: ((state: string) => void)[] = [];

  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    handler: (state: string) => void
  ) => {
    listeners.push(handler);
    return { remove: jest.fn() };
  }) as never);

  return {
    async emit(next: string) {
      await act(async () => listeners.forEach((handler) => handler(next)));
    },
    get subscribed() {
      return listeners.length > 0;
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform('ios');
  promptOnScreen.mockReturnValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
  setPlatform(originalOS);
});

describe('PrivacyCover', () => {
  it('shows nothing while the app is in the foreground', async () => {
    captureAppState();

    await render(<PrivacyCover />);

    expect(screen.queryByTestId('privacy-cover')).toBeNull();
  });

  it('covers the app on inactive, before iOS takes its switcher photograph', async () => {
    const appState = captureAppState();

    await render(<PrivacyCover />);
    // 'inactive' rather than 'background' on purpose: iOS raises it as the
    // multitasking view starts to appear, which is the only part of this the
    // render can win.
    await appState.emit('inactive');

    expect(screen.getByTestId('privacy-cover')).toBeVisible();
  });

  it('covers on background too, for platforms that never say inactive', async () => {
    setPlatform('android');
    const appState = captureAppState();

    await render(<PrivacyCover />);
    await appState.emit('background');

    expect(screen.getByTestId('privacy-cover')).toBeVisible();
  });

  it('gets out of the way as soon as the app is back', async () => {
    const appState = captureAppState();

    await render(<PrivacyCover />);
    await appState.emit('inactive');
    await appState.emit('active');

    expect(screen.queryByTestId('privacy-cover')).toBeNull();
  });

  it('leaves the OS unlock sheet alone, which iOS also reports as inactive', async () => {
    // The failure this avoids is the bad one. Face ID makes the app inactive,
    // and the matching 'active' is not always delivered afterwards - covering
    // here could leave an opaque view over the lock screen with the Unlock
    // button underneath it and no way back. Nothing leaks by skipping: that
    // sheet only ever opens over the lock screen.
    promptOnScreen.mockReturnValue(true);
    const appState = captureAppState();

    await render(<PrivacyCover />);
    await appState.emit('inactive');

    expect(screen.queryByTestId('privacy-cover')).toBeNull();
  });

  it('does not watch the web build, which has no switcher and no journal', async () => {
    setPlatform('web');
    const appState = captureAppState();

    await render(<PrivacyCover />);

    expect(appState.subscribed).toBe(false);
  });
});
