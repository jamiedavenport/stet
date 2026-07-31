// Optional secrets are typed here rather than in wrangler.jsonc's
// `secrets.required`, which blocks deploys while any listed secret is unset.
type OptionalSecrets = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

declare namespace Cloudflare {
  interface Env extends OptionalSecrets {}
}

interface Env extends OptionalSecrets {}
