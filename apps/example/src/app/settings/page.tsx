import { ConnectionsList } from '@ai-token-vault/react';

// In a real app, these would be fetched server-side
const mockProviders = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Access GitHub repositories',
    authMethod: 'oauth2' as const,
    usageMode: 'token' as const,
  },
];

export default function SettingsPage() {
  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '32px' }}>
      <ConnectionsList
        providers={mockProviders}
        credentials={[]}
      />
    </main>
  );
}
