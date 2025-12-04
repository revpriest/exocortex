import { useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { applyHueVariables } from "@/lib/hueCss";

/**
 * useHueInit
 *
 * Ensures the global CSS hue-related variables are synced from the stored app
 * config as soon as providers are mounted, so every page (grid, summary,
 * stats, etc.) uses the right accent hue on first paint.
 */
export function useHueInit() {
  const { config } = useAppContext();
  const hue = typeof config.hue === "number" ? config.hue : 90.3;

  useEffect(() => {
    if (typeof window === "undefined") return;
    applyHueVariables(hue);
  }, [hue]);
}
