import { Command } from 'commander';
import open from 'open';

import { CLI_CLIENT_ID, createClient, resolveOrigin } from '#/client';
import type { Client } from '#/client';
import { saveAuth } from '#/store';
import * as ui from '#/ui';

const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

type DeviceCode = {
  device_code: string;
  expires_in: number;
  interval?: number;
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function pollForToken(client: Client, device: DeviceCode): Promise<string> {
  const waiting = ui.progress();
  waiting.start('Waiting for approval in the browser…');
  let intervalSeconds = device.interval ?? 5;
  const deadline = Date.now() + device.expires_in * 1000;

  while (Date.now() < deadline) {
    await sleep(intervalSeconds * 1000);
    const { data, error } = await client.device.token({
      grant_type: DEVICE_GRANT_TYPE,
      device_code: device.device_code,
      client_id: CLI_CLIENT_ID,
    });
    if (data !== null) {
      waiting.stop('Approved');
      return data.access_token;
    }
    if (error.error === 'authorization_pending') {
      continue;
    }
    if (error.error === 'slow_down') {
      intervalSeconds = intervalSeconds + 5;
      continue;
    }
    waiting.stop('Not approved');
    if (error.error === 'access_denied') {
      ui.fail('The request was denied in the browser.');
    }
    if (error.error === 'expired_token') {
      ui.fail('The code expired before the login was approved. Run `onyx login` again.');
    }
    ui.fail(error.error_description ?? 'Device authorization failed.');
  }

  waiting.stop('Timed out');
  ui.fail('The code expired before the login was approved. Run `onyx login` again.');
}

export const loginCommand = new Command('login')
  .description('Log in to Onyx from this machine')
  .option('--url <origin>', 'Onyx server origin (defaults to $ONYX_API_URL or the hosted app)')
  .option('--no-open', 'Print the verification link instead of opening a browser')
  .action(async (options: { url?: string; open: boolean }) => {
    const origin = resolveOrigin(options.url);
    const client = createClient(origin);

    ui.begin('onyx login');

    const { data: device, error } = await client.device.code({ client_id: CLI_CLIENT_ID });
    if (error !== null || device === null) {
      ui.fail(error?.error_description ?? `Could not reach ${origin}.`);
    }

    ui.showVerification(device.verification_uri, device.user_code);

    if (options.open === true) {
      const verificationUrl = device.verification_uri_complete ?? device.verification_uri;
      try {
        await open(verificationUrl);
      } catch {
        ui.info('Could not open a browser. Use the link above to continue.');
      }
    }

    const token = await pollForToken(client, device);
    saveAuth({ origin, token });

    const { data: session } = await client.getSession({
      fetchOptions: { headers: { Authorization: `Bearer ${token}` } },
    });
    const email = session?.user.email ?? 'your account';
    ui.done(`Logged in as ${email}`);
  });
