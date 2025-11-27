/**
 * ExocortexGrid.tsx - Main Time Tracking Grid Component
 *
 * This is the core component of the time tracking application.
 * It displays events in a visual grid where:
 * - X-axis represents hours of the day (24 hours)
 * - Y-axis represents different days (today at top, past days below)
 * - Colored blocks represent events with different categories
 * - Smiley faces show mood during each event
 *
 * Features handled by this component:
 * - Display events in a responsive grid layout
 * - Add, edit, and delete events
 * - Infinite scroll to load historical data
 * - Import/export functionality
 * - Test data generation
 * - Mobile-responsive design
 */

// React hooks for managing state and lifecycle
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Import our data types and utilities
import { ExocortexEvent, DayEvents, ExocortexDB, getEventColor, formatTime, getHourSlots } from '@/lib/exocortex';

// Import hooks
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppContext } from '@/hooks/useAppContext';

// Import UI components
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, Database, Trash2, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { EventDialog } from './EventDialog';
import { DataExporter } from '@/lib/dataExport';
import { SmileyFace } from './SmileyFace';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Component Props Interface
 *
 * TypeScript interface that defines what props this component accepts.
 * Currently only accepts optional className for additional styling.
 */
interface ExocortexGridProps {
  className?: string;
}

/**
 * Grid Layout Constants
 *
 * These values define the visual structure of our time grid:
 */

const HOURS_IN_DAY = 24; // Total hours in a day (24-hour format)
const HOUR_WIDTH = 60; // Width of each hour block on desktop (60 pixels)
const MOBILE_HOUR_WIDTH = 30; // Width of each hour block on mobile (30 pixels, smaller to fit screen)

/**
 * Responsive CSS Styles
 *
 * We use CSS custom properties (CSS variables) to make grid responsive.
 * This allows us to change the hour width based on screen size
 * without recalculating everything in JavaScript.
 */
const responsiveStyles = `
  .exocortex {
    --hour-width: ${HOUR_WIDTH}px;
  }

  @media (max-width: 768px) {
    .exocortex {
      --hour-width: ${MOBILE_HOUR_WIDTH}px;
    }
  }
`;

const ROW_HEIGHT = 80; // Height of each day row in pixels - balanced for both mobile and desktop visibility

/**
 * Main ExocortexGrid Component
 *
 * This is the main component function that renders our time tracking grid.
 * It manages all state related to events, database operations, and UI interactions.
 */
export function ExocortexGrid({ className }: ExocortexGridProps) {
  const { config } = useAppContext();
  /**
   * Component State Variables
   *
   * These state variables manage all the data and UI state for the grid:
   *
   * days: Array of day data with events for each day
   * db: Instance of our IndexedDB database for data persistence
   * loading: Shows loading indicator while fetching data
   * isDialogOpen: Controls visibility of add/edit event dialog
   * editingEvent: Stores the event being edited (null when adding new)
   * defaultValues: Default mood values for new events based on last event
   * error: Error message to display to user (null = no error)
   * currentDate: Current date reference for calculations
   * hasReachedHistoricalLimit: Prevents infinite scroll when we have all historical data
   * showClearConfirm: Controls confirmation dialog for clearing all data
   */

  // Array containing events grouped by day
  const [days, setDays] = useState<DayEvents[]>([]);

  // Database instance for storing and retrieving events
  const [db, setDb] = useState<ExocortexDB | null>(null);

  // Loading state for showing loading indicators during data operations
  const [loading, setLoading] = useState(true);

  // Controls whether the add/edit event dialog is visible
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Event being edited (null when adding a new event)
  const [editingEvent, setEditingEvent] = useState<ExocortexEvent | null>(null);

  // Default mood values (happiness, wakefulness, health) for new events
  const [defaultValues, setDefaultValues] = useState({
    happiness: 0.7,
    wakefulness: 0.8,
    health: 0.9,
  });

  // Error message to display to user (null when no error)
  const [error, setError] = useState<string | null>(null);

  // Mobile responsiveness hook
  const isMobile = useIsMobile() || false;

  // Current date reference for various calculations
  const [currentDate, setCurrentDate] = useState(new Date());

  // Flag to stop infinite scroll when we've loaded all available historical data
  const [hasReachedHistoricalLimit, setHasReachedHistoricalLimit] = useState(false);

  // Controls visibility of the "clear all data" confirmation dialog
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTestConfirm, setShowTestConfirm] = useState(false);
  const [showDateSkipDialog, setShowDateSkipDialog] = useState(false);
  const [selectedSkipDate, setSelectedSkipDate] = useState<Date | undefined>(undefined);

  /**
   * Virtualization State
   *
   * These state variables manage the virtualization of the grid:
   * - scrollTop: Current scroll position of the grid container
   * - containerHeight: Height of the visible viewport
   * - totalHeight: Total height of all rows (including off-screen ones)
   */
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  /**
   * Drag-to-Scroll State
   *
   * These state variables manage the drag-to-scroll functionality:
   * - isDragging: Whether the user is currently dragging
   * - dragStart: Mouse position when drag started
   * - scrollStart: Scroll position when drag started
   * - hasDragged: Whether the user has actually moved the mouse during this interaction
   * - dragThreshold: Minimum distance in pixels to consider it a drag vs click
   */
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const dragThreshold = 5; // 5 pixels minimum movement to consider it a drag

  /**
   * React Refs
   *
   * Refs provide direct access to DOM elements and persist values
   * without triggering re-renders when they change.
   */

  // Reference to the main grid container (for scrolling and measurements)
  const gridRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll functionality
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reference to the loading trigger element at bottom of grid
  const loadingRef = useRef<HTMLDivElement>(null);

  /**
   * Virtualization Calculations
   *
   * Memoized calculation of which rows should be visible based on scroll position.
   * This uses a buffer to ensure smooth scrolling.
   */
  const visibleRows = useMemo(() => {
    if (containerHeight === 0 || days.length === 0) {
      // Fallback to showing all rows if we don't have measurements yet
      return { startIndex: 0, endIndex: days.length, offsetY: 0 };
    }

    // Calculate the range of rows that should be visible
    const visibleRowCount = Math.ceil(containerHeight / ROW_HEIGHT);
    const bufferRows = Math.max(1, Math.floor(ROW_HEIGHT * 2 / ROW_HEIGHT)); // Show rows that are ~80px from edge
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - bufferRows);
    const endIndex = Math.min(
      days.length,
      Math.ceil(scrollTop / ROW_HEIGHT) + visibleRowCount + bufferRows
    );

    return {
      startIndex,
      endIndex,
      offsetY: startIndex * ROW_HEIGHT
    };
  }, [scrollTop, containerHeight, days.length]);

  /**
 * Database Initialization Effect
 *
 * This useEffect runs only once when component mounts (empty dependency array []).
 * It sets up the database and loads initial data.
 */
