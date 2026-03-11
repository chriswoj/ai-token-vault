'use client';

import { useCallback, useState } from 'react';

export interface OAuthConfigFormProps {
  providerId: string;
  providerName: string;
  existingConfig?: {
    clientId: string;
    clientSecret: string;
    scopes: string | null;
  } | null;
  /** Called with form data on submit. Handle API call externally. */
  onSubmit?: (data: {
    providerId: string;
    clientId: string;
    clientSecret: string;
    scopes?: string;
  }) => Promise<void>;
  /** Base API path. Defaults to '/api/token-vault' */
  apiBasePath?: string;
  className?: string;
}

/**
 * Secure form for entering OAuth app credentials (client ID / client secret).
 * Uses password fields to prevent credentials from appearing in chat or logs.
 */
export function OAuthConfigForm({
  providerId,
  providerName,
  existingConfig,
  onSubmit,
  apiBasePath = '/api/token-vault',
  className,
}: OAuthConfigFormProps) {
  const [clientId, setClientId] = useState(existingConfig?.clientId ?? '');
  const [clientSecret, setClientSecret] = useState(
    existingConfig?.clientSecret ?? '',
  );
  const [scopes, setScopes] = useState(existingConfig?.scopes ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!clientId.trim() || !clientSecret.trim()) return;

      setSaving(true);
      setMessage(null);

      try {
        if (onSubmit) {
          await onSubmit({
            providerId,
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            scopes: scopes.trim() || undefined,
          });
        } else {
          const res = await fetch(`${apiBasePath}/oauth-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              providerId,
              clientId: clientId.trim(),
              clientSecret: clientSecret.trim(),
              scopes: scopes.trim() || undefined,
            }),
          });
          if (!res.ok) throw new Error('Failed to save');
        }
        setMessage({ type: 'success', text: 'Credentials saved' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to save credentials' });
      } finally {
        setSaving(false);
      }
    },
    [providerId, clientId, clientSecret, scopes, onSubmit, apiBasePath],
  );

  return (
    <div className={className} style={containerStyle}>
      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
        OAuth App Credentials
      </h4>
      <p style={{ margin: '2px 0 12px', fontSize: '12px', color: '#6b7280' }}>
        Configure your {providerName} OAuth app credentials.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Client ID</label>
          <input
            type="password"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="OAuth Client ID"
            autoComplete="off"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Client Secret</label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="OAuth Client Secret"
            autoComplete="off"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>
            Scopes <span style={{ color: '#9ca3af' }}>(optional)</span>
          </label>
          <input
            type="text"
            value={scopes}
            onChange={(e) => setScopes(e.target.value)}
            placeholder="e.g. repo read:user"
            autoComplete="off"
            style={inputStyle}
          />
        </div>

        {message && (
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: message.type === 'success' ? '#16a34a' : '#dc2626',
            }}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !clientId.trim() || !clientSecret.trim()}
          style={{
            ...buttonStyle,
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving
            ? 'Saving...'
            : existingConfig
              ? 'Update Credentials'
              : 'Save Credentials'}
        </button>
      </form>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  marginBottom: '4px',
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '14px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: '6px 12px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#fff',
  backgroundColor: '#111827',
  border: 'none',
  borderRadius: '6px',
};
