import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

import { defaultOutput, installCommand, renderStetConfig, resolveTarget } from './init';

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

  it('takes an explicit --config over anything it found', async () => {
    const root = await project();
    await writeFile(resolve(root, 'stet.config.ts'), 'export default {}', 'utf8');

    const target = resolveTarget(root, { config: 'config/stet.config.ts' });

    expect(target.path).toBe(resolve(root, 'config/stet.config.ts'));
    expect(target.existing).toBeUndefined();
  });
});

describe('installCommand', () => {
  it('follows the lockfile in the project', async () => {
    const root = await project();
    await writeFile(resolve(root, 'pnpm-lock.yaml'), '', 'utf8');

    expect(installCommand(root)).toBe('pnpm add @stetcms/vite @stetcms/client');
  });

  it('falls back to npm', async () => {
    expect(installCommand(await project())).toBe('npm install @stetcms/vite @stetcms/client');
  });
});
