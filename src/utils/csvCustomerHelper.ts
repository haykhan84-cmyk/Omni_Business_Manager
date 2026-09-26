import { Customer, ChannelType } from '../types';
import { extractSequenceNumber } from './sequenceNumbering';

export interface ParsedCustomerRow {
  rowNumber: number;
  shop_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  route: string;
  credit_limit: number;
  opening_balance: number;
  channel_type: ChannelType;
  errors: string[];
  isValid: boolean;
}

/**
 * Standard CSV Parser handling quotes, commas within quotes, CRLF/LF line endings.
 */
export function parseCsvRows(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Normalizes input string to supported ChannelType
 */
export function normalizeChannelType(input?: string): ChannelType {
  if (!input) return 'General / Karyana Store';
  const lower = input.toLowerCase().trim();
  if (lower.includes('pharm') || lower.includes('med') || lower.includes('chem')) {
    return 'Pharmacy / Medical Store';
  }
  if (lower.includes('super') || lower.includes('cash') || lower.includes('mart') || lower.includes('carry')) {
    return 'Supermarket / Cash & Carry';
  }
  if (lower.includes('distrib')) {
    return 'Key Distributor';
  }
  if (lower.includes('whole') || lower.includes('trader')) {
    return 'Wholesaler';
  }
  if (lower.includes('export') || lower.includes('cross')) {
    return 'Export / Cross-Border';
  }
  return 'General / Karyana Store';
}

/**
 * Parses customer CSV file contents, validating required fields (shop_name, route)
 */
export function parseCustomerCsv(csvContent: string): {
  rows: ParsedCustomerRow[];
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
} {
  const rawRows = parseCsvRows(csvContent);
  if (rawRows.length === 0) {
    return { rows: [], totalRows: 0, validRowsCount: 0, errorRowsCount: 0 };
  }

  const headerRow = rawRows[0].map((h) =>
    h.toLowerCase().trim().replace(/[\s_-]+/g, '')
  );

  // Map column indices
  const getColIdx = (aliases: string[]) => {
    return headerRow.findIndex((col) =>
      aliases.some((alias) => col === alias || col.includes(alias))
    );
  };

  const shopNameIdx = getColIdx(['shopname', 'shop', 'outlet', 'retailer', 'store']);
  const ownerNameIdx = getColIdx(['ownername', 'owner', 'proprietor', 'contactname', 'name']);
  const phoneIdx = getColIdx(['phone', 'mobile', 'contact', 'cell', 'tel']);
  const whatsappIdx = getColIdx(['whatsapp', 'whatsappnumber', 'wa']);
  const routeIdx = getColIdx(['route', 'beat', 'territory', 'marketroute']);
  const creditLimitIdx = getColIdx(['creditlimit', 'limit', 'credit']);
  const balanceIdx = getColIdx(['openingbalance', 'balance', 'outstanding', 'debt', 'currentbalance']);
  const channelTypeIdx = getColIdx(['channeltype', 'channel', 'type', 'category']);

  const parsedRows: ParsedCustomerRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const raw = rawRows[i];
    // Skip empty lines
    if (raw.every((field) => !field.trim())) continue;

    const shopName = shopNameIdx >= 0 ? (raw[shopNameIdx] || '').trim() : '';
    const ownerName = ownerNameIdx >= 0 ? (raw[ownerNameIdx] || '').trim() : '';
    const phone = phoneIdx >= 0 ? (raw[phoneIdx] || '').trim() : '';
    const whatsapp = whatsappIdx >= 0 ? (raw[whatsappIdx] || '').trim() : phone;
    const route = routeIdx >= 0 ? (raw[routeIdx] || '').trim() : '';
    
    // Parse numeric fields cleanly without any currency symbols
    const cleanNumber = (val?: string): number => {
      if (!val) return 0;
      const stripped = val.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(stripped);
      return isNaN(parsed) ? 0 : parsed;
    };

    const creditLimit = creditLimitIdx >= 0 ? cleanNumber(raw[creditLimitIdx]) || 150000 : 150000;
    const openingBalance = balanceIdx >= 0 ? cleanNumber(raw[balanceIdx]) : 0;
    const rawChannel = channelTypeIdx >= 0 ? raw[channelTypeIdx] : '';
    const channelType = normalizeChannelType(rawChannel);

    const errors: string[] = [];
    if (!shopName) {
      errors.push('Missing Shop Name');
    }
    if (!route) {
      errors.push('Missing Route');
    }

    parsedRows.push({
      rowNumber: i,
      shop_name: shopName,
      owner_name: ownerName || shopName,
      phone,
      whatsapp: whatsapp || phone,
      route,
      credit_limit: creditLimit,
      opening_balance: openingBalance,
      channel_type: channelType,
      errors,
      isValid: errors.length === 0,
    });
  }

  const validRowsCount = parsedRows.filter((r) => r.isValid).length;
  const errorRowsCount = parsedRows.length - validRowsCount;

  return {
    rows: parsedRows,
    totalRows: parsedRows.length,
    validRowsCount,
    errorRowsCount,
  };
}

