import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOfflineSupport } from '@/hooks/useOfflineSupport';
import { Wifi, WifiOff, Download, AlertCircle, CheckCircle } from 'lucide-react';

export function OfflineSupport() {
  const {
    isOnline,
    isOfflineCapable,
    isInstalled,
    queuedEvents,
    hasQueuedEvents,
    promptInstall
  } = useOfflineSupport();

  if (!isOfflineCapable) {
    return null; // Don't show anything if PWA is not supported
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Network</span>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">PWA Status</span>
          <Badge variant={isInstalled ? "default" : "secondary"}>
            {isInstalled ? "Installed" : "Not Installed"}
          </Badge>
        </div>

        {hasQueuedEvents && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {queuedEvents.length} event{queuedEvents.length !== 1 ? 's' : ''} queued
            </span>
          </div>
        )}

        {!isInstalled && (
          <Button 
            onClick={promptInstall} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="mb-1">When installed, this app works offline and:</p>
          <ul className="space-y-1 ml-2">
            <li className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Caches content for offline use
            </li>
            <li className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Queues events when offline
            </li>
            <li className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Syncs automatically when online
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}