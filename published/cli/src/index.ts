#!/usr/bin/env node
import { Command } from 'commander';

import pkg from '../package.json' with { type: 'json' };
import { generateCommand } from '#/commands/generate';
import { loginCommand } from '#/commands/login';
import { orgCommand } from '#/commands/org';
import { whoamiCommand } from '#/commands/whoami';

const program = new Command();

program.name('stet').description('Stet from the command line').version(pkg.version);

program.addCommand(generateCommand);
program.addCommand(loginCommand);
program.addCommand(orgCommand);
program.addCommand(whoamiCommand);

await program.parseAsync(process.argv);
