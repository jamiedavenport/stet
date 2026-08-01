import { analytics } from '../analytics';

// Records a pageview on the initial navigation and on every client-side one.
// A plugin rather than a page, so every route is counted; `.client` because
// a pageview is a browser fact, not a server render.
export default defineNuxtPlugin(() => {
  const router = useRouter();

  router.afterEach((to) => {
    // The router's URL, not window.location: when this hook runs the router
    // has already advanced and window.location has not, so letting the client
    // read it would label every pageview with the previous page.
    analytics.pageview(`${window.location.origin}${to.fullPath}`);
  });
});
