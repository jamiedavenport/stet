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
        <CardTitle>{"Profile"}</CardTitle>
        <CardDescription>{"Your profile, shown to everyone in your organizations."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ProfilePhoto />
        <DisplayName />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{"Password"}</CardTitle>
        <CardDescription>{"Keep your account secure with a strong password."}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePassword />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{"Two-factor authentication"}</CardTitle>
        <CardDescription>{"Add an extra layer of security with an authenticator app."}</CardDescription>
      </CardHeader>
      <CardContent>
        <TwoFactorSettings />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{"Passkeys"}</CardTitle>
        <CardDescription>{"Sign in without a password using your device's screen lock or a security key."}</CardDescription>
      </CardHeader>
      <CardContent>
        <PasskeySettings />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{"Connected accounts"}</CardTitle>
        <CardDescription>{"Sign in with a linked provider."}</CardDescription>
      </CardHeader>
      <CardContent>
        <ConnectedAccounts />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{"Email"}</CardTitle>
        <CardDescription>{"Change the address you sign in with."}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChangeEmail />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{"Active sessions"}</CardTitle>
        <CardDescription>{"Devices currently signed in to your account."}</CardDescription>
      </CardHeader>
      <CardContent>
        <ActiveSessions />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{"Notifications"}</CardTitle>
        <CardDescription>{"What you are notified about, and on which channels."}</CardDescription>
      </CardHeader>
      <CardContent>
        <NotificationSettings />
      </CardContent>
    </Card>
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">{"Danger zone"}</CardTitle>
        <CardDescription>{"Permanently delete your account and all of its data."}</CardDescription>
      </CardHeader>
      <CardContent>
        <DeleteAccount />
      </CardContent>
    </Card>
  </div>
}
