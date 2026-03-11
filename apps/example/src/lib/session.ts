import type { SessionAdapter } from '@ai-token-vault/core';

/**
 * Example session adapter. In production, integrate with your auth system
 * (Better Auth, NextAuth, Clerk, etc.)
 */
export const sessionAdapter: SessionAdapter = {
  async getSession(_request: Request) {
    // Replace with your auth logic:
    // const session = await auth.api.getSession({ headers: request.headers });
    // if (!session?.user) return null;
    // return { userId: session.user.id, organizationId: session.session.activeOrganizationId };

    return {
      userId: 'demo-user',
      organizationId: 'demo-org',
    };
  },
};
