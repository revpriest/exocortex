/**
 * AppContext.tsx - Global Application State Management
 *
 * This file defines the global context for managing application-wide settings.
 * React Context is a way to pass data through component tree without
 * having to pass props down manually at every level.
 *
 * Think of it as global variables that any component can access.
 */

import { createContext } from "react";

/**
 * Theme Type Definition
 *
 * This defines the allowed theme options for the application.
 * Using TypeScript union type ensures only these values can be used.
 */
export type Theme = "dark" | "light" | "system";

/**
 * Color Override Interface
 *
 * Defines a custom color override for a specific category.
 * Users can override the default hue calculation for categories.
 */
export interface ColorOverride {
  /** Category name to override */
  category: string;
  /** Custom hue value (0-360) */
  hue: number;
}

/**
 * Application Configuration Interface
 *
 * This interface defines the shape of our global app settings.
 * Currently we track theme and color overrides, but you could add more settings like:
 * - language preferences
 * - notification settings
 * - user preferences
 * - display settings
 */
export interface AppConfig {
  /** Current theme - dark, light, or system default */
  theme: Theme;
  /** Custom color overrides for specific categories */
  colorOverrides: ColorOverride[];
}

/**
 * App Context Type Interface
 *
 * This defines what data and functions are available through our context.
 * Components using this context will have access to:
 *
 * config: Current app settings
 * updateConfig: Function to update settings
 */
export interface AppContextType {
  /** Current application configuration object */
  config: AppConfig;
  /**
   * Function to update configuration
   *
   * Uses a "functional update" pattern where you provide a function
   * that receives current config and returns partial updates.
   *
   * Example: updateConfig(current => ({ theme: 'dark' }))
   */
  updateConfig: (updater: (currentConfig: Partial<AppConfig>) => Partial<AppConfig>) => void;
}

/**
 * Create the React Context
 *
 * createContext() creates the context object that components can use.
 * We initialize it with 'undefined' because the actual value will be provided
 * by the AppProvider component.
 *
 * Components that use this context must check that it's not undefined,
 * which TypeScript helps enforce with proper typing.
 */
export const AppContext = createContext<AppContextType | undefined>(undefined);
