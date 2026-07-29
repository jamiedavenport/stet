import { Billing } from '#/organization/billing.tsrx';
import { OrgDanger } from '#/organization/org-danger.tsrx';
import { OrgGeneral } from '#/organization/org-general.tsrx';
import { OrgMembers } from '#/organization/org-members.tsrx';
import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';

// The organization settings page: general details, members, billing, and the
// danger zone for the active organization, as one scrolling stack of cards.
export function OrganizationSettings() @{
  useBreadcrumbs([{ label: 'Organization' }]);

  <div className="flex w-full max-w-xl flex-col gap-6">
    <PageHeader
      title={"Organization"}
      description={"Details, members, and billing for this organization."}
    />
    <OrgGeneral />
    <OrgMembers />
    <Billing />
    <OrgDanger />
  </div>
}
