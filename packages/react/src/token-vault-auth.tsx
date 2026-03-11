'use client';

import type { AuthMethod } from '@ai-token-vault/core';
import { useTokenVaultAuth } from './hooks';

export interface TokenVaultAuthProps {
  providerId: string;
  providerName: string;
  authMethod: AuthMethod;
  requiredScopes?: string[];
  onAuthComplete?: (providerId: string) => void;
  /** Base API path. Defaults to '/api/token-vault' */
  apiBasePath?: string;
  /** Override container className */
  className?: string;
}

export function TokenVaultAuth({
  providerId,
  providerName,
  authMethod,
  requiredScopes,
  onAuthComplete,
  apiBasePath,
  className,
}: TokenVaultAuthProps) {
  const { status, errorMessage, connect } = useTokenVaultAuth({
    providerId,
    authMethod,
    onAuthComplete,
    apiBasePath,
  });

  return (
    <div className={className ?? 'tv-auth-container'} style={defaultContainerStyle}>
      <div style={defaultRowStyle}>
        <div style={defaultIconStyle}>
          {authMethod === 'oauth2' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
            Connect to {providerName}
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
            {authMethod === 'oauth2'
              ? 'Authorize access via OAuth to continue'
              : 'Log in via browser to continue'}
          </p>
          {requiredScopes && requiredScopes.length > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
              Scopes: {requiredScopes.join(', ')}
            </p>
          )}

          {status === 'idle' && (
            <button onClick={connect} style={defaultButtonStyle}>
              {authMethod === 'oauth2'
                ? `Connect ${providerName}`
                : 'Login via Browser'}
            </button>
          )}

          {status === 'connecting' && (
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#6b7280' }}>
              {authMethod === 'oauth2'
                ? 'Waiting for authorization...'
                : 'Browser opened - please log in...'}
            </p>
          )}

          {status === 'success' && (
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#16a34a' }}>
              Connected to {providerName}
            </p>
          )}

          {status === 'error' && (
            <div>
              <p style={{ margin: '8px 0', fontSize: '14px', color: '#dc2626' }}>
                {errorMessage ?? 'Connection failed'}
              </p>
              <button onClick={connect} style={defaultButtonOutlineStyle}>
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const defaultContainerStyle: React.CSSProperties = {
  margin: '16px 0',
  padding: '16px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
};

const defaultRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
};

const defaultIconStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  color: '#6b7280',
};

const defaultButtonStyle: React.CSSProperties = {
  marginTop: '8px',
  padding: '6px 12px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#fff',
  backgroundColor: '#111827',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

const defaultButtonOutlineStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151',
  backgroundColor: 'transparent',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: 'pointer',
};
