/*
 * Conf.tsx - Conf Page
 *
 * Configure display and options along with help
 */
import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '../main';
import { useTheme } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSeoMeta } from '@unhead/react';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataExporter, LAST_EXPORT_AT_KEY } from '@/lib/dataExport';
import { Button } from '@/components/ui/button';
import { ExocortexDB, EventSummary } from '@/lib/exocortex';
import { ColorOverrideWidget } from '@/components/ColorOverrideWidget';
import { HueControl } from '@/components/HueControl';
import { resetCacheAndReload } from '@/lib/cacheReset';
import { Moon, Sun, Notebook, RefreshCw, Database, Newspaper as NewsIcon, HardDrive, Download, Upload, Trash2  } from 'lucide-react';


/**
 * Database Management Section Component
 *
 * Provides database operations including import, export, test data generation,
 * and database clearing functionality.
 */
const DBManagementSection = ({ db }: { db: ExocortexDB | null }) => {
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTestConfirm, setShowTestConfirm] = useState(false);
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      if (!db) {
        setSummary(null);
        return;
      }
      setLoadingSummary(true);
      try {
        const result = await db.getEventSummary();
        if (!cancelled) {
          setSummary(result);
        }
      } catch (err) {
        console.error('Failed to load event summary:', err);
        if (!cancelled) {
          setSummary(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      }
    };

    const loadLastExport = () => {
      try {
        const value = localStorage.getItem(LAST_EXPORT_AT_KEY);
        if (!value) {
          setLastExportAt(null);
          return;
        }
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          setLastExportAt(parsed);
        } else {
          setLastExportAt(null);
        }
      } catch (error) {
        console.warn('Failed to read last export time from localStorage:', error);
        setLastExportAt(null);
      }
    };

    void loadSummary();
    loadLastExport();

    return () => {
      cancelled = true;
    };
  }, [db]);

  const refreshSummary = async () => {
    if (!db) return;
    setLoadingSummary(true);
    try {
      const result = await db.getEventSummary();
      setSummary(result);
    } catch (err) {
      console.error('Failed to refresh event summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const refreshLastExport = () => {
    try {
      const value = localStorage.getItem(LAST_EXPORT_AT_KEY);
      if (!value) {
        setLastExportAt(null);
        return;
      }
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        setLastExportAt(parsed);
      } else {
        setLastExportAt(null);
      }
    } catch (error) {
      console.warn('Failed to refresh last export time from localStorage:', error);
      setLastExportAt(null);
    }
  };

  const confirmGenerateTestData = async () => {
    await handleGenerateTestData();
    setShowTestConfirm(false);
    await refreshSummary();
  };

  const handleGenerateTestData= async () => {
    if (!db) return;
    const t = await db.generateTestData();
    setError(t);
  };

  const cancelGenerateTestData = () => {
    setShowTestConfirm(false);
  };


  const confirmClearAllData = async () => {
    await handleClearAllData();
    setShowClearConfirm(false);
    await refreshSummary();
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
      refreshLastExport();
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
        await refreshSummary();
      } catch (error) {
        console.error('Import failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to import database. Please try again.');
      }
    };

    input.click();
  };


  const formatDateTime = (timestamp: number | null): string => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString();
  };

  const formatLastExportMessage = (): string => {
    if (!lastExportAt) {
      return 'You should probably back up with the export button often, no guarantees. (No exports recorded yet.)';
    }

    const now = new Date();
    const diffMs = now.getTime() - lastExportAt.getTime();

    if (diffMs < 0) {
      return 'You should probably back up with the export button often, no guarantees. (Last export time looks to be in the future; clock mismatch?)';
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let humanReadable: string;
    if (diffMinutes < 1) {
      humanReadable = 'just now';
    } else if (diffMinutes < 60) {
      humanReadable = `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 48) {
      humanReadable = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      humanReadable = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }

    return `You should probably back up with the export button often, no guarantees. (Last export was ${humanReadable}.)`;
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
            {formatLastExportMessage()}
          </p>

          {/* Database overview */}
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm flex flex-col gap-2">
            {loadingSummary ? (
              <span className="text-muted-foreground">Loading database overview…</span>
            ) : summary && summary.totalEvents > 0 ? (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <span className="font-medium">Total events:</span>{' '}
                    {summary.totalEvents.toLocaleString()}
                  </span>
                  <span>
                    <span className="font-medium">Earliest:</span>{' '}
                    {formatDateTime(summary.earliestEndTime)}
                  </span>
                  <span>
                    <span className="font-medium">Latest:</span>{' '}
                    {formatDateTime(summary.latestEndTime)}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">
                No events stored yet. Add some events or import data to get started.
              </span>
            )}
          </div>

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
            error.includes('Successfully') || error.includes('imported successfully')
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
  const [isResetting, setIsResetting] = useState(false);

  const handleResetCache = async () => {
    setIsResetting(true);
    try {
      await resetCacheAndReload();
    } catch (error) {
      console.error('Cache reset failed:', error);
      setIsResetting(false);
    }
  };
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Version Management
        </CardTitle>
        <CardDescription>
          Update and help
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
            {/* About Content */}
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
                  <p>Currlently running version {APP_VERSION}.</p>
        {/* Reset Button */}
        <AlertDialog>
          <div className="flex flex-wrap gap-2">
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isResetting}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? 'Resetting...' : 'Check for upgrade'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Update ExocortexLog</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear cached files and reload the app.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsResetting(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleResetCache}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset cache & reload
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </div>
        </AlertDialog>

        {/* Exocortex Blog Button */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate('/about')}
          >
            <NewsIcon className="h-4 w-4 mr-2" />
            About ExocortexLog
          </Button>

          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate('/')}
          >
            <Notebook className="h-4 w-4 mr-2" />
            Back to Log
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Theme Toggle Section Component
 *
 * Allows users to switch between light and dark themes.
 */
const ThemeToggleSection = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {theme === 'dark' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
          Appearance
        </CardTitle>
        <CardDescription>
          Switch between light and dark themes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Use dark theme
        </span>
        <Switch
          checked={theme === 'dark'}
          onCheckedChange={handleThemeChange}
          aria-label="Toggle dark theme"
        />
      </CardContent>
    </Card>
  );
};

/**
 * Color Customization Section Component
 *
 * Allows users to tweak the global hue and per-category colours.
 */
const ColorCustomizationSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🎨
          Colour Customisation
        </CardTitle>
        <CardDescription>
          Adjust the overall hue and override colours for specific categories.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <HueControl />
        <ColorOverrideWidget />
      </CardContent>
    </Card>
  );
};

/**
 * Conf Page Component
 *
 * Wraps all configuration sections into a single page with layout.
 */
const ConfPage = () => {
  useSeoMeta({
    title: 'Settings',
    description: 'Configure ExocortexLog display, data, and behaviour.',
  });

  const [db, setDb] = useState<ExocortexDB | null>(null);

  useEffect(() => {
    const initDb = async () => {
      const database = new ExocortexDB();
      await database.init();
      setDb(database);
    };

    void initDb();
  }, []);

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Tune how ExocortexLog looks and behaves, and manage your data.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <ThemeToggleSection />
          <ColorCustomizationSection />
        </div>

        <div className="grid gap-6 md:grid-cols-1">
          <DBManagementSection db={db} />
          <CacheResetSection />
        </div>
      </div>
    </PageLayout>
  );
};

export default ConfPage;
