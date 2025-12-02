import React from 'react';
import { TitleNav } from '../components/TitleNav';
import { ExocortexDB } from '@/lib/exocortex';

interface PageLayoutProps {
  title: string;
  explain: string;
  children: React.ReactNode;
  showNavigation?: boolean;
  extraActions?: React.ReactNode;
  db: ExocortexDB | null;
  triggerRefresh?: (prev: any) => any | undefined;
  setSkipDate?: (newDate: Date) => void;
  currentView: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  children,
  currentView,
  db,
  triggerRefresh,
  setSkipDate,
  explain,
}) => {
  return (
    <div className="bg-background p-2 md:p-4 pb-16 md:pb-20 ">
      <TitleNav setSkipDate={setSkipDate} triggerRefresh={triggerRefresh} currentView={currentView} db={db} title={title} explain={explain} />

      {/* Page Content */}
      <div className="space-y-8">
        {children}
      </div>
    </div>
  );
};
