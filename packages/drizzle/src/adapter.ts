import { eq, and, isNull, ne } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';

import type {
  StorageAdapter,
  CredentialSummary,
  OAuthConfig,
  Provider,
  StoredCredential,
  StoreCredentialParams,
} from '@ai-token-vault/core';

import type { createTokenVaultSchema } from './schema';

type Schema = ReturnType<typeof createTokenVaultSchema>;

/**
 * Create a Drizzle-backed StorageAdapter.
 * @param db - Drizzle database instance
 * @param schema - Schema created via createTokenVaultSchema()
 */
export function createDrizzleStorage(
  db: PgDatabase<any, any, any>,
  schema: Schema,
): StorageAdapter {
  const {
    tokenVaultProvider,
    tokenVaultCredential,
    tokenVaultOAuthConfig,
    tokenVaultNonce,
  } = schema;

  return {
    // ── Providers ──

    async getProvider(providerId) {
      const result = await (db as any).query.tokenVaultProvider.findFirst({
        where: (p: any, { eq }: any) => eq(p.id, providerId),
      });
      return (result as Provider) ?? null;
    },

    async listProviders() {
      const results = await (db as any).query.tokenVaultProvider.findMany();
      return results as Provider[];
    },

    // ── Credentials ──

    async storeCredential(params: StoreCredentialParams) {
      const id = crypto.randomUUID();
      await (db as any).insert(tokenVaultCredential).values({
        id,
        userId: params.userId,
        organizationId: params.organizationId ?? null,
        providerId: params.providerId,
        authMethod: params.authMethod,
        shared: params.shared ?? false,
        accessToken: params.accessToken ?? null,
        refreshToken: params.refreshToken ?? null,
        cookies: params.cookies ?? null,
        localStorageTokens: params.localStorageTokens ?? null,
        sessionStorageTokens: params.sessionStorageTokens ?? null,
        scope: params.scope ?? null,
        accessTokenExpiresAt: params.accessTokenExpiresAt ?? null,
        refreshTokenExpiresAt: params.refreshTokenExpiresAt ?? null,
        stagehandSessionId: params.stagehandSessionId ?? null,
        externalAccountId: params.externalAccountId ?? null,
        externalAccountLabel: params.externalAccountLabel ?? null,
      });
      return id;
    },

    async getCredential(credentialId) {
      const result = await (db as any).query.tokenVaultCredential.findFirst({
        where: (c: any, { eq }: any) => eq(c.id, credentialId),
      });
      return (result as StoredCredential) ?? null;
    },

    async findCredential(params) {
      const result = await (db as any).query.tokenVaultCredential.findFirst({
        where: (c: any, { eq, and, isNull }: any) =>
          and(
            eq(c.userId, params.userId),
            eq(c.providerId, params.providerId),
            isNull(c.revokedAt),
          ),
      });
      return (result as StoredCredential) ?? null;
    },

    async findSharedCredential(params) {
      const result = await (db as any).query.tokenVaultCredential.findFirst({
        where: (c: any, { eq, and, isNull, ne }: any) =>
          and(
            eq(c.organizationId, params.organizationId),
            eq(c.providerId, params.providerId),
            eq(c.shared, true),
            ne(c.userId, params.excludeUserId),
            isNull(c.revokedAt),
          ),
      });
      return (result as StoredCredential) ?? null;
    },

    async updateCredential(credentialId, data) {
      await (db as any)
        .update(tokenVaultCredential)
        .set(data)
        .where(eq(tokenVaultCredential.id, credentialId));
    },

    async listCredentials(userId, organizationId) {
      const userCreds = await (db as any).query.tokenVaultCredential.findMany({
        where: (c: any, { eq, and, isNull }: any) =>
          and(eq(c.userId, userId), isNull(c.revokedAt)),
        with: { provider: true },
        columns: {
          id: true,
          providerId: true,
          authMethod: true,
          shared: true,
          scope: true,
          externalAccountId: true,
          externalAccountLabel: true,
          lastValidatedAt: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
      });

      let orgCreds: any[] = [];
      if (organizationId) {
        orgCreds = await (db as any).query.tokenVaultCredential.findMany({
          where: (c: any, { eq, and, isNull, ne }: any) =>
            and(
              eq(c.organizationId, organizationId),
              eq(c.shared, true),
              ne(c.userId, userId),
              isNull(c.revokedAt),
            ),
          with: { provider: true },
          columns: {
            id: true,
            providerId: true,
            authMethod: true,
            shared: true,
            scope: true,
            externalAccountId: true,
            externalAccountLabel: true,
            lastValidatedAt: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
          },
        });
      }

      return [...userCreds, ...orgCreds] as CredentialSummary[];
    },

    async revokeCredential(credentialId) {
      await (db as any)
        .update(tokenVaultCredential)
        .set({ revokedAt: new Date() })
        .where(eq(tokenVaultCredential.id, credentialId));
    },

    // ── OAuth configs ──

    async getOAuthConfig(organizationId, providerId) {
      const result = await (db as any).query.tokenVaultOAuthConfig.findFirst({
        where: (c: any, { eq, and }: any) =>
          and(
            eq(c.organizationId, organizationId),
            eq(c.providerId, providerId),
          ),
      });
      return (result as OAuthConfig) ?? null;
    },

    async upsertOAuthConfig(params) {
      const id = crypto.randomUUID();
      await (db as any)
        .insert(tokenVaultOAuthConfig)
        .values({
          id,
          organizationId: params.organizationId,
          providerId: params.providerId,
          clientId: params.clientId,
          clientSecret: params.clientSecret,
          scopes: params.scopes ?? null,
        })
        .onConflictDoUpdate({
          target: [
            tokenVaultOAuthConfig.organizationId,
            tokenVaultOAuthConfig.providerId,
          ],
          set: {
            clientId: params.clientId,
            clientSecret: params.clientSecret,
            scopes: params.scopes ?? null,
          },
        });
      return id;
    },

    async listOAuthConfigs(organizationId) {
      const results = await (db as any).query.tokenVaultOAuthConfig.findMany({
        where: (c: any, { eq }: any) =>
          eq(c.organizationId, organizationId),
      });
      return results as OAuthConfig[];
    },

    // ── Nonce management ──

    async storeNonce(nonce, userId, expiresAt) {
      await (db as any).insert(tokenVaultNonce).values({
        id: crypto.randomUUID(),
        nonce,
        userId,
        expiresAt,
      });
    },

    async verifyNonce(nonce, userId) {
      const result = await (db as any).query.tokenVaultNonce.findFirst({
        where: (n: any, { eq, and, gt }: any) =>
          and(
            eq(n.nonce, nonce),
            eq(n.userId, userId),
            gt(n.expiresAt, new Date()),
          ),
      });
      return !!result;
    },

    async deleteNonce(nonce) {
      await (db as any)
        .delete(tokenVaultNonce)
        .where(eq(tokenVaultNonce.nonce, nonce));
    },
  };
}
