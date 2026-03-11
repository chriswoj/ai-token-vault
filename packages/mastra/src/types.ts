import type { ToolExecutionContext } from '@mastra/core/tools';

import type {
  AuthMethod,
  DecryptedCredential,
  TokenVaultService,
} from '@ai-token-vault/core';
import type { z } from 'zod';

export type AuthenticatedExecute<TIn, TOut> = (
  input: TIn,
  context: ToolExecutionContext & {
    credential: DecryptedCredential;
  },
) => Promise<TOut>;

export interface CreateAuthenticatedToolOpts<
  TId extends string,
  TIn,
  TOut,
> {
  id: TId;
  description: string;
  providerId: string;
  providerName: string;
  authMethod?: AuthMethod;
  requiredScopes?: string[];
  inputSchema?: z.ZodType<TIn>;
  execute: AuthenticatedExecute<TIn, TOut>;
  /** TokenVaultService instance - injected, not imported globally */
  vault: TokenVaultService;
}
