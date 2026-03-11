import { createTool } from '@mastra/core/tools';
import type { ToolExecutionContext } from '@mastra/core/tools';

import type { DecryptedCredential } from '@ai-token-vault/core';

import type { CreateAuthenticatedToolOpts } from './types';

/**
 * Create a Mastra tool that requires authentication via Token Vault.
 *
 * When no credential exists, returns an `AuthRequiredPayload` that the UI
 * renders as an auth prompt. After the user authenticates, the agent re-calls
 * the tool and finds the credential.
 */
export function createAuthenticatedTool<
  TId extends string,
  TIn,
  TOut,
>(opts: CreateAuthenticatedToolOpts<TId, TIn, TOut>) {
  return createTool({
    id: opts.id,
    description: opts.description,
    inputSchema: opts.inputSchema,
    execute: async (rawContext) => {
      // Cast through unknown to handle Mastra's generic context type
      const context = rawContext as unknown as ToolExecutionContext & {
        context: TIn;
        requestContext?: Map<string, unknown>;
      };
      const input = context.context;
      const userId = (context.requestContext?.get('userId') ??
        context.resourceId) as string | undefined;
      const organizationId = context.requestContext?.get(
        'organizationId',
      ) as string | undefined;

      if (!userId) {
        return { error: 'Not authenticated' } as TOut;
      }

      const credential = await opts.vault.getValidCredential({
        userId,
        providerId: opts.providerId,
        organizationId: organizationId || null,
      });

      if (!credential) {
        return {
          type: 'auth_required',
          providerId: opts.providerId,
          providerName: opts.providerName,
          authMethod: opts.authMethod ?? 'oauth2',
          requiredScopes: opts.requiredScopes,
        } as unknown as TOut;
      }

      return opts.execute(
        input as TIn,
        Object.assign({}, context, { credential }) as ToolExecutionContext & {
          credential: DecryptedCredential;
        },
      );
    },
  });
}
