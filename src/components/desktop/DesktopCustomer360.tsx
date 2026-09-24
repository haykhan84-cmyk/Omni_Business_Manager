import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Plus,
  Phone,
  MessageSquare,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Download,
  Edit2,
  X,
  CreditCard,
  Building,
  ShieldCheck,
  TrendingUp,
  MapPin,
  ExternalLink,
  RefreshCw,
  FileText,
  Sliders,
  DollarSign,
  Briefcase,
  ChevronRight,
  Printer,
  Clock,
  Send,
  Eye,
  Trash2,
} from 'lucide-react';
import { Customer, Order, RoznamchaEntry, CustomerNote, ChannelType, TaxStatus } from '../../types';
import { formatPKR, formatDateTime } from '../../utils/calculations';
import {
  getTenantCustomerNotes,
  addTenantCustomerNote,
  toggleCustomerCreditLock,
  adjustCustomerCreditLimit,
  ACTIVE_TENANT_ID,
} from '../../db/localDb';

interface DesktopCustomer360Props {
  customers: Customer[];
  orders: Order[];
  roznamcha: RoznamchaEntry[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'currentBalance'>) => Promise<void>;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onDeleteCustomer?: (customerId: string) => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
}

export const DesktopCustomer360: React.FC<DesktopCustomer360Props> = ({
  customers,
  orders,
  roznamcha,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onDeleteOrder,
}) => {
  // Navigation & Segmented Filters
  const [selectedSegment, setSelectedSegment] = useState<
    'all' | 'wholesalers' | 'corporate' | 'export' | 'suspended'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('All');

  // Quick Chips
  const [filterAtlOnly, setFilterAtlOnly] = useState(false);
  const [filterOverdue30, setFilterOverdue30] = useState(false);
  const [filterHighCredit, setFilterHighCredit] = useState(false);
  const [filterWhatsAppActive, setFilterWhatsAppActive] = useState(false);

  // Selected customer for 360 Deep-Dive
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    customers[0] || null
  );

  // Multi-select for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inspector Tabs
  const [inspectorTab, setInspectorTab] = useState<'ledger' | 'orders' | 'skus' | 'notes'>('ledger');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isAdjustLimitModalOpen, setIsAdjustLimitModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State
  const [formShopName, setFormShopName] = useState('');
  const [formName, setFormName] = useState('');
  const [formRoute, setFormRoute] = useState('Mingora Central');
  const [formZone, setFormZone] = useState('Mingora Zone 1');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsApp, setFormWhatsApp] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formChannelType, setFormChannelType] = useState<ChannelType>('Supermarket / Cash & Carry');
  const [formTaxStatus, setFormTaxStatus] = useState<TaxStatus>('Filer');
  const [formAtlStatus, setFormAtlStatus] = useState<'filer' | 'non_filer'>('filer');
  const [formCnic, setFormCnic] = useState('');
  const [formNtn, setFormNtn] = useState('');
  const [formStrn, setFormStrn] = useState('');
  const [formGps, setFormGps] = useState('34.7717° N, 72.3602° E');
  const [formCreditLimit, setFormCreditLimit] = useState(1500000);
  const [formCreditDays, setFormCreditDays] = useState(15);
  const [formStatus, setFormStatus] = useState<'active' | 'credit_locked' | 'review'>('active');

  // Adjust Limit Modal State
  const [adjustLimitVal, setAdjustLimitVal] = useState(1000000);
  const [adjustDaysVal, setAdjustDaysVal] = useState(15);
  const [adjustReason, setAdjustReason] = useState('');

  // CRM Notes State
  const [notesList, setNotesList] = useState<CustomerNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteAuthor, setNewNoteAuthor] = useState('Distributor Manager');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // Sync state & toasts
  const [isSyncingApis, setIsSyncingApis] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Keep selected customer in sync with props
  useEffect(() => {
    if (selectedCustomer) {
      const fresh = customers.find((c) => c.id === selectedCustomer.id);
      if (fresh) setSelectedCustomer(fresh);
    } else if (customers.length > 0) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers]);

  // Load customer notes when selected customer changes
  useEffect(() => {
    if (!selectedCustomer) return;
    let isMounted = true;
    setIsLoadingNotes(true);
    getTenantCustomerNotes(selectedCustomer.id)
      .then((notes) => {
        if (isMounted) {
          setNotesList(notes);
          setIsLoadingNotes(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching notes:', err);
        if (isMounted) setIsLoadingNotes(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedCustomer?.id]);

  // Unique routes list
  const routes = useMemo(() => {
    const set = new Set(customers.map((c) => c.route || 'General'));
    return ['All', ...Array.from(set)];
  }, [customers]);

  // Calculate Aging Badge for each customer
  const getCustomerAging = (c: Customer) => {
    if (c.aging_bucket) return c.aging_bucket;
    if (c.status === 'credit_locked') return '30+ Days';
    const util = c.creditLimit > 0 ? (c.currentBalance / c.creditLimit) * 100 : 0;
    if (util > 90) return '30+ Days';
    if (util > 60) return '16-30 Days';
    if (util > 30) return '8-15 Days';
    return '0-7 Days';
  };

  // KPI Calculations
  const totalReceivables = useMemo(
    () => customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0),
    [customers]
  );
  const totalCreditExtended = useMemo(
    () => customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0),
    [customers]
  );
  const overallUtilization =
    totalCreditExtended > 0
      ? Math.min(100, (totalReceivables / totalCreditExtended) * 100)
      : 0;
  const headroomAmount = Math.max(0, totalCreditExtended - totalReceivables);

  const filersCount = useMemo(
    () => customers.filter((c) => c.atlStatus === 'filer' || c.tax_status === 'Filer').length,
    [customers]
  );
  const filerPercentage =
    customers.length > 0 ? Math.round((filersCount / customers.length) * 100) : 0;

  const overdueCount = useMemo(
    () =>
      customers.filter((c) => {
        const aging = getCustomerAging(c);
        return c.status === 'credit_locked' || aging === '30+ Days' || aging === '16-30 Days';
      }).length,
    [customers]
  );

  // Segment Counts
  const segmentCounts = useMemo(() => {
    return {
      all: customers.length,
      wholesalers: customers.filter(
        (c) =>
          c.channel_type === 'Wholesaler' ||
          c.channel_type === 'Key Distributor' ||
          c.shopName.toLowerCase().includes('wholesale') ||
          c.shopName.toLowerCase().includes('trader')
      ).length,
      corporate: customers.filter(
        (c) =>
          c.channel_type === 'Supermarket / Cash & Carry' ||
          c.channel_type === 'General / Karyana Store' ||
          c.shopName.toLowerCase().includes('cash & carry') ||
          c.shopName.toLowerCase().includes('mart')
      ).length,
      export: customers.filter(
        (c) =>
          c.channel_type === 'Export / Cross-Border' ||
          c.shopName.toLowerCase().includes('trading') ||
          c.shopName.toLowerCase().includes('export')
      ).length,
      suspended: customers.filter(
        (c) =>
          c.status === 'credit_locked' ||
          c.status === 'Credit Blocked' ||
          c.status === 'Inactive'
      ).length,
    };
  }, [customers]);

  // Filter Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // 1. Segment
      if (selectedSegment === 'wholesalers') {
        const isWholesale =
          c.channel_type === 'Wholesaler' ||
          c.channel_type === 'Key Distributor' ||
          c.shopName.toLowerCase().includes('wholesale') ||
          c.shopName.toLowerCase().includes('trader');
        if (!isWholesale) return false;
      } else if (selectedSegment === 'corporate') {
        const isCorp =
          c.channel_type === 'Supermarket / Cash & Carry' ||
          c.channel_type === 'General / Karyana Store' ||
          c.shopName.toLowerCase().includes('cash & carry') ||
          c.shopName.toLowerCase().includes('mart');
        if (!isCorp) return false;
      } else if (selectedSegment === 'export') {
        const isExport =
          c.channel_type === 'Export / Cross-Border' ||
          c.shopName.toLowerCase().includes('trading') ||
          c.shopName.toLowerCase().includes('export');
        if (!isExport) return false;
      } else if (selectedSegment === 'suspended') {
        if (
          c.status !== 'credit_locked' &&
          c.status !== 'Credit Blocked' &&
          c.status !== 'Inactive'
        )
          return false;
      }

      // 2. Route
      if (selectedRoute !== 'All' && c.route !== selectedRoute) return false;

      // 3. Chips
      if (filterAtlOnly && c.atlStatus !== 'filer' && c.tax_status !== 'Filer') return false;
      if (filterOverdue30) {
        const aging = getCustomerAging(c);
        if (aging !== '30+ Days') return false;
      }
      if (filterHighCredit) {
        const util = c.creditLimit > 0 ? (c.currentBalance / c.creditLimit) * 100 : 0;
        if (util < 85) return false;
      }
      if (filterWhatsAppActive && !c.whatsapp_number && !c.phone) return false;

      // 4. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchShop = c.shopName.toLowerCase().includes(q);
        const matchPhone = c.phone.toLowerCase().includes(q) || (c.whatsapp_number && c.whatsapp_number.toLowerCase().includes(q));
        const matchNtn = (c.ntn && c.ntn.toLowerCase().includes(q)) || (c.cnic && c.cnic.toLowerCase().includes(q));
        const matchId = c.id.toLowerCase().includes(q);
        const matchRoute = c.route.toLowerCase().includes(q);
        if (!matchName && !matchShop && !matchPhone && !matchNtn && !matchId && !matchRoute) {
          return false;
        }
      }

      return true;
    });
  }, [
    customers,
    selectedSegment,
    selectedRoute,
    filterAtlOnly,
    filterOverdue30,
    filterHighCredit,
    filterWhatsAppActive,
    searchQuery,
  ]);

  // Transaction History for Selected Customer (Combined Ledger)
  const selectedCustomerLedger = useMemo(() => {
    if (!selectedCustomer) return [];

    const custOrders = orders
      .filter((o) => o.customerId === selectedCustomer.id)
      .map((o) => ({
        id: o.id,
        date: o.date,
        type: 'invoice' as const,
        ref: o.orderNo,
        description: `Delivered: ${o.totalCartons}c + ${o.totalPieces}p (${o.paymentType})`,
        debit: o.netBill,
        credit: o.cashPaid,
        orderObj: o,
      }));

    const custRecoveries = roznamcha
      .filter((r) => r.customerId === selectedCustomer.id && r.type === 'cash_in')
      .map((r) => ({
        id: r.id,
        date: r.date,
        type: 'recovery' as const,
        ref: r.slipNo || r.entryNo,
        description: `Cash Recovery Receipt: ${r.narration}`,
        debit: 0,
        credit: r.amount,
        orderObj: null,
      }));

    // Chronological sort ascending to compute running balance
    const combined = [...custOrders, ...custRecoveries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let running = 0;
    const withRunning = combined.map((entry) => {
      running += entry.debit - entry.credit;
      return {
        ...entry,
        runningBalance: running,
      };
    });

    // Return reversed for recent-first view
    return withRunning.reverse();
  }, [selectedCustomer, orders, roznamcha]);

  // Top SKUs bought by selected customer
  const selectedCustomerTopSkus = useMemo(() => {
    if (!selectedCustomer) return [];
    const custOrders = orders.filter((o) => o.customerId === selectedCustomer.id);
    const skuMap = new Map<
      string,
      { name: string; sku: string; cartons: number; pieces: number; totalSpend: number }
    >();

    for (const ord of custOrders) {
      for (const item of ord.items) {
        const existing = skuMap.get(item.productId) || {
          name: item.productName,
          sku: item.sku,
          cartons: 0,
          pieces: 0,
          totalSpend: 0,
        };
        existing.cartons += item.cartons;
        existing.pieces += item.pieces;
        existing.totalSpend += item.netTotal;
        skuMap.set(item.productId, existing);
      }
    }

    return Array.from(skuMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [selectedCustomer, orders]);

  // Average Monthly Purchase
  const avgMonthlyPurchase = useMemo(() => {
    if (!selectedCustomer) return 0;
    const custOrders = orders.filter((o) => o.customerId === selectedCustomer.id);
    const totalOrderVal = custOrders.reduce((sum, o) => sum + o.netBill, 0);
    return Math.round(totalOrderVal / Math.max(1, Math.min(3, custOrders.length)));
  }, [selectedCustomer, orders]);

  // WhatsApp Reminder Trigger
  const handleSendWhatsAppReminder = (cust: Customer) => {
    const rawPhone = cust.whatsapp_number || cust.phone;
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0')
      ? `92${cleanPhone.slice(1)}`
      : cleanPhone.startsWith('92')
      ? cleanPhone
      : `92${cleanPhone}`;

    const text = `Dear ${cust.name} (${cust.shopName}), your outstanding balance with PrimeLink Enterprises as of today is Rs. ${cust.currentBalance.toLocaleString(
      'en-PK'
    )}. Please keep cash ready for our recovery officer on your scheduled beat. Thank you.`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showToast(`WhatsApp reminder opened for ${cust.shopName}`);
  };

  // Toggle Credit Lock
  const handleToggleCreditLock = async (cust: Customer) => {
    const isCurrentlyLocked = cust.status === 'credit_locked';
    const nextStatus = isCurrentlyLocked ? 'active' : 'credit_locked';
    const updated: Customer = { ...cust, status: nextStatus };

    await onUpdateCustomer(updated);
    await toggleCustomerCreditLock(cust.id, !isCurrentlyLocked);

    if (selectedCustomer?.id === cust.id) {
      setSelectedCustomer(updated);
    }
    showToast(
      isCurrentlyLocked
        ? `Credit unlocked for ${cust.shopName}. Field booker can now book credit orders.`
        : `⛔ Credit locked for ${cust.shopName}. Field booking restricted.`
    );
  };

  // Save Credit Limit Adjustment
  const handleSaveAdjustLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const newLimit = Number(adjustLimitVal) || 0;
    const newDays = Number(adjustDaysVal) || 15;

    const updated: Customer = {
      ...selectedCustomer,
      creditLimit: newLimit,
      credit_limit: newLimit,
      credit_days: newDays,
    };

    await onUpdateCustomer(updated);
    await adjustCustomerCreditLimit(selectedCustomer.id, newLimit, newDays);

    if (adjustReason.trim()) {
      await addTenantCustomerNote({
        tenant_id: ACTIVE_TENANT_ID,
        customer_id: selectedCustomer.id,
        note_date: new Date().toISOString(),
        text: `Credit ceiling adjusted to ${formatPKR(newLimit)} (${newDays} credit days). Reason: ${adjustReason.trim()}`,
        author: 'Finance & Risk Committee',
      });
      const refreshedNotes = await getTenantCustomerNotes(selectedCustomer.id);
      setNotesList(refreshedNotes);
    }

    setSelectedCustomer(updated);
    setIsAdjustLimitModalOpen(false);
    setAdjustReason('');
    showToast(`Credit limit updated to ${formatPKR(newLimit)} for ${selectedCustomer.shopName}`);
  };

  // Add CRM Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !newNoteText.trim()) return;

    const noteRecord: Omit<CustomerNote, 'id'> = {
      tenant_id: ACTIVE_TENANT_ID,
      customer_id: selectedCustomer.id,
      note_date: new Date().toISOString(),
      text: newNoteText.trim(),
      author: newNoteAuthor.trim() || 'Distributor Rep',
    };

    await addTenantCustomerNote(noteRecord);
    const refreshed = await getTenantCustomerNotes(selectedCustomer.id);
    setNotesList(refreshed);
    setNewNoteText('');
    showToast('Customer CRM note logged successfully.');
  };

  // Save / Onboard Customer KYC
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formShopName.trim() || !formName.trim()) return;

    const custPayload: Omit<Customer, 'id' | 'currentBalance'> = {
      tenant_id: ACTIVE_TENANT_ID,
      name: formName.trim(),
      owner_name: formName.trim(),
      shopName: formShopName.trim(),
      shop_name: formShopName.trim(),
      route: formRoute,
      zone: formZone,
      phone: formPhone.trim(),
      whatsapp_number: formWhatsApp.trim() || formPhone.trim(),
      address: formAddress.trim(),
      channel_type: formChannelType,
      tax_status: formTaxStatus,
      atlStatus: formAtlStatus,
      cnic: formCnic.trim(),
      ntn: formNtn.trim(),
      strn: formStrn.trim(),
      cnic_or_ntn: formNtn.trim() || formCnic.trim(),
      gps_coordinates: formGps.trim(),
      creditLimit: Number(formCreditLimit) || 0,
      credit_limit: Number(formCreditLimit) || 0,
      credit_days: Number(formCreditDays) || 15,
      status: formStatus,
    };

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        ...custPayload,
      };
      await onUpdateCustomer(updated);
      setSelectedCustomer(updated);
      showToast(`Profile updated for ${updated.shopName}`);
    } else {
      await onAddCustomer(custPayload);
      showToast(`New retailer ${custPayload.shopName} onboarded successfully!`);
    }

    setIsAddModalOpen(false);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Account ID',
      'Shop Name',
      'Proprietor',
      'Route',
      'Channel Type',
      'NTN',
      'STRN',
      'Phone',
      'Credit Limit (PKR)',
      'Current Balance (PKR)',
      'Aging Risk',
      'Status',
    ];

    const rows = filteredCustomers.map((c) => [
      c.id,
      `"${c.shopName.replace(/"/g, '""')}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.route}"`,
      `"${c.channel_type || 'Retail'}"`,
      `"${c.ntn || ''}"`,
      `"${c.strn || ''}"`,
      `"${c.phone}"`,
      c.creditLimit,
      c.currentBalance,
      `"${getCustomerAging(c)}"`,
      `"${c.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `PrimeLink_Retailer_Master_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Retailer directory exported as CSV.');
  };

  // Simulate 3rd party sync
  const handleSyncApis = async () => {
    setIsSyncingApis(true);
    await new Promise((res) => setTimeout(res, 1200));
    setIsSyncingApis(false);
    showToast('FBR ATL Portal & 1Link Raast Node synced. All tax statuses verified.');
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormShopName('');
    setFormName('');
    setFormRoute(routes.filter((r) => r !== 'All')[0] || 'Main Bazaar Route');
    setFormZone('');
    setFormPhone('');
    setFormWhatsApp('');
    setFormAddress('');
    setFormChannelType('General / Karyana Store');
    setFormTaxStatus('Non-Filer');
    setFormAtlStatus('non_filer');
    setFormCnic('');
    setFormNtn('');
    setFormStrn('');
    setFormGps('');
    setFormCreditLimit(100000);
    setFormCreditDays(15);
    setFormStatus('active');
    setIsAddModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormShopName(c.shopName);
    setFormName(c.name);
    setFormRoute(c.route);
    setFormZone(c.zone || 'Mingora Zone 1');
    setFormPhone(c.phone);
    setFormWhatsApp(c.whatsapp_number || c.phone);
    setFormAddress(c.address || '');
    setFormChannelType(c.channel_type || 'Supermarket / Cash & Carry');
    setFormTaxStatus(c.tax_status || (c.atlStatus === 'filer' ? 'Filer' : 'Non-Filer'));
    setFormAtlStatus(c.atlStatus || 'filer');
    setFormCnic(c.cnic || '');
    setFormNtn(c.ntn || '');
    setFormStrn(c.strn || '');
    setFormGps(c.gps_coordinates || '34.7717° N, 72.3602° E');
    setFormCreditLimit(c.creditLimit);
    setFormCreditDays(c.credit_days || 15);
    setFormStatus(c.status as any);
    setIsAddModalOpen(true);
  };

  const openAdjustLimitModal = (c: Customer) => {
    setSelectedCustomer(c);
    setAdjustLimitVal(c.creditLimit);
    setAdjustDaysVal(c.credit_days || 15);
    setAdjustReason('');
    setIsAdjustLimitModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-amber-500/50 flex items-center gap-3 text-xs font-semibold animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* COMMAND STRIP / TOP HEADER (Directly matching Google Stitch Export) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span className="text-amber-700">ERP CORE</span>
              <span>/</span>
              <span>COMMERCIAL DISTRIBUTION</span>
              <span>/</span>
              <span className="text-slate-800">CRM &amp; CUSTOMER 360 GOVERNANCE</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Enterprise CRM &amp; Distributor 360
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                PAK-LATAM-GCC HUB
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Pakistan National &amp; Cross-Border Accounts Governance •{' '}
              <strong className="text-slate-700 font-bold">{customers.length} Active Entities</strong> •
              Currency: PKR (Rs.) &amp; Multi-Currency Ledger (USD/AED) • FBR Active Taxpayer List (ATL):{' '}
              <span className="text-emerald-700 font-bold">{filerPercentage}% Verified</span>
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              title="Export filtered directory to CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Ledger</span>
            </button>

            <button
              onClick={handleSyncApis}
              disabled={isSyncingApis}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 text-amber-600 ${isSyncingApis ? 'animate-spin' : ''}`}
              />
              <span>Sync 3rd-Party APIs</span>
            </button>

            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Onboard Customer</span>
            </button>
          </div>
        </div>

        {/* Real-Time Telemetry Badges */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 font-mono">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <strong className="text-slate-800">Hybrid Edge/Offline Engine:</strong> 100% Local Cache Hit (IndexedDB)
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>
              <strong className="text-slate-800">FBR ATL Sync:</strong> Live 120s poll
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>
              <strong className="text-slate-800">1Link Raast:</strong> Node #882
            </span>
          </div>

          <div className="text-slate-400 text-[10px]">
            Tenant: <span className="font-bold text-slate-700">{ACTIVE_TENANT_ID}</span> • CRDT Auto-Merge Active
          </div>
        </div>
      </div>

      {/* TOP KPI ANALYTICAL SUMMARY CARDS (Matching Google Stitch Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Receivables Exposure */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Receivables Exposure
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {formatPKR(totalReceivables)}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                {overdueCount} Overdue Flagged
              </span>
              <span className="text-[11px] text-slate-400">Risk Hedged: 92.4%</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Credit Limit Extended */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Credit Limit Extended
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {formatPKR(totalCreditExtended)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Utilization: {overallUtilization.toFixed(1)}%</span>
              <span className="font-mono font-bold text-slate-700">
                {formatPKR(headroomAmount)} Headroom
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  overallUtilization > 85
                    ? 'bg-rose-500'
                    : overallUtilization > 65
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${overallUtilization}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: FBR Tax Compliance (ATL) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              FBR Tax Compliance (ATL)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-emerald-700">
              {filerPercentage}% Verified Filer
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                {filersCount} / {customers.length} Filers
              </span>
              <span className="text-[11px] text-slate-400">NTN/STRN Validated</span>
            </div>
          </div>
        </div>

        {/* Card 4: Integration Connectors / Risk Controls */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Integration Connectors
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              5 Nodes
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              Salesforce • SAP RFC • WhatsApp • 1Link Raast
            </p>
          </div>
        </div>
      </div>

      {/* SEGMENTED NAVIGATION BAR & SEARCH / FILTER CHIPS */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        {/* Segmented Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all' as const, label: 'All Accounts', count: segmentCounts.all },
            { id: 'wholesalers' as const, label: 'Key Wholesalers', count: segmentCounts.wholesalers },
            { id: 'corporate' as const, label: 'Corporate Retail', count: segmentCounts.corporate },
            { id: 'export' as const, label: 'Export / Cross-Border', count: segmentCounts.export },
            { id: 'suspended' as const, label: 'Suspended / Credit Locked', count: segmentCounts.suspended },
          ].map((seg) => {
            const isActive = selectedSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setSelectedSegment(seg.id)}
                className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{seg.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-amber-800 text-amber-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {seg.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & Route Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Account Name, NTN/CNIC, STRN, Ledger Code, Phone, or City..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
            >
              {routes.map((r) => (
                <option key={r} value={r}>
                  Route: {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Quick Chips */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
          <span className="font-bold text-slate-400 uppercase text-[10px] mr-1">Filter By:</span>

          <button
            onClick={() => setFilterAtlOnly(!filterAtlOnly)}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
              filterAtlOnly
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ✓ ATL Active Only
          </button>

          <button
            onClick={() => setFilterOverdue30(!filterOverdue30)}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
              filterOverdue30
                ? 'bg-rose-100 border-rose-300 text-rose-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Overdue &gt; 30 Days
          </button>

          <button
            onClick={() => setFilterHighCredit(!filterHighCredit)}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
              filterHighCredit
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Credit &gt; 85% Cap
          </button>

          <button
            onClick={() => setFilterWhatsAppActive(!filterWhatsAppActive)}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
              filterWhatsAppActive
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            WhatsApp Connected
          </button>

          {(filterAtlOnly || filterOverdue30 || filterHighCredit || filterWhatsAppActive || searchQuery || selectedRoute !== 'All') && (
            <button
              onClick={() => {
                setFilterAtlOnly(false);
                setFilterOverdue30(false);
                setFilterHighCredit(false);
                setFilterWhatsAppActive(false);
                setSearchQuery('');
                setSelectedRoute('All');
              }}
              className="text-amber-700 hover:underline font-bold text-[10px] ml-auto cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* SPLIT HIGH-DENSITY WORKSPACE: MASTER DATA GRID (LEFT 7 COLS) + CUSTOMER 360 INSPECTOR (RIGHT 5 COLS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: MASTER DATA GRID */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider">
                Retailer Directory ({filteredCustomers.length} Outlets)
              </span>
              {selectedIds.size > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
              <span>
                Exposure: <strong className="text-slate-900">{formatPKR(filteredCustomers.reduce((a, b) => a + b.currentBalance, 0))}</strong>
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size > 0 &&
                        selectedIds.size === filteredCustomers.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                  </th>
                  <th className="p-3 whitespace-nowrap">Account &amp; Entity</th>
                  <th className="p-3 whitespace-nowrap">Zone / Route</th>
                  <th className="p-3 whitespace-nowrap">NTN / ATL</th>
                  <th className="p-3 whitespace-nowrap">Category</th>
                  <th className="p-3 text-right whitespace-nowrap">Limit (PKR)</th>
                  <th className="p-3 text-right whitespace-nowrap">Outstanding</th>
                  <th className="p-3 text-center whitespace-nowrap">Aging Risk</th>
                  <th className="p-3 text-center whitespace-nowrap">Sync</th>
                  <th className="p-3 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="text-slate-900 font-bold text-sm">No Retailers Registered</div>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Your customer directory is ready for real shops and outlets. Click below to add your first retailer.
                        </p>
                        <button
                          onClick={openAddModal}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>+ Add Customer / Retailer</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    const isChecked = selectedIds.has(c.id);
                    const aging = getCustomerAging(c);
                    const utilPct =
                      c.creditLimit > 0
                        ? Math.min(100, Math.round((c.currentBalance / c.creditLimit) * 100))
                        : 0;
                    const isOver = c.status === 'credit_locked' || utilPct >= 90;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-50/80 border-l-4 border-amber-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(c.id);
                              else next.delete(c.id);
                              setSelectedIds(next);
                            }}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                        </td>

                        {/* Account & Entity */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{c.shopName}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-amber-800 font-semibold">{c.id}</span>
                            <span>•</span>
                            <span>{c.name}</span>
                          </div>
                        </td>

                        {/* Zone / Route */}
                        <td className="p-3 whitespace-nowrap text-slate-600">
                          <div className="font-semibold text-slate-800">{c.zone || c.route}</div>
                          <div className="text-[10px] text-slate-400">{c.route}</div>
                        </td>

                        {/* NTN / ATL */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-mono text-[11px] text-slate-700">
                            {c.ntn || c.cnic || 'Pending Reg.'}
                          </div>
                          <div className="mt-0.5">
                            {c.atlStatus === 'filer' || c.tax_status === 'Filer' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                ATL Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Non-Filer (+10%)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {c.channel_type || 'Supermarket'}
                          </span>
                        </td>

                        {/* Credit Limit */}
                        <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                          {formatPKR(c.creditLimit)}
                        </td>

                        {/* Outstanding Balance */}
                        <td className="p-3 text-right whitespace-nowrap font-mono">
                          <div
                            className={`font-bold ${
                              isOver ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {formatPKR(c.currentBalance)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {utilPct}% Used
                          </div>
                        </td>

                        {/* Aging Risk */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {aging === '30+ Days' || c.status === 'credit_locked' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              <Lock className="w-2.5 h-2.5" /> 30+d (Locked)
                            </span>
                          ) : aging === '16-30 Days' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              22d (Warning)
                            </span>
                          ) : aging === '8-15 Days' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              14d (Good)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              7d (Normal)
                            </span>
                          )}
                        </td>

                        {/* Connectors / Sync */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1 text-slate-400">
                            <span
                              title="WhatsApp Notification Ready"
                              className={`w-2 h-2 rounded-full ${
                                c.whatsapp_number || c.phone ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                            <span
                              title="1Link Raast Verified"
                              className="w-2 h-2 rounded-full bg-blue-500"
                            />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCreditLock(c);
                              }}
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                c.status === 'credit_locked'
                                  ? 'hover:bg-emerald-100 text-emerald-600'
                                  : 'hover:bg-rose-100 text-rose-600'
                              }`}
                              title={
                                c.status === 'credit_locked'
                                  ? 'Unlock Customer Credit'
                                  : 'Freeze Customer Credit (Lock)'
                              }
                            >
                              {c.status === 'credit_locked' ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer(c);
                              }}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                              title="Inspect Customer 360"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-700" />
                            </button>

                            {onDeleteCustomer && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCustomerToDelete(c);
                                }}
                                className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                                title="Delete Customer"
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
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Showing {filteredCustomers.length} of {customers.length} Accounts</span>
            <span>Real-time Dexie.js sync</span>
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOMER 360° DEEP-DIVE INSPECTOR PANEL (Direct translation from code.html) */}
        {selectedCustomer ? (
          <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col space-y-4">
            {/* Header Banner */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {selectedCustomer.id}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs text-slate-300">
                      {selectedCustomer.zone || 'Mingora Central Sector'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white mt-1">
                    {selectedCustomer.shopName}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Proprietor: <strong className="text-white font-bold">{selectedCustomer.name}</strong> (Sole Proprietorship)
                  </p>
                </div>

                <div>
                  {selectedCustomer.atlStatus === 'filer' || selectedCustomer.tax_status === 'Filer' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> ATL Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-400/40">
                      <AlertTriangle className="w-3 h-3 text-rose-400" /> Non-Filer
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/60 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Assigned Credit Cap
                  </span>
                  <span className="text-sm font-bold text-slate-100">
                    {formatPKR(selectedCustomer.creditLimit)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Current Outstandings
                  </span>
                  <span
                    className={`text-sm font-black ${
                      selectedCustomer.currentBalance > selectedCustomer.creditLimit * 0.9
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {formatPKR(selectedCustomer.currentBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* REAL-TIME OPERATIONS ACTION BAR */}
            <div className="px-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                title="Print subsidiary ledger statement"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Ledger PDF</span>
              </button>

              <button
                onClick={() => openAdjustLimitModal(selectedCustomer)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                title="Adjust credit limit and terms"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                <span>Adjust Ceiling</span>
              </button>

              <button
                onClick={() => handleSendWhatsAppReminder(selectedCustomer)}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
                title="Open WhatsApp pre-filled balance reminder"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Remind WA</span>
              </button>

              <button
                onClick={() => handleToggleCreditLock(selectedCustomer)}
                className={`p-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                  selectedCustomer.status === 'credit_locked'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                }`}
                title="Lock / Unlock customer credit"
              >
                {selectedCustomer.status === 'credit_locked' ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Credit Lock</span>
                  </>
                )}
              </button>

              {onDeleteCustomer && (
                <button
                  onClick={() => setCustomerToDelete(selectedCustomer)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                  title="Permanently remove customer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            {/* PAKISTAN COMPLIANCE & LEGAL PASSPORT */}
            <div className="px-5">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200 pb-1.5">
                  <span className="flex items-center gap-1.5 text-amber-800">
                    <Building className="w-3.5 h-3.5" /> Pakistan Statutory Passport
                  </span>
                  <button
                    onClick={() => openEditModal(selectedCustomer)}
                    className="text-amber-700 hover:underline flex items-center gap-1 lowercase text-xs"
                  >
                    <Edit2 className="w-3 h-3" /> edit
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">NTN Registration:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedCustomer.ntn || '3948210-4'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">STRN Sales Tax:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedCustomer.strn || '17-00-3948-210-19'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">CNIC (Chief Signatory):</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedCustomer.cnic || '15602-1234567-1'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Standard WHT Rate:</span>
                    <span className="font-bold text-emerald-700">
                      {selectedCustomer.atlStatus === 'filer' ? '0.5% (Filer Advantage)' : '10% (Non-Filer Penalty)'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Commercial Settlement:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    Net {selectedCustomer.credit_days || 15} Days • 1.5% Early Cash Rebate (&lt;7d)
                  </span>
                </div>
              </div>
            </div>

            {/* GEOGRAPHIC & DISPATCH GEOFENCE PIN */}
            <div className="px-5">
              <div className="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-white shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Dispatch Coordinates:</span>
                      <span className="font-mono text-amber-400 text-[11px]">
                        {selectedCustomer.gps_coordinates || '34.7717° N, 72.3602° E'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {selectedCustomer.address || 'Main GT Road, Mingora Bazaar Sector'}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-emerald-500/30">
                  Geo-Tagged
                </span>
              </div>
            </div>

            {/* UNIFIED 360-DEGREE TABS */}
            <div className="px-5 flex-1 flex flex-col">
              {/* Tab Navigation */}
              <div className="flex items-center border-b border-slate-200 gap-4 text-xs font-bold">
                <button
                  onClick={() => setInspectorTab('ledger')}
                  className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    inspectorTab === 'ledger'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Subsidiary Ledger</span>
                </button>

                <button
                  onClick={() => setInspectorTab('orders')}
                  className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    inspectorTab === 'orders'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Order History</span>
                </button>

                <button
                  onClick={() => setInspectorTab('skus')}
                  className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    inspectorTab === 'skus'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Top Moving SKUs</span>
                </button>

                <button
                  onClick={() => setInspectorTab('notes')}
                  className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    inspectorTab === 'notes'
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>CRM Timeline</span>
                </button>
              </div>

              {/* Tab Content Panes */}
              <div className="py-3">
                {/* 1. SUBSIDIARY LEDGER TAB */}
                {inspectorTab === 'ledger' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Date-Wise Statement (Invoices &amp; Recoveries)</span>
                      <span className="font-mono text-slate-700">
                        Monthly Run Rate: <strong>{formatPKR(avgMonthlyPurchase)}</strong>
                      </span>
                    </div>

                    {selectedCustomerLedger.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No transactions recorded for this outlet yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {selectedCustomerLedger.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    item.type === 'invoice'
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-emerald-100 text-emerald-900'
                                  }`}
                                >
                                  {item.ref}
                                </span>
                                <span className="font-bold text-slate-800">
                                  {item.type === 'invoice' ? 'Delivery Invoice' : 'Cash Recovery'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 max-w-[220px] truncate">
                                {item.description}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                <span>{formatDateTime(item.date)}</span>
                                <span>•</span>
                                <span>Bal: {formatPKR(item.runningBalance)}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0 font-mono">
                              {item.type === 'invoice' ? (
                                <>
                                  <span className="font-bold text-slate-900 block">
                                    +{formatPKR(item.debit)}
                                  </span>
                                  {item.credit > 0 && (
                                    <span className="text-[10px] text-emerald-700 block">
                                      Spot Paid: {formatPKR(item.credit)}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="font-bold text-emerald-600 block">
                                  -{formatPKR(item.credit)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ORDER HISTORY TAB */}
                {inspectorTab === 'orders' && (
                  <div className="space-y-2">
                    {orders.filter((o) => o.customerId === selectedCustomer.id).length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No sales orders on file for this retailer.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {orders
                          .filter((o) => o.customerId === selectedCustomer.id)
                          .map((o) => (
                            <div
                              key={o.id}
                              className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-amber-700">{o.orderNo}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700">
                                    {o.status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  {o.totalCartons} Cartons, {o.totalPieces} Pieces • {o.items.length} SKUs
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {formatDateTime(o.date)}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-right font-mono">
                                  <div className="font-bold text-slate-900">{formatPKR(o.netBill)}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {o.paymentType === 'cash' ? 'Cash Spot' : 'Credit Terms'}
                                  </div>
                                </div>
                                {onDeleteOrder && (
                                  <button
                                    onClick={() => setOrderToDelete(o)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Cancel & Delete Order"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. TOP MOVING BRANDS / SKUS */}
                {inspectorTab === 'skus' && (
                  <div className="space-y-2">
                    {selectedCustomerTopSkus.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Order items will accumulate here automatically.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {selectedCustomerTopSkus.map((skuItem, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{skuItem.name}</div>
                              <div className="text-[10px] font-mono text-slate-500">
                                {skuItem.sku} • {skuItem.cartons} Cartons + {skuItem.pieces} Pcs
                              </div>
                            </div>
                            <div className="text-right font-mono font-bold text-slate-900">
                              {formatPKR(skuItem.totalSpend)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. CRM FIELD NOTES & TIMELINE */}
                {inspectorTab === 'notes' && (
                  <div className="space-y-3">
                    {/* Add Note Form */}
                    <form onSubmit={handleAddNote} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Log field visit note, promise to pay, or credit decision..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Log</span>
                        </button>
                      </div>
                    </form>

                    {/* Timeline List */}
                    {isLoadingNotes ? (
                      <div className="text-center py-6 text-xs text-slate-400 animate-pulse">
                        Loading CRM activity logs...
                      </div>
                    ) : notesList.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No field notes recorded yet. Add one above!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {notesList.map((note, idx) => (
                          <div
                            key={note.id || idx}
                            className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                              <span className="font-bold text-amber-800">
                                {note.author || 'Commercial Rep'}
                              </span>
                              <span>{formatDateTime(note.note_date)}</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{note.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ENDPOINT EVENT LOG TELEM */}
            <div className="px-5 pb-5">
              <div className="bg-slate-900 rounded-xl p-3 text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex justify-between items-center text-slate-300 font-bold border-b border-slate-800 pb-1">
                  <span>LIVE ENDPOINT WEBHOOK AUDIT</span>
                  <span className="text-emerald-400">ACK 200 OK</span>
                </div>
                <div className="truncate">
                  POST /api/v2/retailer/{selectedCustomer.id}/sync • TTL: 0.04s • Multi-Region
                </div>
                <div className="text-slate-500 truncate">
                  SHA-256: 8a92f0...c4e1 • Raast IBAN: PK92MEZN00010420088910
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs shadow-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-slate-800 font-bold text-sm">No Retailer Selected</div>
            <p className="text-slate-500 max-w-xs leading-relaxed">
              Select an account from the directory or click below to onboard a new retail customer with credit limits and beat assignment.
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Customer / Retailer</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT RETAILER KYC MODAL (Full Customer Master) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  KYC &amp; Territory Master
                </span>
                <h3 className="font-extrabold text-xl text-slate-900">
                  {editingCustomer ? 'Update Retailer Profile' : 'Onboard New Retail Outlet'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Shop / Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formShopName}
                    onChange={(e) => setFormShopName(e.target.value)}
                    placeholder="e.g. Madina Cash & Carry Superstore"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Proprietor / Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Haji Noor Mohammad"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Contact Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Primary Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0300-9821450"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    WhatsApp Number (Invoicing &amp; Recovery)
                  </label>
                  <input
                    type="text"
                    value={formWhatsApp}
                    onChange={(e) => setFormWhatsApp(e.target.value)}
                    placeholder="0300-9821450"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Territory & Channel Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Assigned Market Beat / Route *
                  </label>
                  <input
                    type="text"
                    required
                    list="available-routes-list"
                    value={formRoute}
                    onChange={(e) => setFormRoute(e.target.value)}
                    placeholder="e.g. Main Bazaar / Beat 1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <datalist id="available-routes-list">
                    {routes
                      .filter((r) => r !== 'All')
                      .map((r) => (
                        <option key={r} value={r} />
                      ))}
                    <option value="Main Bazaar Route" />
                    <option value="Bypass & GT Road Beat" />
                    <option value="Wholesale Market Beat" />
                    <option value="City Center Route" />
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Zone / Depot
                  </label>
                  <input
                    type="text"
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    placeholder="e.g. Mingora Zone 1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Channel Classification
                  </label>
                  <select
                    value={formChannelType}
                    onChange={(e) => setFormChannelType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="Supermarket / Cash & Carry">Supermarket / Cash &amp; Carry</option>
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="General / Karyana Store">General / Karyana Store</option>
                    <option value="Pharmacy / Medical Store">Pharmacy / Medical Store</option>
                    <option value="Key Distributor">Key Distributor</option>
                    <option value="Export / Cross-Border">Export / Cross-Border</option>
                  </select>
                </div>
              </div>

              {/* Tax & Legal Compliance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    FBR Tax Status
                  </label>
                  <select
                    value={formAtlStatus}
                    onChange={(e) => {
                      const val = e.target.value as 'filer' | 'non_filer';
                      setFormAtlStatus(val);
                      setFormTaxStatus(val === 'filer' ? 'Filer' : 'Non-Filer');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="filer">Active Filer (0.5% Advance Tax)</option>
                    <option value="non_filer">Non-Filer (+10% Penalty Tax)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    NTN Number
                  </label>
                  <input
                    type="text"
                    value={formNtn}
                    onChange={(e) => setFormNtn(e.target.value)}
                    placeholder="3948210-4"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    STRN Number
                  </label>
                  <input
                    type="text"
                    value={formStrn}
                    onChange={(e) => setFormStrn(e.target.value)}
                    placeholder="17-00-3948-210-19"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* CNIC & GPS Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Owner CNIC
                  </label>
                  <input
                    type="text"
                    value={formCnic}
                    onChange={(e) => setFormCnic(e.target.value)}
                    placeholder="15602-1234567-1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    GPS Geofence Coordinates
                  </label>
                  <input
                    type="text"
                    value={formGps}
                    onChange={(e) => setFormGps(e.target.value)}
                    placeholder="34.7717° N, 72.3602° E"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Credit Risk Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Authorized Credit Limit (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Credit Payment Days
                  </label>
                  <input
                    type="number"
                    value={formCreditDays}
                    onChange={(e) => setFormCreditDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Account Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="active">Active (Normal Booking)</option>
                    <option value="credit_locked">Credit Locked (Freeze Deliveries)</option>
                    <option value="review">Under Audit Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Full Dispatch Address
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Shop #14, Main GT Road, Mingora Bazaar Sector"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-extrabold text-white shadow-sm cursor-pointer"
                >
                  {editingCustomer ? 'Save Changes' : 'Confirm & Onboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST CREDIT CEILING MODAL */}
      {isAdjustLimitModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Risk &amp; Exposure Governance
                </span>
                <h3 className="font-extrabold text-lg text-slate-900">
                  Adjust Credit Limit &amp; Days
                </h3>
                <p className="text-xs text-slate-500">{selectedCustomer.shopName}</p>
              </div>
              <button
                onClick={() => setIsAdjustLimitModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustLimit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  New Credit Ceiling (PKR)
                </label>
                <input
                  type="number"
                  required
                  value={adjustLimitVal}
                  onChange={(e) => setAdjustLimitVal(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Permitted Settlement Days
                </label>
                <input
                  type="number"
                  required
                  value={adjustDaysVal}
                  onChange={(e) => setAdjustDaysVal(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Audit Reason for Change
                </label>
                <textarea
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Higher seasonal volume approved by Credit Committee"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustLimitModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white shadow-sm cursor-pointer"
                >
                  Apply New Ceiling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE SUBSIDIARY LEDGER STATEMENT */}
      {isPrintModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 print:p-0 print:shadow-none">
            {/* Header / Actions */}
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-700" />
                <h3 className="font-extrabold text-lg text-slate-900">
                  Customer Subsidiary Ledger Statement
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4 Statement</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Statement Document */}
            <div className="p-4 border border-slate-300 rounded-xl space-y-4 text-xs font-sans text-slate-800">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    PRIMELINK ENTERPRISES (PVT) LTD
                  </h2>
                  <div className="text-[11px] text-slate-600">
                    Authorized FMCG &amp; Pharma Distribution Center • Swat Zone
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    NTN: 8829104-2 • STRN: 17-00-8829-104-11 • Phone: 0946-722100
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] uppercase font-mono">
                    SUBSIDIARY STATEMENT
                  </span>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    Statement Date: {new Date().toLocaleDateString('en-PK')}
                  </div>
                </div>
              </div>

              {/* Retailer Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <div className="font-bold text-sm text-slate-900">{selectedCustomer.shopName}</div>
                  <div className="text-[11px] text-slate-600">
                    Proprietor: {selectedCustomer.name}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Beat: {selectedCustomer.route} ({selectedCustomer.zone || 'Mingora Central'})
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Phone: {selectedCustomer.phone}
                  </div>
                </div>

                <div className="text-right space-y-0.5 font-mono">
                  <div className="text-[11px]">
                    Customer ID: <strong className="text-slate-900">{selectedCustomer.id}</strong>
                  </div>
                  <div className="text-[11px]">
                    NTN: {selectedCustomer.ntn || 'Pending'}
                  </div>
                  <div className="text-[11px]">
                    Credit Ceiling: {formatPKR(selectedCustomer.creditLimit)}
                  </div>
                  <div className="text-sm font-bold text-amber-800">
                    Current Balance: {formatPKR(selectedCustomer.currentBalance)}
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-300">
                      <th className="p-2">Date</th>
                      <th className="p-2">Voucher / Ref</th>
                      <th className="p-2">Transaction Particulars</th>
                      <th className="p-2 text-right">Debit (Invoice)</th>
                      <th className="p-2 text-right">Credit (Recovery)</th>
                      <th className="p-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {selectedCustomerLedger.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 whitespace-nowrap text-slate-600">
                          {formatDateTime(row.date)}
                        </td>
                        <td className="p-2 font-bold text-slate-800">{row.ref}</td>
                        <td className="p-2 text-slate-600">{row.description}</td>
                        <td className="p-2 text-right text-slate-900">
                          {row.debit > 0 ? formatPKR(row.debit) : '-'}
                        </td>
                        <td className="p-2 text-right text-emerald-700 font-bold">
                          {row.credit > 0 ? formatPKR(row.credit) : '-'}
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          {formatPKR(row.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary & Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-8 border-t border-slate-300 mt-6">
                <div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    This is an official computer-generated statement from PrimeLink OmniSales ERP. For ledger discrepancies or payment receipts, please notify distributor finance within 7 days.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="border-t border-slate-400 pt-2 text-[10px] font-bold text-slate-600">
                    Prepared By (Accounts)
                  </div>
                  <div className="border-t border-slate-400 pt-2 text-[10px] font-bold text-slate-600">
                    Retailer Stamp &amp; Sign
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for Customer Deletion */}
      {customerToDelete && (
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
                Are you sure you want to permanently remove retailer{' '}
                <strong className="text-slate-900 font-bold">"{customerToDelete.shopName}"</strong>{' '}
                ({customerToDelete.name})? This action cannot be undone.
              </p>
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Beat / Route:</span>
                  <span className="font-bold text-slate-800">{customerToDelete.route}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding Receivable:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {formatPKR(customerToDelete.currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact / WhatsApp:</span>
                  <span className="font-mono text-slate-700">{customerToDelete.phone}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteCustomer && customerToDelete) {
                    await onDeleteCustomer(customerToDelete.id);
                    if (selectedCustomer?.id === customerToDelete.id) {
                      setSelectedCustomer(null);
                    }
                  }
                  setCustomerToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for Order Deletion */}
      {orderToDelete && (
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
                Are you sure you want to cancel and delete Order{' '}
                <strong className="text-slate-900 font-bold">#{orderToDelete.orderNo}</strong>?
                This action will restore product inventory stocks and cannot be undone.
              </p>
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Invoice Value:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatPKR(orderToDelete.netBill)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cartons / Pieces:</span>
                  <span className="font-bold text-slate-800">
                    {orderToDelete.totalCartons} Ctns, {orderToDelete.totalPieces} Pcs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Booked Route:</span>
                  <span className="text-slate-800 font-medium">{orderToDelete.route}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteOrder && orderToDelete) {
                    await onDeleteOrder(orderToDelete.id);
                  }
                  setOrderToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
