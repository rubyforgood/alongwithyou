import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Port that `bin/rails server` listens on. */
const RAILS_PORT = 3000;

/**
 * Where the Rails API lives.
 *
 * Getting this right is the fiddly part of pairing Expo with a local backend,
 * because "localhost" means something different on every target:
 *
 *   - iOS simulator  -> shares the host network, localhost works
 *   - Android emulator -> localhost is the *emulator*, the host is 10.0.2.2
 *   - physical device -> neither works, it needs the host's LAN address
 *
 * Rather than make you hardcode an IP that changes with every coffee shop, we
 * reuse the address Metro is already serving the bundle from: if the phone can
 * download JS from 192.168.1.5:8081, it can reach Rails at 192.168.1.5:3000.
 *
 * Set EXPO_PUBLIC_API_URL in mobile/.env to override (required for release
 * builds, where there is no Metro server to ask).
 */
function resolveBaseUrl(): string | null {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  if (!__DEV__) return null;

  // e.g. "192.168.1.5:8081" or "localhost:8081". Only set by @expo/cli during
  // development, which is exactly the case we are handling here.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];

  const isLoopback = !host || host === 'localhost' || host === '127.0.0.1';

  if (isLoopback && Platform.OS === 'android') {
    return `http://10.0.2.2:${RAILS_PORT}`;
  }

  return `http://${host ?? 'localhost'}:${RAILS_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

/** Field name -> messages, mirroring the `errors` key rendered by Api::BaseController. */
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldErrors;

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      'No API URL configured. Set EXPO_PUBLIC_API_URL in mobile/.env before making a release build.',
      0
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch {
    // fetch only rejects on transport failure, which here almost always means
    // Rails is not running or is not reachable from this device.
    throw new ApiError(`Could not reach the Rails server at ${API_BASE_URL}.`, 0);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.text();
  const payload = body ? JSON.parse(body) : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      payload?.errors ?? {}
    );
  }

  return payload as T;
}

export const tasks = {
  list: () => request<Task[]>('/api/v1/tasks'),

  create: (title: string) =>
    request<Task>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({ task: { title } }),
    }),

  update: (id: number, changes: Partial<Pick<Task, 'title' | 'completed'>>) =>
    request<Task>(`/api/v1/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ task: changes }),
    }),

  destroy: (id: number) => request<void>(`/api/v1/tasks/${id}`, { method: 'DELETE' }),
};
