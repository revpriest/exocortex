import { useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { applyHueVariables } from "@/lib/hueCss";

/**
 * useHueInit
 *
 * Global synchronisation between app config (hue) and CSS variables.
 * This is the *only* place that should write to --hue / --border / --primary.
 */
export function useHueInit() {
  const { config } = useAppContext();
  const hue = typeof config.hue === "number" ? config.hue : 90.3;

  useEffect(() => {
    applyHueVariables(hue);
  }, [hue]);
}
