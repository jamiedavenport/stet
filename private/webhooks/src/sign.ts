import { Webhook } from 'standardwebhooks';

export type SignWebhookInput = {
  // Stable per event across every retry, so receivers can dedupe on it.
  id: string;
  // The attempt time, not the event time: receivers reject signatures whose
  // timestamp is outside a short replay-protection window, and retries can
  // run long after the event occurred.
  timestamp: Date;
  body: string;
  secret: string;
  previousSecret?: string | null;
};

// Standard Webhooks request headers. During a secret rotation both secrets
// sign, so the signature header carries two space-delimited values and
// receivers holding either secret still match one.
export function webhookHeaders(input: SignWebhookInput): Record<string, string> {
  const signatures = [signBody(input.secret, input)];
  if (input.previousSecret !== undefined && input.previousSecret !== null) {
    signatures.push(signBody(input.previousSecret, input));
  }
  return {
    'content-type': 'application/json',
    'webhook-id': input.id,
    'webhook-timestamp': String(Math.floor(input.timestamp.getTime() / 1000)),
    'webhook-signature': signatures.join(' '),
  };
}

function signBody(secret: string, input: SignWebhookInput): string {
  return new Webhook(secret).sign(input.id, input.timestamp, input.body);
}
