/**
 * useNotifications.ts - Notification Management Hook
 *
 * This custom React hook manages browser notifications for the ExocortexLog app.
 * It handles:
 *
 * - Requesting and managing notification permissions
 * - Scheduling periodic reminders based on user preferences
 * - Handling night time restrictions (with proper wrap-around logic)
 * - Creating notifications with last event information
 * - Managing notification levels (silent vs sound)
 * - Cleaning up notification intervals when settings change
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { ExocortexDB, ExocortexEvent, formatTime } from '@/lib/exocortex';

/**
 * Notification Settings Interface
 *
 * Defines the structure for notification preferences
 */
interface NotificationSettings {
  /** How often to send reminders */
  frequency: 'never' | '15-minutes' | '30-minutes' | 'hourly' | 'every-2-hours';
  /** Whether to pause notifications at night */
  exceptAtNight: boolean;
  /** Start time for night period (hour 0-23) */
  nightStartHour: number;
  /** End time for night period (hour 0-23) */
  nightEndHour: number;
  /** Whether notifications should be silent or make sound */
  silent: boolean;
}

/**
 * Default notification settings
 */
const DEFAULT_SETTINGS: NotificationSettings = {
  frequency: 'never',
  exceptAtNight: true,
  nightStartHour: 23, // 11 PM
  nightEndHour: 9,    // 9 AM
  silent: false,
};

/**
 * useNotifications Hook
 *
 * Manages all notification functionality including permissions, scheduling,
 * and notification creation.
 */
export function useNotifications() {
  // Load settings from localStorage with defaults
  const [settings, setSettings] = useLocalStorage<NotificationSettings>(
    'exocortex-notification-settings',
    DEFAULT_SETTINGS
  );

  // Track notification permission status
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // Reference to the current timeout/interval for cleanup
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Database reference
  const dbRef = useRef<ExocortexDB | null>(null);

  /**
   * Check if notifications are supported by the browser
   */
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'Notification' in window;
      setIsSupported(supported);
      if (supported) {
        setPermissionStatus(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  /**
   * Initialize database
   */
  useEffect(() => {
    const initDb = async () => {
      const database = new ExocortexDB();
      await database.init();
      dbRef.current = database;
    };

    initDb().catch(console.error);
  }, []);

  /**
   * Request notification permission from the user
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  };

  /**
   * Check if current time is within the restricted night period
   *
   * This handles the tricky case where night period wraps around midnight.
   * For example, if nightStartHour = 23 (11 PM) and nightEndHour = 9 (9 AM):
   * - 10 PM is NOT in night period
   * - 11 PM IS in night period
   * - 2 AM IS in night period
   * - 8 AM IS in night period
   * - 10 AM is NOT in night period
   */
  const isInNightPeriod = useCallback((): boolean => {
    if (!settings.exceptAtNight) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();

    if (settings.nightStartHour <= settings.nightEndHour) {
      // Simple case: doesn't wrap around midnight
      // Example: 22:00 to 06:00 doesn't apply here
      return currentHour >= settings.nightStartHour && currentHour < settings.nightEndHour;
    } else {
      // Wrap around case: e.g., 23:00 to 09:00
      // Current hour is in night period if it's >= start OR < end
      return currentHour >= settings.nightStartHour || currentHour < settings.nightEndHour;
    }
  }, [settings.exceptAtNight, settings.nightStartHour, settings.nightEndHour]);

  /**
   * Create and show a notification with last event information
   */
  const showNotification = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      return;
    }

    if (isInNightPeriod()) {
      return;
    }

    if (!dbRef.current) {
      return;
    }

    try {
      // Get the most recent event
      const lastEvent = await dbRef.current.getLatestEvent();

      let title = 'Remember to update your exocortex log';
      let body = 'It\'s time to log your current activity';

      if (lastEvent) {
        const eventTime = formatTime(lastEvent.endTime);
        body = `You finished ${lastEvent.category} at ${eventTime}`;
      }

      // Create notification with appropriate options
      const notification = new Notification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'exocortex-reminder',
        renotify: true,
        requireInteraction: false,
        silent: settings.silent,
        // Add vibration pattern if supported and not silent
        vibrate: settings.silent ? undefined : [200, 100, 200],
      });

      // Handle notification click - open the app
      notification.onclick = () => {
        // Focus on the window if it's already open
        if (window.focus) {
          window.focus();
        }

        // If the window is not focused or not visible, navigate to the app
        window.location.href = '/';

        // Close the notification
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }, [permissionStatus, isInNightPeriod, settings.silent]);

  /**
   * Schedule notifications based on current settings
   */
  const scheduleNotifications = useCallback(() => {
    // Clear any existing interval
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
      notificationIntervalRef.current = null;
    }

    // Don't schedule if frequency is 'never' or permission not granted
    if (settings.frequency === 'never' || permissionStatus !== 'granted') {
      return;
    }

    // Calculate interval based on frequency
    let intervalMs: number;
    switch (settings.frequency) {
      case '15-minutes':
        intervalMs = 15 * 60 * 1000; // 15 minutes
        break;
      case '30-minutes':
        intervalMs = 30 * 60 * 1000; // 30 minutes
        break;
      case 'hourly':
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case 'every-2-hours':
        intervalMs = 2 * 60 * 60 * 1000; // 2 hours
        break;
      default:
        return;
    }

    // Show immediate notification first, then schedule periodic ones
    showNotification();

    // Schedule periodic notifications
    notificationIntervalRef.current = setInterval(() => {
      showNotification();
    }, intervalMs);
  }, [settings.frequency, permissionStatus, showNotification]);

  /**
   * Update notification settings and reschedule if needed
   */
  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  /**
   * Reschedule notifications when settings or permission changes
   */
  useEffect(() => {
    scheduleNotifications();

    // Cleanup on unmount
    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, [scheduleNotifications]);

  /**
   * Test notification function for immediate testing
   */
  const testNotification = async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        return false;
      }
    }

    showNotification();
    return true;
  };

  return {
    // State
    settings,
    permissionStatus,
    isSupported,

    // Actions
    requestPermission,
    updateSettings,
    testNotification,

    // Utilities
    isInNightPeriod,
  };
}