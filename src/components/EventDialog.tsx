import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExocortexEvent, getEventColor } from '@/lib/exocortex';
import { Clock, ChevronLeft, ChevronRight, Trash2, AlertCircle } from 'lucide-react';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: Omit<ExocortexEvent, 'id'>) => void;
  onUpdate?: (id: string, event: Omit<ExocortexEvent, 'id'>) => void;
  onDelete?: (id: string) => void;
  editEvent?: ExocortexEvent | null;
  defaultValues?: {
    happiness: number;
    wakefulness: number;
    health: number;
  };
}

export function EventDialog({ open, onOpenChange, onSubmit, onUpdate, onDelete, editEvent, defaultValues }: EventDialogProps) {
  const [category, setCategory] = useState('');
  const [happiness, setHappiness] = useState([defaultValues?.happiness || 0.7]);
  const [wakefulness, setWakefulness] = useState([defaultValues?.wakefulness || 0.8]);
  const [health, setHealth] = useState([defaultValues?.health || 0.9]);
  const [endTime, setEndTime] = useState(new Date());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when dialog opens or editEvent changes
  useEffect(() => {
    if (open) {
      setError(null); // Clear any previous errors
      if (editEvent) {
        setCategory(editEvent.category);
        setHappiness([editEvent.happiness]);
        setWakefulness([editEvent.wakefulness]);
        setHealth([editEvent.health]);
        setEndTime(new Date(editEvent.endTime));
      } else {
        setCategory('');
        setHappiness([defaultValues?.happiness || 0.7]);
        setWakefulness([defaultValues?.wakefulness || 0.8]);
        setHealth([defaultValues?.health || 0.9]);
        setEndTime(new Date());
      }
    }
  }, [open, editEvent, defaultValues]);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!category.trim()) {
      setError('Please enter a category');
      return;
    }

    setError(null);

    try {
      const eventData = {
        endTime: endTime.getTime(),
        category: category.trim(),
        happiness: happiness[0],
        wakefulness: wakefulness[0],
        health: health[0],
      };

      if (editEvent && onUpdate) {
        onUpdate(editEvent.id, eventData);
      } else {
        onSubmit(eventData);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event. Please try again.');
    }
  };

  const handleDelete = () => {
    if (editEvent && onDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = () => {
    if (editEvent && onDelete) {
      try {
        onDelete(editEvent.id);
        onOpenChange(false);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error('Error deleting event:', error);
        setError('Failed to delete event. Please try again.');
        setShowDeleteConfirm(false);
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const adjustTime = (minutes: number) => {
    const newTime = new Date(endTime);
    newTime.setMinutes(newTime.getMinutes() + minutes);
    setEndTime(newTime);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getColorPreview = () => {
    // Create a temporary event object to use the same color calculation as the grid
    const tempEvent: ExocortexEvent = {
      id: 'preview',
      endTime: endTime.getTime(),
      category: category || 'preview',
      happiness: happiness[0],
      wakefulness: wakefulness[0],
      health: health[0],
    };

    return getEventColor(tempEvent);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>{editEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          </DialogHeader>

          {/* Error display */}
          {error && (
            <Alert variant="destructive" className="border-red-600 bg-red-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

        <div className="space-y-6">
          {/* Category input */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Work, Sleep, Exercise"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Time selection */}
          <div className="space-y-2">
            <Label>End Time</Label>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm">
                {formatDate(endTime)} at {formatTime(endTime)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(-60)}
                className="bg-gray-700 border-gray-600"
              >
                <ChevronLeft className="h-4 w-4" />
                -1h
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(-15)}
                className="bg-gray-700 border-gray-600"
              >
                <ChevronLeft className="h-4 w-4" />
                -15m
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(15)}
                className="bg-gray-700 border-gray-600"
              >
                +15m
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(60)}
                className="bg-gray-700 border-gray-600"
              >
                +1h
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Happiness slider */}
          <div className="space-y-2">
            <Label>Happiness: {Math.round(happiness[0] * 100)}%</Label>
            <Slider
              value={happiness}
              onValueChange={setHappiness}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Wakefulness slider */}
          <div className="space-y-2">
            <Label>Wakefulness: {Math.round(wakefulness[0] * 100)}%</Label>
            <Slider
              value={wakefulness}
              onValueChange={setWakefulness}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Health slider */}
          <div className="space-y-2">
            <Label>Health: {Math.round(health[0] * 100)}%</Label>
            <Slider
              value={health}
              onValueChange={setHealth}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Color preview */}
          <div className="space-y-2">
            <Label>Event Color Preview</Label>
            <div
              className="w-full h-12 rounded-md border border-gray-600"
              style={{ backgroundColor: getColorPreview() }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center">
            {editEvent && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex justify-end space-x-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-gray-700 border-gray-600"
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                {editEvent ? 'Update Event' : 'Add Event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <DialogContent className="sm:max-w-sm bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Delete Event</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete this event? This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={cancelDelete}
            className="bg-gray-700 border-gray-600"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}