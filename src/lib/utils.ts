// ============================================
// Utility Functions
// ============================================

/**
 * Simulates API delay for mock services
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Combines class names conditionally
 */
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Formats currency value
 */
export function formatCurrency(value: number, currency: string = '₹'): string {
  return `${currency}${value.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Truncates text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}
