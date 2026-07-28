import type { TurnstileInstance, TurnstileProps } from '@marsidev/react-turnstile';
import { getRouteApi } from '@tanstack/react-router';
import { type RefObject, useRef, useState } from 'react';

// The header Better Auth's captcha plugin reads the token from.
function captchaHeaders(token: string | null): Record<string, string> | undefined {
  if (token === null) {
    return undefined;
  }
  return { 'x-captcha-response': token };
}

const widgetOptions: TurnstileProps['options'] = {
  appearance: 'always',
  size: 'flexible',
};

type CaptchaWidgetProps = TurnstileProps & {
  ref: RefObject<TurnstileInstance | undefined>;
};

const signRoute = getRouteApi('/sign');

/**
 * Captcha state for an auth form. Reads the site key from the `/sign` loader,
 * so it only works inside that route tree. With no site key everything is
 * inert: `widgetProps` is null so nothing renders, headers stay undefined,
 * and the submit button is never held back. Call `reset()` after a failed
 * submit; tokens are single use.
 */
export function useCaptcha() {
  const { turnstileSiteKey } = signRoute.useLoaderData();
  const widget = useRef<TurnstileInstance | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);

  function clear() {
    setToken(null);
  }

  const widgetProps: CaptchaWidgetProps | null =
    turnstileSiteKey === null
      ? null
      : {
          ref: widget,
          siteKey: turnstileSiteKey,
          onSuccess: setToken,
          onExpire: clear,
          onError: clear,
          options: widgetOptions,
        };

  return {
    widgetProps,
    headers: captchaHeaders(token),
    submitDisabled: turnstileSiteKey !== null && token === null,
    reset: () => {
      clear();
      widget.current?.reset();
    },
  };
}
