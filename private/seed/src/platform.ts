import { defaultKeyHasher } from '@better-auth/api-key';
import { schema } from '@repo/db';
import {
  seedAdmin,
  seedAdminOrganization,
  seedApiKey,
  seedAuthors,
  seedInvitation,
  seedOrganization,
  seedSubscription,
  seedUser,
} from '@repo/db/seed-data';
import { hashPassword } from 'better-auth/crypto';

import { assetKey, seedAssets } from './assets';
import type { Db } from './db';

// Everything the demo workspace sits on: who exists, which organization they
// belong to, what it is paying for, and the files and key it holds. The ids
// and names all come from `@repo/db/seed-data`, which is what the e2e tests
// assert against.

// seedAdmin is platform staff for /app/admin; the authors are ordinary
// members who own the demo posts. All sign in the same way.
export const people = [
  { ...seedUser, role: null },
  { ...seedAdmin, role: 'admin' },
  ...seedAuthors.map((author) => ({ ...author, role: null })),
];

/**
 * Empties every table the seed writes. Notification tables go first:
 * better-sqlite3 leaves foreign_keys off, so the ON DELETE CASCADE clauses
 * never fire and orphans would survive the wipe.
 */
export function wipe(db: Db): void {
  for (const table of [
    schema.notification,
    schema.notificationPreference,
    schema.notificationSettings,
    schema.contentRevision,
    schema.contentEntry,
    schema.contentField,
    schema.contentType,
    schema.document,
    schema.apikey,
    schema.asset,
    schema.usage,
    schema.subscription,
    schema.verification,
    schema.session,
    schema.account,
    schema.invitation,
    schema.member,
    schema.organization,
    schema.user,
  ]) {
    db.delete(table).run();
  }
}

export async function writePlatform(db: Db, now: Date): Promise<void> {
  db.insert(schema.user)
    .values(
      people.map((person) => ({
        id: person.id,
        name: person.name,
        email: person.email,
        emailVerified: true,
        role: person.role,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .run();

  db.insert(schema.account)
    .values(
      await Promise.all(
        people.map(async (person) => ({
          id: `${person.id}-credential`,
          accountId: person.id,
          providerId: 'credential',
          userId: person.id,
          password: await hashPassword(person.password),
          createdAt: now,
          updatedAt: now,
        })),
      ),
    )
    .run();

  db.insert(schema.organization)
    .values(
      [seedOrganization, seedAdminOrganization].map((organization) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: now,
      })),
    )
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
      ...seedAuthors.map((author) => ({
        id: `${seedOrganization.id}-${author.id}`,
        organizationId: seedOrganization.id,
        userId: author.id,
        role: 'member',
        createdAt: now,
      })),
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
    .values(
      seedAssets.map((asset) => ({
        id: asset.id,
        key: assetKey(asset.id),
        organizationId: seedOrganization.id,
        uploadedBy: asset.uploadedBy,
        kind: asset.kind,
        name: asset.name,
        size: asset.bytes().byteLength,
        contentType: asset.contentType,
        status: 'uploaded',
        createdAt: now,
      })),
    )
    .run();

  db.insert(schema.apikey)
    .values({
      id: seedApiKey.id,
      configId: 'default',
      name: seedApiKey.name,
      // Matches startingCharactersConfig in private/auth, so the seeded key
      // reads on the keys page exactly like a minted one.
      start: seedApiKey.key.slice(0, 12),
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
}
