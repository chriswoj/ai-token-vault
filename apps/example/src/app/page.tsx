import { TokenVaultAuth } from '@ai-token-vault/react';

export default function HomePage() {
  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '32px' }}>
      <h1>AI Token Vault - Example</h1>
      <p>This demonstrates the in-chat authentication prompt.</p>

      <TokenVaultAuth
        providerId="github"
        providerName="GitHub"
        authMethod="oauth2"
        requiredScopes={['repo', 'read:user']}
        onAuthComplete={(id) => console.log('Connected:', id)}
      />

      <TokenVaultAuth
        providerId="github-browser"
        providerName="GitHub (Browser)"
        authMethod="browser_login"
        onAuthComplete={(id) => console.log('Connected:', id)}
      />
    </main>
  );
}
