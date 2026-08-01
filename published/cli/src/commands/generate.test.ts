import { access, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { runGenerate } from './generate';

vi.mock('#/ui', () => ({
  begin: vi.fn(),
  done: vi.fn(),
  info: vi.fn(),
  note: vi.fn(),
  warn: vi.fn(),
  progress: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  // The real one exits the process, which a test cannot come back from.
  fail: vi.fn((message: string) => {
    throw new Error(message);
  }),
}));

vi.mock('#/config', () => ({
  settleOptions: vi.fn(),
}));

vi.mock('@stetcms/client/codegen', () => ({
  fetchContentModel: vi.fn(),
  renderContentModule: vi.fn(() => 'the generated client'),
}));

const ui = await import('#/ui');
const { settleOptions } = vi.mocked(await import('#/config'));
const { fetchContentModel } = vi.mocked(await import('@stetcms/client/codegen'));

afterEach(() => {
  vi.clearAllMocks();
});

async function output(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'stet-generate-'));
  return join(root, 'stet.gen.ts');
}

function settled(overrides: { apiKey?: string; output: string }): void {
  settleOptions.mockResolvedValue({
    origin: 'http://localhost:3000',
    apiKey: overrides.apiKey,
    output: overrides.output,
    watch: false,
    events: undefined,
  });
}

describe('runGenerate', () => {
  it('fails without a key', async () => {
    settled({ output: await output() });

    await expect(runGenerate({})).rejects.toThrow('No API key');
  });

  it('succeeds without a key under --if-key, leaving the committed client alone', async () => {
    const target = await output();
    settled({ output: target });

    await runGenerate({ ifKey: true });

    expect(fetchContentModel).not.toHaveBeenCalled();
    await expect(access(target)).rejects.toThrow();
    expect(ui.done).toHaveBeenCalledWith(expect.stringContaining('No API key'));
  });

  it('generates as normal when --if-key has a key to work with', async () => {
    const target = await output();
    settled({ apiKey: 'stet_key', output: target });
    fetchContentModel.mockResolvedValue({ types: [] });

    await runGenerate({ ifKey: true });

    expect(await readFile(target, 'utf8')).toBe('the generated client');
  });

  it('does not forgive a failed fetch: only the missing key is optional', async () => {
    settled({ apiKey: 'stet_key', output: await output() });
    fetchContentModel.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(runGenerate({ ifKey: true })).rejects.toThrow('ECONNREFUSED');
  });
});
