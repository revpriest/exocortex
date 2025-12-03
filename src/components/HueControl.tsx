import { Slider } from '@/components/ui/slider';
import { useHue } from '@/hooks/useHue';

export const HueControl = () => {
  const { hue, setHue } = useHue();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Accent hue</span>
        <span className="tabular-nums">{Math.round(hue)}°</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full border border-border shadow-sm"
             style={{ background: `hsl(${hue}, 60%, 45%)` }}
        />
        <Slider
          min={0}
          max={360}
          step={1}
          value={[hue]}
          onValueChange={([value]) => setHue(value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Adjusts the hue of primary buttons and grid borders. Saturation and brightness stay consistent.
      </p>
    </div>
  );
};
