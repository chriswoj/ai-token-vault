import type { StorageAdapter } from './adapters';
import type {
  CredentialSummary,
  OAuthConfig,
  Provider,
  StoredCredential,
  StoreCredentialParams,
} from './types';

interface NonceEntry {
  nonce: string;
  userId: string;
  expiresAt: Date;
}

/**
 * In-memory StorageAdapter for testing and demos.
 * Not suitable for production use.
 */
export function createMemoryStorage(): StorageAdapter {
  const providers = new Map<string, Provider>();
  const credentials = new Map<string, StoredCredential>();
  const oauthConfigs = new Map<string, OAuthConfig>();
  const nonces = new Map<string, NonceEntry>();

  function oauthConfigKey(orgId: string, providerId: string) {
    return `${orgId}:${providerId}`;
  }

  return {
    // Providers
    async getProvider(providerId) {
      return providers.get(providerId) ?? null;
    },

    async listProviders() {
      return [...providers.values()];
    },

    // Credentials
    async storeCredential(params: StoreCredentialParams) {
      const id = crypto.randomUUID();
      const now = new Date();
      const credential: StoredCredential = {
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
        revokedAt: null,
        lastValidatedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      credentials.set(id, credential);
      return id;
    },

    async getCredential(credentialId) {
      return credentials.get(credentialId) ?? null;
    },

    async findCredential(params) {
      for (const cred of credentials.values()) {
        if (
          cred.userId === params.userId &&
          cred.providerId === params.providerId &&
          cred.revokedAt === null
        ) {
          return cred;
        }
      }
      return null;
    },

    async findSharedCredential(params) {
      for (const cred of credentials.values()) {
        if (
          cred.organizationId === params.organizationId &&
          cred.providerId === params.providerId &&
          cred.shared === true &&
          cred.userId !== params.excludeUserId &&
          cred.revokedAt === null
        ) {
          return cred;
        }
      }
      return null;
    },

    async updateCredential(credentialId, data) {
      const existing = credentials.get(credentialId);
      if (!existing) return;
      credentials.set(credentialId, {
        ...existing,
        ...data,
        id: credentialId,
        updatedAt: new Date(),
      });
    },

    async listCredentials(userId, organizationId) {
      const result: CredentialSummary[] = [];

      for (const cred of credentials.values()) {
        if (cred.revokedAt !== null) continue;

        const isOwn = cred.userId === userId;
        const isOrgShared =
          organizationId &&
          cred.organizationId === organizationId &&
          cred.shared &&
          cred.userId !== userId;

        if (isOwn || isOrgShared) {
          const provider = providers.get(cred.providerId) ?? undefined;
          result.push({
            id: cred.id,
            providerId: cred.providerId,
            authMethod: cred.authMethod,
            shared: cred.shared,
            scope: cred.scope,
            externalAccountId: cred.externalAccountId,
            externalAccountLabel: cred.externalAccountLabel,
            lastValidatedAt: cred.lastValidatedAt,
            createdAt: cred.createdAt,
            updatedAt: cred.updatedAt,
            userId: cred.userId,
            provider,
          });
        }
      }

      return result;
    },

    async revokeCredential(credentialId) {
      const existing = credentials.get(credentialId);
      if (!existing) return;
      credentials.set(credentialId, {
        ...existing,
        revokedAt: new Date(),
        updatedAt: new Date(),
      });
    },

    // OAuth configs
    async getOAuthConfig(organizationId, providerId) {
      return (
        oauthConfigs.get(oauthConfigKey(organizationId, providerId)) ?? null
      );
    },

    async upsertOAuthConfig(params) {
      const key = oauthConfigKey(params.organizationId, params.providerId);
      const existing = oauthConfigs.get(key);
      const id = existing?.id ?? crypto.randomUUID();
      oauthConfigs.set(key, {
        id,
        organizationId: params.organizationId,
        providerId: params.providerId,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        scopes: params.scopes ?? null,
      });
      return id;
    },

    async listOAuthConfigs(organizationId) {
      const result: OAuthConfig[] = [];
      for (const config of oauthConfigs.values()) {
        if (config.organizationId === organizationId) {
          result.push(config);
        }
      }
      return result;
    },

    // Nonce management
    async storeNonce(nonce, userId, expiresAt) {
      nonces.set(nonce, { nonce, userId, expiresAt });
    },

    async verifyNonce(nonce, userId) {
      const entry = nonces.get(nonce);
      if (!entry) return false;
      if (entry.userId !== userId) return false;
      if (entry.expiresAt < new Date()) {
        nonces.delete(nonce);
        return false;
      }
      return true;
    },

    async deleteNonce(nonce) {
      nonces.delete(nonce);
    },
  };
}

/**
 * Create a memory storage pre-seeded with providers.
 * Useful for testing and demos.
 */
export function createSeededMemoryStorage(
  providerList: Array<Omit<Provider, 'createdAt' | 'updatedAt'>>,
): StorageAdapter {
  const storage = createMemoryStorage();

  // Access the internal map through the closure - we re-implement by
  // manually storing via storeCredential pattern
  const now = new Date();
  const fullProviders = providerList.map((p) => ({
    ...p,
    createdAt: now,
    updatedAt: now,
  }));

  // We need to expose a way to add providers. For memory storage,
  // we return a wrapper that pre-populates.
  const wrapped: StorageAdapter = {
    ...storage,
    async getProvider(id) {
      const found = fullProviders.find((p) => p.id === id);
      return found ?? storage.getProvider(id);
    },
    async listProviders() {
      return fullProviders;
    },
  };

  return wrapped;
}
