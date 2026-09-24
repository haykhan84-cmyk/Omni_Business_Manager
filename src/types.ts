export interface BankAccount {
  id: string;
  bankName: string; // e.g. "Bank AL Habib", "Meezan Bank", "Faysal Bank", "Habib Bank Ltd"
  accountTitle: string; // e.g. "PrimeLink Enterprises"
  accountNumber: string; // Account Number
  iban: string; // 24-digit PK IBAN
  branchName: string; // e.g. "Mingora City Branch, Swat"
  raastId: string; // Raast ID or registered mobile
  openingBalance: number; // Starting cleared bank balance (PKR)
  currentBalance?: number; // Calculated or current balance
  isPrimary?: boolean;
}

export interface CompanyProfile {
  companyName: string;
  tradingName: string;
  proprietor: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  ntn: string;
  strn: string;
  drugLicenseNo?: string;
  tagline?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  packSize: number; // e.g. 12 pieces per carton
  tradePrice: number; // Carton Trade Price (Rs.)
  retailPrice: number; // Retail MSRP per unit/pack (Rs.)
  cartonStock: number; // In-stock cartons
  piecesStock: number; // In-stock loose pieces
  minStockAlert: number;
  barcode?: string;
  taxSchedule?: string; // e.g. "3rd Sch (MRP)" or "18% GST"
}

export type ChannelType =
  | 'General / Karyana Store'
  | 'Pharmacy / Medical Store'
  | 'Supermarket / Cash & Carry'
  | 'Wholesaler'
  | 'Key Distributor'
  | 'Export / Cross-Border';

export type TaxStatus = 'Filer' | 'Non-Filer' | 'Unregistered';

export interface Customer {
  id: string;
  tenant_id?: string;
  name: string; // Owner / Contact Name
  owner_name?: string;
  shopName: string; // Outlet / Shop Name
  shop_name?: string;
  route: string; // Assigned Market Route / Beat
  route_id?: string;
  phone: string;
  whatsapp_number?: string;
  address: string;
  zone?: string;
  channel_type?: ChannelType;
  tax_status?: TaxStatus;
  creditLimit: number;
  credit_limit?: number;
  credit_days?: number;
  currentBalance: number;
  current_balance?: number;
  status: 'active' | 'credit_locked' | 'review' | 'Active' | 'Credit Blocked' | 'Inactive';
  atlStatus: 'filer' | 'non_filer';
  cnic?: string;
  ntn?: string;
  strn?: string;
  cnic_or_ntn?: string;
  gps_coordinates?: string;
  aging_bucket?: '0-7 Days' | '8-15 Days' | '16-30 Days' | '30+ Days';
  created_at?: string;
}

export interface CustomerNote {
  id?: number;
  tenant_id: string;
  customer_id: string;
  note_date: string;
  text: string;
  author?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  packSize: number;
  cartons: number;
  pieces: number;
  totalUnits: number; // (cartons * packSize) + pieces
  tradePrice: number; // Carton price
  unitPrice: number; // tradePrice / packSize
  grossTotal: number; // totalUnits * (tradePrice / packSize)
  discountPercent: number;
  discountAmount: number;
  netTotal: number; // grossTotal - discountAmount
}

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  shopName: string;
  route: string;
  date: string; // ISO string
  items: OrderItem[];
  totalCartons: number;
  totalPieces: number;
  totalUnits: number;
  grossBill: number;
  totalDiscount: number;
  netBill: number;
  paymentType: 'cash' | 'credit' | 'partial';
  cashPaid: number;
  remainingBalance: number;
  synced: boolean;
  notes?: string;
  status: 'booked' | 'dispatched' | 'delivered';
}

export type RoznamchaCategory =
  | 'Customer Recovery'
  | 'Daily Sales Cash'
  | 'Fleet & Fuel'
  | 'Driver Meal & Wages'
  | 'Loading / Labor'
  | 'Van Repair & Toll'
  | 'Office & Pantry'
  | 'Supplier Payment'
  | 'Bank Cash Deposit'
  | 'Other';

export interface RoznamchaEntry {
  id: string;
  entryNo: string;
  date: string; // ISO string
  type: 'cash_in' | 'cash_out';
  category: RoznamchaCategory;
  amount: number;
  customerId?: string;
  customerName?: string;
  supplierName?: string;
  accountCode?: string;
  paymentMethod?: 'Cash' | 'Bank AL Habib / Raast' | 'EasyPaisa' | 'Cheque';
  slipNo?: string;
  narration: string;
  recordedBy: string;
  synced: boolean;
  tenant_id?: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'order' | 'roznamcha' | 'customer' | 'product' | 'grn';
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: number;
}

export interface GRNLineItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  batchLot: string;
  mfgDate: string;
  expiryDate: string;
  orderedCartons: number;
  unloadedCartons: number;
  acceptedCartons: number;
  rejectedCartons: number;
  poRate: number;
  invRate: number;
  lineTotal: number;
  varianceNote?: string;
  targetBay?: string;
}

export interface GRNDocket {
  id: string;
  grnNo: string;
  poNo: string;
  vendorId: string;
  vendorName: string;
  date: string;
  challanNo: string;
  gatePassNo: string;
  depotLocation: string;
  receivingInspector: string;
  truckRegNo: string;
  consignmentWeightKg: number;
  status: 'pending_inspection' | 'discrepancy' | 'fully_matched' | 'posted_received';
  items: GRNLineItem[];
  totalOrderedCartons: number;
  totalReceivedCartons: number;
  totalShortageCartons: number;
  totalAmount: number;
  varianceAmount: number;
  notes?: string;
  debitNoteNo?: string;
  temperatureLog?: string;
  sealVerified: boolean;
  receivedAt?: string;
}