/**
 * Returns formatted CSV template string for Customer Master bulk onboarding.
 */
export function generateSampleCustomerCsvTemplate(): string {
  const headers = [
    'shop_name',
    'owner_name',
    'phone',
    'whatsapp',
    'route',
    'credit_limit',
    'opening_balance',
    'channel_type',
  ];

  const sampleRows = [
    [
      'Madina Karyana Store',
      'Haji Abdul Qayyum',
      '03001234567',
      '03001234567',
      'Main Bazar',
      '150000',
      '0',
      'General / Karyana Store',
    ],
    [
      'Zam Zam Superstore',
      'Mohammad Tariq',
      '03129876543',
      '03129876543',
      'Mingora Central',
      '300000',
      '25000',
      'Supermarket / Cash & Carry',
    ],
    [
      'Al-Rehman Pharmacy',
      'Dr. Sohail Ahmad',
      '03335551234',
      '03335551234',
      'Saidu Road',
      '500000',
      '0',
      'Pharmacy / Chemist',
    ],
    [
      'Khan Wholesale Traders',
      'Imran Khan',
      '03458889900',
      '03458889900',
      'Bypass Road',
      '1000000',
      '120000',
      'Wholesaler',
    ],
    [
      'Insaf General Store',
      'Bilal Jan',
      '03017772233',
      '03017772233',
      'Matta Bazar',
      '200000',
      '0',
      'General / Karyana Store',
    ],
  ];

  const csvLines = [
    headers.join(','),
    ...sampleRows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
    ),
  ];

  return csvLines.join('\n');
}

/**
 * Exports customers to a structured CSV matching the operational standard:
 * Shop #, Shop Name, Owner Name, Phone, WhatsApp, Route, Channel Type, Credit Limit, Current Outstanding Balance (Debt), Account Status
 */
export function exportCustomersToCsv(
  customers: Customer[],
  routeFilter?: string
): { csvString: string; filename: string; rowCount: number } {
  const filtered =
    !routeFilter || routeFilter === 'All'
      ? customers
      : customers.filter((c) => c.route === routeFilter);

  const headers = [
    'Shop #',
    'Shop Name',
    'Owner Name',
    'Phone',
    'WhatsApp',
    'Route',
    'Channel Type',
    'Credit Limit',
    'Current Outstanding Balance (Debt)',
    'Account Status',
  ];

  const rows = filtered.map((c, idx) => {
    const shopNum = c.shopNumber || extractSequenceNumber(c.id) || idx + 1;
    const shopFormatted = `Shop #${shopNum}`;
    const shopName = c.shopName || c.shop_name || 'Retail Store';
    const ownerName = c.name || c.owner_name || '';
    const phone = c.phone || '';
    const whatsapp = c.whatsapp_number || c.phone || '';
    const route = c.route || '';
    const channel = c.channel_type || 'General / Karyana Store';
    const creditLimit = Math.round(c.creditLimit ?? c.credit_limit ?? 0);
    const balance = Math.round(c.currentBalance ?? c.current_balance ?? 0);
    const status = c.status || 'Active';

    return [
      `"${shopFormatted}"`,
      `"${shopName.replace(/"/g, '""')}"`,
      `"${ownerName.replace(/"/g, '""')}"`,
      `"${phone}"`,
      `"${whatsapp}"`,
      `"${route.replace(/"/g, '""')}"`,
      `"${channel}"`,
      creditLimit,
      balance,
      `"${status}"`,
    ];
  });

  const csvString = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  const todayStr = new Date().toISOString().slice(0, 10);
  const filename = `primelink_customers_${todayStr}.csv`;

  return {
    csvString,
    filename,
    rowCount: filtered.length,
  };
}

/**
 * Triggers a client-side file download for CSV content.
 */
export function triggerCsvDownload(csvString: string, filename: string): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
