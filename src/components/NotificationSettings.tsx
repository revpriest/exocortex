// NotificationSettings component was removed because browser-based
// periodic notifications are not reliable on all platforms (especially
// Android PWAs). This file is kept as a no-op export to avoid import
// errors and make future re-introduction easier if platform support
// improves.

export function NotificationSettings() {
  return null;
}
