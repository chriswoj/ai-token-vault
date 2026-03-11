import type {
  BrowserLoginSession,
  BrowserLoginStatus,
  CapturedAuthState,
  CredentialSummary,
  OAuthConfig,
  Provider,
  StoredCredential,
  StoreCredentialParams,
  TokenVaultSession,
} from './types';

// ── Storage adapter ──

export interface StorageAdapter {
  // Providers
  getProvider(providerId: string): Promise<Provider | null>;
  listProviders(): Promise<Provider[]>;

  // Credentials
  storeCredential(params: StoreCredentialParams): Promise<string>;
  getCredential(credentialId: string): Promise<StoredCredential | null>;
  findCredential(params: {
    userId: string;
    providerId: string;
    revokedAt?: null;
  }): Promise<StoredCredential | null>;
  findSharedCredential(params: {
    organizationId: string;
    providerId: string;
    excludeUserId: string;
  }): Promise<StoredCredential | null>;
  updateCredential(
    credentialId: string,
    data: Partial<StoredCredential>,
  ): Promise<void>;
  listCredentials(
    userId: string,
    organizationId?: string | null,
  ): Promise<CredentialSummary[]>;
  revokeCredential(credentialId: string): Promise<void>;

  // OAuth configs
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
  listOAuthConfigs(organizationId: string): Promise<OAuthConfig[]>;

  // Nonce management (CSRF)
  storeNonce(nonce: string, userId: string, expiresAt: Date): Promise<void>;
  verifyNonce(nonce: string, userId: string): Promise<boolean>;
  deleteNonce(nonce: string): Promise<void>;
}

// ── Encryption adapter ──

export interface EncryptionAdapter {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}

// ── Session adapter ──

export interface SessionAdapter {
  getSession(request: Request): Promise<TokenVaultSession | null>;
}

// ── Browser adapter (optional, for browser login flow) ──

export interface BrowserAdapter {
  startSession(
    providerId: string,
    provider: Provider,
  ): Promise<BrowserLoginSession>;
  getSessionStatus(
    sessionId: string,
    loginSuccessUrlPattern: string | null,
  ): Promise<BrowserLoginStatus>;
  captureAuthState(
    sessionId: string,
    provider: Provider,
  ): Promise<CapturedAuthState>;
  closeSession(sessionId: string): Promise<void>;
}
