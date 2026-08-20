import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, Platform, Text as RNText } from 'react-native';

import { UnlockGate } from './unlock-gate';
import { checkUnlockAvailability, requestUnlock } from '@/lib/auth/unlock';
import { closeJournalDatabase } from '@/lib/db/database';

jest.mock('@/lib/auth/unlock', () => ({
  checkUnlockAvailability: jest.fn(),
  requestUnlock: jest.fn(),
}));

// The gate closes the database when it re-locks. Mocked rather than exercised:
// the real one needs expo-sqlite and a device, and what matters here is only
// that the gate asks.
jest.mock('@/lib/db/database', () => ({
  closeJournalDatabase: jest.fn(async () => undefined),
}));

const availability = checkUnlockAvailability as jest.Mock;
const unlock = requestUnlock as jest.Mock;
const closeDatabase = closeJournalDatabase as jest.Mock;

const originalOS = Platform.OS;
function setPlatform(os: typeof Platform.OS) {
  (Platform as { OS: typeof Platform.OS }).OS = os;
}

function Journal() {
  return <RNText>Journal contents</RNText>;
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
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform('ios');
  availability.mockResolvedValue({ kind: 'biometric' });
  unlock.mockResolvedValue({ status: 'unlocked' });
});

afterEach(() => {
  jest.restoreAllMocks();
  setPlatform(originalOS);
});

