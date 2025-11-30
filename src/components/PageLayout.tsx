import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Grid3X3, BarChart3, Settings } from 'lucide-react';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  showNavigation?: boolean;
  extraActions?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  children,
  showNavigation = true,
  extraActions,
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
        {/* Navigation Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {title}
            </h1>

            {/* View Toggle Buttons */}
            {showNavigation && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGridClick}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStatsClick}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Stats
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConfClick}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Conf
                </Button>
                {extraActions}
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
};