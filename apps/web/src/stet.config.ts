import { analytics } from '@dogfood/analytics/plan';
import { defineStet } from '@stetcms/config';

// Stet's own Stet integration, in the shape the docs hand a customer.
//
// The plan itself lives in @dogfood/analytics because @repo/auth captures
// events server-side and cannot import from this app. Neither the origin nor
// the key is named here: both come from the Worker's environment where the
// route is mounted (src/routes/api/analytics.ts), which keeps this file
// loadable under plain Node and safe to commit.
//
// There is no `output`: this app is Stet, so it has no generated content
// client to keep current.
export default defineStet({ analytics });
