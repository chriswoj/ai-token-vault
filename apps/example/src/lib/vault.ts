import {
  createTokenVault,
  createAes256GcmEncryption,
  createMemoryStorage,
} from '@ai-token-vault/core';

// For production, use createDrizzleStorage from @ai-token-vault/drizzle
// import { createDrizzleStorage, createTokenVaultSchema } from '@ai-token-vault/drizzle';
// const schema = createTokenVaultSchema({ userTable, organizationTable });
// const storage = createDrizzleStorage(db, schema);

const storage = createMemoryStorage();
const encryption = createAes256GcmEncryption(
  process.env.TOKEN_VAULT_SECRET ?? 'a-very-secret-key-at-least-32chars!!',
);

export const vault = createTokenVault({ storage, encryption });
