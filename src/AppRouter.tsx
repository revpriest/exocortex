/**
 * AppRouter.tsx - Application Router Configuration
 *
 * This file defines all URL routes for the application.
 * It uses React Router to handle client-side navigation (no page reloads).
 *
 * When users visit different URLs, React Router shows different components
 * without reloading the entire page.
 */

import { BrowserRouter, Route, Routes } from "react-router-dom";

// Import custom components
import { ScrollToTop } from "./components/ScrollToTop";

// Import page components
import Index from "./pages/Index";
import About from "./pages/About";
import Stats from "./pages/Stats";
import Summary from "./pages/Summary";
import Search from "./pages/Search";
import Conf from "./pages/Conf";
import NotFound from "./pages/NotFound";
import Cats from "./pages/Cats";

/**
 * AppRouter Component
 *
 * This is the main routing component that sets up URL handling:
 *
 * - BrowserRouter: Enables client-side routing with history API
 * - ScrollToTop: Custom component that scrolls to top when route changes
 * - Routes: Container for all route definitions
 * - Route: Individual URL pattern and component mapping
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      {/*
        ScrollToTop component ensures that when users navigate to a new page,
        they start at the top of the page instead of staying at their current scroll position.
        This provides better user experience.
      */}
      <ScrollToTop />

      {/*
        Routes component contains all our URL route definitions.
        React Router will match the current URL against these routes in order
        and render the matching component.
      */}
      <Routes>
        {/*
          Index route: Matches the root URL ("/")
          This shows the main time tracking interface
        */}
        <Route path="/" element={<Index />} />

        {/*
          About route: Matches the "/about" URL
          Shows information about the app and how to use it
        */}
        <Route path="/about" element={<About />} />

        {/*
          Stats route: Matches the "/stats" URL
          Shows information about your database 
        */}
        <Route path="/stats" element={<Stats />} />

        {/*
          Cats route: Matches the "/cats" URL
          Category time trends
        */}
        <Route path="/cats" element={<Cats />} />

        {/*
          Summary route: Matches the "/summary" URL
          Shows summray of recent events
        */}
        <Route path="/summary" element={<Summary />} />

        {/*
          Search route: Matches the "/search" URL
          Allows searching events by notes or category
        */}
        <Route path="/search" element={<Search />} />

        {/*
          Conf route: Matches the "/conf" URL
          Configuration and help
        */}
        <Route path="/conf" element={<Conf />} />

        {/*
          IMPORTANT: Add all custom routes ABOVE this catch-all route.
          The "*" route matches any URL that doesn't match the routes above.
        */}

        {/*
          404 Not Found route: Matches any unrecognized URL
          Shows a friendly "page not found" message instead of blank screen.
        */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
