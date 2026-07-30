import type { AiEnv } from '@repo/ai/model';
import { createContentMcpServer } from '@repo/ai/mcp';
import { type AnalyticsEnv, AnalyticsStore as AnalyticsStoreBase } from '@repo/analytics/store';
import { ChatAgent as ChatAgentBase } from '@repo/ai/server';
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from '@repo/auth/server';
import { ai, BillingError } from '@repo/billing/server';
import { handleScheduled } from '@repo/crons/server';
import { and, database, eq, schema } from '@repo/db';
import { handleQueue } from '@repo/jobs/server';
import { type HubEnv, NotificationHub as NotificationHubBase } from '@repo/notifications/server';
import { PagePresenceRoom as PagePresenceRoomBase } from '@repo/realtime/server';
import {
  InvitationReminderWorkflow as InvitationReminderWorkflowBase,
  SiteImportWorkflow as SiteImportWorkflowBase,
  type WorkflowsEnv,
} from '@repo/workflows/server';
import * as Sentry from '@sentry/cloudflare';
import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { routeAgentRequest } from 'agents';
import { createMcpHandler } from 'agents/mcp';
import { env } from 'cloudflare:workers';
import { getServerByName } from 'partyserver';

import { auth } from '#/auth-server';
import { sentryOptions } from '#/observability';
import { enforceAuthRateLimit, withSecurityHeaders } from '#/security';

// Durable Objects and workflows run outside the fetch handler, so each needs
// its own Sentry initialization to report the errors thrown inside it. Sentry
// takes the environment type from the options callback rather than the class,
// so each wrapper names the env its class declares.
export const AnalyticsStore = Sentry.instrumentDurableObjectWithSentry(
  sentryOptions<AnalyticsEnv>,
  AnalyticsStoreBase,
);
export const ChatAgent = Sentry.instrumentDurableObjectWithSentry(
  sentryOptions<Cloudflare.Env & AiEnv>,
  ChatAgentBase,
);
export const NotificationHub = Sentry.instrumentDurableObjectWithSentry(
  sentryOptions<HubEnv>,
  NotificationHubBase,
);
export const PagePresenceRoom = Sentry.instrumentDurableObjectWithSentry(
  sentryOptions<Env>,
  PagePresenceRoomBase,
);
export const InvitationReminderWorkflow = Sentry.instrumentWorkflowWithSentry(
  sentryOptions<WorkflowsEnv>,
  InvitationReminderWorkflowBase,
);
export const SiteImportWorkflow = Sentry.instrumentWorkflowWithSentry(
  sentryOptions<WorkflowsEnv>,
  SiteImportWorkflowBase,
);

const entry = createServerEntry({
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/realtime') {
      return handleRealtimeConnection(request, url);
    }
    if (url.pathname === '/api/notifications') {
      return handleNotificationConnection(request);
    }
    if (url.pathname.startsWith('/agents/')) {
      return handleAgentRequest(request, url);
    }

    const limited = await enforceAuthRateLimit(request, url);
    if (limited !== null) {
      return limited;
    }

    return withSecurityHeaders(await handler.fetch(request));
  },
});

// withSentry instruments all three handlers, so an uncaught error is reported
// with the trigger that produced it (request, cron, or queue batch).
export default Sentry.withSentry(sentryOptions, {
  // MCP is handled here rather than in the entry above because its handler
  // wants the real ExecutionContext, which TanStack Start's entry does not
  // pass through (the entry reads bindings from `cloudflare:workers` instead).
  fetch: (request: Request, _env: unknown, ctx: ExecutionContext) => {
    const url = new URL(request.url);
    // OAuth discovery for MCP clients, which expect these at the root.
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      return oAuthDiscoveryMetadata(auth)(request);
    }
    if (url.pathname === '/.well-known/oauth-protected-resource') {
      return oAuthProtectedResourceMetadata(auth)(request);
    }
    if (url.pathname === '/mcp') {
      return handleMcpRequest(request, url, ctx);
    }
    return entry.fetch(request);
  },
  // Cron Triggers (wrangler.jsonc `triggers.crons`) land here.
  scheduled: handleScheduled,
  // The stet-jobs queue consumer (wrangler.jsonc `queues.consumers`).
  queue: handleQueue,
});

// The session's active organization outlives a removal by up to the cookie
// cache's maxAge, so every organization-scoped entry point verifies the
// member row still exists before any org resource is reached.
async function isOrganizationMember(organizationId: string, userId: string): Promise<boolean> {
  const db = await database();
  const membership = await db.query.member.findFirst({
    where: and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, userId)),
  });
  return membership !== undefined;
}

// Same shape as the realtime handler below: authenticate in the worker, then
// only route to agent instances scoped to the caller's org + user. The
// instance name is part of the URL (/agents/chat-agent/:name), so a client
// asking for any other conversation is rejected before the Durable Object is
// ever reached.
async function handleAgentRequest(request: Request, url: URL): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  const organizationId = session?.session.activeOrganizationId;
  if (session === null || organizationId === null || organizationId === undefined) {
    return new Response('Unauthorized.', { status: 401 });
  }
  if (!(await isOrganizationMember(organizationId, session.user.id))) {
    return new Response('Forbidden.', { status: 403 });
  }

  const allowedName = `${organizationId}:${session.user.id}`;
  const requestedName = decodeURIComponent(url.pathname.split('/')[3] ?? '');
  if (requestedName !== allowedName) {
    return new Response('Forbidden.', { status: 403 });
  }

  // The AI assistant is plan-gated. Enforced here in the worker so the chat
  // UI's own check can never be bypassed; the guard's message names the
  // cheapest plan that includes the feature.
  try {
    await ai.require(organizationId);
  } catch (error) {
    if (error instanceof BillingError) {
      return new Response(error.message, { status: 403 });
    }
    throw error;
  }

  const response = await routeAgentRequest(request, env);
  if (response === null || response === undefined) {
    return new Response('Not found.', { status: 404 });
  }
  return response;
}

