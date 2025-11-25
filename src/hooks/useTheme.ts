/**
 * useTheme.ts - Theme Management Hook
 *
 * This custom hook provides access to the application's theme system.
 * It handles switching between light, dark, and system themes.
 *
 * Theme management involves:
 * - Reading current theme from app context
 * - Providing function to change theme
 * - Updating app configuration when theme changes
 * - Applying CSS classes to document root for styling
 */

// Import theme type definition and app context hook
import { type Theme } from "@/contexts/AppContext";
import { useAppContext } from "@/hooks/useAppContext";

/**
 * useTheme Hook
 *
 * Provides theme state and theme switching functionality.
 * This is the primary way components should interact with theme system.
 *
 * @returns Object containing:
 * - theme: Current theme value ('dark', 'light', or 'system')
 * - setTheme: Function to change the theme
 *
 * Example usage:
 * const { theme, setTheme } = useTheme();
 * setTheme('dark'); // Switch to dark theme
 */
export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  // Get current app configuration and update function
  const { config, updateConfig } = useAppContext();

  return {
    // Current theme from app configuration
    theme: config.theme,

    /**
     * Set Theme Function
     *
     * Updates the theme in the global app configuration.
     * This will trigger a re-render of components that use the theme.
     *
     * The update is done immutably by merging with existing config:
     * - Create new object with existing config properties
     * - Override the theme property with new value
     * - Pass to updateConfig to persist the change
     */
    setTheme: (theme: Theme) => {
      updateConfig((currentConfig) => ({
        ...currentConfig,        // Keep existing config properties
        theme,                  // Update theme property
      }));
    }
  };
}