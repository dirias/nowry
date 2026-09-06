/**
 * The plan limits the library reads (docs/prd-books-library.md FR-005). Mirrors
 * `Nowry-API/app/config/subscription_plans.py` (`limits.books`: 3 · 15 · -1);
 * the server enforces, this only draws the readout when the limit is reached.
 */
export const BOOK_LIMITS = { free: 3, plus: 15, pro: Infinity }

export const NEXT_PLAN = { free: 'plus', plus: 'pro' }

export const bookLimitFor = (tier) => BOOK_LIMITS[tier] ?? Infinity
