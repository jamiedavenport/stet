import { createAuth } from '@repo/auth/server';
import { createMailer } from '@repo/mail';
import { env, waitUntil } from 'cloudflare:workers';

const mailer = createMailer({
  apiKey: env.RESEND_API_KEY,
  from: env.MAIL_FROM,
});

export const auth = createAuth({
  db: env.DB,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  mailer,
  stripeSecretKey: env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  stripePricePaid: env.STRIPE_PRICE_PAID,
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  githubClientId: env.GITHUB_CLIENT_ID,
  githubClientSecret: env.GITHUB_CLIENT_SECRET,
  turnstileSecretKey: env.TURNSTILE_SECRET_KEY,
  waitUntil,
});
