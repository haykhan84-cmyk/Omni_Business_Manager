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
  RouteDeliverySummary,
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
  route_summaries!: Table<RouteDeliverySummary, string>;

  constructor() {
    super('OmniSalesERP_DB');
    this.version(9).stores({
      products: 'id, sku, brand, name, category',
      customers: 'id, tenant_id, shop_name, owner_name, route_id, phone, credit_limit, current_balance, status, name, shopName, route',
      customer_notes: '++id, tenant_id, customer_id, note_date, text',
      orders: 'id, orderNo, customerId, route, date, synced',
      roznamcha: 'id, entryNo, date, type, category, customerId, synced',
      syncQueue: 'id, type, timestamp',
      grn: 'id, grnNo, poNo, vendorName, status, date',
      staff: 'id, empCode, name, routeAssigned, status',
      attendance: 'id, staffId, empCode, date, status',
      employees: 'id, tenant_id, name, phone, role, assigned_route, status',
      staff_attendance: '++id, tenant_id, employee_id, date, status, allowance',
      salary_advances: '++id, tenant_id, employee_id, date, amount, is_settled',
      payroll_records: '++id, tenant_id, month, year, employee_id, net_salary, status',
      routes: 'id, tenant_id, route_code, route_name, assigned_booker_id, status',
      route_stops: '++id, tenant_id, route_id, customer_id, stop_sequence',
      zero_sales: '++id, tenant_id, route_id, customer_id, date, reason',
      bank_accounts: 'id, bankName, accountNumber, iban, raastId, isPrimary',
      route_summaries: 'id, summaryNumber, summaryCode, routeId, routeName, dispatchDate, status',
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
export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-001',
    tenant_id: 'tenant_pk_swat_1042',
    employeeNumber: 1,
    name: 'Haji Noor Mohammad (Managing Director)',
    phone: '0300-9821450',
    cnic: '15602-1234567-1',
    role: 'Office Manager',
    assigned_route: 'Internal Depot / Office',
    base_salary: 100000,
    daily_allowance_rate: 500,
    ta_da_rate: 500,
    commission_rate: 0,
    status: 'Active',
    pin: '1234',
  },
  {
    id: 'EMP-101',
    tenant_id: 'tenant_pk_swat_1042',
    employeeNumber: 2,
    name: 'Bilal Swati (Order Booker)',
    phone: '0300-1122334',
    cnic: '15602-2345678-2',
    role: 'Order Booker / Field Salesman',
    assigned_route: 'Mingora',
    base_salary: 45000,
    daily_allowance_rate: 300,
    ta_da_rate: 300,
    commission_rate: 1.5,
    status: 'Active',
    pin: '1122',
  },
  {
    id: 'EMP-201',
    tenant_id: 'tenant_pk_swat_1042',
    employeeNumber: 3,
    name: 'Tariq Driver (Dispatch Van 04)',
    phone: '0300-5566778',
    cnic: '15602-3456789-3',
    role: 'Delivery Van Driver',
    assigned_route: 'Mingora',
    van_assigned: 'Suzuki Bolan (SWT-8821)',
    base_salary: 38000,
    daily_allowance_rate: 250,
    ta_da_rate: 250,
    commission_rate: 0,
    status: 'Active',
    pin: '3344',
  },
  {
    id: 'EMP-301',
    tenant_id: 'tenant_pk_swat_1042',
    employeeNumber: 4,
    name: 'Rashid Jan (Depot Supervisor)',
    phone: '0300-7788990',
    cnic: '15602-4567890-4',
    role: 'Warehouse Supervisor',
    assigned_route: 'Internal Depot / Office',
    base_salary: 42000,
    daily_allowance_rate: 200,
    ta_da_rate: 200,
    commission_rate: 0,
    status: 'Active',
    pin: '5566',
  },
  {
    id: 'EMP-401',
    tenant_id: 'tenant_pk_swat_1042',
    employeeNumber: 5,
    name: 'Kamran Cashier (Head Cashier)',
    phone: '0300-3344556',
    cnic: '15602-5678901-5',
    role: 'Cashier',
    assigned_route: 'Internal Depot / Office',
    base_salary: 50000,
    daily_allowance_rate: 200,
    ta_da_rate: 200,
    commission_rate: 0,
    status: 'Active',
    pin: '7788',
  },
  {
    id: 'EMP-501',
    tenant_id: 'tenant_pk_swat_1042',
    employeeNumber: 6,
    name: 'Ihsan Ullah (Depot Assistant)',
    phone: '0300-6677889',
    cnic: '15602-6789012-6',
    role: 'Office Boy',
    assigned_route: 'Internal Depot / Office',
    base_salary: 28000,
    daily_allowance_rate: 150,
    ta_da_rate: 150,
    commission_rate: 0,
    status: 'Active',
    pin: '9900',
  },
];
export const INITIAL_SALARY_ADVANCES: SalaryAdvance[] = [];
export const INITIAL_ROUTES: SalesRoute[] = [];
export const INITIAL_ROUTE_STOPS: RouteStop[] = [];
export const INITIAL_ZERO_SALES: ZeroSaleCall[] = [];

/**
 * 100% Clean Catalog: Demo items permanently removed.
 * User catalog is fully preserved and protected from auto-seeding.
 */
export const SAMPLE_PRODUCTS: Product[] = [];
export const SAMPLE_CUSTOMERS: Customer[] = [];

/**
 * seedInitialEmployeesIfEmpty: Seeds default staff into db.employees if table is empty
 */
export async function seedInitialEmployeesIfEmpty(): Promise<void> {
  try {
    const count = await db.employees.count();
    if (count === 0) {
      await db.employees.bulkPut(INITIAL_EMPLOYEES);
    }
  } catch (err) {
    console.warn('Failed to seed initial employees in Dexie:', err);
  }
}

/**
 * seedDatabaseIfEmpty: Seeds base staff credentials if none exist
 */
export async function seedDatabaseIfEmpty() {
  await seedInitialEmployeesIfEmpty();
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
    db.route_summaries.clear(),
  ]);
  localStorage.removeItem('omnisales_opening_cash');
  localStorage.setItem('omnisales_clean_slate_v2', 'true');
}

/**
 * loadSampleTestingData: Kept safe and empty so demo items never repopulate
 */
export async function loadSampleTestingData(): Promise<void> {
  // Demo items permanently removed to protect user catalog
}
