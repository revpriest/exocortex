import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExocortexDB } from '@/lib/exocortex';

export const usePageData = () => {
  const navigate = useNavigate();
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if there's existing data
  useEffect(() => {
    const checkForData = async () => {
      try {
        const database = new ExocortexDB();
        await database.init();

        // Check today and past few days for events
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = await database.getEventsByDate(today);

        if (todayEvents.length > 0) {
          setHasData(true);
          return;
        }

        // Check past 7 days
        for (let i = 1; i <= 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const events = await database.getEventsByDate(dateStr);

          if (events.length > 0) {
            setHasData(true);
            return;
          }
        }

        setHasData(false);
      } catch (error) {
        console.error('Failed to check database:', error);
        setHasData(false);
      }
    };

    void checkForData();
  }, []);

  const handleStartWithTestData = async () => {
    setIsGenerating(true);
    try {
      const database = new ExocortexDB();
      await database.init();

      // Use the shared 30-day test data generator
      const resultMessage = await database.generateTestData();
      console.log(resultMessage);

      // Navigate to grid after generating data
      navigate('/');
    } catch (error) {
      console.error('Failed to generate test data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartEmpty = () => {
    navigate('/');
  };

  const handleGotoGrid = () => {
    navigate('/');
  };

  return {
    hasData,
    isGenerating,
    handleStartWithTestData,
    handleStartEmpty,
    handleGotoGrid,
  };
};
