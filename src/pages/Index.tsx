import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';

const Index = () => {
  useSeoMeta({
    title: 'Exocortex - Time Tracking Grid',
    description: 'A visual time tracking app that displays your daily events in a colorful grid pattern.',
  });

  return (
    <div className="min-h-screen bg-gray-900 p-2 md:p-4 pb-20 md:pb-24"> {/* Extra bottom padding for floating button */}
      <div className="max-w-7xl mx-auto">
        {/* Main grid */}
        <ExocortexGrid className="w-full" />
      </div>
    </div>
  );
};

export default Index;
