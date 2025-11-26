/**
 * useBuildInfo.ts - Build Information Hook
 *
 * This hook provides access to build information including version,
 * build hash, build date, and git commit information.
 *
 * Build information is generated during the build process and stored
 * in build-info.json in the public directory.
 */

import { useState, useEffect } from 'react';

export interface BuildInfo {
  version: string;
  buildHash: string;
  buildDate: string;
  branch: string;
  commitDate: string;
}

export function useBuildInfo(): BuildInfo | null {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    const loadBuildInfo = async () => {
      try {
        // Try to fetch build-info.json from the root
        const response = await fetch('/build-info.json');
        if (response.ok) {
          const info = await response.json();
          setBuildInfo(info);
          console.log('📋 Build info loaded:', info);
        } else {
          // Fallback: Use current time (development mode)
          console.log('📋 No build-info.json found, using development fallback');
          const fallbackInfo: BuildInfo = {
            version: 'dev',
            buildHash: 'dev',
            buildDate: new Date().toISOString(),
            branch: 'main',
            commitDate: new Date().toISOString()
          };
          setBuildInfo(fallbackInfo);
        }
      } catch (error) {
        console.error('❌ Failed to load build info:', error);
        // Final fallback
        const fallbackInfo: BuildInfo = {
          version: Date.now().toString(),
          buildHash: 'unknown',
          buildDate: new Date().toISOString(),
          branch: 'main',
          commitDate: new Date().toISOString()
        };
        setBuildInfo(fallbackInfo);
      }
    };

    loadBuildInfo();
  }, []);

  return buildInfo;
}