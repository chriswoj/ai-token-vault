import type { Provider } from '../types';

const now = new Date();

export const githubOAuthProvider: Omit<Provider, 'createdAt' | 'updatedAt'> = {
  id: 'github',
  name: 'GitHub',
  description: 'Access GitHub repositories, issues, and pull requests',
  iconUrl: null,
  authMethod: 'oauth2',
  usageMode: 'token',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  defaultScopes: 'repo read:user',
  loginDetectionStrategy: 'url_pattern',
  loginUrl: null,
  loginSuccessUrlPattern: null,
  authEndpoint: null,
  probeUrl: null,
  sessionValidationEndpoint: null,
  sessionCookieName: null,
  cookieDomains: null,
};

export const githubBrowserProvider: Omit<Provider, 'createdAt' | 'updatedAt'> = {
  id: 'github-browser',
  name: 'GitHub (Browser)',
  description: 'Access GitHub via browser login (no OAuth app required)',
  iconUrl: null,
  authMethod: 'browser_login',
  usageMode: 'token',
  loginUrl: 'https://github.com/login',
  loginSuccessUrlPattern: '^https://github\\.com/(?!login)',
  loginDetectionStrategy: 'url_pattern',
  probeUrl: 'https://github.com',
  sessionCookieName: 'user_session',
  cookieDomains: JSON.stringify(['github.com', '.github.com']),
  authorizationUrl: null,
  tokenUrl: null,
  defaultScopes: null,
  authEndpoint: null,
  sessionValidationEndpoint: null,
};
