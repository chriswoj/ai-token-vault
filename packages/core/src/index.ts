// Types
export type {
  AuthMethod,
  UsageMode,
  LoginDetectionStrategy,
  Provider,
  StoredCredential,
  DecryptedCredential,
  CredentialSummary,
  StoreCredentialParams,
  OAuthConfig,
  OAuthTokenResponse,
  TokenVaultSession,
  AuthRequiredPayload,
  CapturedAuthState,
  BrowserLoginSession,
  BrowserLoginStatus,
} from './types';

// Adapters
export type {
  StorageAdapter,
  EncryptionAdapter,
  SessionAdapter,
  BrowserAdapter,
} from './adapters';

// Service
export { createTokenVault } from './service';
export type { TokenVaultService, CreateTokenVaultOptions } from './service';

// Encryption
export {
  createAes256GcmEncryption,
  encryptIfPresent,
  decryptIfPresent,
} from './encryption';

// Memory storage (for testing)
export { createMemoryStorage, createSeededMemoryStorage } from './memory-storage';

// Errors
export {
  TokenVaultError,
  CredentialNotFoundError,
  OwnershipError,
  ProviderNotFoundError,
  OAuthConfigError,
  EncryptionError,
} from './errors';

// Provider configs
export { githubOAuthProvider, githubBrowserProvider } from './providers/index';
