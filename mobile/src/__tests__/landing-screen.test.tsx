// The landing screen. Screen tests live here rather than beside the screen -
// Expo Router would turn src/app/index.test.tsx into a route. See jest.config.js.

import { render, screen } from '@testing-library/react-native';

import LandingScreen from '@/app/index';

describe('LandingScreen', () => {
  it('leads with what the app is for', async () => {
    await render(<LandingScreen />);

    expect(screen.getByRole('heading', { name: /a quiet place for your own words/i })).toBeTruthy();
    expect(screen.getByText('Along With You')).toBeTruthy();
  });

  it('shows all three reassurances', async () => {
    await render(<LandingScreen />);

    expect(screen.getByText('Whatever you need to say')).toBeTruthy();
    expect(screen.getByText('Ready for the next appointment')).toBeTruthy();
    expect(screen.getByText('No streaks to keep up')).toBeTruthy();
  });

  it('offers a way in and a way to look around', async () => {
    await render(<LandingScreen />);

    // Role is link, not button: both are `Link asChild` around a Button, and
    // Link's own role wins. That is the right way round for something whose job
    // is to navigate, so the roles are worth asserting rather than working past.
    expect(screen.getByRole('link', { name: 'Start your journal' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Look around first' })).toBeTruthy();
  });

  it('says it is not medical advice', async () => {
    // Load-bearing copy, not decoration: this is a journal for people in
    // treatment, and the disclaimer should not quietly disappear in a redesign.
    await render(<LandingScreen />);

    expect(screen.getByText(/not medical advice/i)).toBeTruthy();
  });
});
