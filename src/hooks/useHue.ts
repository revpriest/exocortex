import { useAppContext } from "@/hooks/useAppContext";

// Thin wrapper over app config for the global hue.
// This hook deliberately does *not* touch CSS variables; that is owned by
// useHueInit + applyHueVariables so we have a single writer.
export function useHue() {
  const { config, updateConfig } = useAppContext();
  const hue = typeof config.hue === "number" ? config.hue : 90.3;

  const setHue = (value: number) => {
    const clamped = Math.min(360, Math.max(0, value));
    updateConfig(current => ({
      ...current,
      hue: clamped,
    }));
  };

  return { hue, setHue };
}
