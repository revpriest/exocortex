/**
 * NotificationSettings.tsx - Notification Settings Component
 *
 * This component provides the user interface for configuring notification preferences
 * in the ExocortexLog app. It includes:
 *
 * - Reminder frequency selection (never, hourly, every 2 hours)
 * - Night time exclusion toggle
 * - Start and end time selection for night period
 * - Silent vs sound notification preference
 * - Permission request and test functionality
 * - Visual indicators for permission status
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Volume2, VolumeX, Clock, Moon, Sun, Check, X, AlertTriangle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

/**
 * Time options for dropdown menus (24-hour format)
 */
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  const timeStr = `${hour}:00`;
  const displayStr = i === 0 ? '12:00 AM' : 
                    i < 12 ? `${i}:00 AM` : 
                    i === 12 ? '12:00 PM' : 
                    `${i - 12}:00 PM`;
  
  return { value: i, label: displayStr, timeStr };
});

/**
 * NotificationSettings Component
 */
export function NotificationSettings() {
  const {
    settings,
    permissionStatus,
    isSupported,
    requestPermission,
    updateSettings,
    testNotification,
  } = useNotifications();

  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  /**
   * Handle permission request with loading state
   */
  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      await requestPermission();
    } catch (error) {
      console.error('Failed to request permission:', error);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  /**
   * Handle test notification with loading state
   */
  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      await testNotification();
    } catch (error) {
      console.error('Failed to test notification:', error);
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Get permission status display information
   */
  const getPermissionStatusInfo = () => {
    if (!isSupported) {
      return {
        icon: BellOff,
        text: 'Not supported',
        variant: 'destructive' as const,
        description: 'Your browser does not support notifications'
      };
    }

    switch (permissionStatus) {
      case 'granted':
        return {
          icon: Bell,
          text: 'Enabled',
          variant: 'default' as const,
          description: 'Notifications are enabled and working'
        };
      case 'denied':
        return {
          icon: BellOff,
          text: 'Blocked',
          variant: 'destructive' as const,
          description: 'Notifications are blocked. Check your browser settings.'
        };
      case 'default':
        return {
          icon: Bell,
          text: 'Not requested',
          variant: 'secondary' as const,
          description: 'Click "Request Permission" to enable notifications'
        };
      default:
        return {
          icon: BellOff,
          text: 'Unknown',
          variant: 'destructive' as const,
          description: 'Unknown permission status'
        };
    }
  };

  const permissionInfo = getPermissionStatusInfo();
  const PermissionIcon = permissionInfo.icon;

  /**
   * Format time display for night period
   */
  const formatNightTimeDisplay = (hour: number) => {
    return TIME_OPTIONS.find(opt => opt.value === hour)?.timeStr || `${hour.toString().padStart(2, '0')}:00`;
  };

  /**
   * Get night period description
   */
  const getNightPeriodDescription = () => {
    if (!settings.exceptAtNight) {
      return 'Notifications are sent 24/7';
    }

    const startTime = formatNightTimeDisplay(settings.nightStartHour);
    const endTime = formatNightTimeDisplay(settings.nightEndHour);
    
    if (settings.nightStartHour > settings.nightEndHour) {
      // Wraps around midnight
      return `Notifications paused from ${startTime} to ${endTime} (next day)`;
    } else {
      // Same day range
      return `Notifications paused from ${startTime} to ${endTime}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Reminder Notifications
        </CardTitle>
        <CardDescription>
          Get periodic reminders to update your time log
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">Permission Status</label>
              <p className="text-xs text-muted-foreground">{permissionInfo.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={permissionInfo.variant} className="flex items-center gap-1">
                <PermissionIcon className="h-3 w-3" />
                {permissionInfo.text}
              </Badge>
            </div>
          </div>

          {permissionStatus === 'default' && (
            <Button
              onClick={handleRequestPermission}
              disabled={isRequestingPermission || !isSupported}
              className="w-full"
              variant="outline"
            >
              {isRequestingPermission ? 'Requesting...' : 'Request Permission'}
            </Button>
          )}

          {permissionStatus === 'granted' && (
            <Button
              onClick={handleTestNotification}
              disabled={isTesting}
              className="w-full"
              variant="outline"
            >
              {isTesting ? 'Sending...' : 'Test Notification'}
            </Button>
          )}

          {permissionStatus === 'denied' && isSupported && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Notifications are blocked</p>
                <p>You'll need to enable notifications in your browser settings to use this feature.</p>
              </div>
            </div>
          )}
        </div>

        {/* Reminder Frequency */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Reminder Frequency</label>
          <Select
            value={settings.frequency}
            onValueChange={(value: 'never' | 'hourly' | 'every-2-hours') => 
              updateSettings({ frequency: value })
            }
            disabled={permissionStatus !== 'granted'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">
                <div className="flex items-center gap-2">
                  <BellOff className="h-4 w-4" />
                  Never
                </div>
              </SelectItem>
              <SelectItem value="hourly">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Every hour
                </div>
              </SelectItem>
              <SelectItem value="every-2-hours">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Every 2 hours
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Except at Night Toggle */}
        {settings.frequency !== 'never' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium">Except at night</label>
                <p className="text-xs text-muted-foreground">{getNightPeriodDescription()}</p>
              </div>
              <Switch
                checked={settings.exceptAtNight}
                onCheckedChange={(checked) => updateSettings({ exceptAtNight: checked })}
                disabled={permissionStatus !== 'granted'}
              />
            </div>

            {/* Night Time Settings */}
            {settings.exceptAtNight && (
              <div className="space-y-3 pl-4 border-l-2 border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium flex items-center gap-1">
                      <Moon className="h-3 w-3" />
                      Start time
                    </label>
                    <Select
                      value={settings.nightStartHour.toString()}
                      onValueChange={(value) => updateSettings({ nightStartHour: parseInt(value) })}
                      disabled={permissionStatus !== 'granted'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium flex items-center gap-1">
                      <Sun className="h-3 w-3" />
                      End time
                    </label>
                    <Select
                      value={settings.nightEndHour.toString()}
                      onValueChange={(value) => updateSettings({ nightEndHour: parseInt(value) })}
                      disabled={permissionStatus !== 'granted'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notification Level */}
        {settings.frequency !== 'never' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium">Notification Sound</label>
                <p className="text-xs text-muted-foreground">
                  {settings.silent ? 'Silent notifications' : 'Sound and vibration enabled'}
                </p>
              </div>
              <Button
                variant={settings.silent ? "outline" : "default"}
                size="sm"
                onClick={() => updateSettings({ silent: !settings.silent })}
                disabled={permissionStatus !== 'granted'}
                className="w-20"
              >
                {settings.silent ? (
                  <>
                    <VolumeX className="h-4 w-4 mr-1" />
                    Off
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-1" />
                    On
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Info about notifications */}
        {permissionStatus === 'granted' && settings.frequency !== 'never' && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Notifications will include your last logged activity</p>
            <p>• Click a notification to open the app</p>
            <p>• Notifications auto-close after 10 seconds</p>
            <p>• Settings are saved automatically</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}