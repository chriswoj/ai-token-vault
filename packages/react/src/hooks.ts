'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { AuthMethod } from '@ai-token-vault/core';

export type AuthStatus = 'idle' | 'connecting' | 'success' | 'error';

export interface UseTokenVaultAuthOptions {
  providerId: string;
  authMethod: AuthMethod;
  onAuthComplete?: (providerId: string) => void;
  /** Base API path. Defaults to '/api/token-vault' */
  apiBasePath?: string;
}

export function useTokenVaultAuth(opts: UseTokenVaultAuthOptions) {
  const {
    providerId,
    authMethod,
    onAuthComplete,
    apiBasePath = '/api/token-vault',
  } = opts;

  const [status, setStatus] = useState<AuthStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startOAuth = useCallback(() => {
    setStatus('connecting');
    setErrorMessage(undefined);

    const params = new URLSearchParams({ providerId });
    const popup = window.open(
      `${apiBasePath}/oauth/authorize?${params}`,
      'token-vault-oauth',
      'width=600,height=700,popup=yes',
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'token-vault:auth-complete') {
        setStatus('success');
        window.removeEventListener('message', handleMessage);
        onAuthComplete?.(event.data.providerId);
      }

      if (event.data?.type === 'token-vault:auth-error') {
        setStatus('error');
        setErrorMessage(event.data.error);
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setStatus((current) => (current === 'connecting' ? 'idle' : current));
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  }, [providerId, onAuthComplete, apiBasePath]);

  const startBrowserLogin = useCallback(async () => {
    setStatus('connecting');
    setErrorMessage(undefined);

    try {
      const startRes = await fetch(`${apiBasePath}/browser-login/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });

      if (!startRes.ok) {
        setStatus('error');
        setErrorMessage('Failed to start browser login');
        return;
      }

      const { sessionId, loginSuccessUrlPattern } = await startRes.json();

      pollRef.current = setInterval(async () => {
        try {
          const params = new URLSearchParams({ sessionId });
          if (loginSuccessUrlPattern) {
            params.set('loginSuccessUrlPattern', loginSuccessUrlPattern);
          }

          const statusRes = await fetch(
            `${apiBasePath}/browser-login/status?${params}`,
          );
          if (!statusRes.ok) return;
          const data = await statusRes.json();

          if (data.status === 'authenticated') {
            if (pollRef.current) clearInterval(pollRef.current);

            const completeRes = await fetch(
              `${apiBasePath}/browser-login/complete`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, providerId }),
              },
            );

            if (completeRes.ok) {
              setStatus('success');
              onAuthComplete?.(providerId);
            } else {
              setStatus('error');
              setErrorMessage('Failed to capture login session');
            }
          }
        } catch {
          // Polling error, will retry
        }
      }, 3000);
    } catch {
      setStatus('error');
      setErrorMessage('Failed to start browser session');
    }
  }, [providerId, onAuthComplete, apiBasePath]);

  const connect = authMethod === 'oauth2' ? startOAuth : startBrowserLogin;

  return { status, errorMessage, connect };
}

// ── useCredentials ──

export interface Credential {
  id: string;
  providerId: string;
  authMethod: AuthMethod;
  shared: boolean;
  externalAccountId: string | null;
  externalAccountLabel: string | null;
  createdAt: string;
  provider?: {
    id: string;
    name: string;
    description: string | null;
    authMethod: AuthMethod;
  };
}

export function useCredentials(apiBasePath = '/api/token-vault') {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBasePath}/credentials`);
      if (res.ok) {
        setCredentials(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [apiBasePath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const revoke = useCallback(
    async (credentialId: string) => {
      const res = await fetch(`${apiBasePath}/credentials/${credentialId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCredentials((prev) => prev.filter((c) => c.id !== credentialId));
      }
      return res.ok;
    },
    [apiBasePath],
  );

  return { credentials, loading, refresh, revoke };
}
