import { authClient } from '@repo/auth/client';
import { getLocale, isLocale, languageName, locales, setLocale } from '@repo/i18n';
import { m } from '@repo/i18n/messages';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';

// Value-to-label map for the Select so the trigger shows "English" rather
// than "en".
const localeItems = Object.fromEntries(locales.map((locale) => [locale, languageName(locale)]));

export function LanguageSettings() @{
  const onChange = async (value: string) => {
    if (!isLocale(value) || value === getLocale()) {
      return;
    }
    // Persist to the account first; setLocale pins the cookie and reloads
    // the page, which would drop an in-flight update.
    await authClient.updateUser({ locale: value });
    setLocale(value);
  };

  <Select
    items={localeItems}
    value={getLocale()}
    onValueChange={(value) => {
      if (value !== null) {
        void onChange(value);
      }
    }}
  >
    <SelectTrigger className="w-48" aria-label={m.language()}>
      <SelectValue />
    </SelectTrigger>
    <SelectPositioner>
      <SelectContent>
        @for (const locale of locales; key locale) {
          <SelectItem value={locale}>{languageName(locale)}</SelectItem>
        }
      </SelectContent>
    </SelectPositioner>
  </Select>
}
