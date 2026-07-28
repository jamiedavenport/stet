# @repo/mail

Transactional email: React Email templates delivered with [Resend](https://resend.com).

`createMailer({ apiKey, from })` returns typed senders for the welcome, verify-email, reset-password, magic-link, change-email, delete-account, organization-invitation, invitation-reminder, and notification-digest emails. When no API key is set (local dev), emails are logged with their action link instead of sent, so link-based flows like password reset still work.

Every sender accepts an optional `locale` (pass the recipient's `user.locale` where known): subjects and templates render in that language through [@repo/i18n](../i18n), falling back to the default locale for unknown values and invitees without accounts. Template copy lives in `private/i18n/messages/{locale}/mail.json`. Because emails render outside a request (no ambient locale), each template and sender binds the locale once with `const t = localized(locale)` from `@repo/i18n/localized` and then calls `t.some_key({ … })`.

## Bulk email and unsubscribe

The senders split into transactional email (verification, password reset, magic links, email change, account deletion: never carries an unsubscribe, because suppressing it would break auth) and bulk email (the notification digest and invitation reminders). Bulk senders require an `unsubscribeUrl`, which becomes both a footer link and the RFC 8058 `List-Unsubscribe` / `List-Unsubscribe-Post` headers Gmail and Yahoo require of bulk senders. A new bulk sender cannot forget it: the option is part of the sender's type.

`./unsubscribe` mints and verifies the signed one-click tokens (HMAC over a subject with `BETTER_AUTH_SECRET`, no expiry, because unsubscribe links get clicked months later) and builds the public URL, served by the web app at `/mail/unsubscribe`. Subjects: `notification-emails` (flips the user's master email switch, see [@repo/notifications](../notifications)) and `invitation-reminders` (terminates that invitation's reminder workflow).

Config: the `RESEND_API_KEY` secret and the `MAIL_FROM` var. In production `MAIL_FROM` must use a Resend-verified domain.
