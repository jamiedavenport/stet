import { authClient } from '@repo/auth/client';
import { getLocale } from '@repo/i18n';
import { m } from '@repo/i18n/messages';
import type { PlanName, PlanSummary, Usage } from '@repo/billing/types';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError } from '@repo/ui/components/field';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { CheckIcon, MinusIcon } from 'lucide-react';

import { useAppRoute } from '#/use-app-route';
import { orgBillingQuery } from '#/organization/functions';

function useOrgBilling() {
  const { activeOrganization } = useAppRoute();
  return useSuspenseQuery(orgBillingQuery(activeOrganization.id)).data;
}

function formatDate(date: Date, locale: string): string {
  return new Date(date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCount(count: number): string {
  return new Intl.NumberFormat(getLocale()).format(count);
}

// Plan and feature labels come through the i18n catalog, keyed by the names
// in @repo/billing. Both switches are exhaustive, so adding a plan or a
// feature fails compilation here until it gets a label.
function planLabel(name: PlanName): string {
  switch (name) {
    case 'free':
      return m.free();
    case 'paid':
      return m.paid();
  }
}

type PlanEntitlement = PlanSummary['features'][number];

function entitlementLabel(entitlement: PlanEntitlement): string {
  switch (entitlement.feature) {
    case 'members':
      if (entitlement.kind === 'limit' && entitlement.cap !== null) {
        return m.up_to_members({ memberLimit: entitlement.cap });
      }
      if (entitlement.kind === 'unlimited') {
        return m.unlimited_members();
      }
      return m.members();
    case 'apiRequests':
      if (entitlement.kind === 'limit' && entitlement.cap !== null) {
        return m.api_requests_per_month({ count: formatCount(entitlement.cap) });
      }
      if (entitlement.kind === 'unlimited') {
        return m.unlimited_api_requests();
      }
      return m.api_requests();
    case 'storage':
      if (entitlement.kind === 'limit' && entitlement.cap !== null) {
        return m.storage_of_mb({ limit: formatCount(entitlement.cap) });
      }
      if (entitlement.kind === 'unlimited') {
        return m.unlimited_storage();
      }
      return m.storage();
    case 'ai':
      return m.ai_assistant();
  }
}

function usageLine(usage: Usage): string {
  let label: string;
  switch (usage.feature) {
    case 'members':
      label = m.members();
      break;
    case 'apiRequests':
      label = usage.window === 'month' ? m.api_requests_this_month() : m.api_requests();
      break;
    case 'storage':
      // Counted in megabytes, so both halves carry the unit.
      if (usage.cap === null) {
        return m.usage_no_limit({
          label: m.storage(),
          count: m.megabytes({ count: formatCount(usage.used) }),
        });
      }
      return m.usage_of_limit({
        label: m.storage(),
        count: formatCount(usage.used),
        limit: m.megabytes({ count: formatCount(usage.cap) }),
      });
  }
  if (usage.cap === null) {
    return m.usage_no_limit({ label, count: formatCount(usage.used) });
  }
  return m.usage_of_limit({
    label,
    count: formatCount(usage.used),
    limit: formatCount(usage.cap),
  });
}

export function Billing() @{
  <>
    <PlanCard />
    <UsageCard />
  </>
}

type BillingAction = 'upgrade' | 'cancel' | 'restore';

// Runs a billing action and resolves to the Stripe URL to follow (checkout
// or portal), or null when the action completed in place.
function usePlanMutation() {
  const { activeOrganization } = useAppRoute();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: BillingAction): Promise<string | null> => {
      const reference = {
        customerType: 'organization' as const,
        referenceId: activeOrganization.id,
      };
      if (action === 'upgrade') {
        const { data, error } = await authClient.subscription.upgrade({
          ...reference,
          plan: 'paid',
          successUrl: '/app/organization',
          cancelUrl: '/app/organization',
        });
        if (error !== null) {
          throw new Error(error.message ?? m.something_went_wrong_try_again());
        }
        return data?.url ?? null;
      }
      if (action === 'cancel') {
        const { data, error } = await authClient.subscription.cancel({
          ...reference,
          returnUrl: '/app/organization',
        });
        if (error !== null) {
          throw new Error(error.message ?? m.something_went_wrong_try_again());
        }
        return data?.url ?? null;
      }
      const { error } = await authClient.subscription.restore(reference);
      if (error !== null) {
        throw new Error(error.message ?? m.something_went_wrong_try_again());
      }
      return null;
    },
    onSuccess: async (url) => {
      if (url !== null) {
        window.location.href = url;
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: orgBillingQuery(activeOrganization.id).queryKey,
      });
      await router.invalidate();
    },
  });
}