describe('UnlockGate', () => {
  it('shows nothing of what it wraps until the device says yes', async () => {
    let release: (value: { status: string }) => void = () => {};
    unlock.mockReturnValue(
      new Promise<{ status: string }>((resolve) => {
        release = resolve;
      })
    );

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(screen.queryByText('Journal contents')).toBeNull();

    await act(async () => release({ status: 'unlocked' }));
    expect(await screen.findByText('Journal contents')).toBeVisible();
  });

  it('renders its children once unlocked', async () => {
    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(await screen.findByText('Journal contents')).toBeVisible();
  });

  it('offers a way back in after the prompt is dismissed', async () => {
    const user = userEvent.setup();
    unlock.mockResolvedValueOnce({ status: 'cancelled' });

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(await screen.findByText('Your journal is locked')).toBeVisible();
    expect(screen.queryByText('Journal contents')).toBeNull();

    unlock.mockResolvedValueOnce({ status: 'unlocked' });
    await user.press(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByText('Journal contents')).toBeVisible();
  });

  it('offers a way forward when the check itself throws', async () => {
    // Not a hypothetical: expo-local-authentication throws "Cannot find native
    // module" in Expo Go, which is what a contributor who has not made a
    // development build is running. unlock.ts turns that into 'unavailable';
    // what matters here is that the gate gives the user a way forward rather
    // than sitting on its spinner for ever with no text and no button.
    availability.mockResolvedValueOnce({ kind: 'unavailable' });

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(
      await screen.findByText("We couldn't check your phone's lock. You can try again.")
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeVisible();
    expect(screen.queryByText('Journal contents')).toBeNull();
  });

  it('recovers when the prompt could not run and the next attempt works', async () => {
    const user = userEvent.setup();
    unlock.mockResolvedValueOnce({ status: 'unavailable' });

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(
      await screen.findByText("We couldn't check your phone's lock. You can try again.")
    ).toBeVisible();

    // The re-entrancy guard has to have been released, or the button below
    // would do nothing.
    unlock.mockResolvedValueOnce({ status: 'unlocked' });
    await user.press(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByText('Journal contents')).toBeVisible();
  });

  it('does not blame the user when authentication fails', async () => {
    unlock.mockResolvedValue({ status: 'failed', reason: 'authentication_failed' });

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    const message = await screen.findByText("That didn't work. You can try again.");
    expect(message).toBeVisible();
    // Screen readers should hear it, not just sighted users see it.
    expect(message.props.accessibilityLiveRegion).toBe('polite');
  });

  it('explains a lockout rather than repeating a generic failure', async () => {
    unlock.mockResolvedValue({ status: 'locked-out' });

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(await screen.findByText(/try again in a moment/)).toBeVisible();
  });

  // 0018 is open, and this test records what the placeholder does rather than
  // what the app has to do. Refusing to open, nudging once and offering a
  // shortcut into Settings are all still on the table; whoever settles 0018
  // should expect to rewrite this alongside the screen, and should read a
  // failure here as "the placeholder changed", not "a requirement broke".
  it('lets someone through on a phone with no lock, and says so (0018 placeholder)', async () => {
    const user = userEvent.setup();
    availability.mockResolvedValue({ kind: 'none' });

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(await screen.findByText('Your phone has no lock set')).toBeVisible();
    expect(unlock).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Journal contents')).toBeVisible();
  });

  it('does not offer a retry for something retrying cannot fix', async () => {
    // The check said there was a lock and the prompt disagreed - a passcode
    // removed while the app sat in the background, most likely. "You can try
    // again" would be untrue: the next tap meets the same missing lock.
    unlock.mockResolvedValue({ status: 'no-device-lock' });

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(await screen.findByText('Your phone has no lock set')).toBeVisible();
    expect(screen.queryByText("That didn't work. You can try again.")).toBeNull();
  });

  it.each([
    ['locked', { kind: 'biometric' }, { status: 'cancelled' }, 'Your journal is locked'],
    ['no-device-lock', { kind: 'none' }, undefined, 'Your phone has no lock set'],
  ])('gives the %s screen a heading a screen reader can find', async (_name, kind, outcome, heading) => {
    availability.mockResolvedValue(kind);
    if (outcome) unlock.mockResolvedValue(outcome);

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    // Bare styled Text is a paragraph that happens to be large. On a screen
    // with nothing else on it, the heading is the only landmark there is.
    expect(await screen.findByRole('heading', { name: heading as string })).toBeVisible();
  });

  it('says the failure out loud on iOS, where the live region is inert', async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
    unlock.mockResolvedValue({ status: 'failed', reason: 'authentication_failed' });

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    await screen.findByText("That didn't work. You can try again.");

    // accessibilityLiveRegion is Android-only, so without this the one
    // explanation the screen offers is silent on the platform Face ID is on.
    expect(announce).toHaveBeenCalledWith("That didn't work. You can try again.");
  });

  it('re-locks when the app goes to the background', async () => {
    const appState = captureAppState();

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(await screen.findByText('Journal contents')).toBeVisible();

    // Without this the gate is a splash screen, not a lock.
    await appState.emit('background');

    await waitFor(() => expect(screen.queryByText('Journal contents')).toBeNull());
    expect(screen.getByText('Your journal is locked')).toBeVisible();

    // Locking the view is only half of it. While the handle stays open the key
    // is still in memory and any caller can still read, which makes 0015's
    // WHEN_UNLOCKED_THIS_DEVICE_ONLY a first-launch property and nothing more.
    expect(closeDatabase).toHaveBeenCalled();
  });

  it('keeps what it was explaining when the app comes back', async () => {
    unlock.mockResolvedValue({ status: 'locked-out' });
    const appState = captureAppState();

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(await screen.findByText(/try again in a moment/)).toBeVisible();

    await appState.emit('background');
    await appState.emit('active');

    // Re-locking an already-locked screen used to overwrite the message, so
    // someone who checked the time during a lockout came back to a bare "Your
    // journal is locked" and no explanation of why their last try had failed.
    expect(screen.getByText(/try again in a moment/)).toBeVisible();
  });

  it('does not tell someone with no phone lock to unlock with their phone', async () => {
    const user = userEvent.setup();
    availability.mockResolvedValue({ kind: 'none' });
    const appState = captureAppState();

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    await user.press(await screen.findByText('Continue'));
    expect(await screen.findByText('Journal contents')).toBeVisible();

    await appState.emit('background');
    expect(screen.queryByText('Journal contents')).toBeNull();

    await appState.emit('active');

    // The whole point. "Your journal is locked / Unlock with your phone to open
    // it" is a false statement on a phone with no lock, and its button can only
    // fail - two taps back to this same screen, on every resume, for the people
    // 0018 is about.
    expect(await screen.findByText('Your phone has no lock set')).toBeVisible();
    expect(screen.queryByText('Your journal is locked')).toBeNull();
    expect(unlock).not.toHaveBeenCalled();
  });

  it('notices a lock set while the app was away', async () => {
    const user = userEvent.setup();
    availability.mockResolvedValue({ kind: 'none' });
    const appState = captureAppState();

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    await user.press(await screen.findByText('Continue'));
    expect(await screen.findByText('Journal contents')).toBeVisible();

    // The screen they just read recommends setting a passcode, and going to
    // Settings to do it is what put the app in the background. Coming back to
    // "Your phone has no lock set" would be wrong, and would undo the nudge.
    await appState.emit('background');
    availability.mockResolvedValue({ kind: 'biometric' });
    await appState.emit('active');

    expect(await screen.findByText('Journal contents')).toBeVisible();
    expect(unlock).toHaveBeenCalled();
  });

  it('does not close a database the web build never opened', async () => {
    setPlatform('web');

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(closeDatabase).not.toHaveBeenCalled();
  });

  it('does not gate the web build, which holds no journal data', async () => {
    setPlatform('web');

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(screen.getByText('Journal contents')).toBeVisible();
    expect(availability).not.toHaveBeenCalled();
  });

  it('can be skipped explicitly', async () => {
    await render(
      <UnlockGate skip>
        <Journal />
      </UnlockGate>
    );

    expect(screen.getByText('Journal contents')).toBeVisible();
    expect(availability).not.toHaveBeenCalled();
  });
});
