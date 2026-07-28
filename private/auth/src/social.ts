type SocialCredentials = {
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
};

/**
 * The configured social sign-in providers. A provider is only offered when
 * both its id and secret are present; a fork with neither pair set simply has
 * no social buttons.
 */
export function socialProviders({
  googleClientId,
  googleClientSecret,
  githubClientId,
  githubClientSecret,
}: SocialCredentials) {
  return {
    ...(googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {}),
    ...(githubClientId && githubClientSecret
      ? { github: { clientId: githubClientId, clientSecret: githubClientSecret } }
      : {}),
  };
}
