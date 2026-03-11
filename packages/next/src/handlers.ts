import type {
  BrowserAdapter,
  SessionAdapter,
  StorageAdapter,
  TokenVaultService,
} from '@ai-token-vault/core';

export interface TokenVaultHandlersConfig {
  vault: TokenVaultService;
  session: SessionAdapter;
  /** Storage adapter for nonce management (CSRF). If omitted, nonces are not verified. */
  storage?: StorageAdapter;
  browserAdapter?: BrowserAdapter;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function html(body: string) {
  return new Response(body, {
    headers: { 'Content-Type': 'text/html' },
  });
}

function closePopupWithError(error: string) {
  return html(
    `<!DOCTYPE html>
<html><body><script>
  if (window.opener) {
    window.opener.postMessage(
      { type: 'token-vault:auth-error', error: ${JSON.stringify(error)} },
      location.origin
    );
  }
  window.close();
</script></body></html>`,
  );
}

export function createTokenVaultHandlers(config: TokenVaultHandlersConfig) {
  const { vault, session, storage, browserAdapter } = config;

  async function requireSession(req: Request) {
    const s = await session.getSession(req);
    if (!s) return null;
    return s;
  }

  return {
    /**
     * GET /oauth/authorize - Build OAuth URL and redirect
     */
    async oauthAuthorize(req: Request): Promise<Response> {
      const sess = await requireSession(req);
      if (!sess) return json({ error: 'Unauthorized' }, 401);

      const url = new URL(req.url);
      const providerId = url.searchParams.get('providerId');
      const threadId = url.searchParams.get('threadId');

      if (!providerId) return json({ error: 'providerId required' }, 400);

      const provider = await vault.getProvider(providerId);
      if (!provider || provider.authMethod !== 'oauth2') {
        return json({ error: 'OAuth provider not found' }, 404);
      }
      if (!provider.authorizationUrl) {
        return json({ error: 'Provider not configured for OAuth' }, 400);
      }

      const orgId = sess.organizationId;
      if (!orgId) return json({ error: 'No active organization' }, 400);

      const oauthConfig = await vault.getOAuthConfig(orgId, providerId);
      if (!oauthConfig) {
        return json({ error: 'OAuth not configured for this organization' }, 400);
      }

      const nonce = crypto.randomUUID();
      const state = btoa(
        JSON.stringify({
          userId: sess.userId,
          orgId,
          providerId,
          threadId,
          nonce,
        }),
      );

      // Store nonce (5 min TTL)
      if (storage) {
        await storage.storeNonce(
          nonce,
          sess.userId,
          new Date(Date.now() + 5 * 60 * 1000),
        );
      }

      const origin = url.origin;
      const redirectUri = `${origin}/api/token-vault/oauth/callback`;

      const params = new URLSearchParams({
        client_id: oauthConfig.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state,
      });

      const scopes = oauthConfig.scopes || provider.defaultScopes;
      if (scopes) params.set('scope', scopes);

      return Response.redirect(
        `${provider.authorizationUrl}?${params.toString()}`,
      );
    },

    /**
     * GET /oauth/callback - Exchange code for tokens, store credential, close popup
     */
    async oauthCallback(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const stateParam = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) return closePopupWithError(error);
      if (!code || !stateParam) return closePopupWithError('Missing code or state');

      let state: {
        userId: string;
        orgId: string | null;
        providerId: string;
        threadId: string | null;
        nonce: string;
      };

      try {
        state = JSON.parse(atob(stateParam));
      } catch {
        return closePopupWithError('Invalid state');
      }

      // Verify session
      const sess = await session.getSession(req);
      if (!sess || sess.userId !== state.userId) {
        return closePopupWithError('Session mismatch');
      }

      const provider = await vault.getProvider(state.providerId);
      if (!provider?.tokenUrl) return closePopupWithError('Provider not configured');
      if (!state.orgId) return closePopupWithError('No organization in state');

      const oauthConfig = await vault.getOAuthConfig(state.orgId, state.providerId);
      if (!oauthConfig) {
        return closePopupWithError('OAuth not configured for this organization');
      }

      const origin = url.origin;
      const redirectUri = `${origin}/api/token-vault/oauth/callback`;

      const tokenResponse = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
        }),
      });

      if (!tokenResponse.ok) return closePopupWithError('Token exchange failed');

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
      };

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      await vault.storeCredential({
        userId: state.userId,
        organizationId: state.orgId,
        providerId: state.providerId,
        authMethod: 'oauth2',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope ?? oauthConfig.scopes ?? provider.defaultScopes,
        accessTokenExpiresAt: expiresAt,
      });

      return html(
        `<!DOCTYPE html>
<html><body><script>
  if (window.opener) {
    window.opener.postMessage(
      { type: 'token-vault:auth-complete', providerId: '${state.providerId}' },
      '${origin}'
    );
  }
  window.close();
</script></body></html>`,
      );
    },

    /**
     * POST /browser-login/start - Start a browser login session
     */
    async browserLoginStart(req: Request): Promise<Response> {
      const sess = await requireSession(req);
      if (!sess) return json({ error: 'Unauthorized' }, 401);
      if (!browserAdapter) return json({ error: 'Browser login not configured' }, 501);

      const { providerId } = (await req.json()) as { providerId: string };
      if (!providerId) return json({ error: 'providerId required' }, 400);

      const provider = await vault.getProvider(providerId);
      if (!provider || provider.authMethod !== 'browser_login') {
        return json({ error: 'Browser login provider not found' }, 404);
      }
      if (!provider.loginUrl) {
        return json({ error: 'Provider loginUrl not configured' }, 400);
      }

      const loginSession = await browserAdapter.startSession(providerId, provider);

      const credentialId = await vault.storeCredential({
        userId: sess.userId,
        organizationId: sess.organizationId,
        providerId,
        authMethod: 'browser_login',
        stagehandSessionId: loginSession.sessionId,
      });

      return json({
        sessionId: loginSession.sessionId,
        credentialId,
        loginUrl: provider.loginUrl,
        loginSuccessUrlPattern: provider.loginSuccessUrlPattern,
        loginDetectionStrategy: provider.loginDetectionStrategy,
        authEndpoint: provider.authEndpoint,
        liveViewUrl: loginSession.liveViewUrl ?? null,
      });
    },

    /**
     * GET /browser-login/status - Poll for login completion
     */
    async browserLoginStatus(req: Request): Promise<Response> {
      const sess = await requireSession(req);
      if (!sess) return json({ error: 'Unauthorized' }, 401);
      if (!browserAdapter) return json({ error: 'Browser login not configured' }, 501);

      const url = new URL(req.url);
      const sessionId = url.searchParams.get('sessionId');
      const loginSuccessUrlPattern = url.searchParams.get('loginSuccessUrlPattern');

      if (!sessionId) return json({ error: 'sessionId required' }, 400);

      try {
        const status = await browserAdapter.getSessionStatus(
          sessionId,
          loginSuccessUrlPattern,
        );
        return json(status);
      } catch {
        return json({ error: 'Session not found' }, 404);
      }
    },

    /**
     * POST /browser-login/complete - Capture auth state from browser session
     */
    async browserLoginComplete(req: Request): Promise<Response> {
      const sess = await requireSession(req);
      if (!sess) return json({ error: 'Unauthorized' }, 401);
      if (!browserAdapter) return json({ error: 'Browser login not configured' }, 501);

      const { sessionId, providerId } = (await req.json()) as {
        sessionId: string;
        providerId: string;
      };

      if (!sessionId || !providerId) {
        return json({ error: 'sessionId and providerId required' }, 400);
      }

      const provider = await vault.getProvider(providerId);
      if (!provider) return json({ error: 'Provider not found' }, 404);

      try {
        const authState = await browserAdapter.captureAuthState(
          sessionId,
          provider,
        );

        const keepSessionAlive = provider.usageMode === 'session';

        const credentialId = await vault.storeCredential({
          userId: sess.userId,
          organizationId: sess.organizationId,
          providerId,
          authMethod: 'browser_login',
          cookies: authState.cookies,
          localStorageTokens: authState.localStorageTokens,
          sessionStorageTokens: authState.sessionStorageTokens,
          stagehandSessionId: keepSessionAlive ? sessionId : null,
        });

        if (!keepSessionAlive) {
          await browserAdapter.closeSession(sessionId);
        }

        return json({
          success: true,
          credentialId,
          sessionMode: keepSessionAlive,
        });
      } catch (error) {
        return json(
          {
            error:
              error instanceof Error ? error.message : 'Failed to capture auth',
          },
          500,
        );
      }
    },

    /**
     * GET /providers - List all providers
     */
    async listProviders(req: Request): Promise<Response> {
      const sess = await requireSession(req);
      if (!sess) return json({ error: 'Unauthorized' }, 401);

      const providers = await vault.listProviders();
      return json(providers);
    },

    /**
     * GET /credentials - List user's credentials
     */
    async listCredentials(req: Request): Promise<Response> {
      const sess = await requireSession(req);
      if (!sess) return json({ error: 'Unauthorized' }, 401);

      const credentials = await vault.listCredentials(
        sess.userId,
        sess.organizationId,
      );
      return json(credentials);
    },

    /**
     * DELETE /credentials/:id - Revoke a credential
     */
    async revokeCredential(
      req: Request,
      params: { id: string },
    ): Promise<Response> {
      const sess = await requireSession(req);
      if (!sess) return json({ error: 'Unauthorized' }, 401);

      try {
        await vault.revokeCredential(params.id, sess.userId);
        return json({ success: true });
      } catch (error) {
        return json(
          {
            error:
              error instanceof Error ? error.message : 'Failed to revoke',
          },
          400,
        );
      }
    },
  };
}

