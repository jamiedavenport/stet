import { Billing } from '#/organization/billing.tsrx';
import { OrgDanger } from '#/organization/org-danger.tsrx';
import { OrgGeneral } from '#/organization/org-general.tsrx';
import { OrgMembers } from '#/organization/org-members.tsrx';

// The organization settings page: general details, members, billing, and the
// danger zone for the active organization, as one scrolling stack of cards.
export function OrganizationSettings() @{
  <div className="flex w-full max-w-lg flex-col gap-4">
    <OrgGeneral />
    <OrgMembers />
    <Billing />
    <OrgDanger />
  </div>
}
