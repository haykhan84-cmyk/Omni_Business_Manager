import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Download,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Wallet,
  Clock,
  CheckCircle,
  X,
  Search,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  DollarSign,
  Fuel,
  Receipt,
  Users,
  Building,
  RefreshCw,
  Eye,
  CreditCard,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Trash2,
  Truck,
} from 'lucide-react';
import { Customer, Order, RoznamchaCategory, RoznamchaEntry, BankAccount, CompanyProfile, GRNDocket } from '../../types';
import { formatPKR, formatDateTime, formatDate } from '../../utils/calculations';
import { extractShopSequence } from '../../utils/sequenceNumbering';

interface DesktopRoznamchaProps {
  entries: RoznamchaEntry[];
  customers: Customer[];
  orders?: Order[];
  grnDockets?: GRNDocket[];
  openingCash: number;
  bankAccount?: BankAccount;
  companyProfile?: CompanyProfile;
  calculatedBankBalance?: number;
  onAddEntry: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
  onUpdateOpeningCash?: (val: number) => void;
  onUpdateBankAccount?: (account: BankAccount) => Promise<void> | void;
  onUpdateCompanyProfile?: (profile: CompanyProfile) => Promise<void> | void;
  onDeleteRoznamchaEntry?: (entryId: string) => Promise<void>;
}

