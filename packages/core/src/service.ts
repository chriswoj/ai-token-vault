import type { EncryptionAdapter, StorageAdapter } from './adapters';
import { decryptIfPresent, encryptIfPresent } from './encryption';
import { OwnershipError } from './errors';
import type {
  CredentialSummary,
  DecryptedCredential,
  OAuthConfig,
  Provider,
  StoreCredentialParams,
} from './types';

export interface TokenVaultService {
  getProvider(providerId: string): Promise<Provider | null>;
  listProviders(): Promise<Provider[]>;

  getOAuthConfig(
    organizationId: string,
    providerId: string,
  ): Promise<OAuthConfig | null>;
  upsertOAuthConfig(params: {
    organizationId: string;
    providerId: string;
    clientId: string;
    clientSecret: string;
    scopes?: string | null;
  }): Promise<string>;
  listOAuthConfigsForOrg(organizationId: string): Promise<OAuthConfig[]>;

  storeCredential(params: StoreCredentialParams): Promise<string>;
  getValidCredential(params: {
    userId: string;
    providerId: string;
    organizationId?: string | null;
  }): Promise<DecryptedCredential | null>;
  hasCredential(userId: string, providerId: string): Promise<boolean>;
  refreshAccessToken(credentialId: string): Promise<DecryptedCredential | null>;
  revokeCredential(credentialId: string, userId: string): Promise<void>;
  listCredentials(
    userId: string,
    organizationId?: string | null,
  ): Promise<CredentialSummary[]>;
  updateStagehandSessionId(
    credentialId: string,
    sessionId: string | null,
  ): Promise<void>;
}

export interface CreateTokenVaultOptions {
  storage: StorageAdapter;
  encryption: EncryptionAdapter;
  /** Custom ID generator. Defaults to crypto.randomUUID(). */
  idGenerator?: () => string;
}

