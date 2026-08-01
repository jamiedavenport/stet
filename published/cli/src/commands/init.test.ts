import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import {
  defaultOutput,
  installCommand,
  nextSteps,
  renderStetConfig,
  resolveTarget,
  runInit,
  usesVite,
} from './init';

vi.mock('#/ui', () => ({
  begin: vi.fn(),
  done: vi.fn(),
  info: vi.fn(),
  note: vi.fn(),
  warn: vi.fn(),
  // The real one exits the process, which a test cannot come back from.
  fail: vi.fn((message: string) => {
    throw new Error(message);
  }),
}));

const ui = await import('#/ui');

afterEach(() => {
  vi.clearAllMocks();
});

async function project(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'stet-init-'));
}

describe('renderStetConfig', () => {
  it('writes a config the config package can load', () => {
    const source = renderStetConfig('src/stet.gen.ts');

    expect(source).toContain("import { defineStet } from '@stetcms/config'");
    expect(source).toContain("output: 'src/stet.gen.ts'");
  });

  it('leaves every analytics line commented out', () => {
    const lines = renderStetConfig('src/stet.gen.ts')
      .split('\n')
      .filter((line) => /analytics|defineAnalytics|event\(|z\.enum/.test(line));

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.trimStart().startsWith('//')).toBe(true);
    }
  });
});

describe('defaultOutput', () => {
  it('keeps generated code inside src when the project has one', async () => {
    const root = await project();
    await mkdir(resolve(root, 'src'));

    expect(defaultOutput(root)).toBe('src/stet.gen.ts');
  });

  it('writes to the root when there is no src', async () => {
    expect(defaultOutput(await project())).toBe('stet.gen.ts');
  });
});

describe('resolveTarget', () => {
  it('writes stet.config.ts at the root of an empty project', async () => {
    const root = await project();

    const target = resolveTarget(root, {});

    expect(target.path).toBe(resolve(root, 'stet.config.ts'));
    expect(target.existing).toBeUndefined();
  });

  it('reports a config at the root', async () => {
    const root = await project();
    await writeFile(resolve(root, 'stet.config.ts'), 'export default {}', 'utf8');

    expect(resolveTarget(root, {}).existing).toBe(resolve(root, 'stet.config.ts'));
  });

  it('overwrites the config the project loads, not a second one beside it', async () => {
    const root = await project();
    await mkdir(resolve(root, 'src'));
    await writeFile(resolve(root, 'src/stet.config.ts'), 'export default { output: "a" }', 'utf8');

    const target = resolveTarget(root, { force: true });

    expect(target.path).toBe(resolve(root, 'src/stet.config.ts'));
    expect(target.existing).toBe(resolve(root, 'src/stet.config.ts'));
  });

  it('takes an explicit --config over anything it found, and still reports it', async () => {
    const root = await project();
    await writeFile(resolve(root, 'stet.config.ts'), 'export default {}', 'utf8');

    const target = resolveTarget(root, { config: 'config/stet.config.ts' });

    expect(target.path).toBe(resolve(root, 'config/stet.config.ts'));
    expect(target.existing).toBeUndefined();
    expect(target.detected).toBe(resolve(root, 'stet.config.ts'));
  });
});

describe('usesVite', () => {
  it('sees a vite config', async () => {
    const root = await project();
    await writeFile(resolve(root, 'vite.config.ts'), 'export default {}', 'utf8');

    expect(usesVite(root)).toBe(true);
  });

  it('sees vite in the manifest', async () => {
    const root = await project();
    await writeFile(
      resolve(root, 'package.json'),
      JSON.stringify({ devDependencies: { vite: '^7.0.0' } }),
      'utf8',
    );

    expect(usesVite(root)).toBe(true);
  });

  it('is false for a project that does not build with vite', async () => {
    const root = await project();
    await writeFile(
      resolve(root, 'package.json'),
      JSON.stringify({ dependencies: { next: '^16.0.0' } }),
      'utf8',
    );

    expect(usesVite(root)).toBe(false);
  });
});

describe('installCommand', () => {
  it('follows the lockfile in the project', async () => {
    const root = await project();
    await writeFile(resolve(root, 'pnpm-lock.yaml'), '', 'utf8');

    expect(await installCommand(root, ['@stetcms/client'])).toBe('pnpm add @stetcms/client');
  });

  it('reads the packageManager field when there is no lockfile', async () => {
    const root = await project();
    await writeFile(
      resolve(root, 'package.json'),
      JSON.stringify({ packageManager: 'bun@1.2.0' }),
      'utf8',
    );

    expect(await installCommand(root, ['@stetcms/client'])).toBe('bun add @stetcms/client');
  });

  it('falls back to npm', async () => {
    expect(await installCommand(await project(), ['@stetcms/client'])).toBe(
      'npm i @stetcms/client',
    );
  });
});

describe('nextSteps', () => {
  it('installs the plugin and points at vite.config.ts for a vite project', async () => {
    const root = await project();
    await writeFile(resolve(root, 'vite.config.ts'), 'export default {}', 'utf8');

    const steps = await nextSteps(root);

    expect(steps).toContain('@stetcms/vite @stetcms/client');
    expect(steps).toContain('Add stet() to vite.config.ts');
  });

  it('installs only the client and runs generate everywhere else', async () => {
    const steps = await nextSteps(await project());

    expect(steps).not.toContain('@stetcms/vite');
    expect(steps).toContain('@stetcms/client');
    expect(steps).toContain('npx stet generate');
  });
});

describe('runInit', () => {
  it('writes the config', async () => {
    const root = await project();

    await runInit(root, {});

    expect(await readFile(resolve(root, 'stet.config.ts'), 'utf8')).toContain('defineStet');
  });

  it('leaves an existing config untouched without --force', async () => {
    const root = await project();
    await writeFile(resolve(root, 'stet.config.ts'), 'the tracking plan', 'utf8');

    await expect(runInit(root, {})).rejects.toThrow('already exists');

    expect(await readFile(resolve(root, 'stet.config.ts'), 'utf8')).toBe('the tracking plan');
  });

  it('replaces it with --force', async () => {
    const root = await project();
    await writeFile(resolve(root, 'stet.config.ts'), 'the tracking plan', 'utf8');

    await runInit(root, { force: true });

    expect(await readFile(resolve(root, 'stet.config.ts'), 'utf8')).toContain('defineStet');
  });

  it('warns when an explicit --config lands where Stet will not look', async () => {
    const root = await project();
    await writeFile(resolve(root, 'stet.config.ts'), 'export default {}', 'utf8');

    await runInit(root, { config: 'config/stet.config.ts' });

    expect(ui.warn).toHaveBeenCalledWith(expect.stringContaining('stet.config.ts is the config'));
  });

  it('does not warn when it wrote the file Stet loads', async () => {
    await runInit(await project(), {});

    expect(ui.warn).not.toHaveBeenCalled();
  });
});
