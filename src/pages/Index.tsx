import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';
import { OfflineSupport } from '@/components/OfflineSupport';

const Index = () => {
  useSeoMeta({
    title: 'Exocortex - Time Tracking Grid',
    description: 'A visual time tracking app that displays your daily events in a colorful grid pattern.',
  });

  return (
    <div className="min-h-screen bg-gray-900 p-2 md:p-4 pb-16 md:pb-20"> {/* Reduced bottom padding */}
      <div className="max-w-7xl mx-auto">
        {/* Main grid */}
        <ExocortexGrid className="w-full" />

        {/* Offline support component */}
        <div className="fixed bottom-4 right-4 z-50">
          <OfflineSupport />
        </div>
      </div>
    </div>
  );
};

export default Index;
