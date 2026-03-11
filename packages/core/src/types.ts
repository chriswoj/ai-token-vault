// ── Union types ──

export type AuthMethod = 'oauth2' | 'browser_login';
export type UsageMode = 'token' | 'session';
export type LoginDetectionStrategy =
  | 'url_pattern'
  | 'response_intercept'
  | 'domain_return';

// ── Provider ──

export interface Provider {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  authMethod: AuthMethod;
  usageMode: UsageMode;
  loginDetectionStrategy: LoginDetectionStrategy | null;
  // OAuth2 fields
  authorizationUrl: string | null;
  tokenUrl: string | null;
  defaultScopes: string | null;
  // Browser login fields
  loginUrl: string | null;
  loginSuccessUrlPattern: string | null;
  authEndpoint: string | null;
  probeUrl: string | null;
  sessionValidationEndpoint: string | null;
  sessionCookieName: string | null;
  cookieDomains: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Credential ──

export interface StoredCredential {
  id: string;
  userId: string;
  organizationId: string | null;
  providerId: string;
  authMethod: AuthMethod;
  shared: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  cookies: string | null;
  localStorageTokens: string | null;
  sessionStorageTokens: string | null;
  scope: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  stagehandSessionId: string | null;
  externalAccountId: string | null;
  externalAccountLabel: string | null;
  revokedAt: Date | null;
  lastValidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecryptedCredential {
  id: string;
  providerId: string;
  authMethod: AuthMethod;
  accessToken: string | null;
  refreshToken: string | null;
  cookies: string | null;
  localStorageTokens: string | null;
  sessionStorageTokens: string | null;
  scope: string | null;
  stagehandSessionId: string | null;
  accessTokenExpiresAt: Date | null;
  externalAccountId: string | null;
  externalAccountLabel: string | null;
}

export interface CredentialSummary {
  id: string;
  providerId: string;
  authMethod: AuthMethod;
  shared: boolean;
  scope: string | null;
  externalAccountId: string | null;
  externalAccountLabel: string | null;
  lastValidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  provider?: Provider;
}

export interface StoreCredentialParams {
  userId: string;
  organizationId?: string | null;
  providerId: string;
  authMethod: AuthMethod;
  shared?: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
  cookies?: string | null;
  localStorageTokens?: string | null;
  sessionStorageTokens?: string | null;
  scope?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  stagehandSessionId?: string | null;
  externalAccountId?: string | null;
  externalAccountLabel?: string | null;
}

// ── OAuth ──

export interface OAuthConfig {
  id: string;
  organizationId: string;
  providerId: string;
  clientId: string;
  clientSecret: string;
  scopes: string | null;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

// ── Session ──

export interface TokenVaultSession {
  userId: string;
  organizationId?: string | null;
}

// ── Auth required payload (returned by tools when cred missing) ──

export interface AuthRequiredPayload {
  type: 'auth_required';
  providerId: string;
  providerName: string;
  authMethod: AuthMethod;
  requiredScopes?: string[];
}

// ── Browser login ──

export interface CapturedAuthState {
  cookies: string;
  localStorageTokens: string | null;
  sessionStorageTokens: string | null;
}

export interface BrowserLoginSession {
  sessionId: string;
  credentialId: string;
  loginUrl: string;
  loginSuccessUrlPattern: string | null;
  loginDetectionStrategy: LoginDetectionStrategy | null;
  authEndpoint: string | null;
}

export interface BrowserLoginStatus {
  status: 'waiting' | 'authenticated';
  currentUrl: string;
}