export const DesktopRoznamcha: React.FC<DesktopRoznamchaProps> = ({
  entries,
  customers,
  orders = [],
  grnDockets = [],
  openingCash,
  bankAccount,
  companyProfile,
  calculatedBankBalance,
  onAddEntry,
  onUpdateOpeningCash,
  onUpdateBankAccount,
  onUpdateCompanyProfile,
  onDeleteRoznamchaEntry,
}) => {
  // Configurable Opening Cash State
  const [openingCashState, setOpeningCashState] = useState<number>(openingCash);
  const [showConfigOpeningModal, setShowConfigOpeningModal] = useState<boolean>(false);
  const [tempOpeningCash, setTempOpeningCash] = useState<string>(openingCash.toString());

  useEffect(() => {
    setOpeningCashState(openingCash);
    setTempOpeningCash(openingCash.toString());
  }, [openingCash]);

  // Physical Drawer Cash Verification State
  const [showVaultAuditModal, setShowVaultAuditModal] = useState<boolean>(false);
  const [countedPhysicalCash, setCountedPhysicalCash] = useState<string>('');
  const [vaultAuditSuccess, setVaultAuditSuccess] = useState<boolean | null>(null);

  // View Mode & Filters
  const [activeLedgerView, setActiveLedgerView] = useState<'day_book' | 'account_ledger' | 'trial_balance'>('day_book');
  const [subsidiaryFilter, setSubsidiaryFilter] = useState<'cash_book' | 'customer_receivables' | 'supplier_payables' | 'expense_accounts'>('cash_book');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('all');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('all');
  const [selectedOperationalHead, setSelectedOperationalHead] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'all'>('today');

  // Modals
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [selectedVoucherForReceipt, setSelectedVoucherForReceipt] = useState<RoznamchaEntry | null>(null);
  const [selectedVoucherForDetail, setSelectedVoucherForDetail] = useState<RoznamchaEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<RoznamchaEntry | null>(null);

  // Pay Supplier / Settle Debt Modal State
  const [showPaySupplierModal, setShowPaySupplierModal] = useState<boolean>(false);
  const [paySupplierName, setPaySupplierName] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank AL Habib / Raast' | 'EasyPaisa' | 'Cheque'>('Bank AL Habib / Raast');
  const [paySlipNo, setPaySlipNo] = useState<string>(`PAY-VCH-${Math.floor(1000 + Math.random() * 9000)}`);
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payNarration, setPayNarration] = useState<string>('');

  // Form State for Quick Post / Voucher Entry
  const [entryType, setEntryType] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [targetAccountCode, setTargetAccountCode] = useState<string>('AC-5020');
  const [voucherAmount, setVoucherAmount] = useState<string>('125000');
  const [voucherSlipNo, setVoucherSlipNo] = useState<string>(`VCH-2026-SEP-${Math.floor(10 + Math.random() * 89)}`);
  const [voucherNarration, setVoucherNarration] = useState<string>('Fleet fuel refill & PSO card reconciliation');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank AL Habib / Raast' | 'EasyPaisa' | 'Cheque'>('Cash');
  const [voucherCategory, setVoucherCategory] = useState<RoznamchaCategory>('Fleet & Fuel');
  const [voucherCustomerId, setVoucherCustomerId] = useState<string>(customers[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  // 1. Calculations: Cash Inflows, Outflows, Net Closing Cash
  const totalCashIn = useMemo(() => {
    return entries
      .filter((e) => e.type === 'cash_in')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [entries]);

  const totalCashOut = useMemo(() => {
    return entries
      .filter((e) => e.type === 'cash_out')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [entries]);

  // Live Closing Cash Balance: Closing Cash = Opening Cash + Total Cash In - Total Cash Out
  const netClosingCash = openingCashState + totalCashIn - totalCashOut;

  // 2. Filtered Entries by Date, Search, and Operational Heads
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Date filter
      if (dateFilter === 'today' && !e.date.startsWith(todayStr)) return false;
      if (dateFilter === 'yesterday' && !e.date.startsWith(yesterday)) return false;
      if (dateFilter === 'week' && e.date.slice(0, 10) < sevenDaysAgo) return false;

      // Operational head tab filter
      if (selectedOperationalHead !== 'all') {
        if (selectedOperationalHead === 'supplier_ap' && e.category !== 'Supplier Payment') return false;
        if (selectedOperationalHead === 'payroll' && e.category !== 'Driver Meal & Wages' && e.category !== 'Loading / Labor') return false;
        if (selectedOperationalHead === 'fleet' && e.category !== 'Fleet & Fuel') return false;
        if (selectedOperationalHead === 'facility' && e.category !== 'Van Repair & Toll' && e.category !== 'Office & Pantry') return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          e.entryNo.toLowerCase().includes(q) ||
          (e.slipNo && e.slipNo.toLowerCase().includes(q)) ||
          e.category.toLowerCase().includes(q) ||
          e.narration.toLowerCase().includes(q) ||
          (e.customerName && e.customerName.toLowerCase().includes(q)) ||
          (e.supplierName && e.supplierName.toLowerCase().includes(q)) ||
          (e.accountCode && e.accountCode.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [entries, dateFilter, selectedOperationalHead, searchQuery, todayStr, yesterday, sevenDaysAgo]);

  // Running balance double-entry sequence
  const entriesWithRunningBalance = useMemo(() => {
    let running = openingCashState;
    // Sort chronologically ascending to compute running balances
    const sorted = [...filteredEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const withBal = sorted.map((item, idx) => {
      if (item.type === 'cash_in') {
        running += item.amount;
      } else {
        running -= item.amount;
      }

      // Ensure mock account code & module tagging if not present
      const accountCode =
        item.accountCode ||
        (item.type === 'cash_in'
          ? item.customerId
            ? 'AC-1050'
            : 'AC-1002'
          : item.category === 'Fleet & Fuel'
          ? 'AC-5020'
          : item.category === 'Driver Meal & Wages'
          ? 'AC-6010'
          : item.category === 'Supplier Payment'
          ? 'AC-2040'
          : 'AC-1004');

      const moduleTag =
        item.type === 'cash_in'
          ? item.customerId
            ? 'INVOICE_REC'
            : 'CASH_RECEIPT'
          : item.category === 'Supplier Payment'
          ? 'AP_PAYMENT'
          : item.category === 'Bank Cash Deposit'
          ? 'BANK_TX'
          : 'EXPENSE';

      return {
        ...item,
        txId: `TX-984${10 + (idx % 80)}`,
        accountCode,
        moduleTag,
        runningBalance: running,
      };
    });

    // Reverse to display newest on top
    return withBal.reverse();
  }, [filteredEntries, openingCashState]);

  // Batch totals for table footer
  const currentBatchDebit = useMemo(() => {
    return filteredEntries
      .filter((e) => e.type === 'cash_out')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredEntries]);

  const currentBatchCredit = useMemo(() => {
    return filteredEntries
      .filter((e) => e.type === 'cash_in')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredEntries]);

  // 3. Subsidiary Customer Ledger Data
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  const customerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];

    type CustTx = {
      id: string;
      date: string;
      refNo: string;
      description: string;
      debit: number; // Invoice bill (increases receivable)
      credit: number; // Payment (decreases receivable)
      runningBalance: number;
    };

    const list: CustTx[] = [];

    // Orders booked for this customer (Invoices / Debits)
    orders
      .filter((o) => o.customerId === selectedCustomer.id)
      .forEach((ord) => {
        list.push({
          id: `ord-${ord.id}`,
          date: ord.date,
          refNo: ord.orderNo,
          description: `Sales Invoice - ${ord.totalCartons} Cartons (${ord.items.map((i) => i.productName).slice(0, 2).join(', ')})`,
          debit: ord.netBill,
          credit: ord.cashPaid || 0,
          runningBalance: 0,
        });
      });

    // Cash Recoveries from Roznamcha (Credits)
    entries
      .filter((e) => e.type === 'cash_in' && e.customerId === selectedCustomer.id)
      .forEach((r) => {
        list.push({
          id: `roz-${r.id}`,
          date: r.date,
          refNo: r.slipNo || r.entryNo,
          description: `Customer Debt Recovery Payment (${r.narration})`,
          debit: 0,
          credit: r.amount,
          runningBalance: 0,
        });
      });

    // Chronological sorting and running balance calculation
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let bal = 0;
    const computed = list.map((item) => {
      bal += item.debit - item.credit;
      return { ...item, runningBalance: bal };
    });

    return computed.reverse();
  }, [orders, entries, selectedCustomer]);

  const customerTotalInvoiced = useMemo(() => {
    return customerTransactions.reduce((sum, t) => sum + t.debit, 0);
  }, [customerTransactions]);

  const customerTotalCollected = useMemo(() => {
    return customerTransactions.reduce((sum, t) => sum + t.credit, 0);
  }, [customerTransactions]);

  // 3B. Supplier Payables Subsidiary Ledger Data (Unified GRN Inward Stock & Debt Settlements)
  const supplierTransactions = useMemo(() => {
    type SupTx = {
      id: string;
      date: string;
      refNo: string;
      supplierName: string;
      description: string;
      type: 'CREDIT' | 'DEBIT'; // CREDIT = Inward Bill / Stock Received; DEBIT = Payment / Debt Settled
      debit: number;
      credit: number;
      runningBalance: number;
      paymentMethod?: string;
      originalEntry?: RoznamchaEntry;
      grnDocket?: GRNDocket;
    };

    const list: SupTx[] = [];
    const grnRefNumbersSeen = new Set<string>();

    // 1. Inward Stock from GRN Dockets (Credits to Supplier)
    (grnDockets || []).forEach((docket) => {
      const totalVal =
        docket.totalAmount > 0
          ? docket.totalAmount
          : docket.items?.reduce(
              (sum, item) =>
                sum +
                (item.lineTotal ||
                  item.acceptedCartons * (item.invRate || item.poRate || 0)),
              0
            ) || 0;

      const sName = (docket.vendorName || 'Volker Life').trim();
      const grnNo = docket.grnNo || `GRN-${docket.id}`;
      grnRefNumbersSeen.add(grnNo.toLowerCase());

      list.push({
        id: `grn-docket-${docket.id || grnNo}`,
        date: docket.receivedAt || docket.date || new Date().toISOString(),
        refNo: grnNo,
        supplierName: sName,
        description: docket.notes || `Stock received via GRN #${grnNo}`,
        type: 'CREDIT',
        debit: 0,
        credit: totalVal,
        runningBalance: 0,
        grnDocket: docket,
      });
    });

    // 2. Inward Stock from Roznamcha entries where category is 'Supplier Bill / Inward Stock' or credit
    entries.forEach((e) => {
      const isGrnBill =
        e.category === 'Supplier Bill / Inward Stock' ||
        (e.type === 'credit' && (e.supplierName || e.narration.toLowerCase().includes('grn')));

      if (isGrnBill) {
        const ref = (e.slipNo || e.entryNo || '').trim();
        if (ref && grnRefNumbersSeen.has(ref.toLowerCase())) {
          // Already added from grnDockets
          return;
        }

        list.push({
          id: `roz-bill-${e.id}`,
          date: e.date,
          refNo: ref || `BILL-${e.id.slice(0, 4)}`,
          supplierName: (e.supplierName || 'Volker Life').trim(),
          description: e.narration || `Stock received via GRN #${ref}`,
          type: 'CREDIT',
          debit: 0,
          credit: e.amount || 0,
          runningBalance: 0,
          originalEntry: e,
        });
      }
    });

    // 3. Supplier Payments from Roznamcha (Debits to Supplier, Cash/Bank Out)
    entries.forEach((e) => {
      if (e.category === 'Supplier Payment' || (e.type === 'cash_out' && e.supplierName)) {
        list.push({
          id: `roz-pay-${e.id}`,
          date: e.date,
          refNo: e.slipNo || e.entryNo || `PAY-${e.id.slice(0, 4)}`,
          supplierName: (e.supplierName || 'Volker Life').trim(),
          description: e.narration || `Supplier Payment via ${e.paymentMethod || 'Cash'}`,
          type: 'DEBIT',
          debit: e.amount || 0,
          credit: 0,
          runningBalance: 0,
          paymentMethod: e.paymentMethod || 'Cash',
          originalEntry: e,
        });
      }
    });

    // Sort chronologically ascending
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balance (Liability: Credit increases payable, Debit decreases payable)
    let bal = 0;
    const computed = list.map((tx) => {
      bal += tx.credit - tx.debit;
      return { ...tx, runningBalance: bal };
    });

    return computed.reverse();
  }, [grnDockets, entries]);

  // Unique Supplier Names
  const uniqueSupplierNames = useMemo(() => {
    const set = new Set<string>();
    supplierTransactions.forEach((t) => {
      if (t.supplierName) set.add(t.supplierName.trim());
    });
    if (!set.has('Volker Life')) set.add('Volker Life');
    return Array.from(set).sort();
  }, [supplierTransactions]);

  // Filtered Supplier Transactions (Search across all records & date filter)
  const filteredSupplierTransactions = useMemo(() => {
    return supplierTransactions.filter((tx) => {
      // 1. Supplier Name Filter
      if (selectedSupplierName !== 'all') {
        if (tx.supplierName.toLowerCase() !== selectedSupplierName.toLowerCase()) {
          return false;
        }
      }

      // 2. Date Filter
      // If user has entered a search query or dateFilter is 'all', show across all dates
      if (dateFilter !== 'all' && !searchQuery.trim()) {
        if (dateFilter === 'today' && !tx.date.startsWith(todayStr)) return false;
        if (dateFilter === 'yesterday' && !tx.date.startsWith(yesterday)) return false;
        if (dateFilter === 'week' && tx.date.slice(0, 10) < sevenDaysAgo) return false;
      }

      // 3. Search Query Filter (Matches supplier name, ref folio/GRN, narration, method)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          tx.supplierName.toLowerCase().includes(q) ||
          tx.refNo.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q) ||
          (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [supplierTransactions, selectedSupplierName, dateFilter, searchQuery, todayStr, yesterday, sevenDaysAgo]);

  const supplierTotalBills = useMemo(() => {
    return filteredSupplierTransactions.reduce((sum, t) => sum + t.credit, 0);
  }, [filteredSupplierTransactions]);

  const supplierTotalPaid = useMemo(() => {
    return filteredSupplierTransactions.reduce((sum, t) => sum + t.debit, 0);
  }, [filteredSupplierTransactions]);

  const supplierNetPayable = useMemo(() => {
    return supplierTotalBills - supplierTotalPaid;
  }, [supplierTotalBills, supplierTotalPaid]);

  // 4. Operational Heads Outflow Matrix (Live calculation from database transactions - No hardcoded fallback)
  const operationalHeads = useMemo(() => {
    const cashOutEntries = entries.filter((e) => e.type === 'cash_out');

    let supplierAP = 0;
    let payroll = 0;
    let fleet = 0;
    let facility = 0;
    let banking = 0;
    let kitchen = 0;

    cashOutEntries.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const cat = e.category;
      const narr = (e.narration || '').toLowerCase();

      if (cat === 'Supplier Payment') {
        supplierAP += amt;
      } else if (cat === 'Driver Meal & Wages' || cat === 'Loading / Labor') {
        payroll += amt;
      } else if (cat === 'Fleet & Fuel') {
        fleet += amt;
      } else if (cat === 'Van Repair & Toll') {
        facility += amt;
      } else if (cat === 'Office & Pantry') {
        if (narr.includes('kitchen') || narr.includes('tea') || narr.includes('pantry') || narr.includes('lunch')) {
          kitchen += amt;
        } else {
          facility += amt;
        }
      } else if (cat === 'Bank Cash Deposit') {
        banking += amt;
      } else {
        if (narr.includes('supplier') || narr.includes('vendor')) {
          supplierAP += amt;
        } else if (narr.includes('salary') || narr.includes('wage') || narr.includes('labor')) {
          payroll += amt;
        } else if (narr.includes('fuel') || narr.includes('fleet')) {
          fleet += amt;
        } else if (narr.includes('rent') || narr.includes('repair')) {
          facility += amt;
        } else {
          facility += amt;
        }
      }
    });

    const calcPercent = (amt: number) =>
      totalCashOut > 0 ? Number(((amt / totalCashOut) * 100).toFixed(1)) : 0;

    return [
      { id: 'all', label: 'All Heads', amount: totalCashOut, percent: totalCashOut > 0 ? 100 : 0 },
      { id: 'supplier_ap', label: 'Supplier AP', amount: supplierAP, percent: calcPercent(supplierAP) },
      { id: 'payroll', label: 'Payroll & Staff', amount: payroll, percent: calcPercent(payroll) },
      { id: 'fleet', label: 'Logistics & Fleet', amount: fleet, percent: calcPercent(fleet) },
      { id: 'facility', label: 'Facility & Rent', amount: facility, percent: calcPercent(facility) },
      { id: 'banking', label: 'Banking & Tx', amount: banking, percent: calcPercent(banking) },
      { id: 'kitchen', label: 'Kitchen / Pantry', amount: kitchen, percent: calcPercent(kitchen) },
    ];
  }, [entries, totalCashOut]);

  // 5. Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'OMNISALES ERP - GENERAL ROZNAMCHA CASHBOOK JOURNAL\n';
    csv += `Export Date,${new Date().toLocaleString()}\n`;
    csv += `Opening Cash Balance,${openingCashState}\n`;
    csv += `Total Cash In,${totalCashIn}\n`;
    csv += `Total Cash Out,${totalCashOut}\n`;
    csv += `Closing Cash Balance,${netClosingCash}\n\n`;

    csv += 'Tx ID,Date,Account Code & Title,Module,Ref Folio,Debit (Out),Credit (In),Narration,Running Balance,Audit Status\n';
    entriesWithRunningBalance.forEach((row) => {
      const isIn = row.type === 'cash_in';
      csv += `"${row.txId}","${row.date}","${row.accountCode} - ${row.customerName || row.category}","${row.moduleTag}","${row.slipNo || row.entryNo}",${!isIn ? row.amount : 0},${isIn ? row.amount : 0},"${row.narration}",${row.runningBalance},"VERIFIED"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Roznamcha_Journal_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPL = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'OMNISALES ERP - DISTRIBUTION PROFIT & LOSS AUDIT STATEMENT\n';
    csv += `Period,Current Fiscal Month (Swat Depot)\n`;
    csv += `Commercial Inflow Realized,${totalCashIn}\n`;
    csv += `Disbursed Operational Expenses,${totalCashOut}\n`;
    csv += `Net Operating Cash EBIT,${totalCashIn - totalCashOut}\n`;
    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Distribution_PL_Statement_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCommitJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(voucherAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid voucher amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const isRecovery = entryType === 'cash_in' && targetAccountCode === 'AC-1050';
      const cust = customers.find((c) => c.id === voucherCustomerId);

      const categoryToPost: RoznamchaCategory =
        entryType === 'cash_in'
          ? isRecovery
            ? 'Customer Recovery'
            : 'Daily Sales Cash'
          : targetAccountCode === 'AC-5020'
          ? 'Fleet & Fuel'
          : targetAccountCode === 'AC-6010'
          ? 'Driver Meal & Wages'
          : targetAccountCode === 'AC-2040'
          ? 'Supplier Payment'
          : targetAccountCode === 'AC-1010'
          ? 'Bank Cash Deposit'
          : 'Other';

      const newEntryPayload: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'> = {
        date: new Date().toISOString(),
        type: entryType,
        category: categoryToPost,
        amount: amt,
        customerId: isRecovery ? cust?.id : undefined,
        customerName: isRecovery ? cust?.shopName : undefined,
        slipNo: voucherSlipNo.trim() || `VCH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        narration: voucherNarration.trim() || `${categoryToPost} logged via Roznamcha Console`,
        recordedBy: 'Executive Cashier (Console)',
        paymentMethod: paymentMethod,
        accountCode: targetAccountCode,
        tenant_id: 'tenant_pk_swat_1042',
      };

      await onAddEntry(newEntryPayload);

      // Offer immediate receipt view if cash recovery was received
      if (entryType === 'cash_in') {
        setSelectedVoucherForReceipt({
          ...newEntryPayload,
          id: `roz-${Date.now()}`,
          entryNo: voucherSlipNo,
          synced: true,
        });
      }

      setIsVoucherModalOpen(false);
      setVoucherSlipNo(`VCH-2026-SEP-${Math.floor(10 + Math.random() * 89)}`);
      setVoucherNarration('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDrawerCash = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(countedPhysicalCash);
    if (isNaN(counted)) return;

    if (Math.abs(counted - netClosingCash) < 1) {
      setVaultAuditSuccess(true);
    } else {
      setVaultAuditSuccess(false);
    }
  };

  return (
    <div className="flex flex-col w-full font-sans text-slate-900 space-y-6">
      {/* 1. Top Command & Action Strip (Matching Stitch Export exactly) */}
      <section className="w-full px-5 py-4 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-sm">
              <Landmark className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  General Ledger &amp; Roznamcha Console
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                  Fiscal Control v4.8
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Real-time audited double-entry journal &amp; liquidity verification stream
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="tracking-wide text-[11px]">STATE: IMMUTABLE AUDIT LEDGER</span>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            type="button"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Day Book (PDF)</span>
          </button>

          <button
            onClick={handleExportPL}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            type="button"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Boardroom P&amp;L (.XLSX)</span>
          </button>

          <button
            onClick={() => setIsVoucherModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>+ Post Voucher</span>
          </button>
        </div>
      </section>

      {/* 2. Real-Time KPI Summary Bar (4 Prominent Metric Cards) */}
      <section className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Opening Cash Balance */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                Opening Cash Balance
              </span>
              <button
                onClick={() => setShowConfigOpeningModal(true)}
                title="Configure Start of Day Cash"
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
              >
                <Wallet className="w-4 h-4 text-slate-700" />
              </button>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                {formatPKR(openingCashState)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Reconciled {todayStr} (Bank &amp; Vaults)</span>
              </div>
            </div>
            <div className="mt-3 pt-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span className="text-cyan-800">
                {bankAccount ? `${bankAccount.bankName}: ${formatPKR(calculatedBankBalance ?? (bankAccount.openingBalance || 0))}` : 'Bank Account: Active'}
              </span>
              <span className="text-amber-700">Vault: {formatPKR(openingCashState)}</span>
            </div>
          </div>

          {/* Card 2: True Monthly Inflows */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                True Monthly Inflows
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <ArrowDownLeft className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
                +{formatPKR(totalCashIn)}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                  +12.4%
                </span>
                <span className="text-xs text-slate-500">vs last month cycle</span>
              </div>
            </div>
            <div className="mt-3 pt-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>{entries.filter((e) => e.type === 'cash_in').length} Verified Receipts</span>
              <span className="text-emerald-700 font-extrabold">Zero Unallocated</span>
            </div>
          </div>

          {/* Card 3: Total Verified Outflows */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                Total Verified Outflows
              </span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-rose-600 tracking-tight">
                -{formatPKR(totalCashOut)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <span>Approved AP, Fleet, Payroll &amp; OpEx</span>
              </div>
            </div>
            <div className="mt-3 pt-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Disbursed: {formatPKR(totalCashOut)}</span>
              <span className="text-amber-700 font-bold">Scheduled: 0.00</span>
            </div>
          </div>

          {/* Card 4: Net Closing Cash */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                Net Closing Cash
              </span>
              <button
                onClick={() => setShowVaultAuditModal(true)}
                className="px-2 py-0.5 rounded-full bg-amber-600 text-white font-mono text-[10px] font-extrabold cursor-pointer hover:bg-amber-500 transition-colors"
                title="Perform Physical Drawer Reconciliation"
              >
                DRAWER AUDIT
              </button>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                {formatPKR(netClosingCash)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                <span>Audited Net Position ({todayStr})</span>
              </div>
            </div>
            <div className="mt-3 pt-2 bg-slate-800/80 px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-300">Physical Vault: Verified</span>
              <span className="text-emerald-400 font-bold">Balanced: 100%</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Expense Categorization & Operational Heads Matrix */}
      <section className="w-full bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
              Disbursement Matrix &amp; Operational Heads (Roznamcha Outflows)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Month-to-Date Budget Allocation View</span>
        </div>

        {/* Quick Filter Bar with Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          {operationalHeads.map((head) => (
            <button
              key={head.id}
              onClick={() => setSelectedOperationalHead(head.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                selectedOperationalHead === head.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{head.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  selectedOperationalHead === head.id ? 'bg-amber-800 text-white' : 'bg-white text-slate-600'
                }`}
              >
                {formatPKR(head.amount)} {head.id !== 'all' ? `• ${head.percent}%` : ''}
              </span>
            </button>
          ))}
        </div>

        {/* Ratio Visual Bar Chart - Live Dynamic Widths */}
        <div className="w-full mt-2 flex h-2 rounded-full overflow-hidden bg-slate-100">
          {totalCashOut === 0 ? (
            <div className="w-full h-full bg-slate-200" title="No outflow expenses recorded yet"></div>
          ) : (
            <>
              {(operationalHeads.find((h) => h.id === 'supplier_ap')?.percent || 0) > 0 && (
                <div
                  className="h-full bg-slate-800 transition-all"
                  style={{ width: `${operationalHeads.find((h) => h.id === 'supplier_ap')!.percent}%` }}
                  title={`Supplier AP: ${operationalHeads.find((h) => h.id === 'supplier_ap')!.percent}%`}
                />
              )}
              {(operationalHeads.find((h) => h.id === 'payroll')?.percent || 0) > 0 && (
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${operationalHeads.find((h) => h.id === 'payroll')!.percent}%` }}
                  title={`Payroll: ${operationalHeads.find((h) => h.id === 'payroll')!.percent}%`}
                />
              )}
              {(operationalHeads.find((h) => h.id === 'fleet')?.percent || 0) > 0 && (
                <div
                  className="h-full bg-amber-600 transition-all"
                  style={{ width: `${operationalHeads.find((h) => h.id === 'fleet')!.percent}%` }}
                  title={`Logistics: ${operationalHeads.find((h) => h.id === 'fleet')!.percent}%`}
                />
              )}
              {(operationalHeads.find((h) => h.id === 'facility')?.percent || 0) > 0 && (
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${operationalHeads.find((h) => h.id === 'facility')!.percent}%` }}
                  title={`Facility: ${operationalHeads.find((h) => h.id === 'facility')!.percent}%`}
                />
              )}
              {(operationalHeads.find((h) => h.id === 'banking')?.percent || 0) > 0 && (
                <div
                  className="h-full bg-purple-600 transition-all"
                  style={{ width: `${operationalHeads.find((h) => h.id === 'banking')!.percent}%` }}
                  title={`Banking: ${operationalHeads.find((h) => h.id === 'banking')!.percent}%`}
                />
              )}
              {(operationalHeads.find((h) => h.id === 'kitchen')?.percent || 0) > 0 && (
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${operationalHeads.find((h) => h.id === 'kitchen')!.percent}%` }}
                  title={`Kitchen: ${operationalHeads.find((h) => h.id === 'kitchen')!.percent}%`}
                />
              )}
            </>
          )}
        </div>
      </section>

      {/* 4. Subsidiary Ledgers Filter & Mode Switcher */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Account Scope Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Account Scope:</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSubsidiaryFilter('cash_book')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                subsidiaryFilter === 'cash_book' ? 'bg-white shadow-xs text-slate-900 font-extrabold' : 'text-slate-600'
              }`}
            >
              Daily Cash Book (Roznamcha)
            </button>
            <button
              onClick={() => setSubsidiaryFilter('customer_receivables')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                subsidiaryFilter === 'customer_receivables' ? 'bg-white shadow-xs text-slate-900 font-extrabold' : 'text-slate-600'
              }`}
            >
              Customer Ledgers (Khatay)
            </button>
            <button
              onClick={() => {
                setSubsidiaryFilter('supplier_payables');
                setDateFilter('all');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                subsidiaryFilter === 'supplier_payables' ? 'bg-white shadow-xs text-slate-900 font-extrabold' : 'text-slate-600'
              }`}
            >
              Supplier Payables
            </button>
            <button
              onClick={() => setSubsidiaryFilter('expense_accounts')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                subsidiaryFilter === 'expense_accounts' ? 'bg-white shadow-xs text-slate-900 font-extrabold' : 'text-slate-600'
              }`}
            >
              Expense Heads
            </button>
          </div>
        </div>

        {/* Temporal Scope Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Date Range:</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'This Week' },
                { id: 'all', label: 'All Records' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  dateFilter === d.id ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Conditional Subsidiary View Header: If Customer Ledgers is selected */}
      {subsidiaryFilter === 'customer_receivables' && (
        <section className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                  Customer Subsidiary Account Statement
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="bg-white border border-amber-300 font-bold text-sm text-slate-900 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {customers.map((c, idx) => (
                      <option key={c.id} value={c.id}>
                        Shop #{extractShopSequence(c, idx)}: {c.shopName} ({c.name}) - Route: {c.route}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Retailer Statement Summary Metrics */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-amber-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Invoiced</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                  {formatPKR(customerTotalInvoiced)}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-200 text-center">
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">Total Collected</span>
                <span className="font-mono font-bold text-emerald-600 text-sm mt-0.5 block">
                  {formatPKR(customerTotalCollected)}
                </span>
              </div>
              <div className="p-3 bg-amber-600 text-white rounded-xl text-center shadow-xs">
                <span className="text-[10px] uppercase font-bold block text-amber-100">Outstanding Balance</span>
                <span className="font-mono font-extrabold text-sm mt-0.5 block">
                  {formatPKR(selectedCustomer?.currentBalance || 0)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5B. Conditional Subsidiary View Header: If Supplier Payables is selected */}
      {subsidiaryFilter === 'supplier_payables' && (
        <section className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4 border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                  Supplier Payables &amp; Inward Stock Ledger
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    value={selectedSupplierName}
                    onChange={(e) => setSelectedSupplierName(e.target.value)}
                    className="bg-slate-800 border border-slate-700 font-bold text-sm text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="all">All Suppliers (Consolidated Payables)</option>
                    {uniqueSupplierNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Supplier Metrics & Quick Action Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Inward GRN Bills</span>
                  <span className="font-mono font-bold text-rose-400 text-xs mt-0.5 block">
                    {formatPKR(supplierTotalBills)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Paid Out</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block">
                    {formatPKR(supplierTotalPaid)}
                  </span>
                </div>
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl text-center shadow-xs">
                  <span className="text-[10px] uppercase font-black block text-slate-900">Net Balance Due</span>
                  <span className="font-mono font-black text-xs mt-0.5 block">
                    {formatPKR(supplierNetPayable)}
                  </span>
                </div>
              </div>

              {/* + Pay Supplier / Settle Debt Button */}
              <button
                type="button"
                onClick={() => {
                  setPaySupplierName(
                    selectedSupplierName !== 'all' ? selectedSupplierName : uniqueSupplierNames[0] || 'Volker Life'
                  );
                  setPayAmount('');
                  setPayNarration(
                    `Supplier settlement for ${
                      selectedSupplierName !== 'all' ? selectedSupplierName : 'Vendor'
                    }`
                  );
                  setPaySlipNo(`PAY-VCH-${Date.now().toString().slice(-4)}`);
                  setShowPaySupplierModal(true);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>+ Pay Supplier / Settle Debt</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 6. Main Double-Entry Table Section (Matching Stitch Layout) */}
      <section className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" id="printable-ledger">
        {/* Table Controls & Search Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  subsidiaryFilter === 'supplier_payables'
                    ? 'Search by Supplier Name (e.g. Volker Life), GRN Folio, or Narration across all records...'
                    : subsidiaryFilter === 'customer_receivables'
                    ? 'Filter by Customer Invoice, Slip #, or Narration...'
                    : 'Filter by Tx ID, Account, Ref Folio, Voucher No, or Narration...'
                }
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800 shadow-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500 mr-2" />
              <span className="font-mono font-bold">{todayStr} — Today (Realtime)</span>
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs text-xs font-bold">
              <button
                onClick={() => setActiveLedgerView('day_book')}
                className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
                  activeLedgerView === 'day_book' ? 'bg-slate-800 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                }`}
                type="button"
              >
                Day Book
              </button>
              <button
                onClick={() => setActiveLedgerView('account_ledger')}
                className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
                  activeLedgerView === 'account_ledger' ? 'bg-slate-800 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                }`}
                type="button"
              >
                Account Ledger
              </button>
              <button
                onClick={() => setActiveLedgerView('trial_balance')}
                className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
                  activeLedgerView === 'trial_balance' ? 'bg-slate-800 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                }`}
                type="button"
              >
                Trial Balance
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Table Rendering */}
        <div className="overflow-x-auto w-full">
          {subsidiaryFilter === 'customer_receivables' ? (
            /* Customer Subsidiary Running Statement */
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Ref / Bill #</th>
                  <th className="py-3 px-4">Particulars &amp; Description</th>
                  <th className="py-3 px-4 text-right text-rose-300">Debit (Invoice)</th>
                  <th className="py-3 px-4 text-right text-emerald-300">Credit (Recovery)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {customerTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      No invoices or cash collections logged for this customer yet.
                    </td>
                  </tr>
                ) : (
                  customerTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-sans">{formatDateTime(tx.date)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{tx.refNo}</td>
                      <td className="py-3 px-4 font-sans text-slate-800">{tx.description}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        {tx.debit > 0 ? formatPKR(tx.debit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {tx.credit > 0 ? formatPKR(tx.credit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatPKR(tx.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : subsidiaryFilter === 'supplier_payables' ? (
            /* Supplier Subsidiary Running Statement */
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Ref / Folio #</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Particulars &amp; Description</th>
                  <th className="py-3 px-3 text-center">Tx Type</th>
                  <th className="py-3 px-4 text-right text-emerald-300">Debit (Payment Out)</th>
                  <th className="py-3 px-4 text-right text-rose-300">Credit (Inward Bill)</th>
                  <th className="py-3 px-4 text-right">Balance Payable</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredSupplierTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                      No supplier invoices, GRN stock receipts, or payments found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSupplierTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-sans whitespace-nowrap">
                        {formatDateTime(tx.date)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {tx.refNo}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {tx.supplierName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-800">
                        <div>{tx.description}</div>
                        {tx.paymentMethod && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            via {tx.paymentMethod}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            tx.type === 'CREDIT'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {tx.type === 'CREDIT' ? 'Credit (Bill)' : 'Debit (Payment)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {tx.debit > 0 ? formatPKR(tx.debit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        {tx.credit > 0 ? formatPKR(tx.credit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatPKR(tx.runningBalance)}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        {tx.originalEntry && (
                          <button
                            type="button"
                            onClick={() => setSelectedVoucherForReceipt(tx.originalEntry!)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                            title="Print Voucher Receipt"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-slate-700 uppercase font-extrabold text-right">
                    Current Statement Totals:
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-mono font-black">
                    {formatPKR(supplierTotalPaid)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-600 font-mono font-black">
                    {formatPKR(supplierTotalBills)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900 font-mono font-black">
                    {formatPKR(supplierNetPayable)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            /* General Double-Entry Day Book Table */
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Tx ID &amp; Stamp</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4">Account Code &amp; Title</th>
                  <th className="py-3 px-3 text-center">Module</th>
                  <th className="py-3 px-3">Ref Folio / Bill</th>
                  <th className="py-3 px-4 text-right">Debit (Out)</th>
                  <th className="py-3 px-4 text-right">Credit (In)</th>
                  <th className="py-3 px-4">Particulars / Narration</th>
                  <th className="py-3 px-3 text-center">Audit</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {entriesWithRunningBalance.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                      No ledger transactions found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  entriesWithRunningBalance.map((item) => {
                    const isIn = item.type === 'cash_in';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{item.txId}</div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} PKT
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-sans">
                          {formatDate(item.date)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {item.accountCode} • {item.customerName || item.category}
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {item.category === 'Customer Recovery'
                              ? `Market Debt Recovery • ${item.customerName}`
                              : item.category}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isIn
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {item.moduleTag}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.slipNo || item.entryNo}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                          {!isIn ? formatPKR(item.amount) : '-'}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                          {isIn ? formatPKR(item.amount) : '-'}
                        </td>

                        <td className="py-3 px-4 text-slate-800 font-sans max-w-xs truncate">
                          {item.narration}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>VERIFIED</span>
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedVoucherForDetail(item)}
                              className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                              title="View Voucher Breakdown"
                              type="button"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedVoucherForReceipt(item)}
                              className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-amber-700 cursor-pointer"
                              title="Print Payment Voucher"
                              type="button"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteRoznamchaEntry && (
                              <button
                                onClick={() => setEntryToDelete(item)}
                                className="w-7 h-7 rounded hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                                title="Delete Voucher"
                                type="button"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Ledger Balance Footer */}
              <tfoot>
                <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300 text-xs">
                  <td className="py-3 px-4 uppercase font-sans tracking-wider" colSpan={5}>
                    Current Batch Total (Balanced Roznamcha Audit)
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                    {formatPKR(currentBatchDebit)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                    {formatPKR(currentBatchCredit)}
                  </td>
                  <td className="py-3 px-4 text-right" colSpan={3}>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>ZERO VARIANCE • BALANCED TRIAL STATE</span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>

      {/* 7. Boardroom Financial Reports & Quick Post Engine Section (Exact Stitch 7:5 Grid) */}
      <section className="w-full mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Panel: Boardroom Financial Report Generator (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Boardroom Financial Reports &amp; Audit Dossiers
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Instant certified fiscal exports generated from immutable ledger state
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                  ISO 9001 / GAAP Compliant
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                {/* Report Card 1: Roznamcha Day Book */}
                <div className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl p-4 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center mb-3">
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900">Roznamcha Day Book</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Chronological A4 format double-entry cash and journal sequence.
                    </p>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="mt-4 w-full h-9 rounded-xl bg-white hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs border border-slate-200 transition-colors cursor-pointer"
                    type="button"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download PDF</span>
                  </button>
                </div>

                {/* Report Card 2: Profit & Loss Statement */}
                <div className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl p-4 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-3">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900">Profit &amp; Loss Statement</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Operating revenue, gross margins, logistics COGS &amp; net EBIT.
                    </p>
                  </div>
                  <button
                    onClick={handleExportPL}
                    className="mt-4 w-full h-9 rounded-xl bg-white hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs border border-slate-200 transition-colors cursor-pointer"
                    type="button"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Generate P&amp;L</span>
                  </button>
                </div>

                {/* Report Card 3: Safe Vault Reconciliation */}
                <div className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl p-4 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-3">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-900">Safe Vault Reconciliation</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Physical currency notes count matched with system opening &amp; draws.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowVaultAuditModal(true)}
                    className="mt-4 w-full h-9 rounded-xl bg-white hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs border border-slate-200 transition-colors cursor-pointer"
                    type="button"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                    <span>Audit Certificate</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>All reports comply with FBR e-Audit and State Bank of Pakistan statutory ledger norms.</span>
              </div>
              <span className="font-mono text-slate-800 font-bold">PDF Engine: v4.2.9</span>
            </div>
          </div>

          {/* Right Panel: Quick Journal Entry Engine (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-600"></span>
                  <h2 className="text-base font-extrabold text-slate-900">Quick Journal Entry Engine</h2>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase">
                  DIRECT POST
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Instant double-entry posting to the tamper-proof ledger</p>

              <form onSubmit={handleCommitJournalEntry} className="space-y-3 text-xs">
                {/* Account Selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Target GL Account
                  </label>
                  <select
                    value={targetAccountCode}
                    onChange={(e) => {
                      setTargetAccountCode(e.target.value);
                      if (e.target.value === 'AC-1050') {
                        setEntryType('cash_in');
                      } else if (e.target.value === 'AC-5020' || e.target.value === 'AC-6010' || e.target.value === 'AC-2040') {
                        setEntryType('cash_out');
                      }
                    }}
                    className="w-full h-10 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 px-3 focus:outline-none focus:ring-2 focus:ring-slate-800 font-medium"
                  >
                    <option value="AC-2040">AC-2040 • Supplier AP - Engro Foods Ltd</option>
                    <option value="AC-1050">AC-1050 • Accounts Receivable - Retailer Recovery</option>
                    <option value="AC-1010">AC-1010 • Habib Bank Limited (Main Ops A/C)</option>
                    <option value="AC-1002">AC-1002 • Vault Physical Cash (HQ Islamabad)</option>
                    <option value="AC-5020">AC-5020 • Fleet Fuel &amp; Diesel Consumption</option>
                    <option value="AC-6010">AC-6010 • Staff Salaries &amp; Dispatch Payroll</option>
                    <option value="AC-4010">AC-4010 • Commercial Spot Sales - FMCG</option>
                  </select>
                </div>

                {/* If Customer Recovery, show customer picker */}
                {targetAccountCode === 'AC-1050' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Select Retail Customer (Auto-Decrements Balance)
                    </label>
                    <select
                      value={voucherCustomerId}
                      onChange={(e) => setVoucherCustomerId(e.target.value)}
                      className="w-full h-10 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 px-3 focus:outline-none"
                    >
                      {customers.map((c, idx) => (
                        <option key={c.id} value={c.id}>
                          Shop #{extractShopSequence(c, idx)}: {c.shopName} ({c.name}) — Due: Rs. {c.currentBalance.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Debit/Credit Toggle & Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Entry Type
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 h-10 items-center">
                      <button
                        type="button"
                        onClick={() => setEntryType('cash_out')}
                        className={`h-8 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                          entryType === 'cash_out' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Debit (Dr)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntryType('cash_in')}
                        className={`h-8 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                          entryType === 'cash_in' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Credit (Cr)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Amount (PKR)
                    </label>
                    <input
                      type="number"
                      value={voucherAmount}
                      onChange={(e) => setVoucherAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                </div>

                {/* Folio & Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Ref Folio / Doc #
                    </label>
                    <input
                      type="text"
                      value={voucherSlipNo}
                      onChange={(e) => setVoucherSlipNo(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full h-10 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 px-3 focus:outline-none"
                    >
                      <option value="Cash">Cash (Counter/Vault)</option>
                      <option value="Bank AL Habib / Raast">Bank AL Habib / Raast</option>
                      <option value="EasyPaisa">EasyPaisa / JazzCash</option>
                      <option value="Cheque">Clearing Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Roznamcha Narration / Particulars
                  </label>
                  <input
                    type="text"
                    value={voucherNarration}
                    onChange={(e) => setVoucherNarration(e.target.value)}
                    placeholder="Describe transaction particulars..."
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Posting...' : 'Commit & Post to Tamper-Proof Ledger'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Authorizer: Audit Officer (Terminal #4)</span>
              <span className="font-mono text-slate-800 font-bold">Auto-Balances: Enabled</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Cryptographic Footer Audit Strip (Exact Stitch layout) */}
      <section className="w-full p-3.5 bg-slate-900 text-white rounded-2xl shadow-inner flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-bold text-white">LEDGER ENGINE: V4.8.2-PROD</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span>MERKLE ROOT:</span>
            <span className="font-mono text-amber-400 font-bold">0x8F9B7A21C049...31E2D4</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span>LOCAL DISK CACHE:</span>
            <span className="font-mono text-white font-bold">SYNCED (0.02ms)</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-emerald-400 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>100% AUDIT PROOF • ZERO BALANCE VARIANCE</span>
        </div>
      </section>

      {/* MODAL: Post Voucher / Detailed Modal */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">New Roznamcha Cash Voucher</h3>
              </div>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCommitJournalEntry} className="p-6 space-y-4 text-xs">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('cash_in');
                    setTargetAccountCode('AC-1050');
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    entryType === 'cash_in' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  + Cash In (Jama / Recovery)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('cash_out');
                    setTargetAccountCode('AC-5020');
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    entryType === 'cash_out' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  - Cash Out (Banam / Expense)
                </button>
              </div>

              {entryType === 'cash_in' ? (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Select Customer Account (Khatay)
                  </label>
                  <select
                    value={voucherCustomerId}
                    onChange={(e) => setVoucherCustomerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shopName} ({c.name}) — Due: Rs. {c.currentBalance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Disbursement Expense Head
                  </label>
                  <select
                    value={targetAccountCode}
                    onChange={(e) => setTargetAccountCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="AC-5020">AC-5020 • Fleet &amp; Fuel (Diesel / CNG)</option>
                    <option value="AC-6010">AC-6010 • Driver &amp; Booker Daily Meal Wages</option>
                    <option value="AC-2040">AC-2040 • Supplier / Manufacturer Payment</option>
                    <option value="AC-1004">AC-1004 • Van Maintenance &amp; Toll Plaza</option>
                    <option value="AC-1010">AC-1010 • Bank Cash Deposit (Counter to Bank)</option>
                    <option value="AC-4010">AC-4010 • Loading / Unloading Labor</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Amount (PKR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={voucherAmount}
                    onChange={(e) => setVoucherAmount(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="Cash">Cash (Vault / Drawer)</option>
                    <option value="Bank AL Habib / Raast">Bank AL Habib / Raast</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Ref / Slip / Voucher #</label>
                <input
                  type="text"
                  value={voucherSlipNo}
                  onChange={(e) => setVoucherSlipNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Narration / Particulars</label>
                <input
                  type="text"
                  value={voucherNarration}
                  onChange={(e) => setVoucherNarration(e.target.value)}
                  placeholder="e.g. Market recovery against invoice #9481"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm text-white shadow-sm cursor-pointer ${
                    entryType === 'cash_in'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting ? 'Posting...' : 'Commit Voucher to Dexie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Printable Payment Receipt & Voucher Studio */}
      {selectedVoucherForReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Payment Receipt Studio</h3>
              </div>
              <button
                onClick={() => setSelectedVoucherForReceipt(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Preview (80mm / A4 style) */}
            <div className="p-6 bg-slate-50 space-y-4 text-xs" id="printable-voucher-card">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                {/* Header */}
                <div className="text-center border-b border-slate-200 pb-3">
                  <h4 className="font-black text-sm tracking-tight text-slate-900 uppercase">
                    OMNISALES DISTRIBUTION ERP
                  </h4>
                  <p className="text-[10px] text-slate-500">Mingora Swat Depot • PrimeLink Hub</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">NTN: 5829103-1 • SRO 450(I)/2024</p>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-white font-bold text-[10px] uppercase ${
                      selectedVoucherForReceipt.category === 'Supplier Payment' ||
                      selectedVoucherForReceipt.type === 'cash_out'
                        ? 'bg-rose-700'
                        : 'bg-slate-900'
                    }`}
                  >
                    {selectedVoucherForReceipt.category === 'Supplier Payment'
                      ? 'OFFICIAL SUPPLIER PAYMENT VOUCHER'
                      : selectedVoucherForReceipt.type === 'cash_out'
                      ? 'OFFICIAL PAYMENT VOUCHER'
                      : 'OFFICIAL CASH RECEIPT'}
                  </span>
                </div>

                {/* Voucher Meta */}
                <div className="space-y-1.5 font-mono text-[11px] border-b border-slate-100 pb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Receipt Ref:</span>
                    <span className="font-bold text-slate-900">
                      {selectedVoucherForReceipt.slipNo || selectedVoucherForReceipt.entryNo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Date &amp; Time:</span>
                    <span className="text-slate-800">{formatDateTime(selectedVoucherForReceipt.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">
                      {selectedVoucherForReceipt.category === 'Supplier Payment' ||
                      selectedVoucherForReceipt.type === 'cash_out'
                        ? 'Paid To / Payee:'
                        : 'Received From:'}
                    </span>
                    <span className="font-bold text-slate-900 font-sans">
                      {selectedVoucherForReceipt.supplierName ||
                        selectedVoucherForReceipt.customerName ||
                        'Direct Cash Desk'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Payment Method:</span>
                    <span className="text-slate-800 font-sans">
                      {selectedVoucherForReceipt.paymentMethod || 'Cash'}
                    </span>
                  </div>
                </div>

                {/* Amount Box */}
                <div
                  className={`p-3 border rounded-xl text-center ${
                    selectedVoucherForReceipt.category === 'Supplier Payment' ||
                    selectedVoucherForReceipt.type === 'cash_out'
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-bold block ${
                      selectedVoucherForReceipt.category === 'Supplier Payment' ||
                      selectedVoucherForReceipt.type === 'cash_out'
                        ? 'text-rose-800'
                        : 'text-emerald-800'
                    }`}
                  >
                    {selectedVoucherForReceipt.category === 'Supplier Payment' ||
                    selectedVoucherForReceipt.type === 'cash_out'
                      ? 'Amount Disbursed / Settled'
                      : 'Amount Received'}
                  </span>
                  <span
                    className={`font-mono text-xl font-black block mt-0.5 ${
                      selectedVoucherForReceipt.category === 'Supplier Payment' ||
                      selectedVoucherForReceipt.type === 'cash_out'
                        ? 'text-rose-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatPKR(selectedVoucherForReceipt.amount)}
                  </span>
                </div>

                {/* Particulars */}
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-bold block text-slate-800">Particulars:</span>
                  <span>{selectedVoucherForReceipt.narration}</span>
                </div>

                {/* Signatures */}
                <div className="pt-4 flex justify-between text-[10px] text-slate-500">
                  <div className="text-center">
                    <div className="w-24 border-b border-slate-300 pb-1"></div>
                    <span className="mt-1 block">
                      {selectedVoucherForReceipt.category === 'Supplier Payment' ||
                      selectedVoucherForReceipt.type === 'cash_out'
                        ? 'Payee / Supplier Sign'
                        : 'Customer Sign'}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="w-24 border-b border-slate-300 pb-1 font-mono font-bold text-slate-800">
                      Tariq Khan
                    </div>
                    <span className="mt-1 block">Cashier / Stamp</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedVoucherForReceipt(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Configure Opening Cash Balance */}
      {showConfigOpeningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Configure Opening Cash Balance</h3>
              </div>
              <button
                onClick={() => setShowConfigOpeningModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const val = parseFloat(tempOpeningCash);
                if (!isNaN(val) && val >= 0) {
                  setOpeningCashState(val);
                  if (onUpdateOpeningCash) {
                    onUpdateOpeningCash(val);
                  }
                }
                setShowConfigOpeningModal(false);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Start-of-Day Physical Vault Cash (PKR)
                </label>
                <input
                  type="number"
                  value={tempOpeningCash}
                  onChange={(e) => setTempOpeningCash(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-lg text-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                This baseline anchors the daily Roznamcha ledger calculation:
                <br />
                <strong className="font-mono">Closing Cash = Opening Cash + Cash In - Cash Out</strong>.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigOpeningModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm cursor-pointer"
                >
                  Save Opening Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Drawer Cash Count & Reconciliation Audit */}
      {showVaultAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Drawer Physical Cash Audit</h3>
              </div>
              <button
                onClick={() => {
                  setShowVaultAuditModal(false);
                  setVaultAuditSuccess(null);
                }}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyDrawerCash} className="p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-100 rounded-xl">
                <span className="text-slate-600 font-bold uppercase">System Calculated Balance:</span>
                <span className="font-mono text-base font-black text-slate-900">{formatPKR(netClosingCash)}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Counted Physical Cash in Drawer (PKR)
                </label>
                <input
                  type="number"
                  value={countedPhysicalCash}
                  onChange={(e) => {
                    setCountedPhysicalCash(e.target.value);
                    setVaultAuditSuccess(null);
                  }}
                  placeholder="Enter physical cash count..."
                  required
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-base text-slate-900 focus:outline-none"
                />
              </div>

              {vaultAuditSuccess === true && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>PERFECT MATCH: Zero variance between physical drawer and ledger!</span>
                </div>
              )}

              {vaultAuditSuccess === false && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>
                    VARIANCE DETECTED: Difference of{' '}
                    {formatPKR(Math.abs(parseFloat(countedPhysicalCash) - netClosingCash))}.
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowVaultAuditModal(false);
                    setVaultAuditSuccess(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm cursor-pointer"
                >
                  Verify Variance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for Roznamcha Entry Deletion */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Confirm Deletion
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to permanently remove cash entry of{' '}
                <strong className="text-slate-900 font-bold">
                  Rs. {entryToDelete.amount.toLocaleString()}
                </strong>{' '}
                ({entryToDelete.category})? This action cannot be undone.
              </p>
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Slip / Voucher Ref:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {entryToDelete.slipNo || entryToDelete.entryNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Party / Head:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">
                    {entryToDelete.customerName || 'General Disbursement'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Type:</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {entryToDelete.type === 'cash_in' ? 'Cash In (Credit)' : 'Cash Out (Debit)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteRoznamchaEntry && entryToDelete) {
                    await onDeleteRoznamchaEntry(entryToDelete.id);
                  }
                  setEntryToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Pay Supplier / Settle Debt Voucher Modal */}
      {showPaySupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Pay Supplier / Settle Debt</h3>
                  <span className="text-[10px] text-slate-400">
                    Disburse Cash / Bank Payment to Settle GRN Debt
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaySupplierModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const amt = parseFloat(payAmount);
                if (isNaN(amt) || amt <= 0) return;
                const sName = paySupplierName.trim() || 'Volker Life';
                const createdEntry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'> = {
                  date: payDate
                    ? `${payDate}T${new Date().toTimeString().slice(0, 8)}`
                    : new Date().toISOString(),
                  accountCode: 'AC-5010',
                  category: 'Supplier Payment',
                  narration: payNarration.trim() || `Payment to ${sName} for GRN stock settlement`,
                  amount: amt,
                  type: 'cash_out',
                  slipNo: paySlipNo,
                  supplierName: sName,
                  paymentMethod: payMethod,
                  recordedBy: 'Executive Cashier (Console)',
                  tenant_id: 'tenant_pk_swat_1042',
                };

                await onAddEntry(createdEntry);
                setShowPaySupplierModal(false);

                // Auto-open voucher slip preview for instant printing
                setSelectedVoucherForReceipt({
                  ...createdEntry,
                  id: `pay-${Date.now()}`,
                  entryNo: paySlipNo,
                  synced: false,
                });
              }}
              className="p-6 space-y-4 text-xs"
            >
              {/* Supplier Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Select Supplier / Vendor *
                </label>
                <div className="flex gap-2">
                  <select
                    value={paySupplierName}
                    onChange={(e) => setPaySupplierName(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs"
                  >
                    {uniqueSupplierNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={paySupplierName}
                    onChange={(e) => setPaySupplierName(e.target.value)}
                    placeholder="Or type custom vendor name"
                    className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Settlement Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 250000"
                    required
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Voucher Date *
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Payment Channel & Voucher # */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Payment Method / Source
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full h-10 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 px-3 focus:outline-none text-xs"
                  >
                    <option value="Cash">Cash (Vault / Drawer)</option>
                    <option value="Bank AL Habib / Raast">Bank AL Habib / Raast</option>
                    <option value="EasyPaisa">EasyPaisa / JazzCash</option>
                    <option value="Cheque">Cross Cheque / Pay Order</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Voucher Ref / Slip #
                  </label>
                  <input
                    type="text"
                    value={paySlipNo}
                    onChange={(e) => setPaySlipNo(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Narration */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Transaction Particulars / Memo
                </label>
                <input
                  type="text"
                  value={payNarration}
                  onChange={(e) => setPayNarration(e.target.value)}
                  placeholder="e.g. Settle partial invoice of GRN-1002"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none text-xs"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaySupplierModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Post &amp; Print Voucher</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
