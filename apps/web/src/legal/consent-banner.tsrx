import { useConsent } from '@policystack/react/consent';
import { Button } from '@repo/ui/components/button';
import { Link } from '@tanstack/react-router';

// Category copy is the app's own rather than PolicyStack-derived labels,
// keyed by the category keys in policystack.ts.
function categoryLabel(key: string): string {
  switch (key) {
    case 'essential':
      return "Essential";
    case 'analytics':
      return "Analytics";
    default:
      return key;
  }
}

function categoryDescription(key: string): string | null {
  switch (key) {
    case 'essential':
      return "Sign-in, security, and your language choice. Always on.";
    case 'analytics':
      return "Product analytics that help us understand usage. Off until you allow it.";
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
        <p className="text-sm font-medium">{"Cookies and privacy"}</p>
        <p className="text-sm text-muted-foreground">
          {"We use essential cookies to run the app, and analytics only with your permission."}{' '}
          <Link to="/cookies" className="text-foreground underline underline-offset-4">
            {"Cookie policy"}
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
            {"Essential only"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => consent.save()}>
            {"Save preferences"}
          </Button>
          <Button size="sm" onClick={() => consent.acceptAll()}>
            {"Accept all"}
          </Button>
        </div>
        </>
      } @else {
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => consent.setRoute('preferences')}>
            {"Preferences"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => consent.acceptNecessary()}>
            {"Essential only"}
          </Button>
          <Button size="sm" onClick={() => consent.acceptAll()}>
            {"Accept all"}
          </Button>
        </div>
      }
    </div>
  </div>
}
