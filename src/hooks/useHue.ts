import { useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";

export function useHue() {
  const { config, updateConfig } = useAppContext();
  const hue = typeof config.hue === "number" ? config.hue : 90.3;

  // Apply stored hue to CSS variable on mount/when config changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty("--hue", String(hue));
  }, [hue]);

  const setHue = (value: number) => {
    const clamped = Math.min(360, Math.max(0, value));
    updateConfig(current => ({
      ...current,
      hue: clamped,
    }));

    const root = window.document.documentElement;
    root.style.setProperty("--hue", String(clamped));
  };

  return { hue, setHue };
}
