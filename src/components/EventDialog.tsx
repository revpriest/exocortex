import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExocortexEvent, getEventColor } from '@/lib/exocortex';
import { Clock, ChevronLeft, ChevronRight, Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import { ExocortexDB } from '@/lib/exocortex';
import { useIsMobile } from '@/hooks/useIsMobile';

// Helper function to draw smiley face
function drawSmileyFaceOnCanvas(
  canvas: HTMLCanvasElement | null,
  healthArr: number[],
  wakefulnessArr: number[],
  happinessArr: number[]
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
  const healthVal = healthArr[0];
  const wakefulnessVal = wakefulnessArr[0];
  const happinessVal = happinessArr[0];

  // Calculate face color (yellow to green based on health)
  // Yellow: RGB(255, 255, 0), Green: RGB(0, 255, 0)
  const red = Math.round(255 * healthVal);
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
  const eyeHeight = Math.max(radius * 0.02, radius * 0.2 * wakefulnessVal); // Minimum height for closed eyes
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
  const mouthCurveHeight = (happinessVal - 0.5) * 1.2 * radius;

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
  const isMobile = useIsMobile();
  const [category, setCategory] = useState('');
  const [happinessState, setHappinessState] = useState([defaultValues?.happiness || 0.7]);
  const [wakefulnessState, setWakefulnessState] = useState([defaultValues?.wakefulness || 0.8]);
  const [healthState, setHealthState] = useState([defaultValues?.health || 0.9]);
  const [endTime, setEndTime] = useState(new Date());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recentCategories, setRecentCategories] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Inject Firefox-specific CSS
  useEffect(() => {
    if (isMobile && open) {
      const style = document.createElement('style');
      style.textContent = `
        @-moz-document url-prefix() {
          .fixed[data-state="open"] {
            width: 240px !important;
            max-width: 240px !important;
            max-height: 350px !important;
            padding: 6px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          .fixed[data-state="open"] button {
            min-height: 20px !important;
            font-size: 10px !important;
            padding: 2px 4px !important;
          }
          .fixed[data-state="open"] input {
            font-size: 10px !important;
            padding: 2px 4px !important;
            height: 24px !important;
          }
          .fixed[data-state="open"] label {
            font-size: 10px !important;
            margin-bottom: 0 !important;
          }
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, [isMobile, open]);

  // Reset form when dialog opens or editEvent changes
  useEffect(() => {
    if (open) {
      if (editEvent) {
        setCategory(editEvent.category);
        setHappinessState([editEvent.happiness]);
        setWakefulnessState([editEvent.wakefulness]);
        setHealthState([editEvent.health]);
        setEndTime(new Date(editEvent.endTime));
      } else {
        setCategory('');
        setHappinessState([defaultValues?.happiness || 0.7]);
        setWakefulnessState([defaultValues?.wakefulness || 0.8]);
        setHealthState([defaultValues?.health || 0.9]);
        setEndTime(new Date());
      }
    }
  }, [open, editEvent, defaultValues]);

  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw smiley face based on current mood values
  const drawSmileyFace = () => {
    drawSmileyFaceOnCanvas(canvasRef.current, healthState, wakefulnessState, happinessState);
  };

  // Update canvas when mood values change
  useEffect(() => {
    drawSmileyFace();
  }, [happinessState, wakefulnessState, healthState]);

  // Initial draw when component mounts
  useEffect(() => {
    drawSmileyFace();
  }, []);

  // Load recent categories when dialog opens
  useEffect(() => {
    if (open) {
      loadRecentCategories();
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdownContainer = target.closest('.relative');
      if (!dropdownContainer || !dropdownContainer.contains(target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Load recent unique categories from database
  const loadRecentCategories = async () => {
    try {
      const db = new ExocortexDB();
      await db.init();

      // Get events from the last 30 days including today
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29); // -29 to include 30 days total (today + 29 previous)

      const days = await db.getEventsByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Extract all categories and get unique ones, keeping most recent first
      const allCategories = days.flatMap(day => day.events.map(event => event.category));

      // Reverse to get most recent first, then get unique ones
      const reversedCategories = [...allCategories].reverse();
      const uniqueCategories = [...new Set(reversedCategories)].slice(0, 12);

      // Always include default categories along with existing ones
      const defaultCategories = ['Work', 'Sleep', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];
      const combinedCategories = [...uniqueCategories, ...defaultCategories];
      const finalCategories = [...new Set(combinedCategories)].slice(0, 12); // Remove duplicates and limit to 12

      setRecentCategories(finalCategories);
    } catch (error) {
      // Add default categories even if there's an error
      const defaultCategories = ['Work', 'Sleep', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];
      setRecentCategories(defaultCategories);
    }
  };

  // Handle category selection from dropdown
  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setShowDropdown(false);
  };

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
        happiness: happinessState[0],
        wakefulness: wakefulnessState[0],
        health: healthState[0],
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
      happiness: happinessState[0],
      wakefulness: wakefulnessState[0],
      health: healthState[0],
    };

    return getEventColor(tempEvent);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`${isMobile ? '!w-[50vw] !max-w-[50vw] !max-w-[240px] !max-h-[50vh] !max-h-[350px] !overflow-y-auto !p-1.5 !gap-0' : 'sm:max-w-md'} bg-gray-800 border-gray-700 text-white`}
          style={isMobile ? {
            width: '50vw !important',
            maxWidth: '240px !important',
            maxHeight: '350px !important',
            padding: '6px !important',
            margin: '0 !important',
            boxSizing: 'border-box !important',
            transform: 'translate(-50%, -50%) !important'
          } : undefined}
        >
          <DialogHeader className={isMobile ? '!pb-0 !space-y-0 !m-0' : ''}>
            <DialogTitle className={isMobile ? '!text-xs !m-0 !p-0' : ''}>{editEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          </DialogHeader>

          {/* Error display */}
          {error && (
            <Alert variant="destructive" className="border-red-600 bg-red-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Smiley face canvas with color preview background */}
          <div className={`flex justify-center ${isMobile ? '!py-0 !my-0' : 'py-2'}`}>
            <div className="relative">
              <div
                className={`${isMobile ? '!w-8 !h-8' : 'w-32 h-32'} rounded-full border-2 border-gray-600`}
                style={{ backgroundColor: getColorPreview() }}
              />
              <canvas
                ref={canvasRef}
                width={isMobile ? "32" : "128"}
                height={isMobile ? "32" : "128"}
                className={`absolute top-0 left-0 ${isMobile ? '!w-8 !h-8' : 'w-32 h-32'}`}
              />
            </div>
          </div>

        <div className={`${isMobile ? '!space-y-0' : 'space-y-4'}`}>
          {/* Category input with dropdown */}
          <div className={`${isMobile ? '!space-y-0' : 'space-y-1'}`}>
            <Label htmlFor="category" className={`${isMobile ? '!text-xs' : 'text-sm'}`}>Category</Label>
            <div className="relative">
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Work, Sleep, Exercise"
                className={`${isMobile ? '!text-[10px] !py-0.5 !h-6 !leading-none' : ''} bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-10`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-600"
              >
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>

              {/* Dropdown menu */}
              {showDropdown && recentCategories.length > 0 && (
                <div className={`absolute ${isMobile ? 'left-0 right-0 -ml-4 -mr-4' : 'left-0 right-0'} mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto`}>
                  {recentCategories.map((cat, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCategorySelect(cat);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-600 focus:bg-gray-600 focus:outline-none transition-colors ${isMobile ? 'px-4' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && recentCategories.length === 0 && (
                <div className={`absolute ${isMobile ? 'left-0 right-0 -ml-4 -mr-4' : 'left-0 right-0'} mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-50`}>
                  <div className={`px-3 py-2 text-sm text-gray-400 ${isMobile ? 'px-4' : ''}`}>
                    No recent categories found
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Time selection */}
          <div className={`${isMobile ? '!space-y-0' : 'space-y-1'}`}>
            <Label className={`${isMobile ? '!text-xs' : 'text-sm'}`}>End Time</Label>
            <div className="flex items-center space-x-2">
              <Clock className={`${isMobile ? '!h-3 !w-3' : 'h-4 w-4'} text-gray-400`} />
              <span className={`${isMobile ? '!text-xs' : 'text-sm'}`}>
                {formatDate(endTime)} at {formatTime(endTime)}
              </span>
            </div>

            <div className={`${isMobile ? 'grid grid-cols-2 gap-0' : 'flex items-center space-x-2'}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(-60)}
                className={`${isMobile ? '!text-[10px] !py-0 !h-5 !leading-none' : ''} bg-gray-700 border-gray-600`}
              >
                <ChevronLeft className={`${isMobile ? '!h-2 !w-2' : 'h-4 w-4'}`} />
                -1h
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(-15)}
                className={`${isMobile ? '!text-[10px] !py-0 !h-5 !leading-none' : ''} bg-gray-700 border-gray-600`}
              >
                <ChevronLeft className={`${isMobile ? '!h-2 !w-2' : 'h-4 w-4'}`} />
                -15m
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(15)}
                className={`${isMobile ? '!text-[10px] !py-0 !h-5 !leading-none' : ''} bg-gray-700 border-gray-600`}
              >
                +15m
                <ChevronRight className={`${isMobile ? '!h-2 !w-2' : 'h-4 w-4'}`} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustTime(60)}
                className={`${isMobile ? '!text-[10px] !py-0 !h-5 !leading-none' : ''} bg-gray-700 border-gray-600`}
              >
                +1h
                <ChevronRight className={`${isMobile ? '!h-2 !w-2' : 'h-4 w-4'}`} />
              </Button>
            </div>
          </div>

          {/* Happiness slider */}
          <div className={`${isMobile ? '!space-y-0 !my-0' : 'space-y-1'}`}>
            <Label className={`${isMobile ? '!text-xs !mb-0' : 'text-sm'}`}>Happiness: {Math.round(happinessState[0] * 100)}%</Label>
            <Slider
              value={happinessState}
              onValueChange={setHappinessState}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Wakefulness slider */}
          <div className={`${isMobile ? '!space-y-0 !my-0' : 'space-y-1'}`}>
            <Label className={`${isMobile ? '!text-xs !mb-0' : 'text-sm'}`}>Wakefulness: {Math.round(wakefulnessState[0] * 100)}%</Label>
            <Slider
              value={wakefulnessState}
              onValueChange={setWakefulnessState}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Health slider */}
          <div className={`${isMobile ? '!space-y-0 !my-0' : 'space-y-1'}`}>
            <Label className={`${isMobile ? '!text-xs !mb-0' : 'text-sm'}`}>Health: {Math.round(healthState[0] * 100)}%</Label>
            <Slider
              value={healthState}
              onValueChange={setHealthState}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Action buttons */}
          <div className={`${isMobile ? 'flex-col space-y-0 pt-0' : 'flex justify-between items-center'} ${isMobile ? '!pt-0 !mt-0' : ''}`}>
            {editEvent && onDelete && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className={`${isMobile ? '!text-[10px] !py-0.5 !h-6 w-full' : ''} bg-red-600 hover:bg-red-700`}
              >
                <Trash2 className={`${isMobile ? '!h-3 !w-3' : 'h-4 w-4'} mr-1`} />
                Delete
              </Button>
            )}
            <div className={`${isMobile ? 'flex space-x-1 w-full' : 'flex justify-end space-x-2 ml-auto'}`}>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className={`${isMobile ? '!text-[10px] !py-0.5 !h-6 flex-1' : ''} bg-gray-700 border-gray-600`}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} className={`${isMobile ? '!text-[10px] !py-0.5 !h-6 flex-1' : ''} bg-blue-600 hover:bg-blue-700`}>
                {editEvent ? 'Update Event' : 'Add Event'}
              </Button>
            </div>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent
          className={`${isMobile ? '!w-[45vw] !max-w-[45vw] !max-w-[220px] !p-1.5 !gap-0' : 'sm:max-w-sm'} bg-gray-800 border-gray-700 text-white`}
          style={isMobile ? {
            width: '45vw !important',
            maxWidth: '220px !important',
            padding: '6px !important',
            margin: '0 !important',
            boxSizing: 'border-box !important',
            transform: 'translate(-50%, -50%) !important'
          } : undefined}
        >
          <DialogHeader className={isMobile ? '!pb-0 !space-y-0 !m-0' : ''}>
            <DialogTitle className={isMobile ? '!text-xs !m-0 !p-0' : ''}>Delete Event</DialogTitle>
          </DialogHeader>
          <div className={isMobile ? '!py-0.5' : 'py-4'}>
            <p className="text-sm text-gray-300">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
          </div>
          <div className={`${isMobile ? 'flex-col space-y-0' : 'flex justify-end space-x-2'}`}>
            <Button
              variant="outline"
              onClick={cancelDelete}
              className={`${isMobile ? '!text-[10px] !py-0.5 !h-6 w-full' : ''} bg-gray-700 border-gray-600`}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className={`${isMobile ? '!text-[10px] !py-0.5 !h-6 w-full' : ''} bg-red-600 hover:bg-red-700`}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}