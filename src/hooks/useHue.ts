import { useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";

// Helper to apply hue to CSS custom properties in a way that works across browsers
function applyHueVariables(hue: number) {
  const root = window.document.documentElement;
  const clamped = Math.min(360, Math.max(0, hue));
  const h = String(clamped);

  // Store the raw hue for anyone that needs it
  root.style.setProperty("--hue", h);

  // Light-mode border (also used as base in many places)
  // Matches the initial values defined in index.css
  root.style.setProperty("--border", `${h} 91.8% 42.4%`);

  // Dark-mode primary and border tints – these match the ratios used in index.css
  // We set them on :root so the .dark class just changes layout/other vars,
  // while the actual tint comes from this helper.
  root.style.setProperty("--primary", `${h} 53% 20%`);
}

export function useHue() {
  const { config, updateConfig } = useAppContext();
  const hue = typeof config.hue === "number" ? config.hue : 90.3;

  // Apply stored hue to CSS variables on mount/when config changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    applyHueVariables(hue);
  }, [hue]);

  const setHue = (value: number) => {
    const clamped = Math.min(360, Math.max(0, value));

    updateConfig(current => ({
      ...current,
      hue: clamped,
    }));

    if (typeof window !== "undefined") {
      applyHueVariables(clamped);
    }
  };

  return { hue, setHue };
}
