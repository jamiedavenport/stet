import { Command } from 'commander';

import { clearAuth, loadAuth } from '#/store';
import * as ui from '#/ui';

export const logoutCommand = new Command('logout')
  .description('Log out of Stet on this machine')
  .action(() => {
    ui.begin('stet logout');

    const stored = loadAuth();
    clearAuth();

    if (stored === null) {
      ui.done('Already logged out.');
      return;
    }

    ui.done('Logged out.');
  });
