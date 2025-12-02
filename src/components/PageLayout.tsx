import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Grid3X3, BarChart3, Settings } from 'lucide-react';
import { TitleNav } from '../components/TitleNav';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  showNavigation?: boolean;
  extraActions?: React.ReactNode;
  db: ExocortexDB | null;
  triggerRefresh: (triggerRefresh: int) => void;
  setSkipDate: (newDate: Date) => void;
  currentView: string;
  explain: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  children,
  showNavigation = true,
  extraActions,
  currentView,
  db,
  triggerRefresh,
  setSkipDate,
  explain,
}) => {
  const navigate = useNavigate();

  const handleGridClick = () => {
    navigate('/');
  };

  const handleStatsClick = () => {
    navigate('/?view=stats');
  };

  const handleConfClick = () => {
    navigate('/?view=conf');
  };

  return (
    <div className="min-h-screen bg-background p-2 md:p-4 pb-16 md:pb-20">
      <div className="max-w-4xl mx-auto">
        <TitleNav setSkipDate={setSkipDate} triggerRefresh={triggerRefresh} currentView={currentView} db={db} title={title} explain={explain} />

        {/* Page Content */}
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
};
