import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  type AnyPgTable,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Enums ──

export const tokenVaultAuthMethodEnum = pgEnum('token_vault_auth_method', [
  'oauth2',
  'browser_login',
]);

export const tokenVaultUsageModeEnum = pgEnum('token_vault_usage_mode', [
  'token',
  'session',
]);

export const tokenVaultLoginDetectionEnum = pgEnum(
  'token_vault_login_detection',
  ['url_pattern', 'response_intercept', 'domain_return'],
);

// ── Schema factory ──

export interface TokenVaultSchemaConfig {
  /** Custom user table for FK references. If omitted, no FK on userId. */
  userTable?: AnyPgTable;
  /** Custom organization table for FK references. If omitted, no FK on organizationId. */
  organizationTable?: AnyPgTable;
}

export function createTokenVaultSchema(config?: TokenVaultSchemaConfig) {
  const userTable = config?.userTable;
  const orgTable = config?.organizationTable;

  // Provider table - registry of connectable external services
  const tokenVaultProvider = pgTable('token_vault_provider', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    iconUrl: text('icon_url'),
    authMethod: tokenVaultAuthMethodEnum('auth_method').notNull(),
    usageMode: tokenVaultUsageModeEnum('usage_mode').notNull(),
    loginDetectionStrategy: tokenVaultLoginDetectionEnum(
      'login_detection_strategy',
    ).default('url_pattern'),
    authorizationUrl: text('authorization_url'),
    tokenUrl: text('token_url'),
    defaultScopes: text('default_scopes'),
    loginUrl: text('login_url'),
    loginSuccessUrlPattern: text('login_success_url_pattern'),
    authEndpoint: text('auth_endpoint'),
    probeUrl: text('probe_url'),
    sessionValidationEndpoint: text('session_validation_endpoint'),
    sessionCookieName: text('session_cookie_name'),
    cookieDomains: text('cookie_domains'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  });

  // Credential table - stored user credentials for external services
  const tokenVaultCredential = pgTable(
    'token_vault_credential',
    {
      id: text('id').primaryKey(),
      userId: userTable
        ? text('user_id')
            .notNull()
            .references(() => (userTable as any).id, { onDelete: 'cascade' })
        : text('user_id').notNull(),
      organizationId: orgTable
        ? text('organization_id').references(
            () => (orgTable as any).id,
            { onDelete: 'cascade' },
          )
        : text('organization_id'),
      providerId: text('provider_id')
        .notNull()
        .references(() => tokenVaultProvider.id, { onDelete: 'cascade' }),
      authMethod: tokenVaultAuthMethodEnum('auth_method').notNull(),
      shared: boolean('shared').default(false).notNull(),
      accessToken: text('access_token'),
      refreshToken: text('refresh_token'),
      cookies: text('cookies'),
      localStorageTokens: text('local_storage_tokens'),
      sessionStorageTokens: text('session_storage_tokens'),
      scope: text('scope'),
      accessTokenExpiresAt: timestamp('access_token_expires_at'),
      refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
      stagehandSessionId: text('stagehand_session_id'),
      externalAccountId: text('external_account_id'),
      externalAccountLabel: text('external_account_label'),
      revokedAt: timestamp('revoked_at'),
      lastValidatedAt: timestamp('last_validated_at'),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
    },
    (table) => [
      index('tv_credential_userId_idx').on(table.userId),
      index('tv_credential_organizationId_idx').on(table.organizationId),
      index('tv_credential_userId_providerId_idx').on(
        table.userId,
        table.providerId,
      ),
    ],
  );

  // OAuth config table - per-org OAuth client credentials
  const tokenVaultOAuthConfig = pgTable(
    'token_vault_oauth_config',
    {
      id: text('id').primaryKey(),
      organizationId: orgTable
        ? text('organization_id')
            .notNull()
            .references(() => (orgTable as any).id, { onDelete: 'cascade' })
        : text('organization_id').notNull(),
      providerId: text('provider_id')
        .notNull()
        .references(() => tokenVaultProvider.id, { onDelete: 'cascade' }),
      clientId: text('client_id').notNull(),
      clientSecret: text('client_secret').notNull(),
      scopes: text('scopes'),
      createdAt: timestamp('created_at').defaultNow().notNull(),
      updatedAt: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
    },
    (table) => [
      unique('tv_oauth_config_org_provider_uniq').on(
        table.organizationId,
        table.providerId,
      ),
      index('tv_oauth_config_organizationId_idx').on(table.organizationId),
    ],
  );

  // Nonce table for CSRF protection
  const tokenVaultNonce = pgTable('token_vault_nonce', {
    id: text('id').primaryKey(),
    nonce: text('nonce').notNull().unique(),
    userId: text('user_id').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  });

  // Relations
  const tokenVaultProviderRelations = relations(
    tokenVaultProvider,
    ({ many }) => ({
      credentials: many(tokenVaultCredential),
      oauthConfigs: many(tokenVaultOAuthConfig),
    }),
  );

  const tokenVaultCredentialRelations = relations(
    tokenVaultCredential,
    ({ one }) => ({
      provider: one(tokenVaultProvider, {
        fields: [tokenVaultCredential.providerId],
        references: [tokenVaultProvider.id],
      }),
    }),
  );

  const tokenVaultOAuthConfigRelations = relations(
    tokenVaultOAuthConfig,
    ({ one }) => ({
      provider: one(tokenVaultProvider, {
        fields: [tokenVaultOAuthConfig.providerId],
        references: [tokenVaultProvider.id],
      }),
    }),
  );

  return {
    tokenVaultProvider,
    tokenVaultCredential,
    tokenVaultOAuthConfig,
    tokenVaultNonce,
    tokenVaultProviderRelations,
    tokenVaultCredentialRelations,
    tokenVaultOAuthConfigRelations,
  };
}

// Default schema (no FK references)
export const defaultSchema = createTokenVaultSchema();
