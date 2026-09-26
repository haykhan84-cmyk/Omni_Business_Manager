/**
 * Universal Auto-Incrementing Sequential Numbering Utility
 * Replaces long UUIDs, random hashes, timestamps, and complex codes with simple,
 * memorable integers starting from 1 (Next = Max Existing + 1).
 */

export function extractSequenceNumber(value: any): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  if (!value || typeof value !== 'string') {
    return 0;
  }

  // Matches pattern like "#12", "Shop #12", "Bill #3", "Invoice #5", "ORD-42", etc.
  const match = value.match(/(?:#|\b)(\d+)\b/);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Fallback: extract any digits
  const anyDigits = value.replace(/[^0-9]/g, '');
  if (anyDigits.length > 0) {
    const parsed = parseInt(anyDigits, 10);
    // If it's a huge timestamp, avoid taking the huge number
    if (parsed > 100000000) {
      return 0;
    }
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
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
  for (const item of items) {
    if (!item) continue;
    let val: any;
    if (typeof fieldOrGetter === 'function') {
      val = fieldOrGetter(item);
    } else {
      val = item[fieldOrGetter];
    }

    const num = extractSequenceNumber(val);
    if (num > maxNum) {
      maxNum = num;
    }
  }

  return maxNum > 0 ? maxNum + 1 : defaultStart;
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
