import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AppState, Platform, Text as RNText } from 'react-native';

import { UnlockGate } from './unlock-gate';
import { checkUnlockAvailability, requestUnlock } from '@/lib/auth/unlock';

jest.mock('@/lib/auth/unlock', () => ({
  checkUnlockAvailability: jest.fn(),
  requestUnlock: jest.fn(),
}));

const availability = checkUnlockAvailability as jest.Mock;
const unlock = requestUnlock as jest.Mock;

const originalOS = Platform.OS;
function setPlatform(os: typeof Platform.OS) {
  (Platform as { OS: typeof Platform.OS }).OS = os;
}

function Journal() {
  return <RNText>Journal contents</RNText>;
}

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform('ios');
  availability.mockResolvedValue({ kind: 'biometric' });
  unlock.mockResolvedValue({ status: 'unlocked' });
});

afterEach(() => setPlatform(originalOS));

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

  it('lets someone through on a phone with no lock, and says so', async () => {
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

  it('re-locks when the app goes to the background', async () => {
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _event: string,
      handler: (state: string) => void
    ) => {
      listeners.push(handler);
      return { remove: jest.fn() };
    }) as never);

    await render(
      <UnlockGate>
        <Journal />
      </UnlockGate>
    );

    expect(await screen.findByText('Journal contents')).toBeVisible();

    // Without this the gate is a splash screen, not a lock.
    await act(async () => listeners.forEach((handler) => handler('background')));

    await waitFor(() => expect(screen.queryByText('Journal contents')).toBeNull());
    expect(screen.getByText('Your journal is locked')).toBeVisible();

    jest.restoreAllMocks();
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
