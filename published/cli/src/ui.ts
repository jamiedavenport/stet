import { intro, log, note as clackNote, outro, spinner } from '@clack/prompts';
import pc from 'picocolors';

// Every command funnels its output through this module so the CLI keeps one
// visual voice as commands get added.

export function begin(title: string): void {
  intro(pc.inverse(` ${title} `));
}

export function done(message: string): void {
  outro(pc.green(message));
}

export function info(message: string): void {
  log.info(message);
}

export function fail(message: string): never {
  log.error(pc.red(message));
  outro(pc.red('Something went wrong.'));
  process.exit(1);
}

export function note(message: string, title: string): void {
  clackNote(message, title);
}

export function showVerification(verificationUri: string, userCode: string): void {
  const lines = [
    `${pc.dim('Visit')} ${verificationUri}`,
    `${pc.dim('Code')}  ${pc.bold(userCode)}`,
  ];
  note(lines.join('\n'), 'Confirm this device');
}

type Progress = {
  start: (message: string) => void;
  stop: (message: string) => void;
};

// Spinners are animated only on interactive terminals; in CI or when piped
// they degrade to plain log lines.
export function progress(): Progress {
  if (process.stdout.isTTY) {
    const active = spinner();
    return {
      start: (message) => active.start(message),
      stop: (message) => active.stop(message),
    };
  }
  return {
    start: (message) => log.step(message),
    stop: (message) => log.step(message),
  };
}

export function keyValueRows(rows: [string, string][]): string {
  const width = Math.max(...rows.map(([label]) => label.length));
  const lines = rows.map(([label, value]) => `${pc.dim(label.padEnd(width))}  ${value}`);
  return lines.join('\n');
}
