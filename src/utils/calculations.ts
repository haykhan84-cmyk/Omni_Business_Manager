import { OrderItem } from '../types';

/**
 * Calculates item totals strictly adhering to FMCG ERP rules:
 * Total Units = (Cartons * PackSize) + Pieces
 * Unit Price = Price / PackSize
 * Line Total = (Cartons * Price) + (Pieces * Unit Price)
 * Net Total = Line Total - Discount
 */
export function calculateOrderItem(
  cartons: number,
  pieces: number,
  packSize: number,
  price: number,
  discountPercent: number = 0
): {
  totalUnits: number;
  unitPrice: number;
  grossTotal: number;
  discountAmount: number;
  netTotal: number;
} {
  const safeCartons = Math.max(0, cartons || 0);
  const safePieces = Math.max(0, pieces || 0);
  const safePackSize = Math.max(1, packSize || 1);
  const safePrice = Math.max(0, price || 0);
  const safeDiscountPct = Math.max(0, Math.min(100, discountPercent || 0));

  const totalUnits = safeCartons * safePackSize + safePieces;
  const unitPrice = safePrice / safePackSize;
  const grossTotal = safeCartons * safePrice + safePieces * unitPrice;
  const discountAmount = (grossTotal * safeDiscountPct) / 100;
  const netTotal = grossTotal - discountAmount;

  return {
    totalUnits,
    unitPrice: Math.round(unitPrice * 100) / 100,
    grossTotal: Math.round(grossTotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    netTotal: Math.round(netTotal * 100) / 100,
  };
}

/**
 * Format amount cleanly without bulky "Rs." prefix (e.g. 2,736)
 */
export function formatAmount(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Math.round(val).toLocaleString('en-PK');
}

/**
 * Format unit rate cleanly without bulky "Rs." prefix, with clean decimals if fractional
 */
export function formatRate(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Number.isInteger(val)
    ? val.toLocaleString('en-PK')
    : val.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Format currency cleanly without bulky "Rs." prefix (e.g. 1,450,200)
 */
export function formatPKR(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Math.round(val).toLocaleString('en-PK');
}

/**
 * Format date into human readable string
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Universal safe label extractor for table columns, chips, dropdowns, and route options.
 * Safely guards against undefined objects and gracefully falls back across label/name/title.
 */
export function safeLabel(item: any): string {
  if (!item) return '';
  return item.label || item.name || item.title || '';
}
