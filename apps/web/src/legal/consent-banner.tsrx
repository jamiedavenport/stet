import { useConsent } from '@policystack/react/consent';
import { m } from '@repo/i18n/messages';
import { Button } from '@repo/ui/components/button';
import { Link } from '@tanstack/react-router';

// Category copy is the app's own (localized through Paraglide) rather than
// PolicyStack-derived labels, keyed by the category keys in policystack.ts.
function categoryLabel(key: string): string {
  switch (key) {
    case 'essential':
      return m.essential_cookies();
    case 'analytics':
      return m.analytics_cookies();
    default:
      return key;
  }
}

function categoryDescription(key: string): string | null {
  switch (key) {
    case 'essential':
      return m.essential_cookies_description();
    case 'analytics':
      return m.analytics_cookies_description();
    default:
      return null;
  }
}

/**
 * The consent banner and preferences panel, driven by the headless consent
 * store the PolicyStack provider derives from src/policystack.ts. Lives
 * inside the client-only ConsentRuntime, so it never renders on the server
 * and cannot mismatch hydration for returning visitors.
 */
export function ConsentBanner() @{
  const consent = useConsent();

  if (consent.route === 'closed') {
    return null;
  }

  const preferences = consent.route === 'preferences';
  // Toggles stage into draft and only reach decisions on save, so the
  // checkboxes have to read the draft to respond to a tick.
  const granted = consent.draft ?? consent.decisions;

  // pointer-events split so the full-width wrapper never swallows clicks
  // beside the card.
  <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
    <div className="pointer-events-auto mx-auto flex w-full max-w-xl flex-col gap-4 rounded-xl border border-border bg-background p-5 shadow-lg">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{m.cookie_banner_title()}</p>
        <p className="text-sm text-muted-foreground">
          {m.cookie_banner_body()}{' '}
          <Link to="/cookies" className="text-foreground underline underline-offset-4">
            {m.cookie_policy()}
          </Link>
        </p>
      </div>
      @if (preferences) {
        <>
        <ul className="flex flex-col gap-3">
          @for (const category of consent.categories; key category.key) {
            <li className="flex items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">{categoryLabel(category.key)}</span>
                @if (categoryDescription(category.key) !== null) {
                  <span className="block text-xs text-muted-foreground">
                    {categoryDescription(category.key)}
                  </span>
                }
              </span>
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                aria-label={categoryLabel(category.key)}
                checked={category.locked === true || granted[category.key] === true}
                disabled={category.locked === true}
                onChange={() => consent.toggle(category.key)}
              />
            </li>
          }
        </ul>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => consent.acceptNecessary()}>
            {m.reject_non_essential()}
          </Button>
          <Button variant="outline" size="sm" onClick={() => consent.save()}>
            {m.save_preferences()}
          </Button>
          <Button size="sm" onClick={() => consent.acceptAll()}>
            {m.accept_all()}
          </Button>
        </div>
        </>
      } @else {
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => consent.setRoute('preferences')}>
            {m.cookie_preferences()}
          </Button>
          <Button variant="outline" size="sm" onClick={() => consent.acceptNecessary()}>
            {m.reject_non_essential()}
          </Button>
          <Button size="sm" onClick={() => consent.acceptAll()}>
            {m.accept_all()}
          </Button>
        </div>
      }
    </div>
  </div>
}
