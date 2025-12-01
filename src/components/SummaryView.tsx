/**
 * SummaryView.tsx - Summary Page Component
 *
 * This component displays a list of all events with events that have no notes
 * collapsed into a single row for each category per day.
 */

import React, { useState, useEffect } from 'react';
import { ExocortexDB, type TimeEvent, type DayWithEvents } from '@/lib/exocortex';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Calendar, Clock, Tag, StickyNote, Smile } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SummaryViewProps {
  className?: string;
}

/**
 * Event Item Component
 * Displays a single event with its details
 */
const EventItem = ({ event, showDate = false }: { event: TimeEvent; showDate?: boolean }) => {
  const startTime = new Date(event.endTime - event.duration);
  const endTime = new Date(event.endTime);

  return (
    <div className="p-3 border-l-2 border-muted bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Date and Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {showDate && (
              <span className="font-medium">
                {format(startTime, 'MMM d, yyyy')}
              </span>
            )}
            <Calendar className="h-3 w-3" />
            <span>
              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
            </span>
            <Clock className="h-3 w-3 ml-1" />
            <span>{Math.round(event.duration / (1000 * 60))}m</span>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2 mb-1">
            <Tag className="h-3 w-3" />
            <Badge variant="secondary" className="text-xs">
              {event.category}
            </Badge>
          </div>

          {/* Notes */}
          {event.notes && (
            <div className="flex items-start gap-2 mt-2">
              <StickyNote className="h-3 w-3 mt-0.5 text-muted-foreground" />
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {event.notes}
              </p>
            </div>
          )}

          {/* Mood Indicators */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Smile className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1">
                <span className="text-xs text-muted-foreground">H:</span>
                <span className={cn(
                  "text-xs font-medium",
                  event.happiness >= 0.7 ? "text-green-600" :
                  event.happiness >= 0.4 ? "text-yellow-600" : "text-red-600"
                )}>
                  {Math.round(event.happiness * 100)}%
                </span>
              </div>
              <div className="flex gap-1">
                <span className="text-xs text-muted-foreground">W:</span>
                <span className={cn(
                  "text-xs font-medium",
                  event.wakefulness >= 0.7 ? "text-green-600" :
                  event.wakefulness >= 0.4 ? "text-yellow-600" : "text-red-600"
                )}>
                  {Math.round(event.wakefulness * 100)}%
                </span>
              </div>
              <div className="flex gap-1">
                <span className="text-xs text-muted-foreground">Hl:</span>
                <span className={cn(
                  "text-xs font-medium",
                  event.health >= 0.7 ? "text-green-600" :
                  event.health >= 0.4 ? "text-yellow-600" : "text-red-600"
                )}>
                  {Math.round(event.health * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Collapsible Day Section Component
 * Groups events by day and category, collapsing events without notes
 */
const DaySection = ({ dayWithEvents }: { dayWithEvents: DayWithEvents }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Group events by category
  const eventsByCategory = dayWithEvents.events.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = [];
    }
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, TimeEvent[]>);

  const categories = Object.entries(eventsByCategory);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(new Date(dayWithEvents.date), 'EEEE, MMMM d, yyyy')}
          </div>
          <Badge variant="outline">
            {dayWithEvents.events.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map(([category, events]) => {
          const eventsWithNotes = events.filter(e => e.notes && e.notes.trim() !== '');
          const eventsWithoutNotes = events.filter(e => !e.notes || e.notes.trim() === '');

          return (
            <div key={category} className="space-y-2">
              {/* Category Header */}
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <Badge variant="secondary">{category}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({eventsWithNotes.length} with notes, {eventsWithoutNotes.length} without)
                  </span>
                </div>
                
                {eventsWithoutNotes.length > 0 && (
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={setIsExpanded}
                    className="w-full"
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        <span className="text-xs ml-1">
                          {isExpanded ? 'Hide' : 'Show'} {eventsWithoutNotes.length} without notes
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-2 mt-2">
                      {eventsWithoutNotes.map((event, index) => (
                        <EventItem key={index} event={event} />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* Events with Notes (always visible) */}
              {eventsWithNotes.map((event, index) => (
                <EventItem key={`with-notes-${index}`} event={event} />
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

/**
 * Loading Skeleton Component
 */
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <Card key={i} className="mb-4">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

/**
 * SummaryView Component
 *
 * Main component that fetches and displays all events grouped by day,
 * with events without notes collapsed by default.
 */
const SummaryView: React.FC<SummaryViewProps> = ({ className }) => {
  const [daysWithEvents, setDaysWithEvents] = useState<DayWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const db = new ExocortexDB();
        await db.init();

        // Load events for the last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const days = await db.getEventsByDateRange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        setDaysWithEvents(days.reverse()); // Most recent first
      } catch (err) {
        console.error('Failed to load events:', err);
        setError('Failed to load events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  if (loading) {
    return (
      <div className={cn("w-full max-w-4xl mx-auto", className)}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Event Summary</h2>
          <p className="text-muted-foreground">Loading your events...</p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full max-w-4xl mx-auto", className)}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Event Summary</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (daysWithEvents.length === 0) {
    return (
      <div className={cn("w-full max-w-4xl mx-auto", className)}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Event Summary</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No events found in the last 30 days.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Event Summary</h2>
        <p className="text-muted-foreground">
          Showing {daysWithEvents.length} days with events. Events without notes are collapsed by default.
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-4">
          {daysWithEvents.map((dayWithEvents) => (
            <DaySection 
              key={dayWithEvents.date} 
              dayWithEvents={dayWithEvents} 
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export { SummaryView };