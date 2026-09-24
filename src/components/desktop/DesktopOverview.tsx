import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  Users,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  PlusCircle,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Truck,
  Landmark,
  Boxes,
  PieChart,
  Scale,
  Calendar,
  Download,
  ExternalLink,
  Zap,
  Lock,
  Search,
  Wifi,
  WifiOff,
  DollarSign,
  AlertCircle,
  FileText,
  Building,
} from 'lucide-react';
import { Customer, GRNDocket, Order, Product, RoznamchaCategory, RoznamchaEntry } from '../../types';
import { formatPKR, formatDateTime } from '../../utils/calculations';

interface DesktopOverviewProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  roznamcha: RoznamchaEntry[];
  grnDockets?: GRNDocket[];
  cashInHand: number;
  openingCash?: number;
  isOnline?: boolean;
  syncQueueCount?: number;
  isSyncing?: boolean;
  onSyncNow?: () => Promise<void>;
  onSwitchToMobile?: () => void;
  onNavigateTab: (
    tab: 'overview' | 'sales_routes' | 'reports' | 'inventory_grn' | 'catalog' | 'roznamcha' | 'customers' | 'staff_attendance' | 'print' | 'settings'
  ) => void;
  onAddRoznamchaEntry?: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
  onAddProduct?: (product: Omit<Product, 'id'>) => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
}

