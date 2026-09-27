/**
 * Universal Auto-Incrementing Sequential Numbering Utility
 * Replaces long UUIDs, random hashes, timestamps, and complex codes with simple,
 * memorable integers starting from 1 (Next = Max Existing + 1).
 */

/**
 * Extracts a clean integer sequence number (< 1,000,000) from a string or number.
 * Automatically ignores 13-digit and 10-digit timestamps (e.g., 1790488864327).
 * For composite IDs like "cust-1790488864327-10-wriq", safely extracts the "10".
 */
export function extractSequenceNumber(value: any): number {
  if (typeof value === 'number') {
    if (isNaN(value) || value <= 0) return 0;
    // Discard timestamps (greater than or equal to 10 million)
    if (value >= 1000000) return 0;
    return Math.floor(value);
  }
  if (!value || typeof value !== 'string') {
    return 0;
  }

  const str = value.trim();
  if (!str) return 0;

  // 1. Check explicit prefix pattern like "Shop #12", "Bill #3", "#45", "ORD-42", "Stop #1"
  const prefixMatch = str.match(/(?:Shop|Invoice|Bill|SKU|Route|Summary|GRN|PO|Gate\s*Pass|Batch|Employee|Stop)?\s*#\s*(\d+)/i);
  if (prefixMatch && prefixMatch[1]) {
    const parsed = parseInt(prefixMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 1000000) {
      return parsed;
    }
  }

  // 2. Tokenize by non-alphanumeric separators (hyphens, underscores, slashes, spaces)
  // Example: "cust-1790488864327-10-wriq" => ["cust", "1790488864327", "10", "wriq"]
  const parts = str.split(/[^0-9a-zA-Z]+/);
  const numericParts: number[] = [];

  for (const part of parts) {
    if (!part || !/^\d+$/.test(part)) continue;
    const num = parseInt(part, 10);
    // Ignore timestamps (>= 1,000,000 or length >= 8) and zero
    if (!isNaN(num) && num > 0 && num < 1000000 && part.length < 8) {
      numericParts.push(num);
    }
  }

  // If we found any valid integer sequence numbers, return the first one
  if (numericParts.length > 0) {
    return numericParts[0];
  }

  return 0;
}

/**
 * Extracts or assigns a clean sequential shop number (1, 2, 3...) for a customer.
 * - Prioritizes explicit `c.shopNumber` or `c.shop_number` if valid.
 * - Extracts clean embedded sequence (e.g. "10" from "cust-1790488864327-10-wriq").
 * - Falls back to `fallbackIndex + 1` (or 1) if no sequence is buried in the ID.
 */
export function extractShopSequence(customerOrId: any, fallbackIndex?: number): number {
  if (!customerOrId) {
    return typeof fallbackIndex === 'number' && fallbackIndex >= 0 ? fallbackIndex + 1 : 1;
  }

  // If customer object was passed
  if (typeof customerOrId === 'object') {
    const rawShopNum = customerOrId.shopNumber ?? customerOrId.shop_number;
    if (typeof rawShopNum === 'number' && rawShopNum > 0 && rawShopNum < 1000000) {
      return Math.floor(rawShopNum);
    }
    if (typeof rawShopNum === 'string') {
      const parsed = extractSequenceNumber(rawShopNum);
      if (parsed > 0 && parsed < 1000000) return parsed;
    }

    // Try extracting clean sequence from ID or Code
    const fromId = extractSequenceNumber(customerOrId.id || customerOrId.code || customerOrId.shop_id);
    if (fromId > 0 && fromId < 1000000) {
      return fromId;
    }

    // Fall back to index if provided
    if (typeof fallbackIndex === 'number' && fallbackIndex >= 0) {
      return fallbackIndex + 1;
    }
    return 1;
  }

  // If primitive ID string or number was passed
  const extracted = extractSequenceNumber(customerOrId);
  if (extracted > 0 && extracted < 1000000) {
    return extracted;
  }

  if (typeof fallbackIndex === 'number' && fallbackIndex >= 0) {
    return fallbackIndex + 1;
  }

  return 1;
}

/**
 * Calculates the next sequential shop number (e.g. Shop #454 after Shop #453)
 */
export function getNextShopSequenceNumber(
  customers: any[],
  defaultStart: number = 1
): number {
  if (!Array.isArray(customers) || customers.length === 0) {
    return defaultStart;
  }

  let maxNum = 0;
  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    if (!c) continue;
    const num = extractShopSequence(c, i);
    if (num > 0 && num < 1000000 && num > maxNum) {
      maxNum = num;
    }
  }

  return maxNum > 0 ? maxNum + 1 : customers.length + 1;
}

export function getNextSequenceNumber(
  items: any[],
  fieldOrGetter: string | ((item: any) => any),
  defaultStart: number = 1
): number {
  if (!Array.isArray(items) || items.length === 0) {
    return defaultStart;
  }

  let maxNum = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    let val: any;
    if (typeof fieldOrGetter === 'function') {
      val = fieldOrGetter(item);
    } else {
      val = item[fieldOrGetter];
    }

    let num = extractSequenceNumber(val);
    if (num <= 0 || num >= 1000000) {
      // If evaluating customer items with fallback index
      if (item && typeof item === 'object') {
        num = extractShopSequence(item, i);
      }
    }

    if (num > 0 && num < 1000000 && num > maxNum) {
      maxNum = num;
    }
  }

  return maxNum > 0 ? maxNum + 1 : (items.length > 0 ? items.length + 1 : defaultStart);
}

export function formatShopId(num: number): string {
  return `Shop #${num}`;
}

export function formatInvoiceId(num: number): string {
  return `Invoice #${num}`;
}

export function formatBillId(num: number): string {
  return `Bill #${num}`;
}

export function formatSkuId(num: number): string {
  return `SKU #${num}`;
}

export function formatRouteId(num: number): string {
  return `Route #${num}`;
}

export function formatSummaryId(num: number): string {
  return `Summary #${num}`;
}

export function formatGrnId(num: number): string {
  return `GRN #${num}`;
}

export function formatPoId(num: number): string {
  return `PO #${num}`;
}

export function formatGatePassId(num: number): string {
  return `Gate Pass #${num}`;
}

export function formatBatchId(num: number): string {
  return `Batch #${num}`;
}

export function formatEmployeeId(num: number): string {
  return `Employee #${num}`;
}
