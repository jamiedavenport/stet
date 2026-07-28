#!/usr/bin/env node
import { Command } from 'commander';

import pkg from '../package.json' with { type: 'json' };
import { loginCommand } from '#/commands/login';
import { orgCommand } from '#/commands/org';
import { whoamiCommand } from '#/commands/whoami';

const program = new Command();

program.name('onyx').description('Onyx from the command line').version(pkg.version);

program.addCommand(loginCommand);
program.addCommand(orgCommand);
program.addCommand(whoamiCommand);

await program.parseAsync(process.argv);
