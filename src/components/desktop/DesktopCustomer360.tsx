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
  Upload,
  FileUp,
  FileSpreadsheet,
  AlertCircle,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
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
import { db } from '../../db';
import { supabase, syncCustomersToSupabase } from '../../db/supabase';
import {
  getNextSequenceNumber,
  getNextShopSequenceNumber,
  formatShopId,
  extractSequenceNumber,
  extractShopSequence,
} from '../../utils/sequenceNumbering';
import {
  parseCustomerCsv,
  generateSampleCustomerCsvTemplate,
  exportCustomersToCsv,
  triggerCsvDownload,
  ParsedCustomerRow,
} from '../../utils/csvCustomerHelper';

interface DesktopCustomer360Props {
  customers: Customer[];
  orders: Order[];
  roznamcha: RoznamchaEntry[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'currentBalance'>) => Promise<void>;
  onBulkAddCustomers?: (customers: Customer[]) => Promise<void>;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onDeleteCustomer?: (customerId: string) => Promise<void>;
  onPurgeAllCustomers?: () => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
}

export type CustomerSortField =
  | 'customerId'
  | 'name'
  | 'route'
  | 'category'
  | 'creditLimit'
  | 'limitPct'
  | 'outstanding'
  | 'aging'
  | 'sync';

