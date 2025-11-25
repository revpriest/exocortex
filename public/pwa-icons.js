// Simple script to generate basic PWA icons
// This creates minimal icons for the PWA to function

const fs = require('fs');
const path = require('path');

// Simple SVG icon template
const svgTemplate = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#3b82f6" rx="128"/>
  <g transform="translate(256, 256)">
    <!-- Grid pattern representing "Exocortex Grid" -->
    <g stroke="#ffffff" stroke-width="16" fill="none" opacity="0.9">
      <circle cx="-80" cy="-80" r="40"/>
      <circle cx="80" cy="-80" r="40"/>
      <circle cx="-80" cy="80" r="40"/>
      <circle cx="80" cy="80" r="40"/>
      <line x1="-80" y1="-80" x2="80" y2="-80"/>
      <line x1="-80" y1="80" x2="80" y2="80"/>
      <line x1="-80" y1="-80" x2="-80" y2="80"/>
      <line x1="80" y1="-80" x2="80" y2="80"/>
      <line x1="-80" y1="-80" x2="80" y2="80"/>
      <line x1="80" y1="-80" x2="-80" y2="80"/>
    </g>
    <!-- Center node -->
    <circle cx="0" cy="0" r="24" fill="#ffffff"/>
  </g>
</svg>
`;

// Create the SVG file
fs.writeFileSync(path.join(__dirname, 'public', 'icon.svg'), svgTemplate.trim());

console.log('PWA icon SVG created successfully');
console.log('Note: For production, you should convert this SVG to PNG files:');
console.log('- pwa-192x192.png');
console.log('- pwa-512x512.png');
console.log('- apple-touch-icon.png');
console.log('- favicon.ico');