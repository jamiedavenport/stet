import { getRouteApi } from '@tanstack/react-router';

const appRoute = getRouteApi('/app');

export function useAppRoute() {
  const ctx = appRoute.useRouteContext();

  const user = ctx.session.user;

  return {
    user,
    ...ctx,
  };
}
