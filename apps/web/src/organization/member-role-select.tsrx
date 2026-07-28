import { useState } from 'react';
import type { OrganizationRole } from '@repo/auth/access';
import { authClient } from '@repo/auth/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';

import { assignableRoles, roleLabel } from '#/organization/roles';

export function MemberRoleSelect({
  member,
  viewerRole,
  organizationId,
  onChanged,
  onError,
}: {
  member: { id: string; role: string; user: { email: string } };
  viewerRole: OrganizationRole;
  organizationId: string;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) @{
  const [pending, setPending] = useState(false);

  const change = async (role: OrganizationRole) => {
    if (role === member.role) {
      return;
    }
    setPending(true);
    const { error } = await authClient.organization.updateMemberRole({
      memberId: member.id,
      role,
      organizationId,
    });
    setPending(false);
    if (error) {
      onError(error.message ?? "Something went wrong. Try again.");
      return;
    }
    await onChanged();
  };

  <Select
    value={member.role}
    onValueChange={(value) => void change(value as OrganizationRole)}
    disabled={pending}
  >
    <SelectTrigger
      className="h-7 w-28 text-xs capitalize"
      aria-label={`Role for ${member.user.email}`}
    >
      <SelectValue />
    </SelectTrigger>
    <SelectPositioner>
      <SelectContent>
        @for (const role of assignableRoles(viewerRole); key role) {
          <SelectItem value={role} className="capitalize">
            {roleLabel(role)}
          </SelectItem>
        }
      </SelectContent>
    </SelectPositioner>
  </Select>
}