export function createTokenVault(
  opts: CreateTokenVaultOptions,
): TokenVaultService {
  const { storage, encryption } = opts;
  const generateId = opts.idGenerator ?? (() => crypto.randomUUID());

  const enc = (v: string | null | undefined) =>
    encryptIfPresent(encryption, v);
  const dec = (v: string | null | undefined) =>
    decryptIfPresent(encryption, v);

  function toDecrypted(
    cred: Awaited<ReturnType<StorageAdapter['getCredential']>>,
  ): DecryptedCredential | null {
    if (!cred) return null;
    return {
      id: cred.id,
      providerId: cred.providerId,
      authMethod: cred.authMethod,
      accessToken: dec(cred.accessToken),
      refreshToken: dec(cred.refreshToken),
      cookies: dec(cred.cookies),
      localStorageTokens: dec(cred.localStorageTokens),
      sessionStorageTokens: dec(cred.sessionStorageTokens),
      scope: cred.scope,
      stagehandSessionId: cred.stagehandSessionId,
      accessTokenExpiresAt: cred.accessTokenExpiresAt,
      externalAccountId: cred.externalAccountId,
      externalAccountLabel: cred.externalAccountLabel,
    };
  }

  const service: TokenVaultService = {
    async getProvider(providerId) {
      return storage.getProvider(providerId);
    },

    async listProviders() {
      return storage.listProviders();
    },

    async getOAuthConfig(organizationId, providerId) {
      const config = await storage.getOAuthConfig(organizationId, providerId);
      if (!config) return null;
      return {
        ...config,
        clientId: encryption.decrypt(config.clientId),
        clientSecret: encryption.decrypt(config.clientSecret),
      };
    },

    async upsertOAuthConfig(params) {
      return storage.upsertOAuthConfig({
        ...params,
        clientId: encryption.encrypt(params.clientId),
        clientSecret: encryption.encrypt(params.clientSecret),
        scopes: params.scopes ?? null,
      });
    },

    async listOAuthConfigsForOrg(organizationId) {
      const configs = await storage.listOAuthConfigs(organizationId);
      return configs.map((c) => ({
        ...c,
        clientId: encryption.decrypt(c.clientId),
        clientSecret: encryption.decrypt(c.clientSecret),
      }));
    },

    async storeCredential(params) {
      return storage.storeCredential({
        ...params,
        accessToken: enc(params.accessToken) ?? undefined,
        refreshToken: enc(params.refreshToken) ?? undefined,
        cookies: enc(params.cookies) ?? undefined,
        localStorageTokens: enc(params.localStorageTokens) ?? undefined,
        sessionStorageTokens: enc(params.sessionStorageTokens) ?? undefined,
      });
    },

    async getValidCredential(params) {
      // Try user's own credential first
      let credential = await storage.findCredential({
        userId: params.userId,
        providerId: params.providerId,
        revokedAt: null,
      });

      // Fall back to org-shared credential
      if (!credential && params.organizationId) {
        credential = await storage.findSharedCredential({
          organizationId: params.organizationId,
          providerId: params.providerId,
          excludeUserId: params.userId,
        });
      }

      if (!credential) return null;

      // Auto-refresh OAuth tokens if expired
      if (
        credential.authMethod === 'oauth2' &&
        credential.accessTokenExpiresAt &&
        credential.accessTokenExpiresAt < new Date() &&
        credential.refreshToken
      ) {
        const refreshed = await service.refreshAccessToken(credential.id);
        if (refreshed) return refreshed;
      }

      return toDecrypted(credential);
    },

    async hasCredential(userId, providerId) {
      const cred = await storage.findCredential({
        userId,
        providerId,
        revokedAt: null,
      });
      return !!cred;
    },

    async refreshAccessToken(credentialId) {
      const credential = await storage.getCredential(credentialId);
      if (!credential?.refreshToken) return null;

      const provider = await storage.getProvider(credential.providerId);
      if (!provider?.tokenUrl) return null;
      if (!credential.organizationId) return null;

      const oauthConfig = await storage.getOAuthConfig(
        credential.organizationId,
        credential.providerId,
      );
      if (!oauthConfig) return null;

      const decryptedRefreshToken = encryption.decrypt(credential.refreshToken);
      const decryptedClientId = encryption.decrypt(oauthConfig.clientId);
      const decryptedClientSecret = encryption.decrypt(oauthConfig.clientSecret);

      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: decryptedRefreshToken,
          client_id: decryptedClientId,
          client_secret: decryptedClientSecret,
        }),
      });

      if (!response.ok) return null;

      const tokens = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      };

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      await storage.updateCredential(credentialId, {
        accessToken: encryption.encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token
          ? encryption.encrypt(tokens.refresh_token)
          : credential.refreshToken,
        accessTokenExpiresAt: expiresAt,
        scope: tokens.scope ?? credential.scope,
      } as Partial<import('./types').StoredCredential>);

      return {
        id: credential.id,
        providerId: credential.providerId,
        authMethod: credential.authMethod,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? decryptedRefreshToken,
        cookies: dec(credential.cookies),
        localStorageTokens: dec(credential.localStorageTokens),
        sessionStorageTokens: dec(credential.sessionStorageTokens),
        scope: tokens.scope ?? credential.scope,
        stagehandSessionId: credential.stagehandSessionId,
        accessTokenExpiresAt: expiresAt,
        externalAccountId: credential.externalAccountId,
        externalAccountLabel: credential.externalAccountLabel,
      };
    },

    async revokeCredential(credentialId, userId) {
      const credential = await storage.getCredential(credentialId);
      if (!credential || credential.userId !== userId) {
        throw new OwnershipError();
      }

      await storage.updateCredential(credentialId, {
        revokedAt: new Date(),
        accessToken: enc('') ?? null,
        refreshToken: enc('') ?? null,
        cookies: enc('') ?? null,
        localStorageTokens: enc('') ?? null,
        sessionStorageTokens: enc('') ?? null,
      } as Partial<import('./types').StoredCredential>);
    },

    async listCredentials(userId, organizationId) {
      return storage.listCredentials(userId, organizationId);
    },

    async updateStagehandSessionId(credentialId, sessionId) {
      await storage.updateCredential(credentialId, {
        stagehandSessionId: sessionId,
      } as Partial<import('./types').StoredCredential>);
    },
  };

  return service;
}
