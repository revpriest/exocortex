/**
 * Conf.tsx - Conf Page
 *
 * Configure display and options along with help
 */
import React, { useState, useEffect, useRef } from 'react';
import { APP_VERSION } from '../main';
import { useTheme } from '@/hooks/useTheme';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataExporter } from '@/lib/dataExport';
import { Button } from '@/components/ui/button';
import { usePageData } from '@/hooks/usePageData';
import { ExocortexDB } from '@/lib/exocortex';
import { StatsView } from '@/components/StatsView';
import { ColorOverrideWidget } from '@/components/ColorOverrideWidget';
import { NotificationSettings } from '@/components/NotificationSettings';
import { resetCacheAndReload, hasActiveServiceWorkers, hasCachedAssets } from '@/lib/cacheReset';
import { Grid3X3, BarChart3, Settings, Moon, Sun, RefreshCw, Database, HardDrive, Download, Upload, Trash2, ChevronUp, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';


/**
 * Database Management Section Component
 *
 * Provides database operations including import, export, test data generation,
 * and database clearing functionality.
 */
const DBManagementSection = ({db}) => {
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTestConfirm, setShowTestConfirm] = useState(false);


  const confirmGenerateTestData = async () => {
    await handleGenerateTestData();
    setShowTestConfirm(false);
  };
 
  const handleGenerateTestData= async () => {
    const t = await db.generateTestData();
    setError(t);
  }

  const cancelGenerateTestData = () => {
    setShowTestConfirm(false);
  };


  const confirmClearAllData = () => {
    handleClearAllData();
    setShowClearConfirm(false);
  };

  const cancelClearAllData = () => {
    setShowClearConfirm(false);
  };

  const handleClearAllData = async() => {
    if (!db) return;

    try {
      await db.clearAllEvents();
      setError('All data has been cleared successfully');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Failed to clear data:', error);
      setError('Failed to clear data. Please try again.');
    }
  };

  const handleExport = async() => {
    if (!db) return;

    try {
      await DataExporter.exportDatabase(db);
      setError('Export completed! Check your downloads folder for the JSON file.');
      setTimeout(() => setError(null), 5000);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export database. Please try again.');
    }
  };

  const handleImportDatabase = async() => {
    if (!db) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const isValid = await DataExporter.validateExportFile(file);
        if (!isValid) {
          setError('Invalid export file. Please select a valid ExocortexLog export file.');
          return;
        }

        await DataExporter.importDatabase(db, file);
        setError(`Successfully imported events from ${file.name}`);
        setTimeout(() => setError(null), 3000);
      } catch (error) {
        console.error('Import failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to import database. Please try again.');
      }
    };

    input.click();
  };

  const handleImportLegacyDatabase = async() => { 
    if (!db) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await DataExporter.importLegacyDatabase(db, file);
        setError('Legacy data imported successfully. Categories from multiple tags have been combined.');
        setTimeout(() => setError(null), 5000);
      } catch (error) {
        console.error('Failed to import legacy data:', error);
        setError(`Legacy import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Management
        </CardTitle>
        <CardDescription>
          Import, export, and manage your time tracking data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
          <p className="text-destructive text-base md:text-lg leading-relaxed">
            You should probably back up with the export button often, no guarantees.
          </p>
        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!db}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleImportDatabase}
            disabled={!db}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleImportLegacyDatabase}
            disabled={!db}
            className="w-full bg-orange-600/20 border-orange-600 text-orange-400 hover:bg-orange-600/30"
          >
            <Upload className="h-4 w-4 mr-2" />
            Legacy
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTestConfirm(true)}
            disabled={!db}
            className="w-full"
          >
            <Database className="h-4 w-4 mr-2" />
            Test Data
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowClearConfirm(true)}
            disabled={!db}
            className="w-full bg-destructive border-destructive text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className={`px-3 py-2 rounded-md text-sm ${
            error.includes('Successfully')
              ? 'bg-green-900/20 border border-green-600 text-green-400'
              : 'bg-red-900/20 border border-red-600 text-red-400'
          }`}>
            {error}
          </div>
        )}
      </CardContent>

      {/* Clear Database Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Delete Entire Database</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will delete the entire database. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={cancelClearAllData}
              className="bg-secondary border-border"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearAllData}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Test Data Confirmation Dialog */}
      <Dialog open={showTestConfirm} onOpenChange={setShowTestConfirm}>
        <DialogContent className="sm:max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Generate Test Data</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will create 30 days of random test data with various activities and diary notes. This will replace any existing data.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={cancelGenerateTestData}
              className="bg-secondary border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmGenerateTestData}
              className="bg-primary hover:bg-primary/90"
            >
              Generate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

/**
 * Cache Reset Section Component
 *
 * Provides cache management functionality including clearing browser caches
 * and service worker caches while preserving IndexedDB data.
 */
const CacheResetSection = () => {
  const [hasServiceWorker, setHasServiceWorker] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Check cache and service worker status on mount
  useEffect(() => {
    const checkCacheStatus = async () => {
      try {
        const [swStatus, cacheStatus] = await Promise.all([
          hasActiveServiceWorkers(),
          hasCachedAssets()
        ]);
        setHasServiceWorker(swStatus);
        setHasCache(cacheStatus);
      } catch (error) {
        console.error('Failed to check cache status:', error);
      }
    };

    checkCacheStatus();
  }, []);

  const handleResetCache = async () => {
    setIsResetting(true);
    try {
      await resetCacheAndReload();
    } catch (error) {
      console.error('Cache reset failed:', error);
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Version Management
        </CardTitle>
        <CardDescription>
          You are currently running version {APP_VERSION}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cache Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">IndexedDB:</span>
            <span className="text-green-600 font-medium">Preserved</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Service Worker:</span>
            <span className={hasServiceWorker ? "text-blue-600 font-medium" : "text-gray-500"}>
              {hasServiceWorker ? "Active" : "Not Active"}
            </span>
          </div>
        </div>


        {/* Reset Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isResetting}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Resetting...' : 'Reset Cache & Check For Upgrade'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Application Cache?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all browser caches and service workers, then reload the app from the network.
                Your time tracking data in IndexedDB will be preserved.
                <br /><br />
                Use this if the app isn't updating properly or if you're experiencing display issues.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetCache} disabled={isResetting}>
                {isResetting ? 'Resetting...' : 'Reset Cache'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};


/**
 * Theme Switch Component
 *
 * A toggle switch that allows users to switch between dark and light themes.
 * It uses the existing theme system and persists the preference in localStorage.
 */
const ThemeSwitch = () => {
  const { theme, setTheme } = useTheme();

  const isDarkMode = theme === 'dark' || (theme === 'system' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleToggle = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center space-x-3">
      <Sun className="h-4 w-4 text-muted-foreground" />
      <Switch
        checked={isDarkMode}
        onCheckedChange={handleToggle}
      />
      <Moon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
};

const Conf = () => {
  const [db, setDb] = useState<ExocortexDB | null>(null);
  const navigate = useNavigate();
  const location = useLocation();


  //Include the DB so header add-event can work.
  useEffect(() => {
    const initAll = async () => {
      const db = new ExocortexDB();
      await db.init();
      setDb(db);
    };
    initAll().catch((error) => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  // Set SEO metadata
  useSeoMeta({
    title: 'Conf - ExocortexLog',
    description: 'Configuration and help',
  });

  return (
    <PageLayout db={db} title="Conf" explain="Configuration preferences and help" currentView="conf">           <div className="items-center justify-center flex">
          <div className="space-y-6">
            {/* Theme Settings Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <ThemeSwitch />
                </div>
              </CardContent>
            </Card>

            {/* Category Color Overrides Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Category Colors</CardTitle>
                <CardDescription>
                  Customize colors for different event categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ColorOverrideWidget />
              </CardContent>
            </Card>

            {/* Notification Settings Section */}
            <NotificationSettings />

            {/* Cache Management Section */}
            <CacheResetSection />

            {/* Database Management Section */}
            <DBManagementSection db={db} />

            {/* About Content */}
            <Card>
              <CardContent className="pt-6">
                  <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                    ExocortexLog was vibe-coded by{' '}
                    <a
                      href="https://dalliance.net/"
                      className="text-primary hover:text-primary/80 underline transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      pre
                    </a>
                    {' '}using{' '}
                    <a
                      href="https://shakespeare.diy/"
                      className="text-primary hover:text-primary/80 underline transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      shakespeare
                    </a> 
                     &nbsp; and a lot of manual clean up.
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/about')}
                      className="h-8 px-3 text-sm"
                    >
                      about
                    </Button>
                  </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </PageLayout>
  );
};

export default Conf;


