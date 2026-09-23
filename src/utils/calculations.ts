import { OrderItem } from '../types';

/**
 * Calculates item totals strictly adhering to FMCG ERP rules:
 * Total Units = (Cartons * PackSize) + Pieces
 * Unit Price = Trade Price / PackSize
 * Gross Total = Total Units * (Trade Price / PackSize)
 * Net Total = Gross Total - Discount
 */
export function calculateOrderItem(
  cartons: number,
  pieces: number,
  packSize: number,
  tradePrice: number,
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
  const safeTradePrice = Math.max(0, tradePrice || 0);
  const safeDiscountPct = Math.max(0, Math.min(100, discountPercent || 0));

  const totalUnits = safeCartons * safePackSize + safePieces;
  const unitPrice = safeTradePrice / safePackSize;
  const grossTotal = totalUnits * unitPrice;
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
 * Format currency into readable PKR format (e.g. Rs. 1,450,200)
 */
export function formatPKR(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'Rs. 0';
  return 'Rs. ' + Math.round(val).toLocaleString('en-PK');
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
