import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';

import { entryQuery } from '#/content/entry/functions';
import { contentModelQuery } from '#/content/model/functions';
import { useAppRoute } from '#/use-app-route';

export type AssistantLocation = {
  /** What the page holds, for the empty state's suggestions. */
  kind: 'home' | 'collection' | 'entry' | 'map' | 'page';
  /** Short chip text, e.g. `Posts · Hello world`. */
  label: string;
  /** The sentence the agent receives with each message. */
  prompt: string;
};

const staticPages: Record<string, Omit<AssistantLocation, 'kind'>> = {
  '/app/analytics': { label: 'Analytics', prompt: 'the analytics page' },
  '/app/developers/keys': { label: 'API keys', prompt: 'the API keys page' },
  '/app/developers/webhooks': { label: 'Webhooks', prompt: 'the webhooks page' },
  '/app/organization': { label: 'Organization', prompt: 'the organization settings' },
  '/app/settings': { label: 'Settings', prompt: 'their account settings' },
};

/**
 * Where in the app the user is standing, resolved from the URL and the
 * content model. Sent with every chat message so the assistant can answer
 * "summarize this" without being told what "this" is.
 */
export function useAssistantLocation(): AssistantLocation {
  const { activeOrganization } = useAppRoute();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const model = useSuspenseQuery(contentModelQuery(activeOrganization.id)).data;

  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  const area = segments[1];
  const type =
    area === 'c' || area === 'm'
      ? model.types.find((candidate) => candidate.slug === segments[2])
      : undefined;
  const entryId = area === 'c' ? segments[3] : undefined;

  const entry = useQuery({
    ...entryQuery(activeOrganization.id, entryId ?? ''),
    enabled: entryId !== undefined,
  }).data;

  if (type !== undefined && area === 'c') {
    if (entryId !== undefined) {
      const title = entry?.entry.title;
      return {
        kind: 'entry',
        label: `${type.name} · ${title ?? '…'}`,
        prompt: `the entry "${title ?? 'untitled'}" (id ${entryId}) in the collection "${type.name}" (slug ${type.slug})`,
      };
    }
    return {
      kind: 'collection',
      label: type.name,
      prompt: `the collection "${type.name}" (slug ${type.slug})`,
    };
  }
  if (type !== undefined && area === 'm') {
    const field = segments[3];
    if (field !== undefined) {
      return {
        kind: 'map',
        label: `${type.name} · ${field}`,
        prompt: `the "${field}" body of the map "${type.name}" (slug ${type.slug})`,
      };
    }
    return { kind: 'map', label: type.name, prompt: `the map "${type.name}" (slug ${type.slug})` };
  }
  if (pathname === '/app') {
    return { kind: 'home', label: 'Home', prompt: 'the home page' };
  }
  const known = staticPages[pathname];
  if (known !== undefined) {
    return { kind: 'page', ...known };
  }
  return { kind: 'page', label: 'App', prompt: `the page ${pathname}` };
}
