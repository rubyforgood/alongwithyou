/// <reference types="jest" />

// Screen tests live here rather than beside the screen: Expo Router turns every
// file under src/app/ into a route, so src/app/tasks.test.tsx would ship as
// /tasks.test. See the note in jest.config.js.
//
// render() and fireEvent() are async in React Native Testing Library 14 - both
// have to be awaited or nothing is mounted and no state update is flushed.

import { fireEvent, render, screen } from '@testing-library/react-native';

import TasksScreen from '@/app/tasks';
import { ApiError, Task, tasks } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  tasks: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

const mocked = tasks as jest.Mocked<typeof tasks>;

function task(attributes: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Wire up the Expo client',
    completed: false,
    created_at: '2026-08-02T16:00:00.000Z',
    updated_at: '2026-08-02T16:00:00.000Z',
    ...attributes,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('lists what the API returns', async () => {
  mocked.list.mockResolvedValue([task(), task({ id: 2, title: 'Install Expo', completed: true })]);

  await render(<TasksScreen />);

  expect(await screen.findByText('Wire up the Expo client')).toBeOnTheScreen();
  expect(screen.getByText('Install Expo')).toBeOnTheScreen();
});

it('says so when the list cannot be loaded, and retries', async () => {
  mocked.list
    .mockRejectedValueOnce(new ApiError('Could not reach the Rails server at http://api.test.', 0))
    .mockResolvedValueOnce([task({ title: 'Back online' })]);

  await render(<TasksScreen />);

  expect(await screen.findByText(/Could not reach the Rails server/)).toBeOnTheScreen();

  await fireEvent.press(screen.getByText('Retry'));

  expect(await screen.findByText('Back online')).toBeOnTheScreen();
});

it('adds a task and puts it at the top of the list', async () => {
  mocked.list.mockResolvedValue([task({ id: 1, title: 'Older' })]);
  mocked.create.mockResolvedValue(task({ id: 2, title: 'Newer' }));

  await render(<TasksScreen />);
  await screen.findByText('Older');

  await fireEvent.changeText(screen.getByPlaceholderText('Add a task'), '  Newer  ');
  await fireEvent.press(screen.getByText('Add'));

  // The title is trimmed before it is sent.
  expect(mocked.create).toHaveBeenCalledWith('Newer');
  expect(await screen.findByText('Newer')).toBeOnTheScreen();
});

it('keeps a task that failed to delete', async () => {
  mocked.list.mockResolvedValue([task({ title: 'Stays put' })]);
  mocked.destroy.mockRejectedValue(new ApiError('Task could not be deleted.', 500));

  await render(<TasksScreen />);
  await screen.findByText('Stays put');

  await fireEvent.press(screen.getByText('Delete'));

  expect(await screen.findByText('Task could not be deleted.')).toBeOnTheScreen();
  expect(screen.getByText('Stays put')).toBeOnTheScreen();
});

it('toggles completion through the API', async () => {
  mocked.list.mockResolvedValue([task({ id: 3, title: 'Toggle me', completed: false })]);
  mocked.update.mockResolvedValue(task({ id: 3, title: 'Toggle me', completed: true }));

  await render(<TasksScreen />);

  await fireEvent.press(await screen.findByText('Toggle me'));

  expect(mocked.update).toHaveBeenCalledWith(3, { completed: true });
});
