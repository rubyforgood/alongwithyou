/// <reference types="jest" />

// The client is the seam between the app and Rails: every screen inherits its
// failure behaviour from here, so it is the piece worth covering directly.
//
// The jest reference above is deliberate: TypeScript 6 does not pull @types/jest
// in on its own, and tsconfig.json stays free of test-only types.
//
// API_BASE_URL is resolved once at import time, so each case loads the module
// fresh with the environment it wants.

type Api = typeof import('./api');

type LoadOptions = {
  apiUrl?: string;
  hostUri?: string;
  os?: 'ios' | 'android' | 'web';
};

function loadApi({ apiUrl, hostUri, os = 'ios' }: LoadOptions = {}): Api {
  jest.resetModules();

  if (apiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = apiUrl;
  }

  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: { expoConfig: hostUri ? { hostUri } : null },
  }));
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));

  return require('./api');
}

/** Runs `body` with __DEV__ off, which is what a release bundle looks like. */
function withoutDevMode<T>(body: () => T): T {
  const globals = globalThis as unknown as { __DEV__: boolean };
  const wasDev = globals.__DEV__;
  globals.__DEV__ = false;

  try {
    return body();
  } finally {
    globals.__DEV__ = wasDev;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
    headers: { get: () => 'application/json; charset=utf-8' },
  };
}

const fetchMock = jest.fn();
(globalThis as { fetch: unknown }).fetch = fetchMock;

beforeEach(() => {
  fetchMock.mockReset();
});

describe('API_BASE_URL', () => {
  it('prefers EXPO_PUBLIC_API_URL and drops trailing slashes', () => {
    expect(loadApi({ apiUrl: 'https://staging.example.com//' }).API_BASE_URL).toBe(
      'https://staging.example.com'
    );
  });

  it('reuses the address Metro serves the bundle from', () => {
    expect(loadApi({ hostUri: '192.168.1.5:8081', os: 'android' }).API_BASE_URL).toBe(
      'http://192.168.1.5:3000'
    );
  });

  it('rewrites loopback to the host alias on the Android emulator', () => {
    expect(loadApi({ hostUri: 'localhost:8081', os: 'android' }).API_BASE_URL).toBe(
      'http://10.0.2.2:3000'
    );
  });

  it('leaves loopback alone everywhere else', () => {
    expect(loadApi({ hostUri: 'localhost:8081', os: 'ios' }).API_BASE_URL).toBe(
      'http://localhost:3000'
    );
  });

  it('falls back to localhost when Metro never reported a host', () => {
    expect(loadApi().API_BASE_URL).toBe('http://localhost:3000');
  });

  it('has nothing to fall back on in a release build', () => {
    expect(withoutDevMode(() => loadApi().API_BASE_URL)).toBeNull();
  });
});

describe('tasks', () => {
  const api = () => loadApi({ apiUrl: 'http://api.test' });

  it('lists tasks as JSON', async () => {
    const rows = [{ id: 1, title: 'Wire up the Expo client', completed: false }];
    fetchMock.mockResolvedValue(jsonResponse(rows));

    await expect(api().tasks.list()).resolves.toEqual(rows);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/v1/tasks');
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  });

  it('wraps a create in the task key Rails expects', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 2, title: 'Ship it' }, 201));

    await api().tasks.create('Ship it');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ task: { title: 'Ship it' } });
  });

  it('resolves a 204 without trying to parse a body', async () => {
    fetchMock.mockResolvedValue({ status: 204, ok: true, text: async () => '' });

    await expect(api().tasks.destroy(7)).resolves.toBeUndefined();
  });
});

describe('failures', () => {
  const api = () => loadApi({ apiUrl: 'http://api.test' });

  it('turns a 422 into field errors the UI can mark up', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: 'unprocessable_entity',
          message: "Title can't be blank",
          errors: { title: ["can't be blank"] },
        },
        422
      )
    );

    const { ApiError, tasks } = api();
    const failure = await tasks.create('').catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      status: 422,
      message: "Title can't be blank",
      fieldErrors: { title: ["can't be blank"] },
    });
  });

  it('reports an HTML body as an API failure, not a SyntaxError', async () => {
    fetchMock.mockResolvedValue({
      status: 502,
      ok: false,
      text: async () => '<html><body>Bad gateway</body></html>',
      headers: { get: () => 'text/html' },
    });

    const { ApiError, tasks } = api();
    const failure = await tasks.list().catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as Error).message).toMatch(/text\/html/);
  });

  it('explains an unreachable server', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    const { ApiError, tasks } = api();
    const failure = await tasks.list().catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as Error).message).toMatch(/Could not reach the Rails server/);
  });

  it('gives up on a server that never answers', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
        })
    );

    jest.useFakeTimers();
    try {
      const pending = api().tasks.list();
      jest.advanceTimersByTime(10_000);

      await expect(pending).rejects.toThrow(/did not answer within 10s/);
    } finally {
      jest.useRealTimers();
    }
  });

  // In development the client always has somewhere to point, so this is the
  // release build case: no Metro server to ask, and nobody set the env var.
  it('refuses to guess a URL in a release build', async () => {
    const { ApiError, tasks } = withoutDevMode(() => loadApi());

    const failure = await tasks.list().catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as Error).message).toMatch(/EXPO_PUBLIC_API_URL/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
