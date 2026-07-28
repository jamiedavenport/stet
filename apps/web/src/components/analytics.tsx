import { useEffect } from 'react';
import { defineCookie } from '@policystack/sdk';
import { useCategory } from '@policystack/react/consent';
import {
  clearAnalyticsIdentity,
  identifyUser,
  initAnalytics,
  setActiveOrganization,
} from '@repo/analytics/client';
import { getRouteApi } from '@tanstack/react-router';

const rootRoute = getRouteApi('__root__');

// Declares the consent category at its use site so the PolicyStack scanner
// ties the config's analytics category to real code.
defineCookie('analytics');

/**
 * Boots the browser analytics client once the visitor grants the analytics
 * consent category, and syncs its identity with the session: identify on
 * sign-in, group on org switch, clear on sign-out. Renders nothing.
 *
 * Withdrawal after boot stops at the next page load: OpenPanel has no
 * teardown, and the consent record is read before every init.
 */
export function Analytics() {
  const { analyticsClientId, session } = rootRoute.useRouteContext();
  const { granted } = useCategory('analytics');

  useEffect(() => {
    if (granted) {
      initAnalytics({ clientId: analyticsClientId });
    }
  }, [granted, analyticsClientId]);

  const user = session?.user;
  const userId = user?.id;
  const userName = user?.name;
  const userEmail = user?.email;
  useEffect(() => {
    if (userId === undefined) {
      clearAnalyticsIdentity();
      return;
    }
    identifyUser({ id: userId, name: userName, email: userEmail });
  }, [userId, userName, userEmail]);

  const organizationId = session?.session.activeOrganizationId ?? null;
  useEffect(() => {
    if (organizationId !== null) {
      setActiveOrganization(organizationId);
    }
  }, [organizationId]);

  return null;
}
