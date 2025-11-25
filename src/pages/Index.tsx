import { useSeoMeta } from '@unhead/react';
import { ExocortexGrid } from '@/components/ExocortexGrid';

const Index = () => {
  useSeoMeta({
    title: 'Exocortex - Time Tracking Grid',
    description: 'A visual time tracking app that displays your daily events in a colorful grid pattern.',
  });

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Exocortex
          </h1>
          <p className="text-gray-400">
            Visual time tracking with mood and energy patterns
          </p>
        </div>

        {/* Main grid */}
        <ExocortexGrid className="w-full" />
      </div>
    </div>
  );
};

export default Index;
