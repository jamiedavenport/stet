import type { Workflow } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';

import { registry } from './registry';
import type { WorkflowName, WorkflowParams } from './registry';

export type StartWorkflowOptions = {
  // Stable instance id for deduplication: creating an instance with an id
  // that already exists throws, which callers can use to guarantee one
  // running chain per entity.
  id?: string;
};

export async function startWorkflow<TName extends WorkflowName>(
  name: TName,
  params: WorkflowParams<TName>,
  options?: StartWorkflowOptions,
): Promise<{ id: string }> {
  const definition = registry[name];
  // Cloudflare.Env is only populated by the app's generated types, so the
  // binding lookup casts once at the boundary; the binding name is pinned to
  // the definition, and params are checked against the schema below.
  const bindings = env as unknown as Record<string, Workflow<WorkflowParams<TName>>>;
  const workflow = bindings[definition.binding];
  const instance = await workflow.create({
    id: options?.id,
    params: definition.schema.parse(params) as WorkflowParams<TName>,
  });
  return { id: instance.id };
}

/**
 * Terminates a running instance by its stable id. Idempotent: unknown,
 * finished, and already-terminated instances have nothing to stop, so those
 * errors are swallowed.
 */
export async function terminateWorkflow(name: WorkflowName, id: string): Promise<void> {
  const definition = registry[name];
  const bindings = env as unknown as Record<string, Workflow>;
  const workflow = bindings[definition.binding];
  try {
    const instance = await workflow.get(id);
    await instance.terminate();
  } catch {
    // Nothing running under that id.
  }
}
