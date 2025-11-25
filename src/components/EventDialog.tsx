import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExocortexEvent, getEventColor } from '@/lib/exocortex';
import { Clock, ChevronLeft, ChevronRight, Trash2, AlertCircle } from 'lucide-react';

// Helper function to draw smiley face
function drawSmileyFaceOnCanvas(
  canvas: HTMLCanvasElement | null,
  health: number[],
  wakefulness: number[],
  happiness: number[]
) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.35;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Get current mood values from state arrays
  const h = health[0];
  const w = wakefulness[0];
  const hp = happiness[0];

  // Calculate face color (yellow to green based on health)
  // Yellow: RGB(255, 255, 0), Green: RGB(0, 255, 0)
  const red = Math.round(255 * h);
  const green = 255;
  const blue = 0;
  const faceColor = `rgb(${red}, ${green}, ${blue})`;

  // Draw face circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = faceColor;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw eyes based on wakefulness (fixed: 0% = closed, 100% = open)
  const eyeWidth = radius * 0.2; // Bigger eyes
  const eyeHeight = Math.max(radius * 0.02, radius * 0.2 * w); // Minimum height for closed eyes
  const eyeYOffset = radius * 0.3;
  const eyeXOffset = radius * 0.3;

  // Left eye
  ctx.beginPath();
  ctx.ellipse(centerX - eyeXOffset, centerY - eyeYOffset, eyeWidth, eyeHeight, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#333';
  ctx.fill();

  // Right eye
  ctx.beginPath();
  ctx.ellipse(centerX + eyeXOffset, centerY - eyeYOffset, eyeWidth, eyeHeight, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#333';
  ctx.fill();

  // Draw mouth based on happiness (exaggerated curve)
  const mouthWidth = radius * 0.6;
  const mouthY = centerY + radius * 0.25; // Even lower to compensate for exaggerated curve
  
  // Calculate mouth curve height based on happiness (exaggerated)
  // -0.6 to 0.6 range: negative = sad, positive = happy (twice as height)
  const mouthCurveHeight = (hp - 0.5) * 1.2 * radius;

  ctx.beginPath();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;

  // Use quadratic curve for smooth mouth
  ctx.moveTo(centerX - mouthWidth, mouthY);
  ctx.quadraticCurveTo(centerX, mouthY + mouthCurveHeight, centerX + mouthWidth, mouthY);
  ctx.stroke();
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw smiley face based on current mood values
  const drawSmileyFace = () => {
    drawSmileyFaceOnCanvas(canvasRef.current, health, wakefulness, happiness);
  };

  // Update canvas when mood values change
  useEffect(() => {
    drawSmileyFace();
  }, [happiness, wakefulness, health]);

  // Initial draw when component mounts
  useEffect(() => {
    drawSmileyFace();
  }, []);

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
    const newTime = new Date(endTime.getTime() + minutes * 60000);
    setEndTime(newTime);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
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
        <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white" style={{ minWidth: '400px' }}>
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

          {/* Smiley face canvas with color preview background */}
          <div className="flex justify-center py-2">
            <div className="relative">
              <div 
                className="w-32 h-32 rounded-full border-2 border-gray-600"
                style={{ backgroundColor: getColorPreview() }}
              />
              <canvas
                ref={canvasRef}
                width="128"
                height="128"
                className="absolute top-0 left-0 w-32 h-32"
              />
            </div>
          </div>

        <div className="space-y-4">
          {/* Category input */}
          <div className="space-y-1">
            <Label htmlFor="category" className="text-sm">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Work, Sleep, Exercise"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          {/* Time selection */}
          <div className="space-y-1">
            <Label className="text-sm">End Time</Label>
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
          <div className="space-y-1">
            <Label className="text-sm">Happiness: {Math.round(happiness[0] * 100)}%</Label>
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
          <div className="space-y-1">
            <Label className="text-sm">Wakefulness: {Math.round(wakefulness[0] * 100)}%</Label>
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
          <div className="space-y-1">
            <Label className="text-sm">Health: {Math.round(health[0] * 100)}%</Label>
            <Slider
              value={health}
              onValueChange={setHealth}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center">
            {editEvent && onDelete && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
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