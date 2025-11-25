import { useState, useEffect } from 'react';
import { useNostrPublish } from './useNostrPublish';

interface QueuedEvent {
  id: string;
  event: any;
  timestamp: number;
  retryCount: number;
}

export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineCapable, setIsOfflineCapable] = useState(false);
  const [queuedEvents, setQueuedEvents] = useState<QueuedEvent[]>([]);
  const { mutate: publishEvent } = useNostrPublish();

  // Check if the app is installed as PWA
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setIsOfflineCapable(true);
      }).catch(() => {
        setIsOfflineCapable(false);
      });
    }

    // Check if app is installed
    const checkIfInstalled = () => {
      // For iOS Safari
      if (('standalone' in navigator) && (navigator as any).standalone) {
        setIsInstalled(true);
        return;
      }
      
      // For Chrome/Android
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      setIsInstalled(false);
    };

    checkIfInstalled();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      syncQueuedEvents();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    // Load queued events from localStorage
    const savedQueuedEvents = localStorage.getItem('queuedNostrEvents');
    if (savedQueuedEvents) {
      try {
        setQueuedEvents(JSON.parse(savedQueuedEvents));
      } catch (error) {
        console.error('Failed to load queued events:', error);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', () => setIsInstalled(true));
    };
  }, []);

  // Save queued events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('queuedNostrEvents', JSON.stringify(queuedEvents));
  }, [queuedEvents]);

  // Sync queued events when coming back online
  const syncQueuedEvents = async () => {
    if (!isOnline || queuedEvents.length === 0) return;

    const eventsToSync = [...queuedEvents];
    const successfullySynced: string[] = [];

    for (const queuedEvent of eventsToSync) {
      try {
        await publishEvent(queuedEvent.event);
        successfullySynced.push(queuedEvent.id);
      } catch (error) {
        console.error(`Failed to sync event ${queuedEvent.id}:`, error);
        // Increment retry count and remove if too many retries
        queuedEvent.retryCount += 1;
        if (queuedEvent.retryCount > 3) {
          successfullySynced.push(queuedEvent.id); // Remove from queue
        }
      }
    }

    // Remove successfully synced events
    setQueuedEvents(prev => prev.filter(event => !successfullySynced.includes(event.id)));
  };

  // Queue an event for when offline
  const queueEvent = (event: any) => {
    const queuedEvent: QueuedEvent = {
      id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      timestamp: Date.now(),
      retryCount: 0
    };

    setQueuedEvents(prev => [...prev, queuedEvent]);
    
    // Register for background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('nostr-events-sync');
      }).catch((error) => {
        console.log('Background sync registration failed:', error);
      });
    }
  };

  // Publish event with offline support
  const publishWithOfflineSupport = (event: any) => {
    if (isOnline) {
      // Try to publish immediately
      publishEvent(event).catch((error) => {
        console.error('Publish failed, queuing for later:', error);
        queueEvent(event);
      });
    } else {
      // Queue for when online
      queueEvent(event);
    }
  };

  // Clear all queued events
  const clearQueuedEvents = () => {
    setQueuedEvents([]);
    localStorage.removeItem('queuedNostrEvents');
  };

  // Prompt user to install PWA
  const promptInstall = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // For Chrome/Edge
        const event = new Event('beforeinstallprompt');
        window.dispatchEvent(event);
        
        // For browsers that support the install prompt
        const deferredPrompt = (window as any).deferredPrompt;
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`User response to the install prompt: ${outcome}`);
          (window as any).deferredPrompt = null;
        }
      } catch (error) {
        console.log('Install prompt not supported or failed:', error);
      }
    }
  };

  return {
    isOnline,
    isOfflineCapable,
    isInstalled,
    queuedEvents,
    publishWithOfflineSupport,
    clearQueuedEvents,
    promptInstall,
    hasQueuedEvents: queuedEvents.length > 0
  };
}