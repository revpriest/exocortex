# ExocortexLog - Visual Time Tracking App

A beautiful, intuitive time tracking application that visualizes your daily activities in a colorful grid pattern. Track your events, moods, and daily patterns with an easy-to-use interface.

It's a web app, but all your data stays on your own machine.

It can be installed as a Progressive Web App, and run offline.

See it at https://exocortex.dalliance.net/

## 🌟 Features

- **Visual Time Grid**: See your entire day laid out in 24-hour blocks
- **Mood Tracking**: Track happiness, wakefulness, and health for each event
- **Color-Coded Categories**: Automatically color-codes events by category
- **Infinite Scroll**: Load past days automatically as you scroll
- **Import/Export**: Save your data as JSON files for backup
- **Test Data Generator**: Generate sample data to explore the app
- **Mobile Responsive**: Works perfectly on phones and tablets
- **Dark Theme**: Easy on the eyes with a dark interface

## 📋 Prerequisites

Before you start, make sure you have:

1. **Node.js** (version 16 or higher) - Download from [nodejs.org](https://nodejs.org/)
2. **npm** (comes with Node.js) - Package manager for JavaScript

To check if you have them installed:
```bash
node --version
npm --version
```

## 🚀 Quick Start

### 1. Install Dependencies

First, you need to download all the packages the app depends on:

```bash
npm install
```

This reads the `package.json` file and downloads everything listed in the `dependencies` section.

### 2. Start Development Server

Run the app in development mode with hot reloading (changes appear automatically):

```bash
npm run dev
```

This command:
- Starts a local web server
- Opens the app in your browser (usually at `http://localhost:5173`)
- Watches for file changes and refreshes automatically
- Shows detailed error messages in the browser

### 3. Open Your Browser

Navigate to the URL shown in terminal (usually `http://localhost:5173`)

## 📱 Using the App

### Adding Your First Event
1. Click the blue `+` button in the bottom-right corner
2. Enter a category (e.g., "Work", "Sleep", "Exercise")
3. Adjust the end time using the +/- buttons
4. Set your mood sliders (happiness, wakefulness, health)
5. Click "Add" to save

### Understanding the Grid
- **Horizontal axis**: 24 hours of the day (midnight to 11 PM)
- **Vertical axis**: Different days (today at top, past days below)
- **Colored blocks**: Your events - color indicates category
- **Smiley faces**: Show your mood during each event
- **Gray lines**: Hour markers for time reference

### Summary Page: How It Works
The **Summary** page provides a smart, compact overview of your recent activity log:

- **Notable events stand out**: Any event with a personal note is always shown as an individual row, clearly displaying your notes and details.
- **Routine activities batched**: Consecutive events without notes are automatically *collapsed* into a single summary row, making it easy to skim past stretches of routine.
- **Expand for details**: Click to expand a collapsed group and reveal all the individual events inside.
- **Mood at a glance**: Rows display quick mood faces for happiness, wakefulness, and health, with color bars representing event types.
- **Day separators**: Each day is visually separated and labeled for quick navigation.
- **Edit instantly**: Click any row to quickly edit event details or notes.

This lets you understand your life at a glance—see exactly what stands out, hide what doesn’t, and zoom into every detail with a click.

### Managing Data
- **Export**: Click "Export" to download all your data as a JSON file
- **Import**: Click "Import" to load data from a previously saved file
- **Test Data**: Click "Test" to generate 30 days of sample events
- **Clear**: Click "Clear" to delete all events (use with caution!)

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/            # Basic UI components (buttons, forms, etc.)
│   ├── ExocortexGrid.tsx # Main time grid display
│   ├── EventDialog.tsx   # Add/edit event popup
│   └── SmileyFace.tsx   # Mood visualization
├── contexts/           # Global state management
│   └── AppContext.ts    # App-wide settings (theme, etc.)
├── hooks/             # Reusable React logic
│   ├── useLocalStorage.ts # Browser storage helper
│   ├── useTheme.ts     # Theme switching logic
│   └── useToast.ts     # Notification system
├── lib/               # Utility functions
│   ├── exocortex.ts    # Main data handling logic
│   ├── dataExport.ts   # Import/export functionality
│   └── utils.ts       # General helper functions
├── pages/             # Different pages/screens
│   ├── Index.tsx       # Main time tracking page
│   └── NotFound.tsx    # 404 error page
├── App.tsx            # Main app component with providers
├── AppRouter.tsx      # URL routing configuration
├── main.tsx           # App entry point
└── index.css          # Global styles
```

## 🔧 Available Commands

In your terminal, you can run these commands:

### Development
```bash
npm run dev          # Start development server with hot reload
```

### Building & Testing
```bash
npm run build         # Create production-ready files in 'dist/' folder
npm run test          # Run all tests and type checking
```

### What These Commands Do

- **`npm run dev`**: Starts a development server that automatically refreshes when you save changes
- **`npm run build`**: Optimizes and bundles your code for production (creates smaller, faster files)
- **`npm run test`**: Checks for errors, runs tests, and ensures code quality

## 📁 How the App Stores Data

This app stores your data **locally in your browser** using IndexedDB:

- ✅ **No server required** - Everything runs in your browser
- ✅ **Privacy** - Your data never leaves your device
- ✅ **Offline** - Works without internet connection
- ⚠️ **Browser-specific** - Data stays in the browser you're using

**Important**: If you clear your browser data, you'll lose all your tracked events. Use the Export feature to create backups!

## 🎨 Customizing the App

### Changing Colors
The colors are defined in `src/index.css` using CSS variables. Look for:
```css
:root {
  --primary: /* main color */
  --background: /* page background */
  --card: /* card background */
  /* ... more colors */
}
```

### Adding New Event Categories
Categories are created dynamically - just type any name when creating an event! The app automatically assigns colors based on the category name.

### Modifying the Time Grid
The grid configuration is in `src/components/ExocortexGrid.tsx`:
```typescript
const HOURS_IN_DAY = 24;  // Change if you want different time ranges
const HOUR_WIDTH = 60;      // Width of each hour block in pixels
```

## 🐛 Troubleshooting

### Common Issues

**"npm command not found"**
- Make sure Node.js is installed and restart your terminal

**"Port already in use"**
- Stop any other development servers, or the app will automatically use a different port

**White screen/blank page**
- Check the browser console (F12) for error messages
- Try stopping the dev server and running `npm install` again

**Changes not appearing**
- Make sure you saved your files
- Try refreshing the browser manually

### Getting Help

If you encounter issues:

1. Check the **terminal** for error messages
2. Open **browser dev tools** (F12) and check the **Console** tab
3. Look at the **Network** tab to see if files are loading correctly

## 🧪 Development Tips

### Code Style
- Use **TypeScript** for type safety
- Follow **React functional components** with hooks
- Use **Tailwind classes** for styling (avoid custom CSS when possible)
- Keep components **small and focused**

### Debugging
- Use **console.log()** to print values and track what's happening
- Use **React DevTools** browser extension to inspect component state
- Check the **Network tab** to see if data is loading correctly

### Testing Changes
1. Make a change to a file
2. Save the file (Ctrl+S or Cmd+S)
3. Browser should refresh automatically
4. If not, manually refresh the page

## 📚 Learning Resources

Since you're learning these frameworks, here are some helpful resources:

### React
- [React Official Tutorial](https://react.dev/learn)
- [React Hooks Cheatsheet](https://usehooks.com/)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Type Cheatsheet](https://www.typescriptlang.org/docs/handbook/cheatsheet.html)

### Tailwind CSS
- [Tailwind Documentation](https://tailwindcss.com/docs)
- [Tailwind Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)

### Vite
- [Vite Guide](https://vitejs.dev/guide/)

## 🤝 Contributing

This is a personal project for time tracking, but feel free to:
- Fork the repository
- Make improvements for your own use
- Share feedback and suggestions

## 📄 License

This project is open source and available under the
 (GPL V3)[https://www.gnu.org/licenses/gpl-3.0.en.html] License.


---

**Happy time tracking!** 🕐✨