// The same tools the chat agent runs, served over MCP to OAuth-authenticated
// clients (Claude, editors). The Better Auth mcp plugin issues the tokens;
// this handler validates one, resolves the organization the tools act on,
// and enforces the same plan gate as the chat agent.
async function handleMcpRequest(request: Request, url: URL, ctx: ExecutionContext) {
  const session = await auth.api.getMcpSession({ headers: request.headers });
  const userId = session?.userId;
  if (session === null || userId === null || userId === undefined) {
    // Points token-less clients at the discovery flow, per the MCP auth spec.
    return new Response('Unauthorized.', {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`,
      },
    });
  }

  const resolved = await resolveMcpOrganization(userId, url.searchParams.get('organization'));
  if (resolved instanceof Response) {
    return resolved;
  }

  try {
    await ai.require(resolved);
  } catch (error) {
    if (error instanceof BillingError) {
      return new Response(error.message, { status: 403 });
    }
    throw error;
  }

  return createMcpHandler(createContentMcpServer(resolved), { route: '/mcp' })(request, env, ctx);
}

/**
 * The organization MCP tools act on. Tokens are user-scoped, so a member of
 * several organizations pins one with `?organization=<slug>` on the MCP URL;
 * with a single membership the choice is made for them.
 */
async function resolveMcpOrganization(
  userId: string,
  slug: string | null,
): Promise<string | Response> {
  const db = await database();
  const memberships = await db
    .select({ id: schema.organization.id, slug: schema.organization.slug })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
    .where(eq(schema.member.userId, userId));

  if (memberships.length === 0) {
    return new Response('This account belongs to no organization.', { status: 403 });
  }
  if (slug !== null) {
    const match = memberships.find((membership) => membership.slug === slug);
    if (match === undefined) {
      return new Response(
        `No organization with slug "${slug}". Yours: ${memberships.map((m) => m.slug).join(', ')}.`,
        {
          status: 403,
        },
      );
    }
    return match.id;
  }
  if (memberships.length === 1) {
    return memberships[0].id;
  }
  return new Response(
    `This account belongs to several organizations; add ?organization=<slug> to the MCP URL. Yours: ${memberships.map((m) => m.slug).join(', ')}.`,
    { status: 400 },
  );
}

// Auth happens here in the worker, before the Durable Object ever sees the
// socket. Rooms are scoped to the active organization server-side, so a
// client can never join a room outside its org.
async function handleRealtimeConnection(request: Request, url: URL): Promise<Response> {
  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('Expected a WebSocket upgrade.', { status: 426 });
  }

  const page = url.searchParams.get('page');
  if (!isPagePath(page)) {
    return new Response('Invalid page.', { status: 400 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const organizationId = session?.session.activeOrganizationId ?? null;
  if (session === null || organizationId === null) {
    return new Response('Unauthorized.', { status: 401 });
  }
  if (!(await isOrganizationMember(organizationId, session.user.id))) {
    return new Response('Forbidden.', { status: 403 });
  }

  const roomName = `${organizationId}:${page}`;
  // An error thrown while waking the room (for example a stale local D1
  // schema failing the document load) must fail this one connection: thrown
  // from a WebSocket upgrade it kills the whole Vite dev server instead of
  // becoming a 500, and the client provider retries on close anyway.
  try {
    const room = await getServerByName(env.PAGE_PRESENCE, roomName);
    return await room.fetch(request);
  } catch (error) {
    Sentry.captureException(error);
    return new Response('Realtime room unavailable.', { status: 503 });
  }
}

function isPagePath(page: string | null): page is string {
  return page !== null && page.startsWith('/') && page.length <= 512;
}

// Same auth stance as the realtime handler: the session decides which hub
// the socket lands on, so a client can only ever hold its own notification
// hub. The identity headers tell the hub who it belongs to (its alarm sends
// the digest email without a request in hand).
async function handleNotificationConnection(request: Request): Promise<Response> {
  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('Expected a WebSocket upgrade.', { status: 426 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const organizationId = session?.session.activeOrganizationId ?? null;
  if (session === null || organizationId === null) {
    return new Response('Unauthorized.', { status: 401 });
  }
  if (!(await isOrganizationMember(organizationId, session.user.id))) {
    return new Response('Forbidden.', { status: 403 });
  }

  const hubName = `${organizationId}:${session.user.id}`;
  const hub = env.NOTIFICATION_HUB.get(env.NOTIFICATION_HUB.idFromName(hubName));

  const forwarded = new Request(request);
  forwarded.headers.set('x-user-id', session.user.id);
  forwarded.headers.set('x-organization-id', organizationId);
  return hub.fetch(forwarded);
}
