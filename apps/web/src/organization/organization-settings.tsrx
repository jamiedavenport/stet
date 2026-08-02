import { Billing } from '#/organization/billing.tsrx';
import { OrgDanger } from '#/organization/org-danger.tsrx';
import { OrgGeneral } from '#/organization/org-general.tsrx';
import { OrgMembers } from '#/organization/org-members.tsrx';
import { OrgModelKit } from '#/organization/org-model-kit.tsrx';
import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';
import { useAppRoute } from '#/use-app-route';

// The organization settings page: general details, members, billing, and the
// danger zone for the active organization, as one scrolling stack of cards.
export function OrganizationSettings() @{
  useBreadcrumbs([{ label: 'Organization' }]);
  const { memberRole } = useAppRoute();
  const canManage = memberRole === 'owner' || memberRole === 'admin';

  <div className="flex w-full max-w-xl flex-col gap-6">
    <PageHeader
      title={"Organization"}
      description={"Details, members, model portability, and billing for this organization."}
    />
    <OrgGeneral />
    <OrgMembers />
    @if (canManage) {
      <OrgModelKit />
    }
    <Billing />
    <OrgDanger />
  </div>
}
