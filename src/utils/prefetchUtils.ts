/**
 * Route prefetching utilities.
 * Preloads route components before the user navigates to them,
 * making page transitions feel instant.
 */

// Lazy-import factory map — matches App.tsx lazy() declarations
const routeImports: Record<string, () => Promise<any>> = {
  home: () => import("../components/Home/Home"),
  login: () => import("../components/Login/Login"),
  otp: () => import("../components/OTP/OTP"),
  product: () => import("../components/Product/Product"),
  projectDetails: () => import("../components/Product/ProjectDetails"),
  places: () => import("../components/Places/Places"),
  locationProjects: () => import("../components/Places/LocationProjects"),
};

// Track which routes have been prefetched to avoid duplicate fetches
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's component bundle.
 * Call this on hover, focus, or when a link becomes visible.
 */
export function prefetchRoute(routeName: string): void {
  if (prefetchedRoutes.has(routeName)) return;

  const importFn = routeImports[routeName];
  if (!importFn) return;

  prefetchedRoutes.add(routeName);
  
  // Use requestIdleCallback if available, otherwise execute immediately
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      importFn().catch(() => {
        // Remove from set so it can be retried
        prefetchedRoutes.delete(routeName);
      });
    });
  } else {
    importFn().catch(() => {
      prefetchedRoutes.delete(routeName);
    });
  }
}

/**
 * Prefetch multiple routes at once.
 * Useful for prefetching the most likely next routes.
 */
export function prefetchRoutes(routeNames: string[]): void {
  routeNames.forEach(name => prefetchRoute(name));
}

/**
 * Get props to attach to a link element for hover-based prefetching.
 * Usage: <Link to="/places" {...prefetchOnHover('places')}>
 */
export function prefetchOnHover(routeName: string): {
  onMouseEnter: () => void;
  onFocus: () => void;
} {
  return {
    onMouseEnter: () => prefetchRoute(routeName),
    onFocus: () => prefetchRoute(routeName),
  };
}

/**
 * Prefetch critical routes after the initial page load.
 * Call this once from App.tsx after the app mounts.
 */
export function prefetchCriticalRoutes(): void {
  // Wait for the initial page to fully load first
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      // Prefetch the most common routes users will navigate to
      prefetchRoutes(['home', 'places', 'product']);
    }, { timeout: 3000 });
  } else {
    setTimeout(() => {
      prefetchRoutes(['home', 'places', 'product']);
    }, 2000);
  }
}
