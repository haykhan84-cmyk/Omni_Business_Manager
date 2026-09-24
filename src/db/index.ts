import Dexie, { type Table } from 'dexie';
import {
  Customer,
  Order,
  Product,
  RoznamchaEntry,
  SyncQueueItem,
  GRNDocket,
  StaffMember,
  AttendanceRecord,
  Employee,
  StaffAttendance,
  SalaryAdvance,
  PayrollRecord,
  SalesRoute,
  RouteStop,
  ZeroSaleCall,
  CustomerNote,
  BankAccount,
  CompanyProfile,
} from '../types';

export class OmniSalesDB extends Dexie {
  products!: Table<Product, string>;
  customers!: Table<Customer, string>;
  orders!: Table<Order, string>;
  roznamcha!: Table<RoznamchaEntry, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  grn!: Table<GRNDocket, string>;
  staff!: Table<StaffMember, string>;
  attendance!: Table<AttendanceRecord, string>;
  employees!: Table<Employee, string>;
  staff_attendance!: Table<StaffAttendance, number>;
  salary_advances!: Table<SalaryAdvance, number>;
  payroll_records!: Table<PayrollRecord, number>;
  routes!: Table<SalesRoute, string>;
  route_stops!: Table<RouteStop, number>;
  zero_sales!: Table<ZeroSaleCall, number>;
  customer_notes!: Table<CustomerNote, number>;
  bank_accounts!: Table<BankAccount, string>;

  constructor() {
    super('OmniSalesERP_DB');
    this.version(7).stores({
      products: 'id, sku, brand, name, category',
      customers: 'id, tenant_id, shop_name, owner_name, route_id, phone, credit_limit, current_balance, status, name, shopName, route',
      customer_notes: '++id, tenant_id, customer_id, note_date, text',
      orders: 'id, orderNo, customerId, route, date, synced',
      roznamcha: 'id, entryNo, date, type, category, customerId, synced',
      syncQueue: 'id, type, timestamp',
      grn: 'id, grnNo, poNo, vendorName, status, date',
      staff: 'id, empCode, name, routeAssigned, status',
      attendance: 'id, staffId, empCode, date, status',
      employees: 'id, tenant_id, name, role, assigned_route, status',
      staff_attendance: '++id, tenant_id, employee_id, date, status, allowance',
      salary_advances: '++id, tenant_id, employee_id, date, amount, is_settled',
      payroll_records: '++id, tenant_id, month, year, employee_id, net_salary, status',
      routes: 'id, tenant_id, route_code, route_name, assigned_booker_id, status',
      route_stops: '++id, tenant_id, route_id, customer_id, stop_sequence',
      zero_sales: '++id, tenant_id, route_id, customer_id, date, reason',
      bank_accounts: 'id, bankName, accountNumber, iban, raastId, isPrimary',
    });
  }
}

export const db = new OmniSalesDB();

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'PrimeLink Distribution & Logistics',
  tradingName: 'PrimeLink Enterprises',
  proprietor: 'Haji Noor Mohammad',
  phone: '0300-9821450',
  email: 'accounts@primelink.com.pk',
  address: 'Main Bypass & Gate 1 Wholesale Market',
  city: 'Mingora, Swat',
  ntn: '7291048-2',
  strn: '327787612345',
  drugLicenseNo: 'DL-SWAT-2024-9812',
  tagline: 'Authorized FMCG & Pharma Distributors',
};

export const INITIAL_BANK_ACCOUNT: BankAccount = {
  id: 'bank-al-habib-01',
  bankName: 'Bank AL Habib',
  accountTitle: 'PrimeLink Enterprises',
  accountNumber: '1023-0981-002341-01',
  iban: 'PK52BAHL1023098100234101',
  branchName: 'Mingora City Branch, Swat',
  raastId: '03009821450',
  openingBalance: 0,
  currentBalance: 0,
  isPrimary: true,
};

// 100% Clean Slate: All initial lists are empty arrays
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_ROZNAMCHA: RoznamchaEntry[] = [];
export const INITIAL_OPENING_CASH = 0; // Rs. 0 base opening cash
export const INITIAL_GRN: GRNDocket[] = [];
export const INITIAL_STAFF: StaffMember[] = [];
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const INITIAL_EMPLOYEES: Employee[] = [];
export const INITIAL_SALARY_ADVANCES: SalaryAdvance[] = [];
export const INITIAL_ROUTES: SalesRoute[] = [];
export const INITIAL_ROUTE_STOPS: RouteStop[] = [];
export const INITIAL_ZERO_SALES: ZeroSaleCall[] = [];

/**
 * Optional sample FMCG product catalog for testing when explicitly requested
 */
export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod-dld-504',
    sku: 'SKU-DLD-504',
    name: 'Dalda Premium Cooking Oil 5L Tin',
    brand: 'Dalda Foods',
    category: 'Cooking Oil & Ghee',
    packSize: 4,
    tradePrice: 11400,
    retailPrice: 3050,
    cartonStock: 50,
    piecesStock: 0,
    minStockAlert: 10,
    barcode: '8964000105210',
    taxSchedule: '3rd Sch (MRP)',
  },
  {
    id: 'prod-tpl-901',
    sku: 'SKU-TPL-901',
    name: 'Tapal Danedar Tea Family Pack 900g',
    brand: 'Tapal Tea Ltd',
    category: 'Tea & Confectionery',
    packSize: 24,
    tradePrice: 29040,
    retailPrice: 1280,
    cartonStock: 40,
    piecesStock: 0,
    minStockAlert: 10,
    barcode: '8964001238910',
    taxSchedule: '18% GST (FBR)',
  },
];

export const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: 'cust-demo-01',
    name: 'Muhammad Tariq',
    shopName: 'Madina Cash & Carry Superstore',
    route: 'Main Bazaar Route',
    phone: '0300-1234567',
    address: 'Main Bazaar Chowk',
    creditLimit: 500000,
    currentBalance: 0,
    status: 'active',
    atlStatus: 'filer',
  },
];

/**
 * seedDatabaseIfEmpty: In a clean slate, will not inject mock data
 */
export async function seedDatabaseIfEmpty() {
  // Empty clean slate - no automatic dummy data injection
}

/**
 * Clear all tables in Dexie IndexedDB to return to a 100% clean slate
 */
export async function clearAllDatabaseData(): Promise<void> {
  await Promise.all([
    db.products.clear(),
    db.customers.clear(),
    db.customer_notes.clear(),
    db.orders.clear(),
    db.roznamcha.clear(),
    db.syncQueue.clear(),
    db.grn.clear(),
    db.staff.clear(),
    db.attendance.clear(),
    db.employees.clear(),
    db.staff_attendance.clear(),
    db.salary_advances.clear(),
    db.payroll_records.clear(),
    db.routes.clear(),
    db.route_stops.clear(),
    db.zero_sales.clear(),
    db.bank_accounts.clear(),
  ]);
  localStorage.removeItem('omnisales_opening_cash');
  localStorage.setItem('omnisales_clean_slate_v2', 'true');
}

/**
 * Load optional sample FMCG products and retailers on explicit user demand
 */
export async function loadSampleTestingData(): Promise<void> {
  await db.products.bulkAdd(SAMPLE_PRODUCTS);
  await db.customers.bulkAdd(SAMPLE_CUSTOMERS);
}
