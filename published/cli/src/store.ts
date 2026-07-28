import fs from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import Conf from 'conf';

export type StoredAuth = {
  origin: string;
  token: string;
};

type AuthConfig = Partial<StoredAuth>;

function configDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome !== undefined && xdgConfigHome !== '') {
    return path.join(xdgConfigHome, 'stet');
  }
  return path.join(homedir(), '.config', 'stet');
}

// `cwd` pins conf to ~/.config/stet/auth.json (the documented location)
// instead of the OS-native preferences directory conf would pick on its own.
function createStore(): Conf<AuthConfig> {
  return new Conf<AuthConfig>({
    cwd: configDir(),
    configName: 'auth',
    // The file holds a session token, so keep it readable by the owner only.
    configFileMode: 0o600,
    clearInvalidConfig: true,
    schema: {
      origin: { type: 'string' },
      token: { type: 'string' },
    },
  });
}

export function saveAuth(auth: StoredAuth): void {
  const store = createStore();
  store.set(auth);
  fs.chmodSync(configDir(), 0o700);
}

export function loadAuth(): StoredAuth | null {
  const store = createStore();
  const origin = store.get('origin');
  const token = store.get('token');
  if (origin === undefined || token === undefined) {
    return null;
  }
  return { origin, token };
}
