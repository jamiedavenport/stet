#!/usr/bin/env node
import { Command } from 'commander';

import pkg from '../package.json' with { type: 'json' };
import { generateCommand } from '#/commands/generate';
import { loginCommand } from '#/commands/login';
import { logoutCommand } from '#/commands/logout';
import { orgCommand } from '#/commands/org';
import { syncCommand } from '#/commands/sync';
import { whoamiCommand } from '#/commands/whoami';

const program = new Command();

program.name('stet').description('Stet from the command line').version(pkg.version);

program.addCommand(generateCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(orgCommand);
program.addCommand(syncCommand);
program.addCommand(whoamiCommand);

await program.parseAsync(process.argv);
