// Central helper for updating hue-driven CSS variables.
// Having this in one place ensures both useHue and useHueInit use exactly the
// same logic, which is critical for consistent behaviour across browsers
// (especially Firefox on Android).

export function applyHueVariables(hue: number) {
  if (typeof window === "undefined") return;

  const root = window.document.documentElement;
  const clamped = Math.min(360, Math.max(0, hue));
  const h = String(clamped);

  // Raw hue, if anything wants to read it directly
  root.style.setProperty("--hue", h);

  // Light-mode / base border colour: matches the initial CSS ratios
  root.style.setProperty("--border", `${h} 91.8% 42.4%`);

  // Dark-mode tints: these get picked up via hsl(var(--primary)) etc.
  // If you later want different behaviour for light vs dark, we can extend
  // this function to look at document.documentElement.classList.
  root.style.setProperty("--primary", `${h} 53% 20%`);
}