useEffect(() => {
    const initDb = async () => {
      // Create new instance of our IndexedDB database
      const database = new ExocortexDB();

      // Initialize database (creates tables and indexes if they don't exist)
      await database.init();

      // Store database instance in state so other functions can use it
      setDb(database);

      // Load initial data for display (today + past 7 days)
      // This gives users immediate content to see
      await loadDays(database, new Date(), 7);

      // Hide loading indicator once data is loaded
      setLoading(false);
    };

    // Execute initialization and handle any errors
    initDb().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, []); // Empty dependency array means this runs only once on mount

/**
 * Load Days Function
 *
 * This function loads a range of days from the database.
 * It's a callback (wrapped in useCallback) to optimize performance.
 *
 * @param database - The ExocortexDB instance to query
 * @param fromDate - The newest date to load (going backwards from here)
 * @param count - Number of days to load before fromDate
 */
const loadDays = useCallback(async (database: ExocortexDB, fromDate: Date, count: number) => {
    /**
     * Date Range Calculation
     *
     * We need to calculate the date range for our database query.
     * Since we show newest days at top, we load backwards in time:
     * - fromDate = newest date (top of visible list)
     * - endDate = oldest date (bottom of loaded range)
     * - count = how many days to load
     */
    const endDate = new Date(fromDate);
    endDate.setDate(endDate.getDate() - count + 1); // This becomes the oldest date in the range

    const newDays = await database.getEventsByDateRange(
      endDate.toISOString().split('T')[0], // Oldest date (start of range)
      fromDate.toISOString().split('T')[0]   // Newest date (end of range)
    );

    // Only add new days if we actually got data
    if (newDays.length > 0) {
      setDays(prev => [...prev, ...newDays.reverse()]);
      return true; // Indicate successful load
    }
    return false; // Indicate no more data available
  }, []);

  // Setup container measurement and scroll tracking
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // Measure container height
    const measureContainer = () => {
      const height = grid.clientHeight;
      setContainerHeight(height);
    };

    // Handle scroll events
    const handleScroll = () => {
      setScrollTop(grid.scrollTop);
    };

    // Initial measurement
    measureContainer();

    // Add event listeners
    grid.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', measureContainer);

    // Create a ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      measureContainer();
    });
    resizeObserver.observe(grid);

    return () => {
      grid.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', measureContainer);
      resizeObserver.disconnect();
    };
  }, []);

  // Setup infinite scroll
  useEffect(() => {
    if (!loadingRef.current || !db) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          const oldestDay = days[days.length - 1];
          if (oldestDay) {
            const loadMoreDays = async () => {
              // Don't load if we've reached the historical limit
              if (hasReachedHistoricalLimit) return;

              setLoading(true);
              const oldestDay = days[days.length - 1];
              const oldestDate = new Date(oldestDay.date);

              // Don't load data from more than 10 years ago
              const tenYearsAgo = new Date();
              tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

              if (oldestDate < tenYearsAgo) {
                setHasReachedHistoricalLimit(true);
                setLoading(false);
                return;
              }

              const fromDate = new Date(oldestDay.date);
              fromDate.setDate(fromDate.getDate() - 7); // Load 7 days before the oldest day
              const success = await loadDays(db, fromDate, 7);

              if (!success) {
                // No more data available, we can stop observing or show a message
                setHasReachedHistoricalLimit(true);
                console.log('No more historical data available');
              }

              setLoading(false);
            };

            loadMoreDays().catch((error) => {
              console.error('Error in loadMoreDays:', error);
              setLoading(false);
              setError('Failed to load more days. Please try again.');
            });
          }
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadingRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, days, db, loadDays]);

  /**
   * Drag-to-Scroll Event Handlers
   *
   * These handlers implement the drag-to-scroll functionality for the grid.
   * This allows users to click and drag to navigate the large time grid.
   */

  // Handle mouse down - start dragging
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only exclude certain UI controls, but allow dragging over events and other elements
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) {
      return;
    }

    e.preventDefault();

    const grid = gridRef.current;
    if (!grid) return;

    // Clear any existing drag reset timeout
    if (dragResetTimeoutRef.current) {
      clearTimeout(dragResetTimeoutRef.current);
      dragResetTimeoutRef.current = null;
    }

    setIsDragging(true);
    setHasDragged(false); // Reset drag movement tracking
    setDragStart({ x: e.clientX, y: e.clientY });
    setScrollStart({
      left: grid.scrollLeft,
      top: grid.scrollTop
    });

    // Add cursor style to indicate dragging
    grid.style.cursor = 'grabbing';
    grid.style.userSelect = 'none';
    grid.style.webkitUserSelect = 'none';
  }, []);

  // Handle mouse move - update scroll while dragging
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const grid = gridRef.current;
    if (!grid) return;

    // Calculate the distance moved
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Check if we've moved beyond the drag threshold
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance >= dragThreshold && !hasDragged) {
      setHasDragged(true);
    }

    // Update scroll position
    grid.scrollLeft = scrollStart.left - deltaX;
    grid.scrollTop = scrollStart.top - deltaY;
  }, [isDragging, dragStart, scrollStart, hasDragged, dragThreshold]);

  // Timeout ref for delayed reset
  const dragResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle mouse up - stop dragging
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    const grid = gridRef.current;
    if (grid) {
      // Reset cursor style
      grid.style.cursor = '';
      grid.style.userSelect = '';
      grid.style.webkitUserSelect = '';
    }

    setIsDragging(false);

    // Clear any existing timeout
    if (dragResetTimeoutRef.current) {
      clearTimeout(dragResetTimeoutRef.current);
    }

    // Delay resetting hasDragged to prevent click events from firing
    dragResetTimeoutRef.current = setTimeout(() => {
      setHasDragged(false);
      dragResetTimeoutRef.current = null;
    }, 100); // 100ms delay to ensure click events are blocked
  }, [isDragging]);

  // Handle mouse leave - stop dragging when mouse leaves the grid
  const handleMouseLeave = useCallback(() => {
    if (!isDragging) return;

    const grid = gridRef.current;
    if (grid) {
      // Reset cursor style
      grid.style.cursor = '';
      grid.style.userSelect = '';
      grid.style.webkitUserSelect = '';
    }

    setIsDragging(false);

    // Clear any existing timeout
    if (dragResetTimeoutRef.current) {
      clearTimeout(dragResetTimeoutRef.current);
    }

    // Delay resetting hasDragged to prevent click events from firing
    dragResetTimeoutRef.current = setTimeout(() => {
      setHasDragged(false);
      dragResetTimeoutRef.current = null;
    }, 100); // 100ms delay to ensure click events are blocked
  }, [isDragging]);



  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragResetTimeoutRef.current) {
        clearTimeout(dragResetTimeoutRef.current);
      }
    };
  }, []);

  // Global mouse up handler - ensure dragging stops even if mouse is released outside grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mouseleave', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, [isDragging, handleMouseUp]);

  // Helper function to calculate the actual start time of an event
  const getEventStartTime = (event: ExocortexEvent, dayEvents: ExocortexEvent[], index: number): number => {
    if (index === 0) {
      // For the first event of the day, we need to handle special cases

      // For sleep events ending in early morning (before 7 AM), they started the previous evening
      if (event.category === 'Sleep' && new Date(event.endTime).getHours() < 7) {
        // Sleep events from test data start between 20:00-22:00 and last 7-8 hours
        // Calculate start time based on end time
        const sleepEndTime = new Date(event.endTime);
        const sleepStartTime = new Date(sleepEndTime);
        sleepStartTime.setDate(sleepStartTime.getDate() - 1); // Previous day

        // Calculate exact start time: 7-8 hours before end time
        const sleepDuration = 7.5 * 60 * 60 * 1000; // 7.5 hours average
        return sleepEndTime.getTime() - sleepDuration;
      }

      // For other events in early morning, they might be continuations from previous day
      if (new Date(event.endTime).getHours() < 7 && event.category !== 'Sleep') {
        // Estimate they started in the evening of previous day
        const estimatedStartTime = new Date(event.endTime);
        estimatedStartTime.setDate(estimatedStartTime.getDate() - 1);
        estimatedStartTime.setHours(21, 0, 0, 0); // 9:00 PM previous day
        return estimatedStartTime.getTime();
      }

      // EDGE CASE FIX: Check if there's a previous day with events that this should connect to
      const currentDayDate = new Date(event.endTime).toISOString().split('T')[0];
      const previousDay = new Date(currentDayDate);
      previousDay.setDate(previousDay.getDate() - 1);
      const previousDayDate = previousDay.toISOString().split('T')[0];

      // Find the previous day in our days array
      const previousDayData = days.find(day => day.date === previousDayDate);

      if (previousDayData && previousDayData.events.length > 0) {
        // Get the last event from the previous day
        const lastEventOfPreviousDay = previousDayData.events[previousDayData.events.length - 1];
        const lastEventEndTime = lastEventOfPreviousDay.endTime;

        // If the last event of previous day ended before midnight, start this event right after it
        const midnightOfCurrentDay = new Date(currentDayDate);
        midnightOfCurrentDay.setHours(0, 0, 0, 0);

        if (lastEventEndTime < midnightOfCurrentDay.getTime()) {
          // Start right after the previous day's last event ended
          return lastEventEndTime;
        }
      }

      // Default: For regular events, assume they start at midnight (00:00) if they're the first event
      // This makes more sense since the day starts at midnight, not 7:00 AM
      const eventEndTime = new Date(event.endTime);
      const eventDate = new Date(eventEndTime);
      eventDate.setHours(0, 0, 0, 0); // 00:00 (midnight) start of day

      return eventDate.getTime();
    } else {
      // For all other events, start immediately after the previous event ends
      // This ensures no gaps between events
      return dayEvents[index - 1].endTime;
    }
  };

  // Calculate event position and width for a specific day portion with explicit start time
  const calculateEventPortionWithStartTime = (
    event: ExocortexEvent,
    dayDate: string,
    startTime: number,
    endTime: number,
    portion: 'start' | 'middle' | 'end' | 'full'
  ) => {
    const eventEndTime = new Date(endTime);
    const eventStartTime = new Date(startTime);
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    let portionStartTime: Date;
    let portionEndTime: Date;

    switch (portion) {
      case 'start':
        // First day portion: from actual start time to midnight
        portionStartTime = new Date(Math.max(eventStartTime.getTime(), dayStart.getTime()));
        portionEndTime = new Date(dayEnd);
        break;
      case 'end':
        // Last day portion: from midnight to actual end time
        portionStartTime = new Date(dayStart);
        portionEndTime = new Date(Math.min(eventEndTime.getTime(), dayEnd.getTime()));
        break;
      case 'middle':
        // Middle day portion: full day
        portionStartTime = new Date(dayStart);
        portionEndTime = new Date(dayEnd);
        break;
      case 'full':
      default:
        // Single day event: from actual start to actual end (clamped to day boundaries)
        portionStartTime = new Date(Math.max(eventStartTime.getTime(), dayStart.getTime()));
        portionEndTime = new Date(Math.min(eventEndTime.getTime(), dayEnd.getTime()));
        break;
    }

    // Ensure we have positive duration
    if (portionEndTime.getTime() <= portionStartTime.getTime()) {
      // Fallback: make it at least 1 hour long
      portionEndTime = new Date(portionStartTime.getTime() + 60 * 60 * 1000);
    }

    const startHour = (portionStartTime.getTime() - dayStart.getTime()) / (1000 * 60 * 60);
    const durationHours = (portionEndTime.getTime() - portionStartTime.getTime()) / (1000 * 60 * 60);

    return {
      left: `calc(${startHour} * var(--hour-width))`,
      width: `calc(${durationHours} * var(--hour-width))`,
      backgroundColor: getEventColor(event, config.colorOverrides),
    };
  };

  // Calculate event position and width for a specific day portion
  const calculateEventPortionStyle = (
    event: ExocortexEvent,
    dayDate: string,
    dayEvents: ExocortexEvent[],
    eventIndex: number,
    portion: 'start' | 'middle' | 'end' | 'full'
  ) => {
    const eventEndTime = new Date(event.endTime);
    const eventStartTime = new Date(getEventStartTime(event, dayEvents, eventIndex));
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    let portionStartTime: Date;
    let portionEndTime: Date;

    switch (portion) {
      case 'start':
        // First day portion: from actual start time to midnight
        portionStartTime = new Date(Math.max(eventStartTime.getTime(), dayStart.getTime()));
        portionEndTime = new Date(dayEnd);
        break;
      case 'end':
        // Last day portion: from midnight to actual end time
        portionStartTime = new Date(dayStart);
        portionEndTime = new Date(Math.min(eventEndTime.getTime(), dayEnd.getTime()));
        break;
      case 'middle':
        // Middle day portion: full day
        portionStartTime = new Date(dayStart);
        portionEndTime = new Date(dayEnd);
        break;
      case 'full':
      default:
        // Single day event: from actual start to actual end (clamped to day boundaries)
        portionStartTime = new Date(Math.max(eventStartTime.getTime(), dayStart.getTime()));
        portionEndTime = new Date(Math.min(eventEndTime.getTime(), dayEnd.getTime()));
        break;
    }

    // Ensure we have positive duration
    if (portionEndTime.getTime() <= portionStartTime.getTime()) {
      // Fallback: make it at least 1 hour long
      portionEndTime = new Date(portionStartTime.getTime() + 60 * 60 * 1000);
    }

    const startHour = (portionStartTime.getTime() - dayStart.getTime()) / (1000 * 60 * 60);
    const durationHours = (portionEndTime.getTime() - portionStartTime.getTime()) / (1000 * 60 * 60);

    return {
      left: `calc(${startHour} * var(--hour-width))`,
      width: `calc(${durationHours} * var(--hour-width))`,
      backgroundColor: getEventColor(event, config.colorOverrides),
    };
  };

  // Check if an event spans multiple days
  const doesEventSpanMultipleDays = (event: ExocortexEvent, dayEvents: ExocortexEvent[], index: number): boolean => {
    const eventEndTime = new Date(event.endTime);
    const eventStartTime = new Date(getEventStartTime(event, dayEvents, index));

    const startDay = eventStartTime.toISOString().split('T')[0];
    const endDay = eventEndTime.toISOString().split('T')[0];

    return startDay !== endDay;
  };

  // Get the portion type for an event on a specific day
  const getEventPortionType = (event: ExocortexEvent, dayDate: string, dayEvents: ExocortexEvent[], index: number): 'start' | 'middle' | 'end' | 'full' => {
    const eventEndTime = new Date(event.endTime);
    const eventStartTime = new Date(getEventStartTime(event, dayEvents, index));

    const startDay = eventStartTime.toISOString().split('T')[0];
    const endDay = eventEndTime.toISOString().split('T')[0];

    if (startDay === endDay) {
      return 'full';
    }

    if (dayDate === startDay) {
      return 'start';
    }

    if (dayDate === endDay) {
      return 'end';
    }

    return 'middle';
  };

  // Get all events that should be displayed on a specific day
  const getEventsForDay = (targetDay: DayEvents, allDays: DayEvents[]): ExocortexEvent[] => {
    const eventsForDay: ExocortexEvent[] = [];

    // First, find spanning events from other days that overlap with this day
    allDays.forEach(day => {
      if (day.date === targetDay.date) return; // Skip the same day

      day.events.forEach(event => {
        const eventEndTime = new Date(event.endTime);
        const eventStartTime = new Date(getEventStartTime(event, day.events, day.events.indexOf(event)));

        const startDay = eventStartTime.toISOString().split('T')[0];
        const endDay = eventEndTime.toISOString().split('T')[0];
        const targetDayDate = targetDay.date;

        // Check if this event spans across the target day
        // The event should start on or before the target day and end on or after the target day
        if (startDay !== endDay && startDay <= targetDayDate && endDay >= targetDayDate) {
          // Add the spanning portion
          eventsForDay.push({
            ...event,
            id: `${event.id}-span-${targetDayDate}`
          });
        }
      });
    });

    // Then add the regular events for this day
    targetDay.events.forEach(event => {
      eventsForDay.push(event);
    });

    // Sort events by end time to maintain proper sequence
    eventsForDay.sort((a, b) => a.endTime - b.endTime);

    return eventsForDay;
  };

  // Legacy function for backward compatibility (used for single-day events)
  const calculateEventStyle = (event: ExocortexEvent, dayEvents: ExocortexEvent[], index: number) => {
    return calculateEventPortionStyle(event, new Date(event.endTime).toISOString().split('T')[0], dayEvents, index, 'full');
  };

  // Calculate text color based on background brightness
  const getTextColor = (event: ExocortexEvent) => {
    const color = getEventColor(event, config.colorOverrides);

    // Parse HSL color - format is "hsl(h, s%, l%)"
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) {
      // Fallback to white if we can't parse the color
      return '#ffffff';
    }

    const lightness = parseInt(hslMatch[3]);

    // Return black for bright backgrounds (lightness > 50%), white for dark backgrounds
    return lightness > 50 ? '#000000' : '#ffffff';
  };

  const hourSlots = getHourSlots();

  const handleAddEvent = async (eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;

    try {
      await db.addEvent(eventData);

      // Get the event date and previous date
      const eventDate = new Date(eventData.endTime).toISOString().split('T')[0];
      const previousDate = new Date(eventDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      // Refresh both the event's day and the previous day (for spanning events)
      const [eventDayEvents, previousDayEvents] = await Promise.all([
        db.getEventsByDate(eventDate),
        db.getEventsByDate(previousDateStr)
      ]);

      setDays(prev => {
        const newDays = [...prev];

        // Update the event's day
        const eventDayIndex = newDays.findIndex(day => day.date === eventDate);
        if (eventDayIndex !== -1) {
          newDays[eventDayIndex] = { date: eventDate, events: eventDayEvents };
        } else {
          newDays.unshift({ date: eventDate, events: eventDayEvents });
        }

        // Update the previous day (if it exists in our display)
        const previousDayIndex = newDays.findIndex(day => day.date === previousDateStr);
        if (previousDayIndex !== -1) {
          newDays[previousDayIndex] = { date: previousDateStr, events: previousDayEvents };
        }

        return newDays;
      });

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const getLatestEventDefaults = async () => {
    if (!db) return { happiness: 0.7, wakefulness: 0.8, health: 0.9 };

    try {
      const latestEvent = await db.getLatestEvent();
      if (latestEvent) {
        return {
          happiness: latestEvent.happiness,
          wakefulness: latestEvent.wakefulness,
          health: latestEvent.health,
        };
      }
    } catch (error) {
      console.error('Failed to get latest event:', error);
    }

    return { happiness: 0.7, wakefulness: 0.8, health: 0.9 };
  };

  const handleUpdateEvent = async (id: string, eventData: Omit<ExocortexEvent, 'id'>) => {
    if (!db) return;

    try {
      await db.updateEvent(id, eventData);

      // Get the event date and previous date
      const eventDate = new Date(eventData.endTime).toISOString().split('T')[0];
      const previousDate = new Date(eventDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      // Refresh both the event's day and the previous day (for spanning events)
      const [eventDayEvents, previousDayEvents] = await Promise.all([
        db.getEventsByDate(eventDate),
        db.getEventsByDate(previousDateStr)
      ]);

      setDays(prev => {
        const newDays = [...prev];

        // Update the event's day
        const eventDayIndex = newDays.findIndex(day => day.date === eventDate);
        if (eventDayIndex !== -1) {
          newDays[eventDayIndex] = { date: eventDate, events: eventDayEvents };
        }

        // Update the previous day (if it exists in our display)
        const previousDayIndex = newDays.findIndex(day => day.date === previousDateStr);
        if (previousDayIndex !== -1) {
          newDays[previousDayIndex] = { date: previousDateStr, events: previousDayEvents };
        }

        return newDays;
      });

      setIsDialogOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!db) return;

    try {
      await db.deleteEvent(id);

      // Remove the event from the corresponding day
      setDays(prev => {
        const newDays = prev.map(day => ({
          ...day,
          events: day.events.filter(event => event.id !== id)
        })).filter(day => day.events.length > 0 || day.date === new Date().toISOString().split('T')[0]);

        return newDays;
      });
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleEventClick = (event: ExocortexEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  // Handle click on events - only trigger if it's a true click, not a drag
  const handleEventClickWithDragCheck = useCallback((event: ExocortexEvent) => {
    // Only trigger event click if we haven't just finished dragging
    if (!hasDragged) {
      handleEventClick(event);
    }
  }, [hasDragged, handleEventClick]);

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
  };

  const handleOpenAddDialog = async () => {
    if (!db) {
      setIsDialogOpen(true);
      return;
    }

    // Get defaults from latest event
    const defaults = await getLatestEventDefaults();
    setDefaultValues(defaults);
    setIsDialogOpen(true);
  };

  const handleExport = async () => {
    if (!db) return;

    try {
      await DataExporter.exportDatabase(db);
      setError('Export completed! Check your downloads folder for the JSON file.');

      // Clear success message after 5 seconds
      setTimeout(() => setError(null), 5000);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export database. Please try again.');
    }
  };

  const handleImportDatabase = async () => {
    if (!db) return;

    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validate file before importing
        const isValid = await DataExporter.validateExportFile(file);
        if (!isValid) {
          setError('Invalid export file. Please select a valid ExocortexLog export file.');
          return;
        }

        await DataExporter.importDatabase(db, file);

        // Refresh the entire grid to show all imported events
        // Load recent days (similar to initial load)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Load past 7 days

        const daysWithEvents = await db.getEventsByDateRange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        // Also get today's events (should be included in range, but ensure it's there)
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = await db.getEventsByDate(today);

        // Combine and sort: today first, then past days in reverse chronological order
        const allDays = [
          { date: today, events: todayEvents }, // Today first (most recent)
          ...daysWithEvents.filter(day => day.date !== today).reverse() // Past days (excluding duplicate today)
        ];

        setDays(allDays);

        setError(`Successfully imported events from ${file.name}`);

        // Clear success message after 3 seconds
        setTimeout(() => setError(null), 3000);
      } catch (error) {
        console.error('Import failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to import database. Please try again.');
      }
    };

    input.click();
  };

  const generateCategoryNotes = (category: string): string => {
    const notesByCategory: Record<string, string[]> = {
      'Work': [
        'Productive morning session',
        'Good meetings with the team',
        'Made good progress on the project',
        'Challenging but rewarding work',
        'Focus was high today'
      ],
      'Exercise': [
        'Great workout! Feeling energized',
        'Pushed myself harder than usual',
        'Nice and relaxing session',
        'Cardio felt good today',
        'Strength training was productive'
      ],
      'Meal': [
        'Delicious and satisfying',
        'Healthy choice, feeling good',
        'Quick bite between tasks',
        'Enjoyed this meal',
        'Felt nourished and ready'
      ],
      'Break': [
        'Needed this rest',
        'Quick recharge session',
        'Nice coffee break',
        'Mindful moment of peace',
        'Good time to reflect'
      ],
      'Study': [
        'Learned something new',
        'Deep focus achieved',
        'Interesting material today',
        'Productive study session',
        'Challenging concepts clicked'
      ],
      'Slack': [
        'Good conversation with colleagues',
        'Team discussion was helpful',
        'Quick catch-up with friends',
        'Interesting threads today',
        'Social time well spent'
      ]
    };

    const categoryNotes = notesByCategory[category] || [
      'Interesting activity',
      'Good use of time',
      'Felt productive',
      'Nice moment today',
      'Time well spent'
    ];

    return categoryNotes[Math.floor(Math.random() * categoryNotes.length)];
  };

  const confirmGenerateTestData = async () => {
    await handleGenerateTestData();
    setShowTestConfirm(false);
  };

  const cancelGenerateTestData = () => {
    setShowTestConfirm(false);
  };

  const handleImportLegacyDatabase = () => {
    if (!db) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await DataExporter.importLegacyDatabase(db, file);
        // Refresh the grid to show imported data
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = await db.getEventsByDate(today);

        // Load past 7 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);

        const pastDays = await db.getEventsByDateRange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        // Sort past days by date (newest first)
        pastDays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Final structure: today first, then past days
        const allDays = [
          { date: today, events: todayEvents },
          ...pastDays
        ];

        setDays(allDays);
        setHasReachedHistoricalLimit(false);

        setError('Legacy data imported successfully. Categories from multiple tags have been combined.');

        // Clear success message after 5 seconds
        setTimeout(() => setError(null), 5000);
      } catch (error) {
        console.error('Failed to import legacy data:', error);
        setError(`Legacy import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  };



  const handleGenerateTestData = async () => {
    if (!db) return;

    try {
      // Clear existing data first
      await db.clearAllEvents();

      // Categories for test data (excluding Sleep - we'll handle that specially)
      const categories = ['Work', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];

      // Generate events for the past 30 days (excluding today)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Yesterday
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 30 days ago

      const events: Omit<ExocortexEvent, 'id'>[] = [];

      // Generate events for each day
      for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const dayEvents: Omit<ExocortexEvent, 'id'>[] = [];

        // Create sleep event that starts around 22:00 and lasts 7-8 hours
        const sleepStartHour = 20 + Math.floor(Math.random() * 3); // 20:00, 21:00, or 22:00
        const sleepStartMinute = Math.floor(Math.random() * 60);
        const sleepDurationHours = 7 + Math.random(); // 7-8 hours

        const sleepStart = new Date(currentDate);
        sleepStart.setHours(sleepStartHour, sleepStartMinute, 0, 0);
        let sleepEnd = new Date(sleepStart.getTime() + sleepDurationHours * 60 * 60 * 1000);

        // CRITICAL FIX: Ensure sleep events don't cross into today
        // If this is yesterday's sleep event, make sure it ends before today
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        if (sleepEnd >= today) {
          // Adjust sleep duration to end before today
          const maxDuration = today.getTime() - sleepStart.getTime();
          const adjustedDurationHours = Math.max(6, (maxDuration / (60 * 60 * 1000)) - 0.5); // At least 6 hours
          sleepEnd = new Date(sleepStart.getTime() + adjustedDurationHours * 60 * 60 * 1000);
        }

        // Sleep event with typical sleep values
        const sleepEvent = {
          endTime: sleepEnd.getTime(),
          category: 'Sleep' as const,
          notes: Math.random() > 0.7 ? [
            'Had some interesting dreams',
            'Woke up feeling refreshed',
            'Slept through the night',
            'A bit restless but okay',
            'Deep sleep cycle felt good'
          ][Math.floor(Math.random() * 5)] : undefined,
          happiness: 0.8, // Generally happy during sleep
          wakefulness: Math.random() * 0.02, // 0-2% wakefulness during sleep (extremely low)
          health: 0.9, // Good for health
        };

        dayEvents.push(sleepEvent);

        // Fill the rest of the day with other activities
        // We'll work around the sleep period

        // Morning activities (before sleep starts)
        const morningEnd = sleepStart.getTime();
        let currentTime = new Date(currentDate);
        currentTime.setHours(7, 0, 0, 0); // Start at 7:00 AM

        while (currentTime < sleepStart) {
          const timeUntilSleep = sleepStart.getTime() - currentTime.getTime();

          // Don't create events too close to sleep time
          if (timeUntilSleep < 30 * 60 * 1000) break; // Less than 30 minutes before sleep

          // Random duration between 30 minutes and 3 hours, but don't exceed time until sleep
          const maxDuration = Math.min(3 * 60 * 60 * 1000, timeUntilSleep - 30 * 60 * 1000);
          if (maxDuration <= 0) break;

          const durationMs = (Math.random() * (maxDuration / (60 * 60 * 1000)) * 2 + 0.5) * 60 * 60 * 1000;
          const actualDuration = Math.min(durationMs, maxDuration);

          const category = categories[Math.floor(Math.random() * categories.length)];

          // Morning mood values (generally good)
          const happiness = Math.random() * 0.4 + 0.5; // 0.5-0.9
          const wakefulness = Math.random() * 0.4 + 0.5; // 0.5-0.9
          const health = Math.random() * 0.3 + 0.6; // 0.6-0.9

          const eventEndTime = new Date(currentTime.getTime() + actualDuration);

          const event = {
            endTime: eventEndTime.getTime(),
            category,
            notes: Math.random() > 0.6 ? generateCategoryNotes(category) : undefined,
            happiness,
            wakefulness,
            health,
          };

          dayEvents.push(event);

          // Move to next event time with some gap
          currentTime = new Date(eventEndTime.getTime() + Math.random() * 30 * 60 * 1000); // 0-30 minute gap
        }

        // Evening activities (after sleep ends, on the next day) - ONLY if the next day is not today
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Only add evening activities if the next day is not today
        if (nextDay < today) {
          const eveningStart = new Date(Math.max(sleepEnd.getTime(), new Date(nextDay).setHours(7, 0, 0, 0)));
          const endOfDay = new Date(nextDay);
          endOfDay.setHours(23, 59, 59, 999);

          currentTime = new Date(eveningStart);

          while (currentTime < endOfDay) {
            const timeUntilEnd = endOfDay.getTime() - currentTime.getTime();

            // Don't create events too close to next sleep time
            const nextSleepStart = new Date(nextDay);
            nextSleepStart.setHours(sleepStartHour, sleepStartMinute, 0, 0);
            const timeUntilNextSleep = nextSleepStart.getTime() - currentTime.getTime();

            if (timeUntilNextSleep < 60 * 60 * 1000) break; // Less than 1 hour before next sleep

            // Random duration between 30 minutes and 3 hours
            const maxDuration = Math.min(3 * 60 * 60 * 1000, timeUntilEnd, timeUntilNextSleep - 30 * 60 * 1000);
            if (maxDuration <= 0) break;

            const durationMs = (Math.random() * (maxDuration / (60 * 60 * 1000)) * 2 + 0.5) * 60 * 60 * 1000;
            const actualDuration = Math.min(durationMs, maxDuration);

            const category = categories[Math.floor(Math.random() * categories.length)];

            // Evening mood values (can be more variable)
            const happiness = Math.random() * 0.6 + 0.3; // 0.3-0.9
            const wakefulness = Math.random() * 0.5 + 0.3; // 0.3-0.8 (getting tired)
            const health = Math.random() * 0.4 + 0.5; // 0.5-0.9

            const eventEndTime = new Date(currentTime.getTime() + actualDuration);

            const event = {
              endTime: eventEndTime.getTime(),
              category,
              notes: Math.random() > 0.6 ? generateCategoryNotes(category) : undefined,
              happiness,
              wakefulness,
              health,
            };

            dayEvents.push(event);

            // Move to next event time with some gap
            currentTime = new Date(eventEndTime.getTime() + Math.random() * 30 * 60 * 1000); // 0-30 minute gap
          }
        }

        // Add all events for this day
        events.push(...dayEvents);
      }

      // Add all events to database
      for (const event of events) {
        await db.addEvent(event);
      }

      // Refresh the grid to show test data - reload past 30 days
      const testEndDate = new Date();
      testEndDate.setDate(testEndDate.getDate() - 1); // Yesterday
      const testStartDate = new Date();
      testStartDate.setDate(testStartDate.getDate() - 30); // 30 days ago

      const daysWithEvents = await db.getEventsByDateRange(
        testStartDate.toISOString().split('T')[0],
        testEndDate.toISOString().split('T')[0]
      );

      // Also get today's events (should be empty)
      const today = new Date().toISOString().split('T')[0];
      const todayEvents = await db.getEventsByDate(today);

      // If today has events, log them for debugging (this should not happen)
      if (todayEvents.length > 0) {
        console.log('WARNING: Today has events when it should be empty:', todayEvents);
        // Clear any events that accidentally got created for today
        for (const event of todayEvents) {
          await db.deleteEvent(event.id);
        }
        // Refresh today's events after clearing
        const refreshedTodayEvents = await db.getEventsByDate(today);
        todayEvents.length = 0;
        todayEvents.push(...refreshedTodayEvents);
      }

      // Check if yesterday is missing and load it if needed
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const hasYesterday = daysWithEvents.some(day => day.date === yesterdayStr);

      if (!hasYesterday) {
        const yesterdayEvents = await db.getEventsByDate(yesterdayStr);
        if (yesterdayEvents.length > 0) {
          daysWithEvents.push({ date: yesterdayStr, events: yesterdayEvents });
        }
      }

      // Sort daysWithEvents by date (newest first) before adding today
      daysWithEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Final structure: today first, then past days in reverse chronological order
      const allDays = [
        { date: today, events: todayEvents }, // Today first (most recent)
        ...daysWithEvents // Then past days (already sorted with yesterday first)
      ];

      setDays(allDays);

      setError(`Successfully generated ${events.length} test events for the past 30 days with realistic sleep patterns`);

      // Clear success message after 5 seconds
      setTimeout(() => setError(null), 5000);
    } catch (error) {
      console.error('Failed to generate test data:', error);
      setError('Failed to generate test data. Please try again.');
    }
  };

  const handleClearAllData = async () => {
    if (!db) return;

    try {
      // Clear all events from database
      await db.clearAllEvents();

      // Clear the grid display
      const today = new Date().toISOString().split('T')[0];
      setDays([{ date: today, events: [] }]);
      setHasReachedHistoricalLimit(false);

      setError('All data has been cleared successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Failed to clear data:', error);
      setError('Failed to clear data. Please try again.');
    }
  };

  const confirmClearAllData = () => {
    handleClearAllData();
    setShowClearConfirm(false);
  };

  const cancelClearAllData = () => {
    setShowClearConfirm(false);
  };

  // Custom calendar component with year navigation
  const CalendarWithYearNav = () => {
    const [currentMonth, setCurrentMonth] = useState(selectedSkipDate || new Date());

    const handleYearUp = () => {
      const newDate = new Date(currentMonth);
      newDate.setFullYear(newDate.getFullYear() + 1);
      setCurrentMonth(newDate);
    };

    const handleYearDown = () => {
      const newDate = new Date(currentMonth);
      newDate.setFullYear(newDate.getFullYear() - 1);
      setCurrentMonth(newDate);
    };

    return (
      <div className="space-y-4">
        {/* Year navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleYearDown}
            className="bg-secondary border-border"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold">
            {currentMonth.getFullYear()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleYearUp}
            className="bg-secondary border-border"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar */}
        <Calendar
          mode="single"
          selected={selectedSkipDate}
          onSelect={(date) => {
            setSelectedSkipDate(date);
            if (date) setCurrentMonth(date);
          }}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="rounded-md border-border"
          disabled={(date) => {
            // Don't allow dates in the future
            return date > new Date();
          }}
          initialFocus
        />
      </div>
    );
  };

  // Skip to date functionality
  const handleSkipToDate = async () => {
    if (!db || !selectedSkipDate) return;

    try {
      const targetDate = selectedSkipDate;
      const today = new Date();
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      // Clear current days
      setDays([]);
      setHasReachedHistoricalLimit(false);
      setLoading(true);

      console.log('Jumping to date:', targetDateStr);

      // Create complete range of dates from target date to today (no gaps)
      const allDays: Array<{ date: string; events: ExocortexEvent[] }> = [];

      // Start from target date and go to today
      const currentDate = new Date(targetDate);
      currentDate.setHours(0, 0, 0, 0); // Start at beginning of day

      while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        allDays.push({
          date: dateStr,
          events: [] // Will be filled below
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log('Created date range:', allDays.length, 'days from', allDays[0]?.date, 'to', allDays[allDays.length - 1]?.date);

      // Get events for all dates in the range
      const eventsByDate = await db.getEventsByDateRange(
        targetDateStr,
        todayStr
      );

      console.log('Found events for', eventsByDate.length, 'dates');

      // Merge events into the date range
      eventsByDate.forEach(dayWithEvents => {
        const dayIndex = allDays.findIndex(day => day.date === dayWithEvents.date);
        if (dayIndex !== -1) {
          allDays[dayIndex] = dayWithEvents; // Replace empty day with events
        }
      });

      // Sort by date (newest first for display)
      allDays.sort((a, b) => {
        const aDate = new Date(a.date);
        const bDate = new Date(b.date);
        return bDate.getTime() - aDate.getTime(); // Newest first
      });

      console.log('Final allDays array:', allDays.map(d => ({ date: d.date, events: d.events.length })));

      setDays(allDays);

      setShowDateSkipDialog(false);

      // Set initial message
      setError(`Skipping to ${targetDate.toLocaleDateString()}`);

      // Wait a moment for DOM to update, then scroll to the selected date
      setTimeout(() => {
        if (gridRef.current) {
          console.log('Attempting to scroll to target date:', targetDateStr);

          // Find the target date in the sorted array
          const targetDayIndex = allDays.findIndex(day => day.date === targetDateStr);

          if (targetDayIndex !== -1) {
            // Calculate scroll position using ROW_HEIGHT
            const estimatedPosition = targetDayIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
            console.log('Scrolling to position:', estimatedPosition, 'for day index:', targetDayIndex);

            // Set scroll position directly (without smooth scrolling for immediate update)
            gridRef.current.scrollTop = estimatedPosition;

            // Update scrollTop state to match the new scroll position
            setScrollTop(estimatedPosition);

            // Update message to show completion
            setError(`Jumped to ${targetDate.toLocaleDateString()}`);
            setTimeout(() => setError(null), 2000);
          } else {
            console.error('Target date not found in allDays array:', targetDateStr);
            setError('Target date not found');
            setTimeout(() => setError(null), 2000);
          }
        }
      }, 500); // Increased timeout to ensure DOM is ready
    } catch (error) {
      console.error('Failed to skip to date:', error);
      setError('Failed to jump to selected date. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && days.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Header with import/export - mobile optimized */}
      <div className="mb-4">
        <div className="flex justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-white">
            Time Grid
          </h2>

          {/* Import/Export buttons - mobile responsive */}
          <div className="flex flex-wrap gap-2 justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="bg-secondary border-border text-secondary-foreground"
              disabled={!db}
              title="Export data to JSON file"
            >
              <Download className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportDatabase}
              className="bg-secondary border-border text-secondary-foreground"
              disabled={!db}
              title="Import data from JSON file"
            >
              <Upload className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Import</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDateSkipDialog(true)}
              className="bg-blue-600/20 border-blue-600 text-blue-400 hover:bg-blue-600/30"
              disabled={!db}
              title="Jump to a specific date"
            >
              <CalendarIcon className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Skip to Date</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportLegacyDatabase}
              className="bg-orange-600/20 border-orange-600 text-orange-400 hover:bg-orange-600/30"
              disabled={!db}
              title="Import data from legacy Exocortex format (old app)"
            >
              <Upload className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Legacy</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTestConfirm(true)}
              className="bg-primary border-primary text-primary-foreground"
              disabled={!db}
              title="Generate random test data for the past 30 days"
            >
              <Database className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Test</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              className="bg-destructive border-destructive text-destructive-foreground"
              disabled={!db}
              title="Clear all events from the database"
            >
              <Trash2 className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Clear</span>
            </Button>
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className={`mt-3 px-3 py-2 rounded-md text-sm ${
            error.includes('Successfully')
              ? 'bg-green-900/20 border border-green-600 text-green-400'
              : 'bg-red-900/20 border border-red-600 text-red-400'
          }`}>
            {error}
          </div>
        )}
      </div>

      {/* Grid container - mobile optimized */}
      <div
        ref={gridRef}
        className="relative overflow-auto bg-background border border-border rounded-lg exocortex"
        style={{
          height: 'calc(100vh - 100px)', // More space - button should be immediately visible
          width: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Inject responsive styles */}
        <style>{responsiveStyles}</style>
        {/* Hour headers - mobile optimized */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
            {hourSlots.map((hour, index) => (
              <div
                key={hour}
                className="text-xs md:text-sm text-muted-foreground border-r border-border px-1 md:px-2 py-1 text-center flex-shrink-0 select-none"
                style={{
                  width: `var(--hour-width)`,
                }}
              >
                {hour}
              </div>
            ))}
          </div>
        </div>

        {/* Day rows - Virtualized */}
        <div
          className="relative"
          style={{
            minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px`,
            height: `${days.length * ROW_HEIGHT}px` // Total height for proper scrolling
          }}
        >
          {/* Spacer to maintain scroll position */}
          <div
            style={{
              height: `${visibleRows.offsetY}px`,
              width: '100%'
            }}
          />

          {/* Only render visible rows */}
          {days.slice(visibleRows.startIndex, visibleRows.endIndex).map((day, visibleIndex) => {
            const actualDayIndex = visibleRows.startIndex + visibleIndex;
            <div
              key={day.date}
              data-day={day.date}
              className="relative border-b border-border"
              style={{
                height: `${ROW_HEIGHT}px`,
              }}
            >
              {/* Date label - mobile optimized */}
              <div className="absolute left-2 -top-1 text-xs md:text-sm text-muted-foreground z-20 select-none">
                {new Date(day.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>

              {/* Grid lines */}
              <div className="absolute inset-0 flex" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
                {Array.from({ length: HOURS_IN_DAY }).map((_, hourIndex) => (
                  <div
                    key={hourIndex}
                    className="border-r border-border flex-shrink-0"
                    style={{
                      width: `var(--hour-width)`,
                    }}
                  />
                ))}
              </div>

              {/* Events - mobile optimized */}
              <div className="absolute inset-0" style={{ minWidth: `${HOURS_IN_DAY * HOUR_WIDTH}px` }}>
                {getEventsForDay(day, days).map((event, eventIndex) => {
                  // For span events, we need to find the original event in its day's events array
                  const originalEventId = event.id.replace(/-span-.*$/, '');
                  const originalDay = days.find(d => d.events.some(e => e.id === originalEventId));
                  const originalEvents = originalDay?.events || [];
                  const originalEventIndex = originalEvents.findIndex(e => e.id === originalEventId);

                  // Get all events for this day for proper timing calculation
                  const dayEvents = getEventsForDay(day, days);

                  // Calculate the actual start time for this event
                  let eventStartTime: number;
                  if (eventIndex === 0) {
                    // First event of the day - use the calculated start time
                    eventStartTime = getEventStartTime(
                      { ...event, id: originalEventId },
                      originalEvents,
                      originalEventIndex
                    );
                  } else {
                    // Subsequent events - start immediately after the previous event ends
                    eventStartTime = dayEvents[eventIndex - 1].endTime;
                  }

                  const portionType = getEventPortionType(
                    { ...event, id: originalEventId }, // Use original ID for portion calculation
                    day.date,
                    originalEvents,
                    originalEventIndex
                  );

                  // Only render the event portion if it's relevant for this day
                  if (portionType === 'middle') {
                    // Skip middle portions for now to avoid visual clutter
                    // We could show them with a different style if needed
                    return null;
                  }

                  // Calculate the style with the proper start time
                  const eventStyle = calculateEventPortionWithStartTime(
                    { ...event, id: originalEventId },
                    day.date,
                    eventStartTime,
                    event.endTime,
                    portionType
                  );

                  return (
                    <div
                      key={`${event.id}-${day.date}`}
                      className="absolute top-2 h-16 rounded-md border border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow touch-manipulation"
                      style={eventStyle}
                      onClick={() => handleEventClickWithDragCheck({ ...event, id: originalEventId })} // Use drag-aware click handler
                    >
                      <div className="p-0 h-full flex flex-col items-center justify-center text-center">
                        <div className="text-xs font-medium truncate w-full mb-0.5" style={{ color: getTextColor(event) }}>
                          {event.category}
                          {portionType !== 'full' && (
                            <span className="ml-1 opacity-70">
                              ({portionType === 'start' ? '→' : portionType === 'end' ? '←' : '↔'})
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <SmileyFace
                            health={event.health}
                            wakefulness={event.wakefulness}
                            happiness={event.happiness}
                            size={27}
                          />
                        </div>
                        {event.notes ? (
                          <div
                            className="text-xs truncate w-full mt-0.5 leading-tight"
                            style={{ color: getTextColor(event), opacity: 0.9 }}
                            title={event.notes}
                          >
                            {event.notes.length > 20 ? `${event.notes.slice(0, 20)}…` : event.notes}
                          </div>
                        ) : (
                          <div className="text-xs truncate w-full mt-0.5 leading-tight">
                            &nbsp;
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          })}

          {/* Loading trigger for infinite scroll - positioned at the end */}
          {days.length > visibleRows.endIndex && (
            <div
              ref={loadingRef}
              className="absolute w-full h-20 flex items-center justify-center"
              style={{
                top: `${days.length * ROW_HEIGHT}px`,
                transform: 'translateY(-100%)'
              }}
            >
              {loading && (
                <div className="text-muted-foreground">Loading more days...</div>
              )}
              {hasReachedHistoricalLimit && !loading && (
                <div className="text-muted-foreground text-sm">
                  Reached historical limit (10 years)
                </div>
              )}
            </div>
          )}

          {/* Fallback loading state when no rows are visible */}
          {visibleRows.startIndex === 0 && visibleRows.endIndex === 0 && loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Floating add button - mobile optimized */}
      <button
        onClick={handleOpenAddDialog}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50 touch-manipulation"
        style={{
          // Ensure button stays within safe areas on mobile
          paddingBottom: 'env(safe-area-inset-bottom, 1rem)',
          paddingRight: 'env(safe-area-inset-right, 1rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Event dialog */}
      <EventDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleAddEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        editEvent={editingEvent}
        defaultValues={defaultValues}
      />

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

      {/* Skip to Date Dialog */}
      <Dialog open={showDateSkipDialog} onOpenChange={setShowDateSkipDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Jump to Date</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select a date to jump to in your time tracking data. Use the year buttons for faster navigation.
            </p>
            <div className="flex justify-center">
              <CalendarWithYearNav />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDateSkipDialog(false)}
              className="bg-secondary border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSkipToDate}
              disabled={!selectedSkipDate || loading}
              className="bg-primary hover:bg-primary/90"
            >
              Jump to Date
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}