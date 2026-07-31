import type { StripeOptions } from '@better-auth/stripe';
import { capture } from '@dogfood/analytics/server';
import { and, eq, schema } from '@repo/db';
import type { Database } from '@repo/db';
import Stripe from 'stripe';

import { emitWebhook } from './webhook.ts';

type StripeDeps = {
  database: Database;
  stripeSecretKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  stripePricePaid: string | undefined;
};

/**
 * Organization subscriptions on Stripe. Upgrades run through Stripe Checkout,
 * cancellation through the billing portal, and webhooks land on
 * /api/auth/stripe/webhook. The paid plan is seat-only (seatPriceId equals
 * priceId), so the plugin bills one unit per member and keeps the quantity in
 * sync as members join and leave.
 */
export function stripeOptions({
  database,
  stripeSecretKey,
  stripeWebhookSecret,
  stripePricePaid,
}: StripeDeps) {
  const configured = stripeSecretKey !== undefined && stripeSecretKey !== '';
  if (!configured) {
    console.log('[auth] STRIPE_SECRET_KEY not set, plan checkout is disabled');
  }
  const stripeClient = new Stripe(configured ? stripeSecretKey : 'sk_unset', {
    httpClient: Stripe.createFetchHttpClient(),
  });

  return {
    stripeClient,
    stripeWebhookSecret: stripeWebhookSecret ?? '',
    createCustomerOnSignUp: false,
    organization: { enabled: true },
    subscription: {
      enabled: true,
      plans: [
        {
          name: 'paid',
          priceId: stripePricePaid ?? '',
          seatPriceId: stripePricePaid ?? '',
        },
      ],
      // Billing truths come from Stripe's webhooks, so these captures cover
      // checkout and portal changes alike. referenceId is the subscribing
      // organization's id.
      onSubscriptionComplete: async ({ subscription, plan }) => {
        capture({ organizationId: subscription.referenceId }, 'subscription.started', {
          plan: plan.name,
        });
        await emitWebhook({
          organizationId: subscription.referenceId,
          type: 'subscription.started',
          payload: { plan: plan.name },
        });
      },
      onSubscriptionCancel: async ({ subscription }) => {
        capture({ organizationId: subscription.referenceId }, 'subscription.canceled', {
          plan: subscription.plan,
        });
        await emitWebhook({
          organizationId: subscription.referenceId,
          type: 'subscription.canceled',
          payload: { plan: subscription.plan },
        });
      },
      // Any member can read billing state; only owners and admins can change
      // it (upgrade, cancel, restore, billing portal).
      authorizeReference: async ({ user, referenceId, action }) => {
        const membership = await database.query.member.findFirst({
          where: and(
            eq(schema.member.organizationId, referenceId),
            eq(schema.member.userId, user.id),
          ),
        });
        if (membership === undefined) {
          return false;
        }
        if (action === 'list-subscription') {
          return true;
        }
        return membership.role === 'owner' || membership.role === 'admin';
      },
    },
  } satisfies StripeOptions;
}
