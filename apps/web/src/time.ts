/**
 * A timestamp as "3m ago". Coarsens as it goes back, so anything older than
 * a day reads in days rather than a running total of hours.
 */
export function timeAgo(value: Date | string): string {
  const format = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto', style: 'narrow' });
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) {
    return format.format(0, 'second');
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return format.format(-minutes, 'minute');
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return format.format(-hours, 'hour');
  }
  return format.format(-Math.floor(hours / 24), 'day');
}
