import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ExocortexEvent } from '@/lib/exocortex';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: Omit<ExocortexEvent, 'id'>) => void;
}

export function EventDialog({ open, onOpenChange, onSubmit }: EventDialogProps) {
  const [category, setCategory] = useState('');
  const [happiness, setHappiness] = useState([0.7]);
  const [wakefulness, setWakefulness] = useState([0.8]);
  const [health, setHealth] = useState([0.9]);
  const [endTime, setEndTime] = useState(new Date());
  const [isTimeScrolling, setIsTimeScrolling] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCategory('');
      setHappiness([0.7]);
      setWakefulness([0.8]);
      setHealth([0.9]);
      setEndTime(new Date());
    }
  }, [open]);

  const handleSubmit = () => {
    if (!category.trim()) {
      alert('Please enter a category');
      return;
    }

    try {
      onSubmit({
        endTime: endTime.getTime(),
        category: category.trim(),
        happiness: happiness[0],
        wakefulness: wakefulness[0],
        health: health[0],
      });
    } catch (error) {
      console.error('Error submitting event:', error);
      alert('Failed to add event. Please try again.');
    }
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
    const hue = Math.abs(category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;
    const saturation = Math.round(happiness[0] * 100);
    const value = Math.round(wakefulness[0] * 100);

    return `hsl(${hue}, ${saturation}%, ${value}%)`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
        </DialogHeader>

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
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-700 border-gray-600"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              Add Event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}