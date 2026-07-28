import { createOpenAPIPage } from 'fumadocs-openapi/ui';
import { shikiFactory, shikiThemes } from '../lib/highlighter';

// Without an explicit factory this pulls the full `shiki` bundle into the
// browser: it was 73% of the client JS, all of it lazy grammar chunks.
export const OpenAPIPage = createOpenAPIPage({
  shiki: shikiFactory,
  shikiOptions: { themes: shikiThemes },
});
