import type { ReactNode } from "react";
import { useHueInit } from "@/hooks/useHueInit";

// HueProvider
//
// Mount this once near the root of the app to keep CSS hue variables in sync
// with the stored app configuration, regardless of which page is loaded first.
export function HueProvider({ children }: { children: ReactNode }) {
  useHueInit();
  return <>{children}</>;
}
