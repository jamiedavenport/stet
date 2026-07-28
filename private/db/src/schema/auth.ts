import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  // BCP 47 base tag from @repo/i18n's locale list; null means "follow the
  // browser". Written through Better Auth updateUser (additionalFields).
  locale: text('locale'),
  // Set by the two-factor plugin once a user finishes TOTP enrolment; sign-in
  // then requires a second factor.
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(false),
  // Platform-wide role for the admin plugin ('user' or 'admin'), unrelated to
  // the per-organization member.role. Never client-writable, so the first
  // admin is promoted with SQL (see DEPLOY.md).
  role: text('role'),
  // Ban state managed by the admin plugin. A banned user cannot create a
  // session; the plugin lifts the ban itself once banExpires passes.
  banned: integer('banned', { mode: 'boolean' }).default(false),
  banReason: text('ban_reason'),
  banExpires: integer('ban_expires', { mode: 'timestamp' }),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// TOTP secrets and backup codes managed by the Better Auth two-factor plugin.
// One row per user; `secret` and `backupCodes` are stored encrypted and never
// returned to the client. `verified` gates enrolment: a row exists once setup
// starts, but the second factor is only required after the first TOTP verify.
export const twoFactor = sqliteTable(
  'two_factor',
  {
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    verified: integer('verified', { mode: 'boolean' }).notNull().default(true),
    failedVerificationCount: integer('failed_verification_count').notNull().default(0),
    lockedUntil: integer('locked_until', { mode: 'timestamp' }),
  },
  (table) => [index('two_factor_user_idx').on(table.userId)],
);

// WebAuthn credentials managed by the @better-auth/passkey plugin. One row
// per registered authenticator; `counter` is the signature counter used for
// clone detection and `aaguid` identifies the authenticator model for
// display labels.
export const passkey = sqliteTable(
  'passkey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    credentialID: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: integer('backed_up', { mode: 'boolean' }).notNull(),
    transports: text('transports'),
    createdAt: integer('created_at', { mode: 'timestamp' }),
    aaguid: text('aaguid'),
  },
  (table) => [
    index('passkey_user_idx').on(table.userId),
    index('passkey_credential_idx').on(table.credentialID),
  ],
);

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  activeOrganizationId: text('active_organization_id'),
  // Set by the admin plugin on an impersonation session: the id of the admin
  // acting as this user. The app shows a banner while it is present.
  impersonatedBy: text('impersonated_by'),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const deviceCode = sqliteTable('device_code', {
  id: text('id').primaryKey(),
  deviceCode: text('device_code').notNull(),
  userCode: text('user_code').notNull(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull(),
  lastPolledAt: integer('last_polled_at', { mode: 'timestamp' }),
  pollingInterval: integer('polling_interval'),
  clientId: text('client_id'),
  scope: text('scope'),
});

// API keys managed by the Better Auth api-key plugin. Keys are owned by an
// organization (`references: 'organization'`), so referenceId holds an
// organization id rather than a user id (no FK: the plugin treats it as a
// polymorphic reference).
export const apikey = sqliteTable('apikey', {
  id: text('id').primaryKey(),
  configId: text('config_id').notNull(),
  name: text('name'),
  start: text('start'),
  referenceId: text('reference_id').notNull(),
  prefix: text('prefix'),
  key: text('key').notNull(),
  refillInterval: integer('refill_interval'),
  refillAmount: integer('refill_amount'),
  lastRefillAt: integer('last_refill_at', { mode: 'timestamp' }),
  enabled: integer('enabled', { mode: 'boolean' }),
  rateLimitEnabled: integer('rate_limit_enabled', { mode: 'boolean' }),
  rateLimitTimeWindow: integer('rate_limit_time_window'),
  rateLimitMax: integer('rate_limit_max'),
  requestCount: integer('request_count'),
  remaining: integer('remaining'),
  lastRequest: integer('last_request', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  permissions: text('permissions'),
  metadata: text('metadata'),
});
