import type { TokenVaultHandlersConfig } from './handlers';
import { createTokenVaultHandlers } from './handlers';

/**
 * Create a catch-all route handler for `app/api/token-vault/[...path]/route.ts`
 *
 * Usage:
 * ```ts
 * import { createTokenVaultRouteHandler } from '@ai-token-vault/next';
 *
 * const handler = createTokenVaultRouteHandler({ vault, session });
 * export { handler as GET, handler as POST, handler as DELETE };
 * ```
 */
export function createTokenVaultRouteHandler(config: TokenVaultHandlersConfig) {
  const handlers = createTokenVaultHandlers(config);

  return async function handler(
    req: Request,
    context: { params: Promise<{ path: string[] }> },
  ): Promise<Response> {
    const { path } = await context.params;
    const route = path.join('/');
    const method = req.method;

    // OAuth
    if (route === 'oauth/authorize' && method === 'GET') {
      return handlers.oauthAuthorize(req);
    }
    if (route === 'oauth/callback' && method === 'GET') {
      return handlers.oauthCallback(req);
    }

    // Browser login
    if (route === 'browser-login/start' && method === 'POST') {
      return handlers.browserLoginStart(req);
    }
    if (route === 'browser-login/status' && method === 'GET') {
      return handlers.browserLoginStatus(req);
    }
    if (route === 'browser-login/complete' && method === 'POST') {
      return handlers.browserLoginComplete(req);
    }

    // Providers
    if (route === 'providers' && method === 'GET') {
      return handlers.listProviders(req);
    }

    // Credentials
    if (route === 'credentials' && method === 'GET') {
      return handlers.listCredentials(req);
    }

    // Credential by ID (credentials/{id})
    const credentialMatch = route.match(/^credentials\/([^/]+)$/);
    if (credentialMatch && method === 'DELETE') {
      return handlers.revokeCredential(req, { id: credentialMatch[1]! });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}
