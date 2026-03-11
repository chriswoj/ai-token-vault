export class TokenVaultError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'TokenVaultError';
  }
}

export class CredentialNotFoundError extends TokenVaultError {
  constructor(credentialId?: string) {
    super(
      credentialId
        ? `Credential ${credentialId} not found`
        : 'Credential not found',
      'CREDENTIAL_NOT_FOUND',
    );
    this.name = 'CredentialNotFoundError';
  }
}

export class OwnershipError extends TokenVaultError {
  constructor() {
    super(
      'Credential not found or not owned by user',
      'OWNERSHIP_ERROR',
    );
    this.name = 'OwnershipError';
  }
}

export class ProviderNotFoundError extends TokenVaultError {
  constructor(providerId: string) {
    super(`Provider ${providerId} not found`, 'PROVIDER_NOT_FOUND');
    this.name = 'ProviderNotFoundError';
  }
}

export class OAuthConfigError extends TokenVaultError {
  constructor(message: string) {
    super(message, 'OAUTH_CONFIG_ERROR');
    this.name = 'OAuthConfigError';
  }
}

export class EncryptionError extends TokenVaultError {
  constructor(message: string) {
    super(message, 'ENCRYPTION_ERROR');
    this.name = 'EncryptionError';
  }
}
