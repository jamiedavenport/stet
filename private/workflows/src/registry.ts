import type { z } from 'zod';

import { invitationReminder } from './workflows/invitation-reminder/definition.ts';

// Every workflow in the app. Adding one means creating a definition + class
// under src/workflows/<name>/ and listing the definition here; the wrangler
// `workflows` config is generated from this registry, startWorkflow() picks
// up the params typing, and server.ts must export the class.
export const registry = {
  [invitationReminder.name]: invitationReminder,
} as const;

type Registry = typeof registry;
export type WorkflowName = keyof Registry;
export type WorkflowParams<TName extends WorkflowName> = z.output<Registry[TName]['schema']>;
