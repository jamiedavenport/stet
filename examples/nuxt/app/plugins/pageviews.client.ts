import { analytics } from '../analytics';

// Records a pageview on the initial navigation and on every client-side one.
// A plugin rather than a page, so every route is counted; `.client` because
// a pageview is a browser fact, not a server render.
export default defineNuxtPlugin(() => {
  const router = useRouter();

  router.afterEach((to, _from, failure) => {
    // afterEach also runs for aborted and redirected navigations, with the
    // failure set; nobody saw those pages, so they are not pageviews.
    if (failure != null) {
      return;
    }
    // The router's URL, not window.location: when this hook runs the router
    // has already advanced and window.location has not, so letting the client
    // read it would label every pageview with the previous page.
    analytics.pageview(`${window.location.origin}${to.fullPath}`);
  });
});
