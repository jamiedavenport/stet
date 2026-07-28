import { useEffect, useState } from 'react';
import { PolicyStack } from '@policystack/react/provider';

import { Analytics } from '#/components/analytics';
import { ConsentBanner } from '#/legal/consent-banner.tsrx';
import policystack from '#/policystack';

/**
 * The consent store, banner, and analytics gate, mounted client-side only.
 * Everything in here is effects and overlays (nothing paints above the fold).
 *
 * The client-only mount is not about hydration mismatches: PolicyStack 1.2.0
 * fixed those with a deterministic server snapshot. It is that under the
 * workerd dev SSR the externally-served provider binds its own React copy,
 * whose dispatcher is null beneath the renderer Vite optimized, so useConsent
 * throws "Cannot read properties of null (reading 'useContext')". Neither
 * ssr.optimizeDeps nor ssr.noExternal on the PolicyStack packages fixes it.
 * The policy pages don't need the provider; they pass the config to the
 * policy components directly.
 */
export function ConsentRuntime() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <PolicyStack config={policystack}>
      <Analytics />
      <ConsentBanner />
    </PolicyStack>
  );
}
