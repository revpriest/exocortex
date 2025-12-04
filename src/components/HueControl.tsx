import React, { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { useHue } from '@/hooks/useHue';

export const HueControl = () => {
  const { hue, setHue } = useHue();

  // Local live state to keep the slider responsive on all browsers
  const [localHue, setLocalHue] = useState(hue);

  // Keep local slider state in sync if global hue changes elsewhere
  useEffect(() => {
    setLocalHue(hue);
  }, [hue]);

  const handleChange = (values: number[]) => {
    const value = values[0];
    setLocalHue(value);
    // Update global hue + CSS variable on every move
    setHue(value);
  };

  const handleCommit = (values: number[]) => {
    const value = values[0];
    // Ensure the final committed value is stored
    setHue(value);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Accent hue</span>
        <span className="tabular-nums">{Math.round(localHue)}°</span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="h-8 w-8 rounded-full border border-border shadow-sm"
          style={{ background: `hsl(${localHue}, 60%, 45%)` }}
        />
        <Slider
          min={0}
          max={360}
          step={1}
          value={[localHue]}
          onValueChange={handleChange}
          onValueCommit={handleCommit}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Adjusts the hue of primary buttons and grid borders. Saturation and brightness stay consistent.
      </p>
    </div>
  );
};
