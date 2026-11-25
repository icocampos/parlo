import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const identityProvider = pgEnum('identity_provider', ['google', 'apple'])
export const storeProvider = pgEnum('store_provider', ['google_play', 'app_store'])
export const subscriptionStatus = pgEnum('subscription_status', ['active', 'grace_period', 'expired', 'revoked'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const identities = pgTable('identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: identityProvider('provider').notNull(),
  providerSubject: text('provider_subject').notNull(),
  email: text('email'),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('identities_provider_subject_unique').on(table.provider, table.providerSubject),
  index('identities_user_id_idx').on(table.userId),
])

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('sessions_user_id_idx').on(table.userId)])

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  store: storeProvider('store').notNull(),
  storeTransactionId: text('store_transaction_id').notNull(),
  productId: text('product_id').notNull(),
  status: subscriptionStatus('status').notNull(),
  currentPeriodEndsAt: timestamp('current_period_ends_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('subscriptions_store_transaction_unique').on(table.store, table.storeTransactionId),
  index('subscriptions_user_id_idx').on(table.userId),
])
