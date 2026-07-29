import fs from 'node:fs';
import path from 'node:path';

import { defaultKeyHasher } from '@better-auth/api-key';
import { D1Helper } from '@nerdfolio/drizzle-d1-helpers';
import { hashPassword } from 'better-auth/crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema/index.ts';
import {
  seedAdmin,
  seedAdminOrganization,
  seedApiKey,
  seedAsset,
  seedContent,
  seedInvitation,
  seedOrganization,
  seedSubscription,
  seedUser,
} from './seed-data.ts';

// Resets the local miniflare D1 database to a known state: wipes the auth
// tables and inserts the deterministic seed user that e2e tests rely on.
// Run schema changes first via `pnpm seed` (which runs `drizzle-kit push`).

// D1Helper discovers the wrangler config from cwd, so resolve from apps/web
// (same trick as drizzle.config.ts).
const webDir = path.resolve(import.meta.dirname, '../../../apps/web');
const cwd = process.cwd();
process.chdir(webDir);
const sqliteFile = path.resolve(webDir, D1Helper.get().sqliteLocalFile);
process.chdir(cwd);

if (!fs.existsSync(sqliteFile)) {
  throw new Error(
    `Local D1 sqlite file not found at ${sqliteFile}. Start the dev server once (\`vp dev\`) and make a request that touches the database so miniflare creates it.`,
  );
}

const sqlite = new Database(sqliteFile);
const db = drizzle(sqlite, { schema });
const now = new Date();

// Notification tables first: better-sqlite3 leaves foreign_keys off, so the
// ON DELETE CASCADE clauses never fire and orphans would survive the wipe.
db.delete(schema.notification).run();
db.delete(schema.notificationPreference).run();
db.delete(schema.notificationSettings).run();
db.delete(schema.contentEntry).run();
db.delete(schema.contentField).run();
db.delete(schema.contentType).run();
db.delete(schema.document).run();
db.delete(schema.apikey).run();
db.delete(schema.asset).run();
db.delete(schema.usage).run();
db.delete(schema.subscription).run();
db.delete(schema.verification).run();
db.delete(schema.session).run();
db.delete(schema.account).run();
db.delete(schema.invitation).run();
db.delete(schema.member).run();
db.delete(schema.organization).run();
db.delete(schema.user).run();

