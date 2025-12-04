// Central helper for updating hue-driven CSS variables.
// This is the single place that touches CSS custom properties
// for the global accent hue.

export function applyHueVariables(hue: number) {
  if (typeof window === "undefined") return;

  const root = window.document.documentElement;
  const clamped = Math.min(360, Math.max(0, hue));
  const h = String(clamped);

  // Raw hue, if anything wants to read it directly
  root.style.setProperty("--hue", h);

  // Base / light-mode border colour: matches initial CSS ratios
  root.style.setProperty("--border", `${h} 91.8% 42.4%`);

  // Dark-mode primary tint: picked up by hsl(var(--primary)) in Tailwind theme
  root.style.setProperty("--primary", `${h} 53% 20%`);
}
