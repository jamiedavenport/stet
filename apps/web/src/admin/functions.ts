import { toPlanName } from '@repo/billing/server';
import type { PlanName } from '@repo/billing/types';
import {
  and,
  count,
  countDistinct,
  database,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  like,
  schema,
} from '@repo/db';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { auth } from '#/auth-server';
import { adminMiddleware } from '#/session';

export const adminPageSize = 20;

// The window "new" and "active" are measured over on the stats page.
const activityWindowDays = 30;

function windowStart(): Date {
  return new Date(Date.now() - activityWindowDays * 24 * 60 * 60 * 1000);
}

const getPlatformStats = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const db = await database();
    const since = windowStart();
    // An organization counts as active when someone signed into it recently,
    // which is the cheapest signal available without an events table.
    const [users, newUsers, organizations, activeOrganizations] = await Promise.all([
      db.$count(schema.user),
      db.$count(schema.user, gte(schema.user.createdAt, since)),
      db.$count(schema.organization),
      db
        .select({ value: countDistinct(schema.session.activeOrganizationId) })
        .from(schema.session)
        .where(
          and(isNotNull(schema.session.activeOrganizationId), gte(schema.session.createdAt, since)),
        ),
    ]);
    return {
      users,
      newUsers,
      organizations,
      activeOrganizations: activeOrganizations[0]?.value ?? 0,
      windowDays: activityWindowDays,
    };
  });

export const platformStatsQuery = queryOptions({
  queryKey: ['admin', 'stats'],
  queryFn: () => getPlatformStats(),
  staleTime: 30_000,
});

const listInput = z.object({
  search: z.string().trim().max(200).default(''),
  page: z.number().int().min(0).default(0),
});

// Delegates to the admin plugin so listing stays subject to its own
// permission check, not just the middleware. Search is by email: it is the
// identifier support tickets carry.
const getAdminUsers = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(listInput)
  .handler(async ({ data, context }) => {
    const result = await auth.api.listUsers({
      headers: context.headers,
      query: {
        limit: adminPageSize,
        offset: data.page * adminPageSize,
        sortBy: 'createdAt',
        sortDirection: 'desc',
        ...(data.search === ''
          ? {}
          : { searchField: 'email', searchOperator: 'contains', searchValue: data.search }),
      },
    });
    const users = 'users' in result ? result.users : [];
    const total = 'total' in result ? result.total : 0;
    return {
      total,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role ?? 'user',
        banned: user.banned === true,
        banReason: user.banReason ?? null,
        createdAt: user.createdAt,
      })),
    };
  });

export type AdminUser = Awaited<ReturnType<typeof getAdminUsers>>['users'][number];

// keepPreviousData holds the current page on screen while the next one
// loads, so paging and searching never blank the table.
export const adminUsersQuery = (input: { search: string; page: number }) =>
  queryOptions({
    queryKey: ['admin', 'users', input.search, input.page],
    queryFn: () => getAdminUsers({ data: input }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

// Organizations are not covered by the admin plugin (its organization
// endpoints are scoped to the caller's own memberships), so this reads D1
// directly.
const getAdminOrganizations = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(listInput)
  .handler(async ({ data }) => {
    const db = await database();
    const where =
      data.search === '' ? undefined : like(schema.organization.name, `%${data.search}%`);
    const [rows, total] = await Promise.all([
      db
        .select({
          id: schema.organization.id,
          name: schema.organization.name,
          slug: schema.organization.slug,
          createdAt: schema.organization.createdAt,
          members: count(schema.member.id),
        })
        .from(schema.organization)
        .leftJoin(schema.member, eq(schema.member.organizationId, schema.organization.id))
        .where(where)
        .groupBy(schema.organization.id)
        .orderBy(desc(schema.organization.createdAt))
        .limit(adminPageSize)
        .offset(data.page * adminPageSize),
      db.$count(schema.organization, where),
    ]);
    const plans = await organizationPlans(rows.map((row) => row.id));
    return {
      total,
      organizations: rows.map((row) => ({ ...row, plan: plans.get(row.id) ?? 'free' })),
    };
  });

async function organizationPlans(ids: string[]): Promise<Map<string, PlanName>> {
  if (ids.length === 0) {
    return new Map();
  }
  const db = await database();
  const subscriptions = await db.query.subscription.findMany({
    where: and(
      inArray(schema.subscription.referenceId, ids),
      inArray(schema.subscription.status, ['active', 'trialing']),
    ),
  });
  return new Map(
    subscriptions.map((subscription) => [subscription.referenceId, toPlanName(subscription.plan)]),
  );
}

export const adminOrganizationsQuery = (input: { search: string; page: number }) =>
  queryOptions({
    queryKey: ['admin', 'organizations', input.search, input.page],
    queryFn: () => getAdminOrganizations({ data: input }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
