import { m } from '@repo/i18n/messages';
import { registry } from '@repo/notifications/registry';
import type { NotificationChannel, NotificationType } from '@repo/notifications/registry';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';

import {
  notificationPreferencesQuery,
  setEmailEnabled,
  updateNotificationPreference,
  updateQuietHours,
} from '#/notifications/functions';

const types = Object.values(registry);
const hours = Array.from({ length: 24 }, (_, hour) => hour);

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

// Registry labels are English canonical values keyed by type; the UI renders
// them through the catalog. The switch is exhaustive over NotificationType,
// so adding a type fails compilation here until it gets a label.
function typeLabel(type: NotificationType): string {
  switch (type) {
    case 'member-joined':
      return m.someone_joins_your_organization();
  }
}

export function NotificationSettings() @{
  const queryClient = useQueryClient();

  // Loaded by the settings route's loader, so this resolves from the cache.
  const { data } = useSuspenseQuery(notificationPreferencesQuery);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: notificationPreferencesQuery.queryKey });

  // Preference rows are exceptions; anything without a row uses the type's
  // default channels from the registry.
  const isEnabled = (type: NotificationType, channel: NotificationChannel): boolean => {
    const row = data.preferences.find(
      (preference) => preference.type === type && preference.channel === channel,
    );
    if (row !== undefined) {
      return row.enabled;
    }
    return registry[type].defaultChannels.includes(channel);
  };

  const onToggle = async (type: NotificationType, channel: NotificationChannel) => {
    await updateNotificationPreference({
      data: { type, channel, enabled: isEnabled(type, channel) === false },
    });
    await refresh();
  };

  const emailEnabled = data.settings?.emailEnabled !== false;

  const onEmailEnabledToggle = async () => {
    await setEmailEnabled({ data: { enabled: !emailEnabled } });
    await refresh();
  };

  const quietStart = data.settings?.quietHoursStart ?? null;
  const quietEnd = data.settings?.quietHoursEnd ?? null;

  const onQuietHoursChange = async (start: number | null, end: number | null) => {
    await updateQuietHours({
      data: {
        quietHoursStart: start,
        // Default the other end of the window when quiet hours are first
        // turned on, so a single pick produces a sane 22:00 to 07:00 night.
        quietHoursEnd: start !== null && end === null ? 7 : end,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
    await refresh();
  };

  <div className="flex flex-col gap-6">
      <label className="flex items-center justify-between gap-2 text-sm">
        <span>
          <span className="font-medium">{m.email_notifications()}</span>
          <span className="block text-xs text-muted-foreground">
            {m.email_notifications_description()}
          </span>
        </span>
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={emailEnabled}
          onChange={() => void onEmailEnabledToggle()}
        />
      </label>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-2 text-sm">
          <span />
          <span className="text-xs text-muted-foreground">{m.in_app()}</span>
          <span className="text-xs text-muted-foreground">{m.email()}</span>
          @for (const definition of types; key definition.type) {
            <>
              <span>{typeLabel(definition.type)}</span>
              <input
                type="checkbox"
                className="size-4 justify-self-center accent-primary"
                aria-label={m.label_in_app({ label: typeLabel(definition.type) })}
                checked={isEnabled(definition.type, 'app')}
                onChange={() => void onToggle(definition.type, 'app')}
              />
              <input
                type="checkbox"
                className="size-4 justify-self-center accent-primary"
                aria-label={m.label_by_email({ label: typeLabel(definition.type) })}
                checked={isEnabled(definition.type, 'email')}
                onChange={() => void onToggle(definition.type, 'email')}
              />
            </>
          }
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{m.quiet_hours()}</p>
        <p className="text-xs text-muted-foreground">
          {m.notification_emails_are_held_and_delivered()}
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={quietStart === null ? 'off' : String(quietStart)}
            onValueChange={(value) =>
              void onQuietHoursChange(value === 'off' ? null : Number(value), quietEnd)
            }
          >
            <SelectTrigger className="w-28" aria-label={m.quiet_hours_start()}>
              <SelectValue />
            </SelectTrigger>
            <SelectPositioner>
              <SelectContent>
                <SelectItem value="off">{m.off()}</SelectItem>
                @for (const hour of hours; key hour) {
                  <SelectItem value={String(hour)}>{hourLabel(hour)}</SelectItem>
                }
              </SelectContent>
            </SelectPositioner>
          </Select>
          <span className="text-sm text-muted-foreground">{m.until()}</span>
          <Select
            value={quietEnd === null ? 'off' : String(quietEnd)}
            onValueChange={(value) =>
              void onQuietHoursChange(quietStart, value === 'off' ? null : Number(value))
            }
          >
            <SelectTrigger className="w-28" aria-label={m.quiet_hours_end()}>
              <SelectValue />
            </SelectTrigger>
            <SelectPositioner>
              <SelectContent>
                <SelectItem value="off">{m.off()}</SelectItem>
                @for (const hour of hours; key hour) {
                  <SelectItem value={String(hour)}>{hourLabel(hour)}</SelectItem>
                }
              </SelectContent>
            </SelectPositioner>
          </Select>
        </div>
      </div>
    </div>
}
