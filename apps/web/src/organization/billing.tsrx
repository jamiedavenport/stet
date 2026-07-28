import { authClient } from '@repo/auth/client';
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

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCount(count: number): string {
  return new Intl.NumberFormat('en-GB').format(count);
}

// Labels keyed by the names in @repo/billing. Both switches are exhaustive,
// so adding a plan or a feature fails compilation here until it gets a label.
function planLabel(name: PlanName): string {
  switch (name) {
    case 'free':
      return "Free";
    case 'paid':
      return "Paid";
  }
}

type PlanEntitlement = PlanSummary['features'][number];

function entitlementLabel(entitlement: PlanEntitlement): string {
  switch (entitlement.feature) {
    case 'members':
      if (entitlement.kind === 'limit' && entitlement.cap !== null) {
        return entitlement.cap === 1 ? 'Up to 1 member' : `Up to ${entitlement.cap} members`;
      }
      if (entitlement.kind === 'unlimited') {
        return "Unlimited members";
      }
      return "Members";
    case 'apiRequests':
      if (entitlement.kind === 'limit' && entitlement.cap !== null) {
        return `${formatCount(entitlement.cap)} API requests / month`;
      }
      if (entitlement.kind === 'unlimited') {
        return "Unlimited API requests";
      }
      return "API requests";
    case 'storage':
      if (entitlement.kind === 'limit' && entitlement.cap !== null) {
        return `${formatCount(entitlement.cap)} MB of storage`;
      }
      if (entitlement.kind === 'unlimited') {
        return "Unlimited storage";
      }
      return "Storage";
    case 'ai':
      return "AI assistant";
  }
}

function usageLine(usage: Usage): string {
  let label: string;
  switch (usage.feature) {
    case 'members':
      label = "Members";
      break;
    case 'apiRequests':
      label = usage.window === 'month' ? "API requests this month" : "API requests";
      break;
    case 'storage':
      // Counted in megabytes, so both halves carry the unit.
      if (usage.cap === null) {
        return `Storage: ${formatCount(usage.used)} MB`;
      }
      return `Storage: ${formatCount(usage.used)} of ${formatCount(usage.cap)} MB`;
  }
  if (usage.cap === null) {
    return `${label}: ${formatCount(usage.used)}`;
  }
  return `${label}: ${formatCount(usage.used)} of ${formatCount(usage.cap)}`;
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
          throw new Error(error.message ?? "Something went wrong. Try again.");
        }
        return data?.url ?? null;
      }
      if (action === 'cancel') {
        const { data, error } = await authClient.subscription.cancel({
          ...reference,
          returnUrl: '/app/organization',
        });
        if (error !== null) {
          throw new Error(error.message ?? "Something went wrong. Try again.");
        }
        return data?.url ?? null;
      }
      const { error } = await authClient.subscription.restore(reference);
      if (error !== null) {
        throw new Error(error.message ?? "Something went wrong. Try again.");
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
      <CardTitle>{"Plan"}</CardTitle>
      <CardDescription>{"Billing is per organization and covers every member."}</CardDescription>
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
          {"Only owners and admins can manage billing."}
        </p>
      } @else {
        @if (billing.plan === 'free') {
          <Button onClick={() => plan.mutate('upgrade')} disabled={plan.isPending}>
            {"Upgrade to Paid"}
          </Button>
        } @else {
          @if (billing.subscription?.cancelAtPeriodEnd === true) {
            <Button onClick={() => plan.mutate('restore')} disabled={plan.isPending}>
              {"Restore subscription"}
            </Button>
          } @else {
            <Button variant="outline" onClick={() => plan.mutate('cancel')} disabled={plan.isPending}>
              {"Cancel subscription"}
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
        <Badge>{"Current"}</Badge>
      }
    </div>
    <p className="text-sm text-muted-foreground">
      {summary.pricePerSeat === 0
        ? "Free forever"
        : `\$${summary.pricePerSeat} per member / month`}
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
    status = "You are on the Free plan.";
  } else if (subscription.periodEnd === null) {
    status = `Subscription ${subscription.status}.`;
  } else if (subscription.cancelAtPeriodEnd) {
    status = `Cancels on ${formatDate(subscription.periodEnd)}.`;
  } else {
    status = `Renews on ${formatDate(subscription.periodEnd)}.`;
  }

  <p className="text-sm text-muted-foreground">{status}</p>
}

function UsageCard() @{
  const billing = useOrgBilling();

  <Card>
    <CardHeader>
      <CardTitle>{"Usage"}</CardTitle>
      <CardDescription>{"What your organization uses today."}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-1 text-sm">
      @for (const usage of billing.usage; key usage.feature) {
        <p>{usageLine(usage)}</p>
      }
      @if (billing.subscription !== null && billing.subscription.seats !== null) {
        <p>{`Seats billed: ${billing.subscription.seats}`}</p>
      }
    </CardContent>
  </Card>
}
