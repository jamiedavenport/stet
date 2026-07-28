import { m } from '@repo/i18n/messages';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';

import { ActiveSessions } from '#/account/active-sessions.tsrx';
import { ChangeEmail } from '#/account/change-email.tsrx';
import { ChangePassword } from '#/account/change-password.tsrx';
import { ConnectedAccounts } from '#/account/connected-accounts.tsrx';
import { DeleteAccount } from '#/account/delete-account.tsrx';
import { DisplayName } from '#/account/display-name.tsrx';
import { LanguageSettings } from '#/account/language-settings.tsrx';
import { NotificationSettings } from '#/notifications/notification-settings.tsrx';
import { PasskeySettings } from '#/account/passkey-settings.tsrx';
import { ProfilePhoto } from '#/account/profile-photo.tsrx';
import { TwoFactorSettings } from '#/account/two-factor-settings.tsrx';

// The personal settings page: everything scoped to the signed-in user, as one
// scrolling stack of cards. Organization-scoped settings live on /app/organization.
export function AccountSettings() @{
  <div className="flex w-full max-w-lg flex-col gap-4">
    <Card>
      <CardHeader>
        <CardTitle>{m.profile()}</CardTitle>
        <CardDescription>{m.your_profile_shown_to_everyone_in()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ProfilePhoto />
        <DisplayName />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{m.language()}</CardTitle>
        <CardDescription>{m.used_across_the_app_and_in()}</CardDescription>
      </CardHeader>
      <CardContent>
        <LanguageSettings />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{m.password()}</CardTitle>
        <CardDescription>{m.keep_your_account_secure_with_a()}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePassword />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{m.two_factor_authentication()}</CardTitle>
        <CardDescription>{m.add_an_extra_layer_of_security()}</CardDescription>
      </CardHeader>
      <CardContent>
        <TwoFactorSettings />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{m.passkeys()}</CardTitle>
        <CardDescription>{m.sign_in_without_a_password_using()}</CardDescription>
      </CardHeader>
      <CardContent>
        <PasskeySettings />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{m.connected_accounts()}</CardTitle>
        <CardDescription>{m.sign_in_with_a_linked_provider()}</CardDescription>
      </CardHeader>
      <CardContent>
        <ConnectedAccounts />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{m.email()}</CardTitle>
        <CardDescription>{m.change_the_address_you_sign_in()}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChangeEmail />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{m.active_sessions()}</CardTitle>
        <CardDescription>{m.devices_currently_signed_in_to_your()}</CardDescription>
      </CardHeader>
      <CardContent>
        <ActiveSessions />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{m.notifications()}</CardTitle>
        <CardDescription>{m.what_you_are_notified_about_and()}</CardDescription>
      </CardHeader>
      <CardContent>
        <NotificationSettings />
      </CardContent>
    </Card>
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">{m.danger_zone()}</CardTitle>
        <CardDescription>{m.permanently_delete_your_account()}</CardDescription>
      </CardHeader>
      <CardContent>
        <DeleteAccount />
      </CardContent>
    </Card>
  </div>
}
