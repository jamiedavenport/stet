import { analytics } from '@dogfood/analytics/plan';
import { defineStet } from '@stetcms/config';

// The plan lives in @dogfood/analytics because @repo/auth records events too
// and cannot import from this app. No origin and no key here: both come from
// STET_ORIGIN and STET_API_KEY, which keeps this file safe to commit.
export default defineStet({ analytics });
