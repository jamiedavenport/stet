// Optional secrets are typed here rather than in wrangler.jsonc's
// `secrets.required`, which blocks deploys while any listed secret is unset.
type OptionalSecrets = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  // Minted under Developers -> API keys on a deployment that is already up,
  // so requiring it would make the first deploy of a new instance impossible.
  STET_API_KEY?: string;
};

declare namespace Cloudflare {
  interface Env extends OptionalSecrets {}
}

interface Env extends OptionalSecrets {}
