/**
 * Help.tsx - Help/About Page
 *
 * This page displays information about the Exocortex application,
 * including credits and important usage notes.
 */

import React from 'react';
import { useSeoMeta } from '@unhead/react';

/**
 * Help Component
 *
 * This component renders the about/help information for Exocortex.
 * It includes:
 * - SEO metadata for search engines
 * - Information about who created the app
 * - Important usage warnings
 * - Properly formatted HTML links
 */
const Help = () => {
  /**
   * Set SEO (Search Engine Optimization) metadata
   */
  useSeoMeta({
    title: 'Exocortex - Help',
    description: 'Information about the Exocortex time tracking application.',
  });

  return (
    <div className="min-h-screen bg-gray-900 p-2 md:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            About Exocortex
          </h1>
        </div>

        {/* Main Content */}
        <div className="bg-gray-800 rounded-lg p-6 md:p-8">
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 text-base md:text-lg leading-relaxed">
              Exocortex was vibe-coded by{' '}
              <a 
                href="https://dalliance.net/" 
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                pre
              </a>
              {' '}using{' '}
              <a 
                href="https://shakespeare.diy/" 
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                shakespeare
              </a>
            </p>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-yellow-400 text-base md:text-lg leading-relaxed">
                You should probably back up with the export button often, no guarantees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;