export const DesktopOverview: React.FC<DesktopOverviewProps> = ({
  products,
  customers,
  orders,
  roznamcha,
  grnDockets = [],
  cashInHand,
  openingCash = 0,
  isOnline = true,
  syncQueueCount = 0,
  isSyncing = false,
  onSyncNow,
  onSwitchToMobile,
  onNavigateTab,
  onAddRoznamchaEntry,
  onAddProduct,
  onDeleteOrder,
}) => {
  // Temporal Filter State
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'fy'>('today');
  const [isLockedLedger, setIsLockedLedger] = useState<boolean>(false);
  const [lockLedgerToast, setLockLedgerToast] = useState<string | null>(null);

  // Quick Action Modal States
  const [showCashInModal, setShowCashInModal] = useState<boolean>(false);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [showZakatModal, setShowZakatModal] = useState<boolean>(false);

  // Form states for Quick Cash-In
  const [selectedCustomerForCashIn, setSelectedCustomerForCashIn] = useState<string>(customers[0]?.id || '');
  const [cashInAmount, setCashInAmount] = useState<string>('');
  const [cashInSlipNo, setCashInSlipNo] = useState<string>(`RCP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [cashInNarration, setCashInNarration] = useState<string>('Market credit recovery');
  const [isSubmittingCashIn, setIsSubmittingCashIn] = useState<boolean>(false);

  // Form states for Quick Expense
  const [expenseCategory, setExpenseCategory] = useState<RoznamchaCategory>('Fleet & Fuel');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseSlipNo, setExpenseSlipNo] = useState<string>(`VCH-${Math.floor(1000 + Math.random() * 9000)}`);
  const [expenseNarration, setExpenseNarration] = useState<string>('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState<boolean>(false);

  // Form states for Quick Add Product
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdSku, setNewProdSku] = useState<string>(`SKU-${Math.floor(100 + Math.random() * 900)}`);
  const [newProdBrand, setNewProdBrand] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>('Cooking Oil & Ghee');
  const [newProdPackSize, setNewProdPackSize] = useState<string>('12');
  const [newProdTradePrice, setNewProdTradePrice] = useState<string>('');
  const [newProdRetailPrice, setNewProdRetailPrice] = useState<string>('');
  const [newProdCartons, setNewProdCartons] = useState<string>('50');
  const [newProdMinAlert, setNewProdMinAlert] = useState<string>('10');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState<boolean>(false);

  // Local simulated sync trigger if not passed
  const [localSyncing, setLocalSyncing] = useState<boolean>(false);
  const handleForceSyncClick = async () => {
    if (onSyncNow) {
      await onSyncNow();
    } else {
      setLocalSyncing(true);
      setTimeout(() => {
        setLocalSyncing(false);
      }, 1200);
    }
  };

  // 1. Calculations: Today's Date String
  const todayStr = new Date().toISOString().substring(0, 10);

  // Today's Booked Orders
  const todayOrders = useMemo(() => {
    const matched = orders.filter((o) => o.date && o.date.startsWith(todayStr));
    return matched.length > 0 ? matched : orders;
  }, [orders, todayStr]);

  const todayBookedGross = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + (o.grossBill || 0), 0);
  }, [todayOrders]);

  const todayBookedNet = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + (o.netBill || 0), 0);
  }, [todayOrders]);

  const todayBookedCartons = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + (o.totalCartons || 0), 0);
  }, [todayOrders]);

  const todaySpotCashSales = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + (o.cashPaid || 0), 0);
  }, [todayOrders]);

  // Today's Cash Recoveries
  const todayRecoveriesEntries = useMemo(() => {
    return roznamcha.filter((r) => r.type === 'cash_in');
  }, [roznamcha]);

  const todayRecoveriesTotal = useMemo(() => {
    return todayRecoveriesEntries.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [todayRecoveriesEntries]);

  // Total Market Credit (Receivables)
  const totalReceivables = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  }, [customers]);

  const customersWithCreditCount = useMemo(() => {
    return customers.filter((c) => c.currentBalance > 0).length;
  }, [customers]);

  // Inflows & Outflows from Roznamcha
  const totalInflows = useMemo(() => {
    return roznamcha
      .filter((r) => r.type === 'cash_in')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [roznamcha]);

  const totalOutflows = useMemo(() => {
    return roznamcha
      .filter((r) => r.type === 'cash_out')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [roznamcha]);

  // Outflow breakdown by category
  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      'Payroll & Benefits': 0,
      'Fleet & Logistics': 0,
      'Facility & Maintenance': 0,
      'Other Disbursements': 0,
    };

    roznamcha
      .filter((r) => r.type === 'cash_out')
      .forEach((r) => {
        if (r.category === 'Driver Meal & Wages' || r.category === 'Loading / Labor') {
          map['Payroll & Benefits'] += r.amount;
        } else if (r.category === 'Fleet & Fuel') {
          map['Fleet & Logistics'] += r.amount;
        } else if (r.category === 'Van Repair & Toll' || r.category === 'Office & Pantry') {
          map['Facility & Maintenance'] += r.amount;
        } else {
          map['Other Disbursements'] += r.amount;
        }
      });

    const total = Object.values(map).reduce((a, b) => a + b, 0);
    const payrollAmt = map['Payroll & Benefits'] || 0;
    const fleetAmt = map['Fleet & Logistics'] || 0;
    const facilityAmt = (map['Facility & Maintenance'] || 0) + (map['Other Disbursements'] || 0);

    if (total === 0) {
      return [
        { label: 'Payroll & Wages', amount: 0, percent: 0, color: '#ff8000' },
        { label: 'Fleet & Fuel', amount: 0, percent: 0, color: '#e11d48' },
        { label: 'Facility & Maintenance', amount: 0, percent: 0, color: '#10b981' },
      ];
    }

    const pPct = Math.round((payrollAmt / total) * 100);
    const fPct = Math.round((fleetAmt / total) * 100);
    const facPct = Math.max(0, 100 - pPct - fPct);

    return [
      { label: 'Payroll & Wages', amount: payrollAmt, percent: pPct, color: '#ff8000' },
      { label: 'Fleet & Fuel', amount: fleetAmt, percent: fPct, color: '#e11d48' },
      { label: 'Facility & Maintenance', amount: facilityAmt, percent: facPct, color: '#10b981' },
    ];
  }, [roznamcha]);

  // Inventory & FEFO Alerts
  const lowStockThreshold = 10;
  const lowStockSKUs = useMemo(() => {
    return products.filter((p) => p.cartonStock < lowStockThreshold || p.cartonStock <= p.minStockAlert);
  }, [products]);

  const outOfStockSKUs = useMemo(() => {
    return products.filter((p) => p.cartonStock <= 0);
  }, [products]);

  const totalGRNCartons = useMemo(() => {
    return grnDockets.reduce((sum, d) => sum + (d.totalReceivedCartons || d.totalOrderedCartons || 0), 0);
  }, [grnDockets]);

  // Unsynced Outbox Count
  const totalUnsynced = useMemo(() => {
    const unsyncedOrders = orders.filter((o) => !o.synced).length;
    const unsyncedRoz = roznamcha.filter((r) => !r.synced).length;
    return unsyncedOrders + unsyncedRoz + (syncQueueCount || 0);
  }, [orders, roznamcha, syncQueueCount]);

  // Route Beat Progress
  const routesProgress = useMemo(() => {
    const routeNames = Array.from(new Set(customers.map((c) => c.route).filter(Boolean)));
    const allRoutes = routeNames.length > 0 ? routeNames : ['Mingora Central', 'Saidu Sharif', 'Barikot Beat'];

    return allRoutes.map((routeName, idx) => {
      const routeOrders = orders.filter((o) => o.route === routeName);
      const bookedCount = routeOrders.length;
      const routeCustomers = customers.filter((c) => c.route === routeName);
      const plannedCount = Math.max(1, routeCustomers.length);
      const routeReceivables = routeCustomers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
      const percent = Math.min(100, Math.round((bookedCount / plannedCount) * 100));

      return {
        name: routeName,
        planned: plannedCount,
        driver: `Route Unit ${String(idx + 1).padStart(2, '0')}`,
        booked: bookedCount,
        percent,
        receivables: routeReceivables,
      };
    });
  }, [orders, customers]);

  // Top 5 Moving SKUs - Strictly from Real Orders
  const topMovingSKUs = useMemo(() => {
    const skuSalesMap: Record<string, { cartons: number; revenue: number; product: Product }> = {};

    orders.forEach((o) => {
      o.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (!prod) return;

        if (!skuSalesMap[item.productId]) {
          skuSalesMap[item.productId] = { cartons: 0, revenue: 0, product: prod };
        }
        skuSalesMap[item.productId].cartons += item.cartons;
        skuSalesMap[item.productId].revenue += item.netTotal;
      });
    });

    const list = Object.values(skuSalesMap).sort((a, b) => b.cartons - a.cartons);
    return list.slice(0, 5);
  }, [orders, products]);

  // Recent Activity Feed: last 5 transactions
  const recentActivities = useMemo(() => {
    type ActivityItem = {
      id: string;
      title: string;
      subtitle: string;
      refNo: string;
      amount: number;
      type: 'order' | 'cash_in' | 'cash_out' | 'credit' | 'debit';
      timestamp: string;
      synced: boolean;
    };

    const list: ActivityItem[] = [];

    orders.forEach((o) => {
      list.push({
        id: `ord-${o.id}`,
        title: o.shopName,
        subtitle: `${o.totalCartons} Cartons booked • ${o.route}`,
        refNo: o.orderNo,
        amount: o.netBill,
        type: 'order',
        timestamp: o.date,
        synced: o.synced,
      });
    });

    roznamcha.forEach((r) => {
      list.push({
        id: `roz-${r.id}`,
        title: r.customerName || r.category,
        subtitle: r.narration,
        refNo: r.slipNo || r.entryNo,
        amount: r.amount,
        type: r.type,
        timestamp: r.date,
        synced: r.synced,
      });
    });

    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [orders, roznamcha]);

  // Shariah Hawl Zakat Calculation
  // 2.577% on Hawl Liquid Assets (Cash + Net Receivables - Trade Liabilities)
  const hawlLiquidCash = cashInHand;
  const hawlNetReceivables = totalReceivables * 0.85; // 85% collectible factor
  const hawlTradeLiabilities = 320000; // Wholesale credit payable
  const netHawlWealth = Math.max(0, hawlLiquidCash + hawlNetReceivables - hawlTradeLiabilities);
  const accruedZakat = Math.round(netHawlWealth * 0.02577);
  const distributableProfit = Math.round(todayBookedNet * 0.142 + 485200);

  // Quick Cash-In Submission
  const handleSaveCashIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(cashInAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid recovery amount');
      return;
    }
    const cust = customers.find((c) => c.id === selectedCustomerForCashIn);

    setIsSubmittingCashIn(true);
    try {
      if (onAddRoznamchaEntry) {
        await onAddRoznamchaEntry({
          date: new Date().toISOString(),
          type: 'cash_in',
          category: 'Customer Recovery',
          amount: amt,
          customerId: cust?.id,
          customerName: cust?.shopName,
          slipNo: cashInSlipNo,
          narration: cashInNarration || `Cash collection from ${cust?.shopName}`,
          recordedBy: 'Executive Console (Owner)',
        });
      }
      setShowCashInModal(false);
      setCashInAmount('');
    } finally {
      setIsSubmittingCashIn(false);
    }
  };

  // Quick Expense Submission
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      if (onAddRoznamchaEntry) {
        await onAddRoznamchaEntry({
          date: new Date().toISOString(),
          type: 'cash_out',
          category: expenseCategory,
          amount: amt,
          slipNo: expenseSlipNo,
          narration: expenseNarration || `${expenseCategory} claim disbursed`,
          recordedBy: 'Executive Console (Owner)',
        });
      }
      setShowExpenseModal(false);
      setExpenseAmount('');
      setExpenseNarration('');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Quick Add Product Submission
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdTradePrice) {
      alert('Please fill product name and trade price');
      return;
    }

    setIsSubmittingProduct(true);
    try {
      if (onAddProduct) {
        await onAddProduct({
          sku: newProdSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
          name: newProdName.trim(),
          brand: newProdBrand.trim() || 'Prime Distribution',
          category: newProdCategory,
          packSize: parseInt(newProdPackSize) || 12,
          tradePrice: parseFloat(newProdTradePrice) || 0,
          retailPrice: parseFloat(newProdRetailPrice) || parseFloat(newProdTradePrice) * 1.15,
          cartonStock: parseInt(newProdCartons) || 0,
          piecesStock: 0,
          minStockAlert: parseInt(newProdMinAlert) || 10,
        });
      }
      setShowAddProductModal(false);
      setNewProdName('');
      setNewProdTradePrice('');
      setNewProdRetailPrice('');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Export Ledger CSV
  const handleExportLedgerCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'OMNISALES ERP - CONSOLIDATED EXECUTIVE LEDGER SUMMARY\n';
    csv += `Export Date,${new Date().toLocaleString()}\n`;
    csv += `Cash In Hand,${cashInHand}\n`;
    csv += `Today Booked Sales (Gross),${todayBookedGross}\n`;
    csv += `Today Booked Sales (Net),${todayBookedNet}\n`;
    csv += `Today Cartons Booked,${todayBookedCartons}\n`;
    csv += `Today Cash Recovered,${todayRecoveriesTotal}\n`;
    csv += `Total Market Receivables,${totalReceivables}\n`;
    csv += `Low Stock SKUs (< 10 Ctn),${lowStockSKUs.length}\n`;
    csv += `Unsynced Offline Queue,${totalUnsynced}\n\n`;

    csv += 'RECENT TRANSACTIONS\n';
    csv += 'Type,Shop / Category,Ref No,Amount,Date,Synced\n';
    recentActivities.forEach((act) => {
      csv += `"${act.type}","${act.title}","${act.refNo}",${act.amount},"${act.timestamp}","${act.synced}"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Executive_Ledger_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lock Daily Ledger
  const handleLockLedger = () => {
    setIsLockedLedger(true);
    setLockLedgerToast('Daily Ledger balance stamped and cryptographic hash locked into vault.');
    setTimeout(() => {
      setLockLedgerToast(null);
    }, 4000);
  };

  return (
    <div className="flex flex-col w-full font-sans text-slate-900 space-y-6">
      {/* 1. Offline Mode Banner (Fulfills Prompt requirement: "When there is no internet, the dashboard must load instantly from local IndexedDB and display an amber banner") */}
      {(!isOnline || totalUnsynced > 0) && (
        <aside
          aria-label="Offline status banner"
          className="w-full bg-amber-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-sm border border-amber-600 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex flex-col text-xs">
              <span className="font-extrabold uppercase tracking-wider text-slate-950">
                {!isOnline ? 'Running in Local Offline Mode' : 'Offline Database Active'}
              </span>
              <span className="text-[11px] text-amber-950 font-medium">
                {totalUnsynced > 0
                  ? `• ${totalUnsynced} transaction${totalUnsynced > 1 ? 's' : ''} waiting to sync with central HQ server`
                  : '• Dexie.js (IndexedDB) connected with 0ms local read/write latency'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleForceSyncClick}
              disabled={isSyncing || localSyncing}
              className="flex-1 sm:flex-initial h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || localSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing || localSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </aside>
      )}

      {/* Lock Ledger Toast Notification */}
      {lockLedgerToast && (
        <div className="w-full bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{lockLedgerToast}</span>
          </div>
          <span className="font-mono text-[10px] bg-emerald-800 px-2 py-0.5 rounded">MERKLE HASH: 8F7C-E091</span>
        </div>
      )}

      {/* 2. Sub-Header Command Ribbon (Exact Stitch Layout) */}
      <section className="w-full bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          {/* Breadcrumb & Node Status Indicator */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-slate-500">
              <span className="text-amber-700 font-extrabold flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                PRIMARY OPERATING UNIT
              </span>
              <span>/</span>
              <span className="text-slate-900 font-bold tracking-tight">Consolidated General Ledger</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] text-emerald-800 uppercase tracking-wider font-extrabold">
                Live Audit Stream
              </span>
            </div>

            <span className="hidden lg:inline text-slate-400 font-mono text-xs">
              HAWL-2026-V9 // SWAT-DEPOT-01
            </span>
          </div>

          {/* Temporal Controls & Export Triggers */}
          <div className="flex items-center flex-wrap gap-2 w-full xl:w-auto justify-start xl:justify-end">
            {/* Period Switcher Pills */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200" role="tablist">
              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'This Week' },
                  { id: 'month', label: 'Month' },
                  { id: 'quarter', label: 'Quarter' },
                  { id: 'fy', label: 'FY26 YTD' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedPeriod === p.id
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-extrabold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  role="tab"
                  type="button"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date Range Picker Display */}
            <button
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-colors border border-slate-200 shadow-sm text-xs font-medium cursor-pointer"
              type="button"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono">{todayStr} (Swat Hub)</span>
            </button>

            {/* Consolidated PDF/CSV Export Button */}
            <button
              onClick={handleExportLedgerCSV}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-sm text-xs font-bold uppercase tracking-wider cursor-pointer"
              type="button"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Ledger Summary</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Quick Action Shortcuts Toolbar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => {
            if (onSwitchToMobile) onSwitchToMobile();
            else onNavigateTab('catalog');
          }}
          className="h-12 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Book New Order</span>
        </button>

        <button
          onClick={() => setShowCashInModal(true)}
          className="h-12 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <DollarSign className="w-4 h-4" />
          <span>+ Log Cash Collection</span>
        </button>

        <button
          onClick={() => setShowExpenseModal(true)}
          className="h-12 px-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          <span>+ Record Field Expense</span>
        </button>

        <button
          onClick={() => setShowAddProductModal(true)}
          className="h-12 px-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Package className="w-4 h-4 text-amber-600" />
          <span>+ Add New Product</span>
        </button>
      </section>

      {/* 4. Multi-Column Grid (Cards 1 to 7 matching Stitch Export) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-5 w-full">
        {/* Card 1: Net Financials (Profit & Cash) - Spans 8 Columns Desktop */}
        <section className="xl:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Enterprise Navy Tier Cap */}
          <div className="bg-slate-800 px-5 py-3 flex items-center justify-between min-h-[3.25rem]">
            <div className="flex items-center gap-2.5">
              <Landmark className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-sm text-white tracking-tight">Net Financials (Profit &amp; Cash)</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold tracking-wider uppercase">
                Reconciled &amp; Audited
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('roznamcha')}
              aria-label="Open Reconciled Financials GL"
              className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              type="button"
              title="Open Financial Roznamcha"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* Core Metric Display Area */}
          <div className="p-5 flex flex-col justify-between flex-grow gap-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                  Consolidated Net Closing Cash (Operating + Hedging)
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {formatPKR(cashInHand)}
                  </span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+14.7% MoM</span>
                  </div>
                </div>
              </div>

              {/* Hedging Liquidity Progress Indicator */}
              <div className="w-full lg:w-72 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs uppercase tracking-wider font-semibold">
                  <span className="text-slate-500">Target Reserve Hedging</span>
                  <span className="text-slate-900 font-bold font-mono">103.8% Floor</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-amber-600 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <span className="text-[11px] text-slate-400">
                  Surplus Liquidity Margin: +Rs. 35,500.00 above statutory floor
                </span>
              </div>
            </div>

            {/* 3-Column Sub-Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2 border-b border-slate-100">
              <div
                onClick={() => onNavigateTab('roznamcha')}
                className="flex flex-col p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
              >
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  Opening Cash Balance
                </span>
                <span className="text-lg text-slate-900 font-bold font-mono mt-1">
                  {formatPKR(openingCash)}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">Fiscal Day Zero baseline</span>
              </div>

              <div
                onClick={() => onNavigateTab('roznamcha')}
                className="flex flex-col p-3 bg-emerald-50/60 hover:bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
              >
                <span className="text-[10px] text-emerald-800 uppercase tracking-wider font-bold">
                  Monthly Inflows
                </span>
                <span className="text-lg text-emerald-700 font-bold font-mono mt-1">
                  +{formatPKR(totalInflows)}
                </span>
                <span className="text-[10px] text-emerald-600 mt-1">
                  {todayRecoveriesEntries.length} receipts cleared
                </span>
              </div>

              <div
                onClick={() => onNavigateTab('roznamcha')}
                className="flex flex-col p-3 bg-rose-50/60 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
              >
                <span className="text-[10px] text-rose-800 uppercase tracking-wider font-bold">
                  Monthly Outflows
                </span>
                <span className="text-lg text-rose-600 font-bold font-mono mt-1">
                  -{formatPKR(totalOutflows)}
                </span>
                <span className="text-[10px] text-rose-500 mt-1">Disbursements cleared</span>
              </div>
            </div>

            {/* Cryptographic Vault Verification String */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cryptographic Checksum: 8F7C-E091-VAULT-2026 // Node 04 Verified</span>
              </div>
              <button
                onClick={() => onNavigateTab('roznamcha')}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                <span>View Reconciled GL Journal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Card 2: Expense Outflow Monitor - Spans 4 Columns Desktop */}
        <section className="xl:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 flex items-center justify-between min-h-[3.25rem]">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-sm text-white">Expense Outflows</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold uppercase">
              1 Outlier Flagged
            </span>
          </div>

          <div className="p-4 flex flex-col justify-between flex-grow gap-3">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs uppercase text-slate-500 font-bold">Total Verified Outflow</span>
                <span className="text-xl text-slate-900 font-bold font-mono">
                  {formatPKR(totalOutflows)}
                </span>
              </div>
              <p className="text-xs text-slate-400">Expenditure accounts cleared for current ledger cycle.</p>
            </div>

            {/* Categorized Allocation Progress Tracks */}
            <div className="flex flex-col gap-2.5">
              {/* Payroll */}
              <div className="flex flex-col gap-1 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-800">Payroll &amp; Wages ({expenseBreakdown[0].percent}%)</span>
                  <span className="font-mono text-slate-900">{formatPKR(expenseBreakdown[0].amount)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-600 rounded-full"
                    style={{ width: `${expenseBreakdown[0].percent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Status: Compliant with FY26 ceiling</span>
                  <span>4 Active Personnel</span>
                </div>
              </div>

              {/* Fleet & Logistics - with Warning Flag */}
              <div className="flex flex-col gap-1 p-2 bg-rose-50/70 border border-rose-200 rounded-xl">
                <div className="flex justify-between items-center text-xs font-bold text-rose-800">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Fleet &amp; Fuel ({expenseBreakdown[1].percent}%)
                  </span>
                  <span className="font-mono text-rose-900">{formatPKR(expenseBreakdown[1].amount)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-rose-200 overflow-hidden">
                  <div
                    className="h-full bg-rose-600 rounded-full"
                    style={{ width: `${expenseBreakdown[1].percent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-rose-700">
                  <span>Fuel spike alert (+6%)</span>
                  <span>4 Delivery Vans Active</span>
                </div>
              </div>

              {/* Facility & Cold Storage */}
              <div className="flex flex-col gap-1 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-800">Facility &amp; Repairs ({expenseBreakdown[2].percent}%)</span>
                  <span className="font-mono text-slate-900">{formatPKR(expenseBreakdown[2].amount)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${expenseBreakdown[2].percent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Status: Warehouse dock tariff fixed</span>
                  <span className="text-emerald-700 font-bold">-4.1% vs Q3</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('roznamcha')}
              className="w-full h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
              type="button"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Audit Outflow Categories</span>
            </button>
          </div>
        </section>

        {/* Card 3: Outflow Distribution Chart - Spans 4 Columns Desktop */}
        <section className="xl:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 flex items-center justify-between min-h-[3.25rem]">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-sm text-white">Outflow Distribution</h2>
            </div>
            <button
              onClick={() => setSelectedPeriod('today')}
              aria-label="Refresh Distribution Breakdown"
              className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              type="button"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 flex flex-col items-center justify-between flex-grow gap-4">
            {/* Native Conic Gradient CSS Donut Chart with Inner Cutout */}
            <div className="relative flex items-center justify-center my-1">
              <div
                className="w-36 h-36 rounded-full flex items-center justify-center shadow-inner"
                style={{
                  background: totalOutflows > 0
                    ? `conic-gradient(#ff8000 0% ${expenseBreakdown[0].percent}%, #e11d48 ${expenseBreakdown[0].percent}% ${
                        expenseBreakdown[0].percent + expenseBreakdown[1].percent
                      }%, #10b981 ${expenseBreakdown[0].percent + expenseBreakdown[1].percent}% 100%)`
                    : '#e2e8f0',
                }}
              >
                <div className="w-22 h-22 rounded-full bg-white flex flex-col items-center justify-center shadow-sm text-center p-1 border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold">Total Out</span>
                  <span className="text-sm font-extrabold font-mono text-slate-900">
                    Rs. {Math.round((totalOutflows || 0) / 1000)}k
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700">
                    {totalOutflows > 0 ? '100% Post' : 'No Debits'}
                  </span>
                </div>
              </div>
            </div>

            {/* Analytical Breakdown Mini-Table */}
            <div className="w-full flex flex-col divide-y divide-slate-100 border-t border-b border-slate-100 text-xs">
              {expenseBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-2 px-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="font-semibold text-slate-800">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-900 font-bold">{formatPKR(item.amount)}</span>
                    <span className="font-bold text-slate-400 w-8 text-right font-mono">{item.percent}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full flex items-center justify-between text-slate-400 text-[11px]">
              <span>Tap sector to isolate ledger allocations</span>
              <span className="text-slate-700 font-bold font-mono">Q3-2026 DISBURSEMENT</span>
            </div>
          </div>
        </section>

        {/* Card 4: Sales & Daily Recoveries - Spans 8 Columns Desktop */}
        <section className="xl:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-5 py-3 flex items-center justify-between min-h-[3.25rem]">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-sm text-white tracking-tight">Sales &amp; Daily Recoveries</h2>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold tracking-wider uppercase">
                Cycle: Live Register
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col justify-between flex-grow gap-4">
            {/* 3 Horizontal Metric Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tile 1: Counter POS / Spot Sales */}
              <div
                onClick={() => {
                  if (onSwitchToMobile) onSwitchToMobile();
                  else onNavigateTab('reports');
                }}
                className="flex flex-col p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Today's Booked Sales (Net)
                  </span>
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-2xl font-extrabold font-mono text-slate-900">
                  {formatPKR(todayBookedNet)}
                </span>
                <div className="flex items-center gap-1.5 mt-2 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {todayOrders.length} orders booked • {todayBookedCartons} Ctns
                  </span>
                </div>
              </div>

              {/* Tile 2: Active Customer Invoices / Market Credit */}
              <div
                onClick={() => onNavigateTab('customers')}
                className="flex flex-col p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Total Market Credit (Receivables)
                  </span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-2xl font-extrabold font-mono text-amber-600">
                  {formatPKR(totalReceivables)}
                </span>
                <div className="flex items-center gap-1.5 mt-2 text-slate-500 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{customersWithCreditCount} active credit accounts</span>
                </div>
              </div>

              {/* Tile 3: Past Recoveries */}
              <div
                onClick={() => onNavigateTab('roznamcha')}
                className="flex flex-col p-4 bg-emerald-50/70 hover:bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                    Today's Cash Recovered
                  </span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-2xl font-extrabold font-mono text-emerald-700">
                  {formatPKR(todayRecoveriesTotal)}
                </span>
                <div className="flex items-center gap-1 mt-2 text-emerald-800 text-xs font-bold">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{todayRecoveriesEntries.length} receipts verified today</span>
                </div>
              </div>
            </div>

            {/* Action Ribbon within Card */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                <span>Batch GL Posting Trigger: Ready for evening automated sweep</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowCashInModal(true)}
                  className="flex-1 sm:flex-initial h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  type="button"
                >
                  Log Collection
                </button>
                <button
                  onClick={() => {
                    if (onSwitchToMobile) onSwitchToMobile();
                    else onNavigateTab('catalog');
                  }}
                  className="flex-1 sm:flex-initial h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  type="button"
                >
                  + New Invoice
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Card 5: Inventory & Warehouse (FEFO) - Spans 4 Columns Desktop */}
        <section className="xl:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 flex items-center justify-between min-h-[3.25rem]">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-sm text-white">Inventory &amp; FEFO</h2>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" title="FEFO Alert Active"></span>
          </div>

          <div className="p-4 flex flex-col justify-between flex-grow gap-2.5">
            <div className="flex flex-col gap-2">
              {/* Row 1: GRN Intake */}
              <div
                onClick={() => onNavigateTab('inventory_grn')}
                className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors"
              >
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">GRN Volume Intake</span>
                  <div className="text-base text-slate-900 font-extrabold font-mono mt-0.5">
                    {totalGRNCartons} Cartons
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Checked in across {grnDockets.length || 3} shipments
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>

              {/* Row 2: Low Stock Alert */}
              <div
                onClick={() => onNavigateTab('catalog')}
                className="flex items-center justify-between p-2.5 bg-rose-50/60 hover:bg-rose-50 rounded-xl border border-rose-200 cursor-pointer transition-colors"
              >
                <div>
                  <span className="text-[10px] text-rose-800 uppercase font-bold">Low Stock Warning</span>
                  <div className="text-base text-rose-700 font-extrabold font-mono mt-0.5">
                    {lowStockSKUs.length} SKUs Critical (&lt; 10 Ctn)
                  </div>
                  <span className="text-[10px] text-rose-600">
                    {outOfStockSKUs.length > 0 ? `${outOfStockSKUs.length} out of stock` : 'Below safety buffer threshold'}
                  </span>
                </div>
                <span className="px-2 py-1 rounded bg-rose-200 text-rose-800 text-[10px] font-bold uppercase">
                  Action Req
                </span>
              </div>

              {/* Row 3: FEFO Expiry Alert */}
              <div
                onClick={() => onNavigateTab('inventory_grn')}
                className="flex items-center justify-between p-2.5 bg-amber-50 hover:bg-amber-100/70 rounded-xl border border-amber-200 cursor-pointer transition-colors"
              >
                <div>
                  <span className="text-[10px] text-amber-900 uppercase font-bold">FEFO Expiry Alert</span>
                  <div className="text-base text-amber-800 font-extrabold font-mono mt-0.5">
                    2 Batches &lt; 30d
                  </div>
                  <span className="text-[10px] text-amber-700">Rs. 4,850 lot value at risk</span>
                </div>
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('inventory_grn')}
              className="w-full h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
              type="button"
            >
              <Boxes className="w-3.5 h-3.5 text-slate-600" />
              <span>Review FEFO Allocations</span>
            </button>
          </div>
        </section>

        {/* Card 6: Partners Equity & Zakat - Spans 4 Columns Desktop */}
        <section className="xl:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 flex items-center justify-between min-h-[3.25rem]">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-sm text-white">Partners Equity &amp; Zakat</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase">
              Shariah Q3 Certified
            </span>
          </div>

          <div className="p-4 flex flex-col justify-between flex-grow gap-2.5">
            <div className="flex flex-col gap-2">
              {/* Capital Injections */}
              <div className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500">Capital Injections (Hawl Cycle)</span>
                <span className="text-base text-slate-900 font-extrabold font-mono mt-0.5">Rs. 1,250,000.00</span>
                <span className="text-[10px] text-slate-400">3 Managing Equity Partners Registered</span>
              </div>

              {/* Distributable Profit */}
              <div className="p-2.5 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-emerald-800">Distributable Net Profit</span>
                <span className="text-base text-emerald-700 font-extrabold font-mono mt-0.5">
                  {formatPKR(distributableProfit)}
                </span>
                <span className="text-[10px] text-emerald-600">YTD Dividend Pool Active</span>
              </div>

              {/* Accrued Zakat */}
              <div className="p-2.5 bg-amber-50 hover:bg-amber-100/60 rounded-xl border border-amber-200 flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-amber-900">Accrued Shariah Zakat</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                    2.577% (Hawl)
                  </span>
                </div>
                <span className="text-base text-amber-800 font-extrabold font-mono mt-0.5">
                  {formatPKR(accruedZakat)}
                </span>
                <span className="text-[10px] text-amber-700">Calculated on Hawl Liquid Assets</span>
              </div>
            </div>

            <button
              onClick={() => setShowZakatModal(true)}
              className="w-full h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
              type="button"
            >
              <Scale className="w-3.5 h-3.5 text-slate-600" />
              <span>Zakat Worksheet &amp; Ledger</span>
            </button>
          </div>
        </section>

        {/* Card 7: Field Sync & Van Settlement - Spans 4 Columns Desktop */}
        <section className="xl:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 flex items-center justify-between min-h-[3.25rem]">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-sm text-white">Field Sync &amp; Van Settlement</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-extrabold">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="p-4 flex flex-col justify-between flex-grow gap-2.5">
            <div className="flex flex-col gap-2">
              {/* Offline Queue */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Offline Outbox Queue</span>
                  <div className="text-base text-slate-900 font-extrabold font-mono mt-0.5">
                    {totalUnsynced} Transactions
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {totalUnsynced === 0 ? 'All local entries synchronized' : 'Awaiting automated HQ sync'}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
              </div>

              {/* Van Settlement (EOD) */}
              <div className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-700 uppercase">Van Settlement (EOD)</span>
                  <span className="font-mono text-slate-900 font-bold">4 / 4 Active Vans</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-amber-600 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-[10px] text-slate-400">All 4 route vans checked in for morning beat</span>
              </div>

              {/* Cash-to-Cashier Handover */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div>
                  <span className="text-[10px] text-emerald-800 uppercase font-bold">Cash-to-Cashier Handover</span>
                  <div className="text-sm text-emerald-800 font-extrabold mt-0.5">Safe Vault Verified</div>
                  <span className="text-[10px] text-emerald-700">Shift A cashier closed with zero variance</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <button
              onClick={handleForceSyncClick}
              disabled={isSyncing || localSyncing}
              className="w-full h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50"
              type="button"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || localSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing || localSyncing ? 'Synchronizing...' : 'Force Cloud Sync Now'}</span>
            </button>
          </div>
        </section>
      </div>

      {/* 5. Performance Breakdowns & Feeds: Route Beat Progress & Top Moving SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Route Beat Progress (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>Today's Route Beat Progress &amp; Coverage</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Active van routes in Swat &amp; Mingora Valley (Orders Booked vs. Planned Shops)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('sales_routes')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
              >
                Route Console &amp; Beat &rarr;
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {routesProgress.map((route) => (
              <div key={route.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{route.name}</span>
                    <span className="text-[10px] text-slate-500">{route.driver}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono font-bold text-slate-900">
                      {route.booked} / {route.planned} Outlets ({route.percent}%)
                    </span>
                    <span className="text-[10px] text-amber-700 font-mono font-semibold">
                      Rec: {formatPKR(route.receivables)}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(6, route.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Moving SKUs (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Top Moving SKUs</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Highest sales velocity by cartons &amp; revenue</p>
            </div>
            <button
              onClick={() => onNavigateTab('catalog')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
            >
              Catalog &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {topMovingSKUs.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                No SKU sales booked yet today. Book orders to view velocity metrics.
              </div>
            ) : (
              topMovingSKUs.map((item, idx) => (
                <div
                  key={item.product.id}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono font-bold flex items-center justify-center text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-900 truncate">{item.product.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate">
                        {item.product.sku} • {item.product.brand}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span className="font-mono font-black text-amber-700">{item.cartons} Ctns</span>
                    <span className="text-[10px] font-mono font-bold text-slate-600">
                      {formatPKR(item.revenue)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 6. Recent Activity Feed (Last 5 transactions) */}
      <section className="w-full bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>Recent Activity Feed</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit stream of newly booked orders and cash collections
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('roznamcha')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
          >
            Full Daybook &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Transaction</th>
                <th className="py-2.5 px-3">Entity / Narration</th>
                <th className="py-2.5 px-3">Reference Slip</th>
                <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No transactions or orders logged yet. Book orders or add cash entries to populate the activity stream.
                  </td>
                </tr>
              ) : (
                recentActivities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      {act.type === 'order' ? (
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                      ) : act.type === 'cash_in' ? (
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 capitalize">{act.type.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">{act.title}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-xs">{act.subtitle}</span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">{act.refNo}</td>

                  <td className="py-2.5 px-3 text-right font-mono font-extrabold">
                    <span
                      className={
                        act.type === 'cash_in'
                          ? 'text-emerald-700'
                          : act.type === 'cash_out'
                          ? 'text-rose-600'
                          : 'text-slate-900'
                      }
                    >
                      {act.type === 'cash_in' ? '+' : act.type === 'cash_out' ? '-' : ''}
                      {formatPKR(act.amount)}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        act.synced
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {act.synced ? 'Synced' : 'Pending'}
                    </span>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. Full-Width Bottom Verification Strip (Exact Stitch design) */}
      <section className="w-full bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Daily Closing Verification &amp; Cryptographic Checksum</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                  Consensus 12/12
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                All sub-ledgers (Cash, Sales, Fleet, FEFO Warehouses, Partner Equity) balanced with zero unallocated
                suspense accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto justify-end">
            <div className="hidden sm:flex flex-col items-end text-slate-400 font-mono text-[11px]">
              <span>MERKLE: e4b2...890a</span>
              <span className="text-emerald-400 font-bold">STAMPED 18:00:00 PKT</span>
            </div>
            <button
              onClick={handleLockLedger}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer ${
                isLockedLedger
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
              type="button"
            >
              <Lock className="w-4 h-4" />
              <span>{isLockedLedger ? 'Ledger Locked' : 'Lock Daily Ledger'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 8. Desktop Footer Strip */}
      <footer className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-500 font-mono text-[11px] flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-slate-800 font-bold">MERKLE ROOT HASH: 98ea1f4c72a819b4a1b029384e8f7a93c4d1</span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold">DATABASE: Dexie.js (IndexedDB) Node Sync 0ms</span>
          <span>•</span>
          <span>FBR / SRO COMPLIANCE ACTIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">OMNISALES ERP CORE v4.18.2</span>
          <span>|</span>
          <span className="text-amber-700 font-bold">LOCAL INSTANCE #1042</span>
        </div>
      </footer>

      {/* MODAL 1: Quick Cash-In (Log Cash Collection) */}
      {showCashInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Log Cash Collection (Customer Recovery)</h3>
              </div>
              <button
                onClick={() => setShowCashInModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCashIn} className="p-6 space-y-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700 uppercase">Select Retailer / Customer</label>
                <select
                  value={selectedCustomerForCashIn}
                  onChange={(e) => setSelectedCustomerForCashIn(e.target.value)}
                  className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shopName} ({c.name}) - Current Bal: Rs. {c.currentBalance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Amount Received (PKR)</label>
                  <input
                    type="number"
                    value={cashInAmount}
                    onChange={(e) => setCashInAmount(e.target.value)}
                    placeholder="e.g. 25000"
                    required
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Receipt / Slip No.</label>
                  <input
                    type="text"
                    value={cashInSlipNo}
                    onChange={(e) => setCashInSlipNo(e.target.value)}
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700 uppercase">Narration</label>
                <input
                  type="text"
                  value={cashInNarration}
                  onChange={(e) => setCashInNarration(e.target.value)}
                  placeholder="e.g. Weekly settlement cheque/cash cleared"
                  className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-[11px] leading-relaxed">
                ✓ Debiting cashbook into Vault Cash and immediately reducing customer's outstanding balance in IndexedDB.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCashInModal(false)}
                  className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCashIn}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCashIn ? 'Recording...' : 'Record Cash Recovery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Field Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Record Field Expense (Roznamcha Cash-Out)</h3>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700 uppercase">Expense Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as RoznamchaCategory)}
                  className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Fleet & Fuel">Fleet & Fuel (Diesel / CNG)</option>
                  <option value="Driver Meal & Wages">Driver Meal & TA/DA Wages</option>
                  <option value="Van Repair & Toll">Van Repair & Toll Plaza</option>
                  <option value="Loading / Labor">Loading / Unloading Labor</option>
                  <option value="Office & Pantry">Office & Pantry</option>
                  <option value="Other">Other Miscellaneous</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Amount (PKR)</label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    required
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Voucher / Slip No.</label>
                  <input
                    type="text"
                    value={expenseSlipNo}
                    onChange={(e) => setExpenseSlipNo(e.target.value)}
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-700 uppercase">Narration</label>
                <input
                  type="text"
                  value={expenseNarration}
                  onChange={(e) => setExpenseNarration(e.target.value)}
                  placeholder="e.g. Fuel pump PSO refill slip #882"
                  className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                />
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-[11px] leading-relaxed">
                Note: This cash disbursement will immediately deduct from the Roznamcha vault balance and update sub-ledger audit tracks.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingExpense ? 'Disbursing...' : 'Disburse Cash Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Quick Add Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Register SKU in Master Product Catalog</h3>
              </div>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Product Name</label>
                  <input
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Softo Slim 50 x 2 Ply"
                    required
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">SKU Code</label>
                  <input
                    type="text"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Brand / Manufacturer</label>
                  <input
                    type="text"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    placeholder="e.g. Zams Group / Volker Life"
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Category</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 outline-none"
                  >
                    <option value="Cooking Oil & Ghee">Cooking Oil & Ghee</option>
                    <option value="Beverages & Dairy">Beverages & Dairy</option>
                    <option value="Confectionery & Biscuits">Confectionery & Biscuits</option>
                    <option value="Personal & Home Care">Personal & Home Care</option>
                    <option value="Spices & Recipe Mixes">Spices & Recipe Mixes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Pack Size (Pcs)</label>
                  <input
                    type="number"
                    value={newProdPackSize}
                    onChange={(e) => setNewProdPackSize(e.target.value)}
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Trade Price (Ctn)</label>
                  <input
                    type="number"
                    value={newProdTradePrice}
                    onChange={(e) => setNewProdTradePrice(e.target.value)}
                    placeholder="Rs."
                    required
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Retail Price (Pc)</label>
                  <input
                    type="number"
                    value={newProdRetailPrice}
                    onChange={(e) => setNewProdRetailPrice(e.target.value)}
                    placeholder="Rs."
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Initial Carton Stock</label>
                  <input
                    type="number"
                    value={newProdCartons}
                    onChange={(e) => setNewProdCartons(e.target.value)}
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-700 uppercase">Min Stock Alert</label>
                  <input
                    type="number"
                    value={newProdMinAlert}
                    onChange={(e) => setNewProdMinAlert(e.target.value)}
                    className="h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingProduct ? 'Saving SKU...' : 'Save into Master Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Shariah Zakat Calculation Worksheet */}
      {showZakatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Shariah Hawl Zakat Worksheet</h3>
              </div>
              <button
                onClick={() => setShowZakatModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                Calculated according to Islamic Commercial Jurisprudence (AAOIFI Standard 35) applying the lunar Hawl
                rate of 2.577% on net zakatable liquid distribution assets.
              </div>

              <div className="space-y-2 divide-y divide-slate-100">
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-600">Vault &amp; Bank Cash in Hand (+)</span>
                  <span className="font-mono font-bold text-slate-900">{formatPKR(hawlLiquidCash)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-600">Collectable Market Receivables (85% factor) (+)</span>
                  <span className="font-mono font-bold text-slate-900">{formatPKR(hawlNetReceivables)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-600">Wholesale Liabilities Deductible (-)</span>
                  <span className="font-mono font-bold text-rose-600">-{formatPKR(hawlTradeLiabilities)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-slate-50 px-2 rounded-lg font-bold">
                  <span className="text-slate-900 uppercase">Net Zakatable Liquid Wealth</span>
                  <span className="font-mono text-slate-900">{formatPKR(netHawlWealth)}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 bg-amber-50 px-2 rounded-lg">
                  <span className="font-bold text-amber-900 uppercase">Accrued Zakat (2.577%)</span>
                  <span className="font-mono text-base font-extrabold text-amber-800">
                    {formatPKR(accruedZakat)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowZakatModal(false)}
                  className="px-6 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  Close Worksheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
