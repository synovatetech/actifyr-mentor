// Centralized plan-based route and navigation access control.
// To gate a new feature behind a plan, add an entry here — no other files need touching.

export type PlanType = 'trial' | 'retail' | 'corporate' | 'custom';

/**
 * Routes that require the user to be on one of the listed plan types.
 * Prefix-matched: '/users' also covers '/users/123', etc.
 *
 * Add new entries here to gate future routes:
 *   '/advanced-analytics': ['corporate', 'custom'],
 */
export const ROUTE_ACCESS: Record<string, PlanType[]> = {};

/**
 * Sidebar nav item IDs that require the user to be on one of the listed plan types.
 * Must match the `id` field in Sidebar's navItems array.
 */
export const NAV_ACCESS: Record<string, PlanType[]> = {};

/** Where to redirect when a user tries to access a route they're not allowed. */
export const ACCESS_DENIED_REDIRECT = '/programs';

/**
 * Returns true if the given plan type may access the pathname.
 * Routes not listed in ROUTE_ACCESS are unrestricted.
 */
export function canAccessRoute(planType: string, pathname: string): boolean {
  for (const [route, allowedPlans] of Object.entries(ROUTE_ACCESS)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return (allowedPlans as string[]).includes(planType);
    }
  }
  return true;
}

/**
 * Returns the subset of nav items the given plan type is allowed to see.
 * Items not listed in NAV_ACCESS are visible to everyone.
 */
export function filterNavItems<T extends { id: string }>(
  planType: string,
  items: T[],
): T[] {
  return items.filter((item) => {
    const required = NAV_ACCESS[item.id];
    if (!required) return true;
    return (required as string[]).includes(planType);
  });
}