db.insert(schema.user)
  .values({
    id: seedUser.id,
    name: seedUser.name,
    email: seedUser.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  .run();

db.insert(schema.account)
  .values({
    id: `${seedUser.id}-credential`,
    accountId: seedUser.id,
    providerId: 'credential',
    userId: seedUser.id,
    password: await hashPassword(seedUser.password),
    createdAt: now,
    updatedAt: now,
  })
  .run();

db.insert(schema.user)
  .values({
    id: seedAdmin.id,
    name: seedAdmin.name,
    email: seedAdmin.email,
    emailVerified: true,
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  })
  .run();

db.insert(schema.account)
  .values({
    id: `${seedAdmin.id}-credential`,
    accountId: seedAdmin.id,
    providerId: 'credential',
    userId: seedAdmin.id,
    password: await hashPassword(seedAdmin.password),
    createdAt: now,
    updatedAt: now,
  })
  .run();

db.insert(schema.organization)
  .values([
    {
      id: seedOrganization.id,
      name: seedOrganization.name,
      slug: seedOrganization.slug,
      createdAt: now,
    },
    {
      id: seedAdminOrganization.id,
      name: seedAdminOrganization.name,
      slug: seedAdminOrganization.slug,
      createdAt: now,
    },
  ])
  .run();

db.insert(schema.member)
  .values([
    {
      id: `${seedOrganization.id}-owner`,
      organizationId: seedOrganization.id,
      userId: seedUser.id,
      role: 'owner',
      createdAt: now,
    },
    {
      id: `${seedAdminOrganization.id}-owner`,
      organizationId: seedAdminOrganization.id,
      userId: seedAdmin.id,
      role: 'owner',
      createdAt: now,
    },
  ])
  .run();

db.insert(schema.invitation)
  .values({
    id: seedInvitation.id,
    email: seedInvitation.email,
    inviterId: seedUser.id,
    organizationId: seedOrganization.id,
    role: 'member',
    status: 'pending',
    expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
    createdAt: now,
  })
  .run();

db.insert(schema.subscription)
  .values({
    id: seedSubscription.id,
    plan: seedSubscription.plan,
    referenceId: seedOrganization.id,
    stripeCustomerId: seedSubscription.stripeCustomerId,
    stripeSubscriptionId: seedSubscription.stripeSubscriptionId,
    status: 'active',
    periodStart: now,
    periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    seats: 1,
    billingInterval: 'month',
    createdAt: now,
    updatedAt: now,
  })
  .run();

db.insert(schema.asset)
  .values({
    id: seedAsset.id,
    key: `${seedOrganization.id}/${seedAsset.id}`,
    organizationId: seedOrganization.id,
    uploadedBy: seedUser.id,
    kind: 'attachment',
    name: seedAsset.name,
    size: 1024,
    contentType: 'application/pdf',
    status: 'uploaded',
    createdAt: now,
  })
  .run();

db.insert(schema.apikey)
  .values({
    id: seedApiKey.id,
    configId: 'default',
    name: seedApiKey.name,
    start: seedApiKey.key.slice(0, 6),
    prefix: 'stet_',
    referenceId: seedOrganization.id,
    key: await defaultKeyHasher(seedApiKey.key),
    enabled: true,
    rateLimitEnabled: false,
    requestCount: 0,
    createdAt: now,
    updatedAt: now,
  })
  .run();

db.insert(schema.contentType)
  .values([
    {
      id: seedContent.posts.id,
      organizationId: seedOrganization.id,
      slug: seedContent.posts.slug,
      name: seedContent.posts.name,
      kind: 'collection',
      createdAt: now,
    },
    {
      id: seedContent.landing.id,
      organizationId: seedOrganization.id,
      slug: seedContent.landing.slug,
      name: seedContent.landing.name,
      kind: 'map',
      // After posts, so the model (and the client generated from it) keeps a
      // stable order across reseeds.
      createdAt: new Date(now.getTime() + 1000),
    },
  ])
  .run();

db.insert(schema.contentField)
  .values([
    {
      id: 'seed-field-summary',
      typeId: seedContent.posts.id,
      key: 'summary',
      name: 'Summary',
      type: 'text',
      config: '{}',
      position: 0,
      createdAt: now,
    },
    {
      id: 'seed-field-body',
      typeId: seedContent.posts.id,
      key: 'body',
      name: 'Body',
      type: 'rich_text',
      config: '{}',
      position: 1,
      createdAt: now,
    },
    {
      id: 'seed-field-headline',
      typeId: seedContent.landing.id,
      key: 'headline',
      name: 'Headline',
      type: 'text',
      config: '{}',
      position: 0,
      createdAt: now,
    },
    {
      id: 'seed-field-pitch',
      typeId: seedContent.landing.id,
      key: 'pitch',
      name: 'Pitch',
      type: 'rich_text',
      config: '{}',
      position: 1,
      createdAt: now,
    },
  ])
  .run();

db.insert(schema.contentEntry)
  .values([
    {
      id: seedContent.post.id,
      typeId: seedContent.posts.id,
      organizationId: seedOrganization.id,
      slug: seedContent.post.slug,
      title: seedContent.post.title,
      values: JSON.stringify({ summary: 'The first post in the seeded Posts collection.' }),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-entry-together',
      typeId: seedContent.posts.id,
      organizationId: seedOrganization.id,
      slug: 'writing-together',
      title: 'Writing together',
      values: JSON.stringify({ summary: 'Open this one in two windows and watch the carets.' }),
      createdAt: new Date(now.getTime() + 1000),
      updatedAt: new Date(now.getTime() + 1000),
    },
    {
      id: 'seed-entry-landing',
      typeId: seedContent.landing.id,
      organizationId: seedOrganization.id,
      slug: 'default',
      title: seedContent.landing.name,
      values: JSON.stringify({ headline: 'Both teams at full speed' }),
      createdAt: now,
      updatedAt: now,
    },
  ])
  .run();

sqlite.close();
console.log(
  `Seeded ${path.basename(sqliteFile)} with users ${seedUser.email} and ${seedAdmin.email} (admin), ` +
    `the ${seedContent.posts.slug}/${seedContent.landing.slug} content model, and API key ${seedApiKey.key}`,
);