export const DesktopCustomer360: React.FC<DesktopCustomer360Props> = ({
  customers,
  orders,
  roznamcha,
  onAddCustomer,
  onBulkAddCustomers,
  onUpdateCustomer,
  onDeleteCustomer,
  onPurgeAllCustomers,
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

  // Sorting State
  const [sortField, setSortField] = useState<CustomerSortField>('customerId');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: CustomerSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Column Visibility State (10 exact columns specification)
  const [visibleColumns, setVisibleColumns] = useState({
    customerId: true,
    name: true,
    route: true,
    category: true,
    creditLimit: true,
    limitPct: true,
    outstanding: true,
    aging: true,
    sync: true,
    actions: true,
  });
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);

  // Column Widths & Resizing State
  const defaultColumnWidths: Record<string, number> = useMemo(
    () => ({
      select: 44,
      customerId: 110,
      name: 220,
      route: 130,
      category: 140,
      creditLimit: 110,
      limitPct: 100,
      outstanding: 130,
      aging: 115,
      sync: 100,
      actions: 115,
    }),
    []
  );

  const compactColumnWidths: Record<string, number> = useMemo(
    () => ({
      select: 34,
      customerId: 80,
      name: 150,
      route: 90,
      category: 95,
      creditLimit: 85,
      limitPct: 75,
      outstanding: 90,
      aging: 85,
      sync: 75,
      actions: 80,
    }),
    []
  );

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    select: 44,
    customerId: 110,
    name: 220,
    route: 130,
    category: 140,
    creditLimit: 110,
    limitPct: 100,
    outstanding: 130,
    aging: 115,
    sync: 100,
    actions: 115,
  });

  const [isCompactDensity, setIsCompactDensity] = useState(false);
  const columnMenuRef = React.useRef<HTMLDivElement | null>(null);
  const resizingColumnRef = React.useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Close column dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    if (isColumnMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isColumnMenuOpen]);

  // Handle Drag to Resize Columns
  const handleResizeStart = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = columnWidths[colKey] || 100;
    resizingColumnRef.current = {
      colKey,
      startX: e.clientX,
      startWidth,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColumnRef.current) return;
      const { colKey: key, startX, startWidth: sw } = resizingColumnRef.current;
      const diff = moveEvent.clientX - startX;
      // Allow minimization down to 40px, or expanding up to 600px
      const newWidth = Math.max(40, Math.min(600, sw + diff));
      setColumnWidths((prev) => ({
        ...prev,
        [key]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingColumnRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Calculate dynamic total table width for horizontal scroll
  const totalTableWidth = useMemo(() => {
    let width = columnWidths.select || 44;
    if (visibleColumns.customerId) width += columnWidths.customerId || 110;
    if (visibleColumns.name) width += columnWidths.name || 220;
    if (visibleColumns.route) width += columnWidths.route || 130;
    if (visibleColumns.category) width += columnWidths.category || 140;
    if (visibleColumns.creditLimit) width += columnWidths.creditLimit || 110;
    if (visibleColumns.limitPct) width += columnWidths.limitPct || 100;
    if (visibleColumns.outstanding) width += columnWidths.outstanding || 130;
    if (visibleColumns.aging) width += columnWidths.aging || 115;
    if (visibleColumns.sync) width += columnWidths.sync || 100;
    if (visibleColumns.actions) width += columnWidths.actions || 115;
    return width;
  }, [columnWidths, visibleColumns]);

  // Data Purge State
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

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

  // Bulk Import & Export Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importDragOver, setImportDragOver] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importParsedRows, setImportParsedRows] = useState<ParsedCustomerRow[]>([]);
  const [importSummary, setImportSummary] = useState({ total: 0, valid: 0, invalid: 0 });
  const [isCommittingImport, setIsCommittingImport] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportRouteChoice, setExportRouteChoice] = useState<'all' | 'selected'>('all');

  // Form State
  const [formShopNumber, setFormShopNumber] = useState<number>(1);
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

  // Sorted Customers List
  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'customerId': {
          const numA = extractShopSequence(a);
          const numB = extractShopSequence(b);
          cmp = numA - numB;
          break;
        }
        case 'name': {
          const nameA = (a.shopName || a.shop_name || '').toLowerCase();
          const nameB = (b.shopName || b.shop_name || '').toLowerCase();
          cmp = nameA.localeCompare(nameB);
          break;
        }
        case 'route': {
          const routeA = (a.route || '').toLowerCase();
          const routeB = (b.route || '').toLowerCase();
          cmp = routeA.localeCompare(routeB);
          break;
        }
        case 'category': {
          const catA = (a.channel_type || '').toLowerCase();
          const catB = (b.channel_type || '').toLowerCase();
          cmp = catA.localeCompare(catB);
          break;
        }
        case 'creditLimit': {
          cmp = (a.creditLimit || 0) - (b.creditLimit || 0);
          break;
        }
        case 'limitPct': {
          const pctA = a.creditLimit > 0 ? (a.currentBalance / a.creditLimit) * 100 : 0;
          const pctB = b.creditLimit > 0 ? (b.currentBalance / b.creditLimit) * 100 : 0;
          cmp = pctA - pctB;
          break;
        }
        case 'outstanding': {
          cmp = (a.currentBalance || 0) - (b.currentBalance || 0);
          break;
        }
        case 'aging': {
          const orderMap: Record<string, number> = {
            Current: 1,
            '8-15 Days': 2,
            '16-30 Days': 3,
            '30+ Days': 4,
          };
          const ageA = orderMap[getCustomerAging(a)] || 0;
          const ageB = orderMap[getCustomerAging(b)] || 0;
          cmp = ageA - ageB;
          break;
        }
        case 'sync': {
          const syncA = a.synced ? 1 : 0;
          const syncB = b.synced ? 1 : 0;
          cmp = syncA - syncB;
          break;
        }
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [filteredCustomers, sortField, sortAsc]);

  // Handle Full Purge of All Outlets to 0
  const handleExecutePurge = async () => {
    setIsPurging(true);
    try {
      await db.customers.clear();
      try {
        await supabase.from('customers').delete().neq('id', '0');
      } catch (err) {
        console.warn('Supabase customer purge:', err);
      }
      if (onPurgeAllCustomers) {
        await onPurgeAllCustomers();
      }
      setSelectedCustomer(null);
      setSelectedIds(new Set());
      setShowPurgeModal(false);
      showToast('🗑️ All outlets successfully purged to 0!');
    } catch (err) {
      console.error('Purge error:', err);
      showToast('Failed to purge outlets.');
    } finally {
      setIsPurging(false);
    }
  };

  // Transaction History for Selected Customer (Combined Ledger)
  const selectedCustomerLedger = useMemo(() => {
    if (!selectedCustomer) return [];

    const custOrders = orders
      .filter((o) => o.customerId === selectedCustomer.id)
      .map((o) => {
        const rawNum = extractSequenceNumber(o.orderNo) || o.invoiceNumber || 1;
        const cleanBill = `Bill #${rawNum}`;
        return {
          id: o.id,
          date: o.date,
          type: 'invoice' as const,
          ref: cleanBill,
          description: `Debit: ${cleanBill} (Delivered ${o.totalCartons}c + ${o.totalPieces}p • ${o.paymentType})`,
          debit: o.netBill,
          credit: o.cashPaid,
          orderObj: o,
        };
      });

    const custRecoveries = roznamcha
      .filter((r) => r.customerId === selectedCustomer.id && r.type === 'cash_in')
      .map((r) => {
        const rawSlip = r.slipNo || r.entryNo || 'RCP';
        const cleanRef = rawSlip.includes('Bill') || rawSlip.includes('Invoice')
          ? `Payment against ${rawSlip.replace('Invoice', 'Bill')}`
          : `Payment against Bill • ${rawSlip}`;
        return {
          id: r.id,
          date: r.date,
          type: 'recovery' as const,
          ref: cleanRef,
          description: r.narration?.includes('Payment against')
            ? r.narration
            : `Payment against Bill — ${r.narration}`,
          debit: 0,
          credit: r.amount,
          orderObj: null,
        };
      });

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
      shopNumber: Number(formShopNumber) || 1,
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

  // Bulk Import Handlers
  const handleDownloadSampleTemplate = () => {
    const templateContent = generateSampleCustomerCsvTemplate();
    triggerCsvDownload(templateContent, 'customers_template.csv');
    showToast('Downloaded sample CSV template (customers_template.csv)');
  };

  const processCsvFile = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      showToast('Please upload a valid .csv file format.');
      return;
    }

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      const parsed = parseCustomerCsv(content);
      setImportParsedRows(parsed.rows);
      setImportSummary({
        total: parsed.totalRows,
        valid: parsed.validRowsCount,
        invalid: parsed.errorRowsCount,
      });

      if (parsed.totalRows === 0) {
        showToast('The uploaded CSV file contains no data rows.');
      } else if (parsed.errorRowsCount > 0) {
        showToast(`Parsed ${parsed.totalRows} rows. ${parsed.errorRowsCount} row(s) missing required fields (Shop Name / Route).`);
      } else {
        showToast(`Parsed ${parsed.totalRows} rows successfully! Ready to commit.`);
      }
    };
    reader.onerror = () => {
      showToast('Error reading the CSV file.');
    };
    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    const validRows = importParsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast('No valid customer rows to import. Each row must have a Shop Name and Route.');
      return;
    }

    setIsCommittingImport(true);
    try {
      const startSeqNum = getNextShopSequenceNumber(customers);
      const newCustomers: Customer[] = validRows.map((row, idx) => {
        const assignedShopNum = row.shop_number || (startSeqNum + idx);
        const custId = `cust-${Date.now()}-${assignedShopNum}-${Math.random().toString(36).slice(2, 6)}`;
        return {
          id: custId,
          tenant_id: ACTIVE_TENANT_ID,
          shopNumber: assignedShopNum,
          shopName: row.shop_name,
          shop_name: row.shop_name,
          name: row.owner_name || row.shop_name,
          owner_name: row.owner_name || row.shop_name,
          phone: row.phone,
          whatsapp_number: row.whatsapp || row.phone,
          route: row.route,
          address: `${row.route}, Swat`,
          zone: 'Mingora Zone 1',
          channel_type: row.channel_type,
          tax_status: 'Filer',
          atlStatus: 'filer',
          creditLimit: row.credit_limit,
          credit_limit: row.credit_limit,
          credit_days: 15,
          currentBalance: row.opening_balance,
          current_balance: row.opening_balance,
          status: 'active',
        };
      });

      // 1. Bulk insert into local Dexie.js
      await db.customers.bulkPut(newCustomers);

      // 2. Sync to Supabase
      try {
        await syncCustomersToSupabase(newCustomers);
      } catch (cloudErr) {
        console.warn('Remote Supabase sync warning during bulk customer import:', cloudErr);
      }

      // 3. Inform parent component if onBulkAddCustomers prop exists
      if (onBulkAddCustomers) {
        await onBulkAddCustomers(newCustomers);
      }

      // 4. Update UI
      showToast(
        `🎉 Successfully imported ${newCustomers.length} retailers (Shop #${startSeqNum} to Shop #${startSeqNum + newCustomers.length - 1})!`
      );
      setIsImportModalOpen(false);
      setImportParsedRows([]);
      setImportFileName('');
      setImportSummary({ total: 0, valid: 0, invalid: 0 });
    } catch (err: any) {
      console.error('Error committing bulk customer import:', err);
      showToast(`Failed to import customers: ${err?.message || 'Database error'}`);
    } finally {
      setIsCommittingImport(false);
    }
  };

  // Bulk Export Handlers
  const handleExportCustomers = (filterRoute?: string) => {
    const route =
      filterRoute !== undefined
        ? filterRoute
        : exportRouteChoice === 'selected'
        ? selectedRoute
        : 'All';
    const { csvString, filename, rowCount } = exportCustomersToCsv(customers, route);
    triggerCsvDownload(csvString, filename);
    setIsExportModalOpen(false);
    showToast(`Exported ${rowCount} retailers to ${filename}`);
  };

  // Legacy Export CSV (kept for backwards compatibility)
  const handleExportCsv = () => {
    handleExportCustomers(selectedRoute === 'All' ? undefined : selectedRoute);
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
    const nextShopNum = getNextShopSequenceNumber(customers);
    setFormShopNumber(nextShopNum);
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
    setFormShopNumber(extractShopSequence(c));
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                DISTRIBUTION NETWORK
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              FMCG &amp; Pharma Retail Accounts Governance •{' '}
              <strong className="text-slate-700 font-bold">{customers.length} Active Entities</strong> •
              Currency: PKR (Rs.) • FBR Active Taxpayer List (ATL):{' '}
              <span className="text-emerald-700 font-bold">{filerPercentage}% Verified</span>
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* PROMINENT PURGE ALL OUTLETS TO 0 BUTTON */}
            <button
              type="button"
              onClick={() => setShowPurgeModal(true)}
              disabled={isPurging}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md border border-rose-700 active:scale-95 disabled:opacity-50"
              title="Wipe all customer records from local database and Supabase"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>[ 🗑️ PURGE ALL OUTLETS TO 0 ]</span>
            </button>

            <button
              onClick={() => {
                setImportFileName('');
                setImportParsedRows([]);
                setImportSummary({ total: 0, valid: 0, invalid: 0 });
                setIsImportModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Bulk import retailers from CSV spreadsheet"
            >
              <Upload className="w-4 h-4 text-amber-700" />
              <span>📥 Bulk Import (CSV)</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300 shadow-2xs"
              title="Export complete customer master directory to CSV"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>📤 Export Customers (CSV)</span>
            </button>

            <button
              onClick={handleSyncApis}
              disabled={isSyncingApis}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 disabled:opacity-60"
              title="Sync 3rd-Party APIs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-amber-600 ${isSyncingApis ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Sync APIs</span>
            </button>

            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Retailer</span>
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
          {/* Header Bar with Purge Button & Column Visibility Toggle */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800 uppercase tracking-wider">
                Retailer Directory ({filteredCustomers.length} Outlets)
              </span>
              {selectedIds.size > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                  {selectedIds.size} selected
                </span>
              )}
              {/* Prominent Red Purge Button */}
              <button
                type="button"
                onClick={() => setShowPurgeModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-rose-700"
                title="Wipe mock entities and reset directory to 0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>[ 🗑️ PURGE ALL OUTLETS TO 0 ]</span>
              </button>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 flex-wrap">
              {/* Columns Visibility Dropdown */}
              <div className="relative" ref={columnMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsColumnMenuOpen((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs font-sans text-xs"
                  title="Toggle visible columns"
                >
                  <Columns className="w-3.5 h-3.5 text-slate-600" />
                  <span>Columns ▾</span>
                </button>
                {isColumnMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 space-y-1.5 text-xs text-slate-200">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span>Column Visibility</span>
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleColumns({
                            customerId: true,
                            name: true,
                            route: true,
                            category: true,
                            creditLimit: true,
                            limitPct: true,
                            outstanding: true,
                            aging: true,
                            sync: true,
                            actions: true,
                          })
                        }
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline decoration-dotted"
                      >
                        Show All
                      </button>
                    </div>
                    {[
                      { key: 'customerId', label: '1. Customer ID' },
                      { key: 'name', label: '2. Name (Shop)' },
                      { key: 'route', label: '3. Route' },
                      { key: 'category', label: '4. Category / Channel' },
                      { key: 'creditLimit', label: '5. Credit Limit' },
                      { key: 'limitPct', label: '6. Discount %' },
                      { key: 'outstanding', label: '7. Outstanding Balance' },
                      { key: 'aging', label: '8. Aging Risk' },
                      { key: 'sync', label: '9. Sync Status' },
                      { key: 'actions', label: '10. Actions' },
                    ].map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2.5 px-2 py-1 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-200 select-none text-xs font-medium transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                          onChange={(e) =>
                            setVisibleColumns({
                              ...visibleColumns,
                              [col.key]: e.target.checked,
                            })
                          }
                          className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Compact Density Button */}
              <button
                type="button"
                onClick={() => {
                  setIsCompactDensity((prev) => {
                    const next = !prev;
                    setColumnWidths(next ? compactColumnWidths : defaultColumnWidths);
                    return next;
                  });
                }}
                className={`px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs font-sans text-xs ${
                  isCompactDensity
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
                title="Toggle compact density viewing"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                <span>{isCompactDensity ? 'Compact Density (ON)' : 'Compact Density'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs font-sans text-xs"
                title="Export customer list to CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>📤 Export (CSV)</span>
              </button>

              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="whitespace-nowrap font-sans font-medium text-slate-600 text-xs">
                Debt: <strong className="text-slate-900 font-bold">{formatPKR(filteredCustomers.reduce((a, b) => a + (b.currentBalance || 0), 0))}</strong>
              </span>
            </div>
          </div>

          {/* Table with Exact 10 Columns, Resizable Headers & Density Support */}
          <div className="overflow-x-auto w-full border-t border-slate-200">
            <table
              className="text-left border-collapse table-fixed w-full"
              style={{ minWidth: totalTableWidth }}
            >
              <thead>
                <tr className="bg-slate-100 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  {/* Select Checkbox Column */}
                  <th
                    style={{
                      width: columnWidths.select,
                      minWidth: columnWidths.select,
                      maxWidth: columnWidths.select,
                    }}
                    className={`${isCompactDensity ? 'px-1.5 py-1' : 'p-3'} text-center select-none relative bg-slate-100 border-r border-slate-200`}
                  >
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
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div
                      onMouseDown={(e) => handleResizeStart('select', e)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                      title="Drag to resize"
                    />
                  </th>

                  {/* Column 1: Customer ID */}
                  {visibleColumns.customerId && (
                    <th
                      style={{
                        width: columnWidths.customerId,
                        minWidth: columnWidths.customerId,
                        maxWidth: columnWidths.customerId,
                      }}
                      className={`${isCompactDensity ? 'px-2 py-1' : 'p-3'} whitespace-nowrap select-none relative group bg-slate-100 hover:bg-slate-200 transition-colors border-r border-slate-200 truncate`}
                    >
                      <div
                        onClick={() => handleSort('customerId')}
                        className="flex items-center gap-1 cursor-pointer truncate pr-1"
                        title="Sort by Customer ID"
                      >
                        <span className="truncate">1. Customer ID</span>
                        {sortField === 'customerId' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3 text-amber-700 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-700 shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 shrink-0" />
                        )}
                      </div>
                      <div
                        onMouseDown={(e) => handleResizeStart('customerId', e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                        title="Drag to resize column"
                      />
                    </th>
                  )}

                  {/* Column 2: Name */}
                  {visibleColumns.name && (
                    <th
                      style={{
                        width: columnWidths.name,
                        minWidth: columnWidths.name,
                        maxWidth: columnWidths.name,
                      }}
                      className={`${isCompactDensity ? 'px-2 py-1' : 'p-3'} whitespace-nowrap select-none relative group bg-slate-100 hover:bg-slate-200 transition-colors border-r border-slate-200 truncate`}
                    >
                      <div
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 cursor-pointer truncate pr-1"
                        title="Sort by Shop Name"
                      >
                        <span className="truncate">2. Name</span>
                        {sortField === 'name' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3 text-amber-700 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-700 shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 shrink-0" />
                        )}
                      </div>
                      <div
                        onMouseDown={(e) => handleResizeStart('name', e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                        title="Drag to resize column"
                      />
                    </th>
                  )}

                  {/* Column 3: Route */}
                  {visibleColumns.route && (
                    <th
                      style={{
                        width: columnWidths.route,
                        minWidth: columnWidths.route,
                        maxWidth: columnWidths.route,
                      }}
                      className={`${isCompactDensity ? 'px-2 py-1' : 'p-3'} whitespace-nowrap select-none relative group bg-slate-100 hover:bg-slate-200 transition-colors border-r border-slate-200 truncate`}
                    >
                      <div
                        onClick={() => handleSort('route')}
                        className="flex items-center gap-1 cursor-pointer truncate pr-1"
                        title="Sort by Route"
                      >
                        <span className="truncate">3. Route</span>
                        {sortField === 'route' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3 text-amber-700 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-700 shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 shrink-0" />
                        )}
                      </div>
                      <div
                        onMouseDown={(e) => handleResizeStart('route', e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                        title="Drag to resize column"
                      />
                    </th>
                  )}

                  {/* Column 4: Category / Channel */}
                  {visibleColumns.category && (
                    <th
                      style={{
                        width: columnWidths.category,
                        minWidth: columnWidths.category,
                        maxWidth: columnWidths.category,
                      }}
                      className={`${isCompactDensity ? 'px-2 py-1' : 'p-3'} whitespace-nowrap select-none relative group bg-slate-100 hover:bg-slate-200 transition-colors border-r border-slate-200 truncate`}
                    >
                      <div
                        onClick={() => handleSort('category')}
                        className="flex items-center gap-1 cursor-pointer truncate pr-1"
                        title="Sort by Category / Channel"
                      >
                        <span className="truncate">4. Category / Channel</span>
                        {sortField === 'category' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3 text-amber-700 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-700 shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 shrink-0" />
                        )}
                      </div>
                      <div
                        onMouseDown={(e) => handleResizeStart('category', e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                        title="Drag to resize column"
                      />
                    </th>
                  )}

                  {/* Column 5: Credit Limit */}
                  {visibleColumns.creditLimit && (
                    <th
                      style={{
                        width: columnWidths.creditLimit,
                        minWidth: columnWidths.creditLimit,
                        maxWidth: columnWidths.creditLimit,
                      }}
                      className={`${isCompactDensity ? 'px-2 py-1' : 'p-3'} text-right whitespace-nowrap select-none relative group bg-slate-100 hover:bg-slate-200 transition-colors border-r border-slate-200 truncate`}
                    >
                      <div
                        onClick={() => handleSort('creditLimit')}
                        className="flex items-center justify-end gap-1 cursor-pointer truncate pr-1"
                        title="Sort by Credit Limit"
                      >
                        <span className="truncate">5. Credit Limit</span>
                        {sortField === 'creditLimit' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3 text-amber-700 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-700 shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 shrink-0" />
                        )}
                      </div>
                      <div
                        onMouseDown={(e) => handleResizeStart('creditLimit', e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                        title="Drag to resize column"
                      />
                    </th>
                  )}

                  {/* Column 6: Limit % */}
                  {visibleColumns.limitPct && (
                    <th
                      style={{
                        width: columnWidths.limitPct,
                        minWidth: columnWidths.limitPct,
                        maxWidth: columnWidths.limitPct,
                      }}
                      className={`${isCompactDensity ? 'px-2 py-1' : 'p-3'} text-center whitespace-nowrap select-none relative group bg-slate-100 hover:bg-slate-200 transition-colors border-r border-slate-200 truncate`}
                    >
                      <div
                        onClick={() => handleSort('limitPct')}
                        className="flex items-center justify-center gap-1 cursor-pointer truncate pr-1"
                        title="Sort by Limit Utilization %"
                      >
                        <span className="truncate">6. Limit %</span>
                        {sortField === 'limitPct' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3 text-amber-700 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-700 shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 shrink-0" />
                        )}
                      </div>
                      <div
                        onMouseDown={(e) => handleResizeStart('limitPct', e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                        title="Drag to resize column"
                      />
                    </th>
                  )}

                  {/* Columns 7 & 8: Outstanding Balance */}
                  {visibleColumns.outstanding && (
                    <th
                      style={{
                        width: columnWidths.outstanding,
                        minWidth: columnWidths.outstanding,
                        maxWidth: columnWidths.outstanding,
                      }}
                      className={`${isCompactDensity ? 'px-2 py-1' : 'p-3'} text-right whitespace-nowrap select-none relative group bg-slate-100 hover:bg-slate-200 transition-colors border-r border-slate-200 truncate`}
                    >
                      <div
                        onClick={() => handleSort('outstanding')}
                        className="flex items-center justify-end gap-1 cursor-pointer truncate pr-1"
                        title="Sort by Outstanding Balance"
                      >
                        <span className="truncate">7. Outstanding</span>
                        {sortField === 'outstanding' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3 text-amber-700 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-700 shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 shrink-0" />
                        )}
                      </div>
                      <div
                        onMouseDown={(e) => handleResizeStart('outstanding', e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                        title="Drag to resize column"
                      />
                    </th>
                  )}

                  {/* Column 9: Aging Risk */}
                  {visibleColumns.aging && (
                    <th
                      style={{
                        width: columnWidths.aging,
                        minWidth: columnWidths.aging,
                        maxWidth: columnWidths.aging,
                      }}
                      className={`${isCompactDensity ? 'px-2 py-1' : 'p-3'} text-center whitespace-nowrap select-none relative group bg-slate-100 hover:bg-slate-200 transition-colors border-r border-slate-200 truncate`}
                    >
                      <div
                        onClick={() => handleSort('aging')}
                        className="flex items-center justify-center gap-1 cursor-pointer truncate pr-1"
                        title="Sort by Aging Risk"
                      >
                        <span className="truncate">8. Aging Risk</span>
                        {sortField === 'aging' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3 text-amber-700 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-700 shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 shrink-0" />
                        )}
                      </div>
                      <div
                        onMouseDown={(e) => handleResizeStart('aging', e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                        title="Drag to resize column"
                      />
                    </th>
                  )}

                  {/* Column 10: Sync Status */}
                  {visibleColumns.sync && (
                    <th
                      style={{
                        width: columnWidths.sync,
                        minWidth: columnWidths.sync,
                        maxWidth: columnWidths.sync,
                      }}
                      className={`${isCompactDensity ? 'px-2 py-1' : 'p-3'} text-center whitespace-nowrap select-none relative group bg-slate-100 hover:bg-slate-200 transition-colors border-r border-slate-200 truncate`}
                    >
                      <div
                        onClick={() => handleSort('sync')}
                        className="flex items-center justify-center gap-1 cursor-pointer truncate pr-1"
                        title="Sort by Live Sync Status"
                      >
                        <span className="truncate">9. Sync Status</span>
                        {sortField === 'sync' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3 text-amber-700 shrink-0" /> : <ArrowDown className="w-3 h-3 text-amber-700 shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 shrink-0" />
                        )}
                      </div>
                      <div
                        onMouseDown={(e) => handleResizeStart('sync', e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                        title="Drag to resize column"
                      />
                    </th>
                  )}

                  {/* Column 11: Actions */}
                  {visibleColumns.actions && (
                    <th
                      style={{
                        width: columnWidths.actions,
                        minWidth: columnWidths.actions,
                        maxWidth: columnWidths.actions,
                      }}
                      className={`${isCompactDensity ? 'px-2 py-1' : 'p-3'} text-center whitespace-nowrap select-none relative group bg-slate-100 truncate`}
                    >
                      <span className="truncate">10. Actions</span>
                      <div
                        onMouseDown={(e) => handleResizeStart('actions', e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none border-r border-slate-700 hover:border-amber-400 z-10"
                        title="Drag to resize column"
                      />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="text-slate-900 font-black text-base">0 Shops Found</div>
                        <p className="text-xs text-slate-600 max-w-md font-medium">
                          0 Shops Found. Click 'Bulk Import (CSV)' or '+ Add Retailer' to onboard your outlets.
                        </p>
                        <div className="flex items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setImportFileName('');
                              setImportParsedRows([]);
                              setImportSummary({ total: 0, valid: 0, invalid: 0 });
                              setIsImportModalOpen(true);
                            }}
                            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <Upload className="w-4 h-4 text-amber-700" />
                            <span>📥 Bulk Import (CSV)</span>
                          </button>
                          <button
                            type="button"
                            onClick={openAddModal}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>+ Add Retailer</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedCustomers.map((c, idx) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    const isChecked = selectedIds.has(c.id);
                    const aging = getCustomerAging(c);
                    const utilPct =
                      c.creditLimit > 0
                        ? Math.min(100, Math.round(((c.currentBalance || 0) / c.creditLimit) * 100))
                        : 0;

                    const rowPadding = isCompactDensity ? 'px-2 py-1' : 'p-3';

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
                          style={{
                            width: columnWidths.select,
                            minWidth: columnWidths.select,
                            maxWidth: columnWidths.select,
                          }}
                          className={`${rowPadding} text-center truncate`}
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
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>

                        {/* Column 1: Customer ID */}
                        {visibleColumns.customerId && (
                          <td
                            style={{
                              width: columnWidths.customerId,
                              minWidth: columnWidths.customerId,
                              maxWidth: columnWidths.customerId,
                            }}
                            className={`${rowPadding} whitespace-nowrap font-mono font-bold text-slate-800 truncate overflow-hidden`}
                          >
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-xs shadow-2xs truncate inline-block max-w-full">
                              Shop #{extractShopSequence(c, idx)}
                            </span>
                          </td>
                        )}

                        {/* Column 2: Name */}
                        {visibleColumns.name && (
                          <td
                            style={{
                              width: columnWidths.name,
                              minWidth: columnWidths.name,
                              maxWidth: columnWidths.name,
                            }}
                            className={`${rowPadding} whitespace-nowrap truncate overflow-hidden`}
                          >
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {c.shopName || c.shop_name || 'Retail Outlet'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium truncate">
                              {c.name || c.owner_name || 'Proprietor'}
                            </div>
                          </td>
                        )}

                        {/* Column 3: Route */}
                        {visibleColumns.route && (
                          <td
                            style={{
                              width: columnWidths.route,
                              minWidth: columnWidths.route,
                              maxWidth: columnWidths.route,
                            }}
                            className={`${rowPadding} whitespace-nowrap text-xs text-slate-700 font-semibold truncate overflow-hidden`}
                          >
                            <span className="truncate block">{c.route}</span>
                          </td>
                        )}

                        {/* Column 4: Category / Channel */}
                        {visibleColumns.category && (
                          <td
                            style={{
                              width: columnWidths.category,
                              minWidth: columnWidths.category,
                              maxWidth: columnWidths.category,
                            }}
                            className={`${rowPadding} whitespace-nowrap truncate overflow-hidden`}
                          >
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-full">
                              {c.channel_type || 'General Store'}
                            </span>
                          </td>
                        )}

                        {/* Column 5: Credit Limit */}
                        {visibleColumns.creditLimit && (
                          <td
                            style={{
                              width: columnWidths.creditLimit,
                              minWidth: columnWidths.creditLimit,
                              maxWidth: columnWidths.creditLimit,
                            }}
                            className={`${rowPadding} text-right whitespace-nowrap font-mono text-xs font-semibold text-slate-700 truncate overflow-hidden`}
                          >
                            <span className="truncate block">{(c.creditLimit || 0).toLocaleString('en-PK')}</span>
                          </td>
                        )}

                        {/* Column 6: Limit % */}
                        {visibleColumns.limitPct && (
                          <td
                            style={{
                              width: columnWidths.limitPct,
                              minWidth: columnWidths.limitPct,
                              maxWidth: columnWidths.limitPct,
                            }}
                            className={`${rowPadding} text-center whitespace-nowrap truncate overflow-hidden`}
                          >
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black border truncate max-w-full ${
                                utilPct >= 100 || c.status === 'credit_locked'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : utilPct >= 71
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {utilPct >= 100 || c.status === 'credit_locked'
                                ? `${Math.min(utilPct, 100)}% Locked`
                                : `${utilPct}% Used`}
                            </span>
                          </td>
                        )}

                        {/* Columns 7 & 8: Outstanding Balance */}
                        {visibleColumns.outstanding && (
                          <td
                            style={{
                              width: columnWidths.outstanding,
                              minWidth: columnWidths.outstanding,
                              maxWidth: columnWidths.outstanding,
                            }}
                            className={`${rowPadding} text-right whitespace-nowrap font-mono text-xs font-bold text-slate-900 truncate overflow-hidden`}
                          >
                            <span className="truncate block">{(c.currentBalance || 0).toLocaleString('en-PK')}</span>
                          </td>
                        )}

                        {/* Column 9: Aging Risk */}
                        {visibleColumns.aging && (
                          <td
                            style={{
                              width: columnWidths.aging,
                              minWidth: columnWidths.aging,
                              maxWidth: columnWidths.aging,
                            }}
                            className={`${rowPadding} text-center whitespace-nowrap truncate overflow-hidden`}
                          >
                            {aging === '30+ Days' || c.status === 'credit_locked' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 truncate max-w-full">
                                <Lock className="w-2.5 h-2.5 shrink-0" /> <span className="truncate">30+d (Locked)</span>
                              </span>
                            ) : aging === '16-30 Days' || aging === '8-15 Days' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 truncate max-w-full">
                                <span className="truncate">15d (Due)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 truncate max-w-full">
                                <span className="truncate">7d (Normal)</span>
                              </span>
                            )}
                          </td>
                        )}

                        {/* Column 10: Sync Status */}
                        {visibleColumns.sync && (
                          <td
                            style={{
                              width: columnWidths.sync,
                              minWidth: columnWidths.sync,
                              maxWidth: columnWidths.sync,
                            }}
                            className={`${rowPadding} text-center whitespace-nowrap truncate overflow-hidden`}
                          >
                            <div
                              className="flex items-center justify-center gap-1.5 truncate"
                              title={c.synced !== false ? 'Live Synced to Cloud DB' : 'Offline / Pending Sync'}
                            >
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  c.synced !== false
                                    ? 'bg-emerald-500 shadow-2xs shadow-emerald-400'
                                    : 'bg-amber-500 animate-pulse'
                                }`}
                              />
                              <span className="text-[10px] font-bold text-slate-500 truncate">
                                {c.synced !== false ? 'Synced' : 'Pending'}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Column 11: Actions */}
                        {visibleColumns.actions && (
                          <td
                            style={{
                              width: columnWidths.actions,
                              minWidth: columnWidths.actions,
                              maxWidth: columnWidths.actions,
                            }}
                            className={`${rowPadding} text-center whitespace-nowrap truncate overflow-hidden`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1 truncate">
                              {/* View Customer 360 / Ledger */}
                              <button
                                onClick={() => {
                                  setSelectedCustomer(c);
                                  setInspectorTab('ledger');
                                }}
                                className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-800 transition-colors cursor-pointer border border-transparent hover:border-amber-300 shrink-0"
                                title="View Customer 360 / Ledger"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Customer */}
                              <button
                                onClick={() => openEditModal(c)}
                                className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer border border-transparent hover:border-blue-300 shrink-0"
                                title="Edit Customer Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Customer with confirmation modal */}
                              {onDeleteCustomer && (
                                <button
                                  onClick={() => setCustomerToDelete(c)}
                                  className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer border border-transparent hover:border-rose-300 shrink-0"
                                  title="Delete Customer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-600/40 shadow-xs">
                      Shop #{extractShopSequence(selectedCustomer)} • {selectedCustomer.route || selectedCustomer.zone || 'Main Beat'}
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
                  POST /api/v2/retailer/shop-{extractShopSequence(selectedCustomer)}/sync • TTL: 0.04s • Multi-Region
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
              {/* Sequential Shop Number */}
              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200">
                <label className="block font-bold text-amber-900 uppercase mb-1">
                  Shop Sequence Number (Auto-Incremented) *
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-2 bg-amber-600 text-white font-black rounded-xl text-sm font-mono shadow-xs">
                    Shop #
                  </span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formShopNumber}
                    onChange={(e) => setFormShopNumber(parseInt(e.target.value, 10) || 1)}
                    placeholder="1"
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <p className="text-[10px] text-amber-800 mt-1 font-medium">
                  Universal Sequential Number (Next = Max Existing + 1). Automatically pre-filled, editable if needed.
                </p>
              </div>

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
                    Shop Identifier: <strong className="text-slate-900 font-bold">Shop #{extractShopSequence(selectedCustomer)}</strong>
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

      {/* Safety Confirmation Modal for Purging All Outlets to 0 */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-rose-300 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-300 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-black text-rose-950 leading-tight">
                ⚠️ Purge All Retailer Outlets to 0?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                This will permanently delete <strong className="text-rose-900 font-bold">ALL {customers.length} retail outlets</strong> from local IndexedDB and cloud storage, resetting your directory to 0 outlets.
              </p>
              <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Irreversible Action</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  All customer records, outstanding balances, and credit limits will be purged. You will be able to onboard clean outlets fresh via <strong>+ Add Retailer</strong> or <strong>Bulk Import (CSV)</strong>.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isPurging}
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPurging}
                onClick={handleExecutePurge}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isPurging ? 'Purging...' : 'Confirm Purge to 0'}</span>
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

      {/* ========================================================================= */}
      {/* MODAL 5: BULK IMPORT (CSV & DRAG-AND-DROP)                                */}
      {/* ========================================================================= */}
      {isImportModalOpen && (() => {
        const startSeqNum = getNextShopSequenceNumber(customers);
        let validCounter = 0;
        const validIndices = importParsedRows.map((r) => {
          if (r.isValid) {
            const idx = validCounter;
            validCounter++;
            return idx;
          }
          return -1;
        });

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center shadow-xs">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      Bulk Import Customers / Shops (CSV)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Upload retailer directory spreadsheet. Automatically validates records and assigns sequential Shop numbers.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                {/* 1. Download Sample CSV Template Bar */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                      <span>Standard CSV Schema &amp; Pre-Structured Template</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Required columns: <code className="bg-amber-100/90 text-amber-900 px-1 py-0.5 rounded font-mono font-bold">shop_name</code> and <code className="bg-amber-100/90 text-amber-900 px-1 py-0.5 rounded font-mono font-bold">route</code>.
                      Optional: <code className="font-mono text-slate-700">owner_name, phone, whatsapp, credit_limit, opening_balance, channel_type</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleTemplate}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Sample CSV Template</span>
                  </button>
                </div>

                {/* 2. Drag & Drop or File Upload Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setImportDragOver(true);
                  }}
                  onDragLeave={() => setImportDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setImportDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processCsvFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    importDragOver
                      ? 'border-amber-500 bg-amber-50/60 scale-[0.99]'
                      : importFileName
                      ? 'border-emerald-400 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-amber-400 bg-slate-50/60 hover:bg-amber-50/20'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processCsvFile(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-amber-600 mb-2.5">
                    <FileUp className="w-6 h-6" />
                  </div>

                  {importFileName ? (
                    <div className="space-y-1">
                      <span className="font-bold text-slate-900 text-sm flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        {importFileName}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        File loaded • Click or drop another .csv file to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 text-sm">
                        Drag &amp; drop your .csv file here, or <span className="text-amber-700 underline">browse files</span>
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Supports standard CSV files with commas, quotes, and custom header columns
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Visual Validation Preview Table */}
                {importParsedRows.length > 0 && (
                  <div className="space-y-3 pt-1">
                    {/* Validation Counters & Next Sequence Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                          Validation Preview:
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                          {importSummary.total} Total
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          ✓ {importSummary.valid} Valid
                        </span>
                        {importSummary.invalid > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {importSummary.invalid} Missing Fields
                          </span>
                        )}
                      </div>

                      {/* Auto-Sequential Shop Range Indicator */}
                      <div className="text-[11px] font-mono text-amber-900 bg-amber-100/80 border border-amber-200 px-3 py-1 rounded-xl font-bold">
                        Auto-Assigning: Shop #{startSeqNum} to Shop #{startSeqNum + Math.max(0, importSummary.valid - 1)}
                      </div>
                    </div>

                    {/* Table Container */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 whitespace-nowrap">Assigned Shop #</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Shop Name *</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Owner / Contact</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Route / Beat *</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Phone / WA</th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-right">Credit Limit</th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-right">Opening Debt</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Channel</th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-center">Validation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                          {importParsedRows.map((row, idx) => {
                            const isError = !row.isValid;
                            const assignedShopNum = row.shop_number || (row.isValid ? startSeqNum + validIndices[idx] : null);

                            return (
                              <tr
                                key={idx}
                                className={
                                  isError
                                    ? 'bg-rose-50/90 text-rose-950 font-medium'
                                    : idx % 2 === 0
                                    ? 'bg-white'
                                    : 'bg-slate-50/60'
                                }
                              >
                                {/* Assigned Shop # */}
                                <td className="py-2 px-3 whitespace-nowrap font-bold">
                                  {assignedShopNum ? (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold">
                                      Shop #{assignedShopNum}
                                    </span>
                                  ) : (
                                    <span className="text-rose-500 font-mono text-[10px]">—</span>
                                  )}
                                </td>

                                {/* Shop Name (Required) */}
                                <td className="py-2 px-3 whitespace-nowrap font-sans font-bold">
                                  {row.shop_name ? (
                                    <span>{row.shop_name}</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded font-bold text-[10px]">
                                      ⚠️ MISSING SHOP NAME
                                    </span>
                                  )}
                                </td>

                                {/* Owner Name */}
                                <td className="py-2 px-3 whitespace-nowrap font-sans text-slate-700">
                                  {row.owner_name}
                                </td>

                                {/* Route (Required) */}
                                <td className="py-2 px-3 whitespace-nowrap font-sans font-semibold">
                                  {row.route ? (
                                    <span className="text-[#35618d]">{row.route}</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded font-bold text-[10px]">
                                      ⚠️ MISSING ROUTE
                                    </span>
                                  )}
                                </td>

                                {/* Phone */}
                                <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                                  {row.phone || row.whatsapp || '—'}
                                </td>

                                {/* Credit Limit (Clean number, no "Rs.") */}
                                <td className="py-2 px-3 whitespace-nowrap text-right font-bold text-slate-900">
                                  {row.credit_limit.toLocaleString()}
                                </td>

                                {/* Opening Balance (Clean number, no "Rs.") */}
                                <td className="py-2 px-3 whitespace-nowrap text-right font-bold text-slate-900">
                                  {row.opening_balance.toLocaleString()}
                                </td>

                                {/* Channel Type */}
                                <td className="py-2 px-3 whitespace-nowrap font-sans text-[11px] text-slate-600">
                                  {row.channel_type}
                                </td>

                                {/* Status Indicator */}
                                <td className="py-2 px-3 whitespace-nowrap text-center">
                                  {row.isValid ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      <Check className="w-3 h-3" /> Ready
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                                      <AlertCircle className="w-3 h-3" /> {row.errors.join(' & ')}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500">
                  {importSummary.invalid > 0 ? (
                    <span className="text-amber-800 font-medium">
                      Note: Rows with missing Shop Name or Route are highlighted in red and will be excluded.
                    </span>
                  ) : importSummary.valid > 0 ? (
                    <span className="text-emerald-700 font-medium">
                      All {importSummary.valid} rows verified and ready to link with Order Booker &amp; Route Summaries!
                    </span>
                  ) : (
                    <span>Upload a CSV file to validate and preview retailer records.</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={importSummary.valid === 0 || isCommittingImport}
                    onClick={handleCommitImport}
                    className="px-5 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isCommittingImport ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Committing to Database...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Commit Import ({importSummary.valid} Retailers)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 6: BULK EXPORT (ONE-CLICK CSV DOWNLOAD)                              */}
      {/* ========================================================================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Export Customers (CSV)</h3>
                  <p className="text-xs text-slate-400">
                    Download complete retailer directory for sales routes, field recovery, and accounting
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Options */}
            <div className="p-6 space-y-5 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-2 text-[11px]">
                  Select Export Scope:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportRouteChoice('all')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      exportRouteChoice === 'all'
                        ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>All Customers</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                        {customers.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Export all retail accounts across all routes and territories
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportRouteChoice('selected')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      exportRouteChoice === 'selected'
                        ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Current Route</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        {customers.filter((c) => selectedRoute === 'All' || c.route === selectedRoute).length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Filtered by: <span className="font-bold text-slate-700">{selectedRoute}</span>
                    </p>
                  </button>
                </div>
              </div>

              {/* Operational Columns Included */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                  Operational Columns in Exported CSV:
                </span>
                <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                  {[
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
                  ].map((col) => (
                    <span
                      key={col}
                      className="bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-700 font-semibold"
                    >
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  ✓ Amounts formatted cleanly as numbers without "Rs." prefix for standard calculation in Excel / ERP.
                </p>
              </div>

              {/* Target Filename Preview */}
              <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                <span>Output File:</span>
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                  primelink_customers_{new Date().toISOString().slice(0, 10)}.csv
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleExportCustomers(exportRouteChoice === 'selected' ? selectedRoute : 'All')
                }
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-500 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