function PlanCard() @{
  const billing = useOrgBilling();
  const plan = usePlanMutation();

  <Card>
    <CardHeader>
      <CardTitle>{m.plan()}</CardTitle>
      <CardDescription>{m.billing_is_per_organization_and_covers()}</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-3 sm:grid-cols-2">
      @for (const summary of billing.catalog; key summary.name) {
        <PlanOption summary={summary} current={billing.plan === summary.name} />
      }
      @if (plan.error !== null) {
        <FieldError className="sm:col-span-2">{plan.error.message}</FieldError>
      }
    </CardContent>
    <CardFooter className="flex flex-wrap items-center justify-between gap-2">
      <PlanStatus />
      @if (!billing.canManage) {
        <p className="text-xs text-muted-foreground">
          {m.only_owners_and_admins_can_manage()}
        </p>
      } @else {
        @if (billing.plan === 'free') {
          <Button onClick={() => plan.mutate('upgrade')} disabled={plan.isPending}>
            {m.upgrade_to_paid()}
          </Button>
        } @else {
          @if (billing.subscription?.cancelAtPeriodEnd === true) {
            <Button onClick={() => plan.mutate('restore')} disabled={plan.isPending}>
              {m.restore_subscription()}
            </Button>
          } @else {
            <Button variant="outline" onClick={() => plan.mutate('cancel')} disabled={plan.isPending}>
              {m.cancel_subscription()}
            </Button>
          }
        }
      }
    </CardFooter>
  </Card>
}

function PlanOption({ summary, current }: { summary: PlanSummary; current: boolean }) @{
  <div aria-current={current} className="flex flex-col gap-2 rounded-lg border p-4">
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium">{planLabel(summary.name)}</span>
      @if (current) {
        <Badge>{m.current()}</Badge>
      }
    </div>
    <p className="text-sm text-muted-foreground">
      {summary.pricePerSeat === 0
        ? m.free_forever()
        : m.price_per_member_month({ pricePerSeat: summary.pricePerSeat })}
    </p>
    <ul className="flex flex-col gap-1 text-sm">
      @for (const entitlement of summary.features; key entitlement.feature) {
        <EntitlementRow entitlement={entitlement} />
      }
    </ul>
  </div>
}

function EntitlementRow({ entitlement }: { entitlement: PlanEntitlement }) @{
  const excluded = entitlement.kind === 'excluded';

  <li
    className={
      excluded ? 'flex items-center gap-2 text-muted-foreground' : 'flex items-center gap-2'
    }
  >
    @if (excluded) {
      <MinusIcon aria-hidden className="size-3.5 text-muted-foreground" />
    } @else {
      <CheckIcon aria-hidden className="size-3.5 text-muted-foreground" />
    }
    {entitlementLabel(entitlement)}
  </li>
}

function PlanStatus() @{
  const { subscription, plan } = useOrgBilling();

  let status: string;
  if (plan === 'free' || subscription === null) {
    status = m.you_are_on_the_free_plan();
  } else if (subscription.periodEnd === null) {
    status = m.subscription({ status: subscription.status });
  } else if (subscription.cancelAtPeriodEnd) {
    status = m.cancels_on({ date: formatDate(subscription.periodEnd, getLocale()) });
  } else {
    status = m.renews_on({ date: formatDate(subscription.periodEnd, getLocale()) });
  }

  <p className="text-sm text-muted-foreground">{status}</p>
}

function UsageCard() @{
  const billing = useOrgBilling();

  <Card>
    <CardHeader>
      <CardTitle>{m.usage()}</CardTitle>
      <CardDescription>{m.what_your_organization_uses_today()}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-1 text-sm">
      @for (const usage of billing.usage; key usage.feature) {
        <p>{usageLine(usage)}</p>
      }
      @if (billing.subscription !== null && billing.subscription.seats !== null) {
        <p>{m.seats_billed({ count: billing.subscription.seats })}</p>
      }
    </CardContent>
  </Card>
}
