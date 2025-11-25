// Simple data URL icons for PWA
// These are basic colored squares with the letter "E" for Exocortex

const createIconDataURL = (size, color = '#3b82f6') => {
  const canvas = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.25}"/>
      <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${size * 0.4}" 
            font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">E</text>
    </svg>
  `;
  
  return 'data:image/svg+xml;base64,' + btoa(canvas);
};

// Create 192x192 icon
const icon192 = createIconDataURL(192);
const icon512 = createIconDataURL(512);

console.log('192x192 icon data URL:', icon192);
console.log('512x512 icon data URL:', icon512);

// Save as simple HTML files for manual conversion
const html192 = `
<!DOCTYPE html>
<html>
<head>
    <title>192x192 Icon</title>
</head>
<body>
    <div style="text-align: center; padding: 20px;">
        <h1>192x192 Icon</h1>
        <img src="${icon192}" alt="192x192 icon" style="border: 1px solid #ccc;"/>
        <p style="margin-top: 20px;">Right-click and "Save image as..." as pwa-192x192.png</p>
    </div>
</body>
</html>
`;

const html512 = `
<!DOCTYPE html>
<html>
<head>
    <title>512x512 Icon</title>
</head>
<body>
    <div style="text-align: center; padding: 20px;">
        <h1>512x512 Icon</h1>
        <img src="${icon512}" alt="512x512 icon" style="border: 1px solid #ccc;"/>
        <p style="margin-top: 20px;">Right-click and "Save image as..." as pwa-512x512.png</p>
    </div>
</body>
</html>
`;

// In a real environment, these would be saved as files
console.log('Icon generator script created');