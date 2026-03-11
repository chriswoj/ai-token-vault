import { createTokenVaultRouteHandler } from '@ai-token-vault/next';
import { vault } from '../../../../lib/vault';
import { sessionAdapter } from '../../../../lib/session';

const handler = createTokenVaultRouteHandler({
  vault,
  session: sessionAdapter,
});

export { handler as GET, handler as POST, handler as DELETE };
