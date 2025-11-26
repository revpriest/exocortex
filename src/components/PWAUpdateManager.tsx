import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface UpdateInfo {
  version: string;
  timestamp: number;
}

export function PWAUpdateManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastNotifiedVersion, setLastNotifiedVersion] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Always check for updates (both PWA and browser)
    console.log('🔍 PWA Update Manager: Checking for updates...');

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'update-available') {
        console.log('🔄 PWA update available:', event.data);

        // Only show update if it's a different version than last notified
        const newVersion = event.data.version;
        if (!lastNotifiedVersion || lastNotifiedVersion !== newVersion) {
          setUpdateInfo({
            version: newVersion,
            timestamp: event.data.timestamp
          });
          setUpdateAvailable(true);
          setIsDismissed(false);
          setLastNotifiedVersion(newVersion);

          // Also show a toast notification
          toast({
            title: "App Update Available",
            description: "A new version of ExocortexLog is ready to install.",
            duration: 10000,
            action: (
              <Button
                size="sm"
                onClick={() => handleRefresh()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Update Now
              </Button>
            ),
          });
        } else {
          console.log('📱 Same version already notified, skipping');
        }
      }
    };

    // Listen for controller changes (service worker updated)
    const handleControllerChange = () => {
      console.log('📱 Service worker controller changed');
      // This indicates the page has been controlled by a new service worker
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    // Check for updates on page load
    checkForUpdates();

    // Set up periodic check for updates (every 5 minutes)
    const updateInterval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
      clearInterval(updateInterval);
    };

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const checkForUpdates = async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        console.log('🔍 Service worker registration found:', {
          active: !!registration.active,
          waiting: !!registration.waiting,
          installing: !!registration.installing
        });

        // Check if there's a waiting service worker (new version available)
        if (registration.waiting && !updateAvailable) {
          console.log('🔄 New waiting service worker found - update available');
          setUpdateAvailable(true);
          setUpdateInfo({
            version: 'New Version',
            timestamp: Date.now()
          });
        } else if (!registration.waiting && updateAvailable) {
          // Reset state if waiting service worker is gone (user updated)
          console.log('📱 Update completed, resetting state');
          setUpdateAvailable(false);
          setUpdateInfo(null);
          setIsDismissed(false);
        }
      } else {
        console.log('ℹ️ No service worker registration found');
      }
    } catch (error) {
      console.error('❌ Failed to check for updates:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      // Tell the waiting service worker to skip waiting
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Wait a moment for the service worker to activate, then refresh
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to refresh:', error);
      setIsRefreshing(false);

      toast({
        title: "Update Failed",
        description: "Please refresh the page manually.",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);

    toast({
      title: "Update Deferred",
      description: "You'll be prompted again later.",
      duration: 3000,
    });
  };

  // Don't render if no update is available, if dismissed, or not in PWA mode
  if (!updateAvailable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Update Available</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              New Version
            </Badge>
          </div>
          <CardDescription>
            A new version of ExocortexLog is ready to install with improvements and bug fixes.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          {updateInfo && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Version: {updateInfo.version}</p>
              <p>
                Available: {new Date(updateInfo.timestamp).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between space-x-2 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            disabled={isRefreshing}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Later
          </Button>

          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Update Now
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}