export type EmployeeRole =
  | 'Order Booker / Salesman'
  | 'Delivery Driver'
  | 'Van Helper / Loader (Mazdoor)'
  | 'Recovery Officer'
  | 'Cashier'
  | 'Accountant';

export interface Employee {
  id: string;
  tenant_id: string;
  name: string;
  father_name?: string;
  phone: string;
  cnic_number?: string;
  role: EmployeeRole;
  assigned_route: string;
  van_assigned?: string;
  base_salary: number;
  daily_allowance_rate: number;
  commission_rate: number;
  status: 'Active' | 'On Leave' | 'Resigned' | 'Inactive';
  imei?: string;
}

export interface StaffAttendance {
  id?: number;
  tenant_id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Half-Day';
  allowance: number;
  check_in_time?: string;
  gps_location?: string;
}

export interface SalaryAdvance {
  id?: number;
  tenant_id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  amount: number;
  reason: string;
  payment_source: 'Cash Counter / Roznamcha' | 'Bank Transfer';
  is_settled: boolean;
  voucher_no?: string;
}

export interface PayrollRecord {
  id?: number;
  tenant_id: string;
  month: string;
  year: number;
  employee_id: string;
  employee_name: string;
  role: string;
  assigned_route: string;
  base_salary: number;
  present_days: number;
  total_working_days: number;
  field_allowance: number;
  sales_volume: number;
  sales_commission: number;
  salary_advances: number;
  penalties: number;
  bonuses?: number;
  gross_earnings: number;
  total_deductions: number;
  net_salary: number;
  status: 'Draft' | 'Approved' | 'Paid';
  paid_date?: string;
  payment_method?: string;
  notes?: string;
}

export interface SalesRoute {
  id: string;
  tenant_id: string;
  route_code: string;
  route_name: string;
  assigned_booker_id: string;
  assigned_booker_name?: string;
  assigned_driver_id?: string;
  assigned_driver_name?: string;
  vehicle_number: string;
  schedule_days: string[];
  target_cartons_daily: number;
  target_revenue_daily?: number;
  status: 'Active' | 'Inactive';
  description?: string;
}

export interface RouteStop {
  id?: number;
  tenant_id: string;
  route_id: string;
  customer_id: string;
  stop_sequence: number; // 1, 2, 3...
  notes?: string;
}

export interface ZeroSaleCall {
  id?: number;
  tenant_id: string;
  route_id: string;
  customer_id: string;
  customer_name?: string;
  shop_name?: string;
  date: string;
  reason: 'Shop Closed' | 'Sufficient Stock' | 'Payment Dispute' | 'Owner Unavailable' | 'Competitor Promotion' | 'Other';
  notes?: string;
  logged_by?: string;
  timestamp?: string;
}

export interface RouteLoadingSheetItem {
  productId: string;
  productName: string;
  brand: string;
  sku: string;
  cartons: number;
  pieces: number;
  totalUnits: number;
  tradePrice: number;
  unitPrice: number;
  totalAmount: number;
}

export interface RouteLoadingSheet {
  id: string;
  gatePassNo: string;
  routeId: string;
  routeName: string;
  routeCode: string;
  vehicleNumber: string;
  driverName: string;
  bookerName: string;
  dispatchDate: string;
  shift: string;
  items: RouteLoadingSheetItem[];
  totalCartons: number;
  totalPieces: number;
  totalAmount: number;
  status: 'Draft' | 'Approved' | 'Dispatched';
  dispatchedAt?: string;
  notes?: string;
}

export interface StaffMember {
  id: string;
  empCode: string;
  name: string;
  designation: string;
  phone: string;
  routeAssigned: string;
  vanAssigned: string;
  driverName: string;
  baseSalary: number;
  dailyAllowanceRate: number; // default Rs. 200/day
  advanceBalance: number;
  status: 'active' | 'on_leave';
  imei?: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  empCode: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // e.g. "07:45 AM"
  checkOutTime?: string;
  status: 'present' | 'absent' | 'leave';
  gpsLocation: string; // e.g. "34.7717° N, 72.3602° E (Depot Gate 1)"
  routeAssigned: string;
  vanAssigned: string;
  driverName: string;
  dailyAllowance: number; // e.g. 200
  allowancePaid: boolean;
  notes?: string;
  synced: boolean;
}

export interface DailySalesSummary {
  date: string;
  totalOrders: number;
  totalGross: number;
  totalDiscounts: number;
  totalNet: number;
  cashCollected: number;
  creditSales: number;
  totalCartons: number;
  totalPieces: number;
  totalUnits: number;
  routes: {
    route: string;
    orderCount: number;
    cartons: number;
    netAmount: number;
    cashCollected: number;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    cartons: number;
    pieces: number;
    netTotal: number;
  }[];
  paymentBreakdown: {
    cashOrders: number;
    creditOrders: number;
    partialOrders: number;
  };
}

export interface ReportItem {
  id: string;
  code: string;
  title: string;
  category: 'financial' | 'statutory' | 'sales' | 'inventory' | 'equity';
  badge: string;
  description: string;
  glSeries?: string;
  scope: string;
  runtime: string;
  lastRun: string;
  supportedFormats: string[];
  isFbrAuditable?: boolean;
  isGpsLocked?: boolean;
  hasNearExpiryAlert?: boolean;
}
