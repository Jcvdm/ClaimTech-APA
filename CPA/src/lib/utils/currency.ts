/**
 * Utility functions for currency formatting and manipulation
 */

/**
 * Format a number as plain decimal (no currency symbols)
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = 'USD',
  locale = 'en-US'
): string {
  if (amount == null) return '0.00';
  
  // Return plain number with 2 decimal places, no currency symbols
  return amount.toFixed(2);
}

/**
 * Parse a number string back to a number
 */
export function parseCurrency(numberString: string): number | null {
  if (!numberString || typeof numberString !== 'string') {
    return null;
  }
  
  // Remove spaces and commas, but allow decimal points and negative signs
  const cleaned = numberString.replace(/[,\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format a number as currency without symbol (for editing)
 */
export function formatCurrencyForEdit(amount: number | null | undefined): string {
  if (amount == null) return '';
  return amount.toFixed(2);
}

/**
 * Validate if a string represents a valid currency amount
 */
export function isValidCurrency(value: string): boolean {
  const parsed = parseCurrency(value);
  return parsed !== null && parsed >= 0;
}

/**
 * Add two currency amounts safely
 */
export function addCurrency(a: number | null, b: number | null): number {
  return (a || 0) + (b || 0);
}

/**
 * Multiply currency by quantity safely
 */
export function multiplyCurrency(amount: number | null, quantity: number | null): number {
  return (amount || 0) * (quantity || 0);
}