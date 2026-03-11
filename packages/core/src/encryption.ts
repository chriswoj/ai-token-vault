import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import type { EncryptionAdapter } from './adapters';
import { EncryptionError } from './errors';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Create an AES-256-GCM encryption adapter.
 * @param key - Must be at least 32 characters. First 32 chars used as key material.
 */
export function createAes256GcmEncryption(key: string): EncryptionAdapter {
  if (!key || key.length < 32) {
    throw new EncryptionError(
      'Encryption key must be at least 32 characters',
    );
  }

  const keyBuffer = Buffer.from(key.slice(0, 32), 'utf8');

  return {
    encrypt(plaintext: string): string {
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, keyBuffer, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
    },

    decrypt(ciphertext: string): string {
      const [ivB64, authTagB64, ciphertextB64] = ciphertext.split(':');

      if (!ivB64 || !authTagB64 || !ciphertextB64) {
        throw new EncryptionError('Invalid encrypted format');
      }

      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(authTagB64, 'base64');
      const data = Buffer.from(ciphertextB64, 'base64');

      const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });

      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(data),
        decipher.final(),
      ]).toString('utf8');
    },
  };
}

/** Encrypt if value is truthy, return null otherwise */
export function encryptIfPresent(
  adapter: EncryptionAdapter,
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return adapter.encrypt(value);
}

/** Decrypt if value is truthy, return null otherwise */
export function decryptIfPresent(
  adapter: EncryptionAdapter,
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return adapter.decrypt(value);
}
