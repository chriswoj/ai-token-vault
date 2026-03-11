'use client';

import { useState } from 'react';
import type { AuthMethod } from '@ai-token-vault/core';

interface Provider {
  id: string;
  name: string;
  description: string | null;
  authMethod: AuthMethod;
  usageMode: 'token' | 'session';
}

interface Credential {
  id: string;
  providerId: string;
  authMethod: AuthMethod;
  shared: boolean;
  externalAccountId: string | null;
  externalAccountLabel: string | null;
  lastValidatedAt: Date | null;
  createdAt: Date;
  userId: string;
  provider: Provider;
}

export interface ConnectionsListProps {
  providers: Provider[];
  credentials: Credential[];
  onRevoke?: (credentialId: string) => Promise<void>;
  onConnect?: (provider: Provider) => void;
  /** Base API path. Defaults to '/api/token-vault' */
  apiBasePath?: string;
  /** Override container className */
  className?: string;
}

export function ConnectionsList({
  providers,
  credentials,
  onRevoke,
  onConnect,
  apiBasePath = '/api/token-vault',
  className,
}: ConnectionsListProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const credentialsByProvider = new Map<string, Credential[]>();
  for (const cred of credentials) {
    const existing = credentialsByProvider.get(cred.providerId) ?? [];
    existing.push(cred);
    credentialsByProvider.set(cred.providerId, existing);
  }

  async function handleRevoke(credentialId: string) {
    setRevokingId(credentialId);
    try {
      if (onRevoke) {
        await onRevoke(credentialId);
      } else {
        await fetch(`${apiBasePath}/credentials/${credentialId}`, {
          method: 'DELETE',
        });
      }
    } finally {
      setRevokingId(null);
    }
  }

  function handleConnect(provider: Provider) {
    if (onConnect) {
      onConnect(provider);
      return;
    }
    if (provider.authMethod === 'oauth2') {
      window.open(
        `${apiBasePath}/oauth/authorize?providerId=${provider.id}`,
        'token-vault-oauth',
        'width=600,height=700,popup=yes',
      );
    }
  }

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Connections</h2>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>
          Manage your connected external services.
        </p>
      </div>

      {providers.map((provider) => {
        const providerCreds = credentialsByProvider.get(provider.id) ?? [];
        const isConnected = providerCreds.length > 0;

        return (
          <div
            key={provider.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>{provider.name}</h3>
                {provider.description && (
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    {provider.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={badgeStyle}>
                  {provider.authMethod === 'oauth2' ? 'OAuth' : 'Browser'}
                </span>
                <span style={badgeStyle}>
                  {provider.usageMode === 'token' ? 'API' : 'Session'}
                </span>
              </div>
            </div>

            {isConnected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {providerCreds.map((cred) => (
                  <div
                    key={cred.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#22c55e',
                        }}
                      />
                      <span style={{ fontSize: '14px' }}>
                        {cred.externalAccountLabel ?? cred.externalAccountId ?? 'Connected'}
                      </span>
                      {cred.shared && (
                        <span style={badgeStyle}>Shared</span>
                      )}
                    </div>
                    <button
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        color: '#dc2626',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      disabled={revokingId === cred.id}
                      onClick={() => handleRevoke(cred.id)}
                    >
                      {revokingId === cred.id ? '...' : 'Revoke'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <button
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
                onClick={() => handleConnect(provider)}
              >
                Connect
              </button>
            )}
          </div>
        );
      })}

      {providers.length === 0 && (
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            No providers configured.
          </p>
        </div>
      )}
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  padding: '2px 6px',
  fontSize: '11px',
  fontWeight: 500,
  color: '#6b7280',
  backgroundColor: '#f3f4f6',
  borderRadius: '4px',
};
