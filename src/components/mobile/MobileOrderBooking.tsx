import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Sparkles,
  MapPin,
  Store,
  DollarSign,
  Printer,
  X,
  CreditCard,
  Ban,
  Clock,
  Lock,
  Package,
  ChevronDown,
} from 'lucide-react';
import { Customer, Order, OrderItem, Product, SalesRoute, RouteStop, ZeroSaleCall, UserAccount } from '../../types';
import { calculateOrderItem, formatPKR, formatAmount, formatRate, safeLabel } from '../../utils/calculations';
import { Thermal80mmReceipt } from '../shared/PrintTemplates';
import { getTenantRoutes, getTenantRouteStops, logZeroSaleCall, ACTIVE_TENANT_ID } from '../../db/localDb';
import { getNextSequenceNumber, formatInvoiceId, formatShopId, extractShopSequence } from '../../utils/sequenceNumbering';

interface MobileOrderBookingProps {
  products: Product[];
  customers: Customer[];
  orders?: Order[];
  currentUser?: UserAccount;
  onSaveOrder: (order: Order, cashCollected: number) => Promise<void>;
  onBulkAddCustomers?: (customers: Customer[]) => Promise<void>;
  isOnline: boolean;
}

export const MobileOrderBooking: React.FC<MobileOrderBookingProps> = ({
  products,
  customers,
  orders = [],
  currentUser,
  onSaveOrder,
  onBulkAddCustomers,
  isOnline,
}) => {
  // Routes & Beats loaded from local Dexie database
  const [dbRoutes, setDbRoutes] = useState<SalesRoute[]>([]);
  const [dbStops, setDbStops] = useState<RouteStop[]>([]);

  useEffect(() => {
    async function fetchRoutesAndStops() {
      try {
        const [rList, sList] = await Promise.all([
          getTenantRoutes(ACTIVE_TENANT_ID),
          getTenantRouteStops(undefined, ACTIVE_TENANT_ID),
        ]);
        setDbRoutes(rList);
        setDbStops(sList);
      } catch (err) {
        console.error('Failed to load routes in mobile order booking:', err);
      }
    }
    fetchRoutesAndStops();
  }, []);

  // Combined route names
  const routeOptions = useMemo(() => {
    const list: { id: string; name: string; label: string; code?: string; schedule?: string[] }[] = [];
    (dbRoutes || []).filter(Boolean).forEach((r) => {
      if (r) {
        list.push({ id: r.id, name: r.route_name, label: r.route_name, code: r.route_code, schedule: r.schedule_days });
      }
    });
    // Add any customer routes not in dbRoutes
    (customers || []).filter(Boolean).forEach((c) => {
      if (c && c.route && !list.some((l) => l.name === c.route)) {
        list.push({ id: `cust-${c.route}`, name: c.route, label: c.route, code: 'BEAT' });
      }
    });
    return list;
  }, [dbRoutes, customers]);

  const [selectedRouteName, setSelectedRouteName] = useState<string>(
    routeOptions[0]?.name || 'Mingora Central Sector'
  );

  useEffect(() => {
    if (routeOptions.length > 0 && !routeOptions.some((r) => r?.name === selectedRouteName)) {
      setSelectedRouteName(routeOptions[0]?.name || '');
    }
  }, [routeOptions, selectedRouteName]);

  const currentDbRoute = useMemo(() => {
    return (dbRoutes || []).find((r) => r?.route_name === selectedRouteName) || null;
  }, [dbRoutes, selectedRouteName]);

  // Route customers ordered by stop sequence
  const routeCustomers = useMemo(() => {
    const matchingCusts = (customers || []).filter(Boolean).filter((c) => {
      if (!c) return false;
      if (currentDbRoute) {
        const isAssignedInStops = (dbStops || []).some(
          (s) => s?.route_id === currentDbRoute.id && s?.customer_id === c.id
        );
        return isAssignedInStops || c.route === selectedRouteName;
      }
      return c.route === selectedRouteName;
    });

    if (currentDbRoute) {
      const stopsForRoute = (dbStops || []).filter((s) => s?.route_id === currentDbRoute.id);
      return matchingCusts.sort((a, b) => {
        const seqA = stopsForRoute.find((s) => s?.customer_id === a.id)?.stop_sequence ?? 999;
        const seqB = stopsForRoute.find((s) => s?.customer_id === b.id)?.stop_sequence ?? 999;
        return seqA - seqB;
      });
    }

    return matchingCusts;
  }, [customers, selectedRouteName, currentDbRoute, dbStops]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    routeCustomers[0]?.id || ''
  );

  // Sync if route changed
  useEffect(() => {
    if (routeCustomers.length > 0 && !routeCustomers.some((c) => c?.id === selectedCustomerId)) {
      setSelectedCustomerId(routeCustomers[0]?.id || '');
    }
  }, [routeCustomers, selectedCustomerId]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId || !customers) return null;
    return customers.find((c) => c?.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Stable sequence mapping for all customers
  const customerSeqMap = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach((c, idx) => {
      map.set(c.id, extractShopSequence(c, idx));
    });
    return map;
  }, [customers]);

  const currentSelectedSeq = useMemo(() => {
    if (!selectedCustomer) return 1;
    return customerSeqMap.get(selectedCustomer.id) ?? extractShopSequence(selectedCustomer);
  }, [selectedCustomer, customerSeqMap]);

  // Smart Searchable Shop Picker State
  const [isShopPickerOpen, setIsShopPickerOpen] = useState(false);
  const [shopSearchQuery, setShopSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const shopPickerRef = React.useRef<HTMLDivElement>(null);
  const shopInputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdown when tapping outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (shopPickerRef.current && !shopPickerRef.current.contains(event.target as Node)) {
        setIsShopPickerOpen(false);
        setShopSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filtered & ranked shops for the combobox
  const searchedShops = useMemo(() => {
    const q = shopSearchQuery.trim().toLowerCase();

    const getDetails = (c: Customer, inRoute: boolean) => {
      const seq = customerSeqMap.get(c.id) ?? extractShopSequence(c);
      const shopName = c.shopName || c.shop_name || 'Unnamed Outlet';
      const ownerName = c.owner_name || c.name || 'Proprietor';
      return {
        customer: c,
        seq,
        shopName,
        ownerName,
        inRoute,
      };
    };

    const routeItems = routeCustomers.map((c) => getDetails(c, true));

    if (!q) {
      return routeItems;
    }

    const otherCustomers = customers.filter(
      (c) => !routeCustomers.some((rc) => rc.id === c.id)
    );
    const otherItems = otherCustomers.map((c) => getDetails(c, false));
    const allItems = [...routeItems, ...otherItems];

    // Filter matches
    const filtered = allItems.filter((item) => {
      const seqStr = item.seq.toString();
      const shopLower = item.shopName.toLowerCase();
      const ownerLower = item.ownerName.toLowerCase();
      const routeLower = (item.customer.route || '').toLowerCase();

      // Check numeric match: "1", "25", "#25", "shop 25", "shop #25"
      if (
        seqStr === q ||
        `#${seqStr}` === q ||
        `shop #${seqStr}`.toLowerCase() === q ||
        `shop ${seqStr}`.toLowerCase() === q
      ) {
        return true;
      }
      if (seqStr.startsWith(q) || seqStr.includes(q)) {
        return true;
      }
      // Check shop name
      if (shopLower.includes(q)) {
        return true;
      }
      // Check owner name
      if (ownerLower.includes(q)) {
        return true;
      }
      // Check route
      if (routeLower.includes(q)) {
        return true;
      }
      return false;
    });

    // Score & sort:
    return filtered.sort((a, b) => {
      const aSeqStr = a.seq.toString();
      const bSeqStr = b.seq.toString();
      const aShopLower = a.shopName.toLowerCase();
      const bShopLower = b.shopName.toLowerCase();
      const aOwnerLower = a.ownerName.toLowerCase();
      const bOwnerLower = b.ownerName.toLowerCase();

      // 1. Exact shop number match takes absolute highest priority:
      // "1" -> Shop #1, "25" -> Shop #25
      const aExactSeq = aSeqStr === q || `#${aSeqStr}` === q || `shop #${aSeqStr}` === q;
      const bExactSeq = bSeqStr === q || `#${bSeqStr}` === q || `shop #${bSeqStr}` === q;
      if (aExactSeq && !bExactSeq) return -1;
      if (!aExactSeq && bExactSeq) return 1;

      // 2. In-route customers first
      if (a.inRoute && !b.inRoute) return -1;
      if (!a.inRoute && b.inRoute) return 1;

      // 3. Shop number prefix match ("2" -> 2, 20, 21...)
      const aSeqPrefix = aSeqStr.startsWith(q);
      const bSeqPrefix = bSeqStr.startsWith(q);
      if (aSeqPrefix && !bSeqPrefix) return -1;
      if (!aSeqPrefix && bSeqPrefix) return 1;

      // 4. Shop name starts with query ("Zee" -> Zeeshan Enterprises)
      const aShopPrefix = aShopLower.startsWith(q);
      const bShopPrefix = bShopLower.startsWith(q);
      if (aShopPrefix && !bShopPrefix) return -1;
      if (!aShopPrefix && bShopPrefix) return 1;

      // 5. Owner name starts with query ("Bakhtmand" -> Bakhtmand)
      const aOwnerPrefix = aOwnerLower.startsWith(q);
      const bOwnerPrefix = bOwnerLower.startsWith(q);
      if (aOwnerPrefix && !bOwnerPrefix) return -1;
      if (!aOwnerPrefix && bOwnerPrefix) return 1;

      // 6. Shop name includes query
      const aShopSub = aShopLower.includes(q);
      const bShopSub = bShopLower.includes(q);
      if (aShopSub && !bShopSub) return -1;
      if (!aShopSub && bShopSub) return 1;

      // 7. Owner name includes query
      const aOwnerSub = aOwnerLower.includes(q);
      const bOwnerSub = bOwnerLower.includes(q);
      if (aOwnerSub && !bOwnerSub) return -1;
      if (!aOwnerSub && bOwnerSub) return 1;

      return a.seq - b.seq;
    });
  }, [shopSearchQuery, routeCustomers, customers, customerSeqMap]);

  // Reset highlight index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [shopSearchQuery, isShopPickerOpen]);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    if (c.route && c.route !== selectedRouteName) {
      setSelectedRouteName(c.route);
    }
    setShopSearchQuery('');
    setIsShopPickerOpen(false);
  };

  const handleClearShopSearch = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShopSearchQuery('');
    setIsShopPickerOpen(true);
    if (shopInputRef.current) {
      shopInputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isShopPickerOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsShopPickerOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (searchedShops.length > 0 ? (prev + 1) % searchedShops.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        searchedShops.length > 0 ? (prev - 1 + searchedShops.length) % searchedShops.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchedShops.length > 0 && searchedShops[highlightedIndex]) {
        handleSelectCustomer(searchedShops[highlightedIndex].customer);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsShopPickerOpen(false);
      setShopSearchQuery('');
    }
  };

  const renderHighlightedText = (text: string, query: string) => {
    if (!query || !query.trim()) {
      return <span>{text}</span>;
    }
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return <span>{text}</span>;

    const escapedTokens = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, idx) => {
          const isMatch = tokens.some((t) => t.toLowerCase() === part.toLowerCase());
          if (isMatch) {
            return (
              <span
                key={idx}
                className="font-black text-amber-300 bg-amber-500/30 px-1 py-0.5 rounded shadow-2xs"
              >
                {part}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </span>
    );
  };

  const inputDisplayValue = isShopPickerOpen
    ? shopSearchQuery
    : selectedCustomer
    ? `Shop #${currentSelectedSeq} • ${selectedCustomer?.shopName || selectedCustomer?.shop_name || 'Outlet'} (Proprietor: ${
        selectedCustomer?.owner_name || selectedCustomer?.name || 'Owner'
      })`
    : '';

  const inputPlaceholderText = selectedCustomer
    ? `Shop #${currentSelectedSeq} • ${selectedCustomer?.shopName || selectedCustomer?.shop_name || 'Outlet'} (Type #, Name, Owner...)`
    : 'Search by shop #, name, or owner...';

  // Zero-Sale Call state
  const [showZeroSaleModal, setShowZeroSaleModal] = useState<boolean>(false);
  const [zeroSaleReason, setZeroSaleReason] = useState<ZeroSaleCall['reason']>('Sufficient Stock');
  const [zeroSaleNotes, setZeroSaleNotes] = useState<string>('');
  const [zeroSaleSuccessMsg, setZeroSaleSuccessMsg] = useState<string | null>(null);

  // Product search & category filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart state: map of productId -> { cartons, pieces, discountPercent }
  const [cartQuantities, setCartQuantities] = useState<
    Record<string, { cartons: number; pieces: number; discountPercent: number }>
  >({});

  const handleCartonDelta = (productId: string, delta: number) => {
    setCartQuantities((prev) => {
      const current = prev[productId] || { cartons: 0, pieces: 0, discountPercent: 0 };
      const nextCartons = Math.max(0, current.cartons + delta);
      if (nextCartons === 0 && current.pieces === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: { ...current, cartons: nextCartons } };
    });
  };

  const handlePiecesDelta = (productId: string, delta: number, packSize: number) => {
    setCartQuantities((prev) => {
      const current = prev[productId] || { cartons: 0, pieces: 0, discountPercent: 0 };
      let nextPieces = current.pieces + delta;
      let nextCartons = current.cartons;

      // Handle roll-over into carton if pieces >= packSize
      if (nextPieces >= packSize) {
        nextCartons += Math.floor(nextPieces / packSize);
        nextPieces = nextPieces % packSize;
      } else if (nextPieces < 0) {
        if (nextCartons > 0) {
          nextCartons -= 1;
          nextPieces = packSize - 1;
        } else {
          nextPieces = 0;
        }
      }

      if (nextCartons === 0 && nextPieces === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: { ...current, cartons: nextCartons, pieces: nextPieces } };
    });
  };

  const handleDiscountChange = (productId: string, discount: number) => {
    setCartQuantities((prev) => {
      const current = prev[productId] || { cartons: 0, pieces: 0, discountPercent: 0 };
      return { ...prev, [productId]: { ...current, discountPercent: Math.max(0, discount) } };
    });
  };

  // Compile cart items
  const cartItems: OrderItem[] = useMemo(() => {
    const list: OrderItem[] = [];
    for (const [prodId, qty] of Object.entries(cartQuantities)) {
      if (qty.cartons <= 0 && qty.pieces <= 0) continue;
      const prod = products.find((p) => p.id === prodId);
      if (!prod) continue;

      // Switch billing rate to Retail Selling Price
      const billingRate =
        prod.retailPrice && prod.retailPrice > 0 ? prod.retailPrice : (prod.tradePrice || 0);

      const calc = calculateOrderItem(
        qty.cartons,
        qty.pieces,
        prod.packSize,
        billingRate,
        qty.discountPercent
      );

      list.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        packSize: prod.packSize,
        cartons: qty.cartons,
        pieces: qty.pieces,
        totalUnits: calc.totalUnits,
        tradePrice: billingRate,
        retailPrice: billingRate,
        unitPrice: calc.unitPrice,
        grossTotal: calc.grossTotal,
        discountPercent: qty.discountPercent,
        discountAmount: calc.discountAmount,
        netTotal: calc.netTotal,
      });
    }
    return list;
  }, [cartQuantities, products]);

  // Order Totals
  const totalCartons = useMemo(() => cartItems.reduce((acc, i) => acc + i.cartons, 0), [cartItems]);
  const totalPieces = useMemo(() => cartItems.reduce((acc, i) => acc + i.pieces, 0), [cartItems]);
  const totalUnits = useMemo(() => cartItems.reduce((acc, i) => acc + i.totalUnits, 0), [cartItems]);
  const grossBill = useMemo(() => cartItems.reduce((acc, i) => acc + i.grossTotal, 0), [cartItems]);
  const totalDiscount = useMemo(() => cartItems.reduce((acc, i) => acc + i.discountAmount, 0), [cartItems]);
  const netBill = useMemo(() => grossBill - totalDiscount, [grossBill, totalDiscount]);

  // Payment Options
  const [paymentType, setPaymentType] = useState<'credit' | 'cash' | 'partial'>('credit');
  const [cashCollected, setCashCollected] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState('');

  // Update cash collected automatically if payment type changes
  React.useEffect(() => {
    if (paymentType === 'cash') {
      setCashCollected(netBill);
    } else if (paymentType === 'credit') {
      setCashCollected(0);
    }
  }, [paymentType, netBill]);

  // Credit Limit Check
  const currentCustomerBalance = selectedCustomer?.currentBalance || 0;
  const customerCreditLimit = selectedCustomer?.creditLimit || 0;
  const projectedBalance = currentCustomerBalance + (netBill - cashCollected);
  const isCreditExceeded = projectedBalance > customerCreditLimit && customerCreditLimit > 0;
  const isCreditLocked = selectedCustomer?.status === 'credit_locked';

  // Modal for Order Success & Thermal Print
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmitOrder = async () => {
    if (!selectedCustomer || cartItems.length === 0) return;
    setIsSaving(true);
    try {
      const nextInvoiceNum = getNextSequenceNumber(orders, (o) => o.invoiceNumber || o.orderNo);
      const orderNo = formatInvoiceId(nextInvoiceNum);
      const newOrder: Order = {
        id: `ord-${nextInvoiceNum}-${Date.now().toString().slice(-4)}`,
        orderNo,
        invoiceNumber: nextInvoiceNum,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        shopName: selectedCustomer.shopName,
        route: currentUser?.assignedRoute || selectedRouteName,
        date: new Date().toISOString(),
        items: cartItems,
        totalCartons,
        totalPieces,
        totalUnits,
        grossBill,
        totalDiscount,
        netBill,
        paymentType,
        cashPaid: cashCollected,
        remainingBalance: Math.max(0, netBill - cashCollected),
        synced: isOnline,
        notes: orderNotes,
        status: 'booked',
        bookerId: currentUser?.employeeId || currentUser?.id || 'EMP-101',
        bookerName: currentUser?.name || 'Order Booker',
        salesmanName: currentUser?.name || 'Order Booker',
      };

      await onSaveOrder(newOrder, cashCollected);
      setSavedOrder(newOrder);
      // Reset form
      setCartQuantities({});
      setOrderNotes('');
      setCashCollected(0);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordZeroSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const zeroSaleEntry: ZeroSaleCall = {
      tenant_id: ACTIVE_TENANT_ID,
      route_id: currentDbRoute?.id || 'route-general',
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      shop_name: selectedCustomer.shopName,
      date: new Date().toISOString().slice(0, 10),
      reason: zeroSaleReason,
      notes: zeroSaleNotes,
      logged_by: currentDbRoute?.assigned_booker_name || 'Order Booker',
      timestamp: new Date().toISOString(),
    };

    await logZeroSaleCall(zeroSaleEntry);
    setShowZeroSaleModal(false);
    setZeroSaleNotes('');
    setZeroSaleSuccessMsg(`Zero-Sale visit logged for ${selectedCustomer.shopName}`);
    setTimeout(() => setZeroSaleSuccessMsg(null), 3500);
  };

  return (
    <div className="w-full flex flex-col space-y-4 pb-36 overflow-x-hidden">
      {/* Zero Sale Success Alert */}
      {zeroSaleSuccessMsg && (
        <div className="bg-amber-900 text-amber-100 p-3.5 rounded-xl border border-amber-700 text-xs flex items-center justify-between shadow-md">
          <span>{zeroSaleSuccessMsg}</span>
          <button onClick={() => setZeroSaleSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 0 Shops Found Empty Banner */}
      {customers.length === 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-center space-y-2 shadow-2xs w-full">
          <div className="text-slate-900 font-black text-sm">0 Shops Found</div>
          <p className="text-xs text-slate-600 font-medium">
            0 Shops Found. Click 'Bulk Import (CSV)' or '+ Add Retailer' to onboard your outlets.
          </p>
        </div>
      )}

      {/* Route & Shop Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm text-white w-full relative z-30">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Route Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Salesman Beat / Route
              </label>
              {currentDbRoute?.route_code && (
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                  {currentDbRoute.route_code}
                </span>
              )}
            </div>
            <select
              value={selectedRouteName}
              onChange={(e) => setSelectedRouteName(e.target.value)}
              className="w-full min-h-[48px] h-12 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {routeOptions.filter(Boolean).map((r) => (
                <option key={r?.id || r?.name} value={r?.name || ''}>
                  {r?.code ? `[${r.code}] ` : ''}{safeLabel(r)}
                </option>
              ))}
            </select>
          </div>

          {/* Shop Selector - Smart Searchable Combobox */}
          <div className="relative" ref={shopPickerRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                Drop Sequence (Shops)
                {routeCustomers.length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {routeCustomers.length}
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setShowZeroSaleModal(true)}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1 cursor-pointer"
              >
                <Ban className="w-3 h-3" />
                Log Zero-Sale
              </button>
            </div>

            {/* Combobox Trigger / Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none z-10" />
              <input
                ref={shopInputRef}
                type="text"
                value={inputDisplayValue}
                onChange={(e) => {
                  setShopSearchQuery(e.target.value);
                  setIsShopPickerOpen(true);
                }}
                onFocus={() => {
                  setIsShopPickerOpen(true);
                }}
                onClick={() => {
                  setIsShopPickerOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder={inputPlaceholderText}
                className="w-full min-h-[48px] h-12 bg-slate-800 border border-slate-700 hover:border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl pl-10 pr-20 py-2.5 text-xs sm:text-sm font-semibold truncate placeholder:text-slate-500 cursor-pointer focus:cursor-text transition-all duration-150 shadow-inner"
              />

              {/* Right Controls: Quick Clear ✕ + Chevron */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                {(shopSearchQuery.length > 0 || isShopPickerOpen) && (
                  <button
                    type="button"
                    onClick={handleClearShopSearch}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
                    title="Clear search & view full route sequence"
                  >
                    <X className="w-4 h-4 text-slate-400 hover:text-amber-400" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsShopPickerOpen((prev) => !prev);
                    if (!isShopPickerOpen && shopInputRef.current) {
                      shopInputRef.current.focus();
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors cursor-pointer"
                  title="Toggle shop sequence list"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isShopPickerOpen ? 'rotate-180 text-amber-400' : 'text-slate-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Floating Dropdown List (z-50) */}
            {isShopPickerOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-72 sm:max-h-80 animate-in fade-in zoom-in-95 duration-100">
                {/* Header inside dropdown */}
                <div className="p-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-[11px] shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-slate-300 uppercase tracking-wider">
                      {shopSearchQuery.trim()
                        ? `${searchedShops.length} Found for "${shopSearchQuery}"`
                        : `Route Drop Sequence (${searchedShops.length} Shops)`}
                    </span>
                  </div>
                  {shopSearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={handleClearShopSearch}
                      className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer text-[10px]"
                    >
                      Show Full Route
                    </button>
                  )}
                </div>

                {/* Scrollable Shop List */}
                <div className="overflow-y-auto divide-y divide-slate-800 flex-1">
                  {searchedShops.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-400 space-y-2">
                      <p className="font-bold text-slate-200 text-sm">No Matching Outlets Found</p>
                      <p className="text-[11px] text-slate-400">
                        No shop matching "{shopSearchQuery}" on this beat.
                      </p>
                      <button
                        type="button"
                        onClick={handleClearShopSearch}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                      >
                        Reset Route Sequence
                      </button>
                    </div>
                  ) : (
                    searchedShops.filter(Boolean).map((item, idx) => {
                      if (!item || !item.customer) return null;
                      const isSelected = item.customer.id === selectedCustomerId;
                      const isHighlighted = idx === highlightedIndex;

                      return (
                        <button
                          key={item.customer.id || Math.random().toString()}
                          type="button"
                          onClick={() => handleSelectCustomer(item.customer)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`w-full text-left p-3 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 border-l-4 border-amber-400'
                              : isHighlighted
                              ? 'bg-slate-800 border-l-4 border-amber-500/50'
                              : 'hover:bg-slate-800/60 border-l-4 border-transparent'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            {/* Main Line: Shop #[ID] • [Shop Name] (Proprietor: [Owner]) */}
                            <div className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                              {renderHighlightedText(
                                `Shop #${item.seq} • ${item.shopName} (Proprietor: ${item.ownerName})`,
                                shopSearchQuery
                              )}
                            </div>

                            {/* Secondary Row: Debt / Credit Limit Badges */}
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-medium">
                              <span className="font-mono text-amber-400 font-bold whitespace-nowrap">
                                Due: {formatAmount(item.customer.currentBalance)}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="font-mono text-slate-300 whitespace-nowrap">
                                Limit: {formatAmount(item.customer.creditLimit)}
                              </span>
                              {!item.inRoute && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-1.5 py-0.2 rounded whitespace-nowrap">
                                    Beat: {item.customer.route}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right Badge / Status */}
                          <div className="shrink-0 flex items-center gap-1.5">
                            {isSelected ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                                <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                                <span className="hidden sm:inline">Active</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
                                Stop #{item.seq}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Customer Financial Snapshot */}
        {selectedCustomer && (
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-800/60 p-2 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Outstanding</span>
              <span className="font-mono font-bold text-amber-400 text-sm whitespace-nowrap">
                {formatAmount(selectedCustomer.currentBalance)}
              </span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Credit Limit</span>
              <span className="font-mono font-semibold text-slate-200 whitespace-nowrap">
                {formatAmount(selectedCustomer.creditLimit)}
              </span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Tax Reg.</span>
              <span
                className={`font-bold inline-block px-1.5 py-0.5 rounded text-[10px] uppercase ${
                  selectedCustomer.atlStatus === 'filer'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {selectedCustomer.atlStatus === 'filer' ? 'ATL Active (0.5%)' : 'Non-Filer (1%)'}
              </span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Health</span>
              <span
                className={`font-bold text-[11px] ${
                  isCreditLocked
                    ? 'text-rose-400 flex items-center gap-1'
                    : isCreditExceeded
                    ? 'text-amber-400'
                    : 'text-emerald-400 flex items-center gap-1'
                }`}
              >
                {isCreditLocked ? 'Credit Locked' : isCreditExceeded ? 'Limit Exceeded' : 'Active / Approved'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Field Zero-Sale Modal */}
      {showZeroSaleModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 text-white w-full sm:max-w-md rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">Log Zero-Sale Call</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowZeroSaleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordZeroSale} className="space-y-3 mt-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Shop / Outlet</span>
                <strong className="text-white text-sm block">{selectedCustomer.shopName}</strong>
                <span className="text-slate-400 text-[11px]">{selectedCustomer.address}</span>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Reason for No Order</label>
                <select
                  value={zeroSaleReason}
                  onChange={(e) => setZeroSaleReason(e.target.value as any)}
                  className="w-full min-h-[48px] h-12 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Sufficient Stock">Sufficient Stock (No replenishment required)</option>
                  <option value="Shop Closed">Shop Closed (Shutter down)</option>
                  <option value="Payment Dispute">Payment Dispute / Credit Overdue</option>
                  <option value="Owner Unavailable">Shop Owner / Purchaser Not Available</option>
                  <option value="Competitor Promotion">Purchased from Competitor Van</option>
                  <option value="Other">Other Operational Issue</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Field Remarks</label>
                <textarea
                  value={zeroSaleNotes}
                  onChange={(e) => setZeroSaleNotes(e.target.value)}
                  placeholder="e.g., Shop owner promised to clear ledger on next Tuesday visit"
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowZeroSaleModal(false)}
                  className="w-full min-h-[48px] h-12 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl font-bold flex items-center justify-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full min-h-[48px] h-12 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center cursor-pointer shadow-md"
                >
                  Save Call Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Locked Account Banner */}
      {isCreditLocked && (
        <div className="bg-red-950 border-2 border-red-500 text-white p-3.5 rounded-xl text-xs flex items-start gap-3 shadow-lg">
          <Lock className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-extrabold text-sm block text-red-200 uppercase tracking-wide">
              ⛔ ACCOUNT CREDIT LOCKED BY DISTRIBUTOR
            </span>
            <p className="text-red-100 mt-1">
              Credit sales suspended due to aging overdue balance or administrative hold. Orders must be 100% Cash Paid on spot or authorized by Distributor Management.
            </p>
          </div>
        </div>
      )}

      {/* Credit Limit Alert Banner */}
      {isCreditExceeded && (
        <div className="bg-rose-950/80 border border-rose-600/60 text-rose-200 p-3 rounded-xl text-xs flex items-start gap-2 shadow-sm animate-pulse">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Credit Limit Warning!</span>
            Projected balance after this order (<span className="whitespace-nowrap font-mono">{formatAmount(projectedBalance)}</span>) exceeds the authorized limit of{' '}
            <span className="whitespace-nowrap font-mono">{formatAmount(customerCreditLimit)}</span>. Collect on-spot cash to proceed smoothly.
          </div>
        </div>
      )}

      {/* Product Search & Category Filters */}
      <div className="space-y-2 w-full">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search SKU, Brand, Product Name, Barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[48px] h-12 bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-full whitespace-nowrap font-semibold cursor-pointer transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List Cards */}
      <div className="space-y-3 w-full">
        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2 w-full">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-800">No Products Found</div>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              No SKUs in catalog matching your filter. Switch to the Master Catalog in Desktop Console to add items.
            </p>
          </div>
        )}

        {filteredProducts.map((product, idx) => {
          const qty = cartQuantities[product.id] || { cartons: 0, pieces: 0, discountPercent: 0 };
          const retailPrice =
            product.retailPrice && product.retailPrice > 0
              ? product.retailPrice
              : product.tradePrice || 0;
          const packSize = Math.max(1, product.packSize || 1);
          const unitRetailRate = retailPrice / packSize;
          const itemUnits = qty.cartons * packSize + qty.pieces;
          const lineTotal = qty.cartons * retailPrice + qty.pieces * unitRetailRate;
          const discountPct = Math.max(0, Math.min(100, qty.discountPercent || 0));
          const discountAmt = (lineTotal * discountPct) / 100;
          const itemNet = lineTotal - discountAmt;
          const isSelected = itemUnits > 0;

          return (
            <div
              key={product.id}
              className={`bg-white rounded-2xl p-4 border transition-all shadow-sm w-full ${
                isSelected
                  ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Product Header */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {product.skuNumber ? `SKU #${product.skuNumber}` : (product.sku.startsWith('SKU') ? product.sku : `SKU #${idx + 1}`)}
                    </span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 font-bold px-1.5 py-0.5 rounded">
                      {product.brand}
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                      1 Ctn = {product.packSize} Pcs
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">
                    {product.name}
                  </h3>
                </div>

                {/* Pricing & Stock */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-extrabold font-mono text-slate-900 whitespace-nowrap">
                    {formatAmount(retailPrice)}
                    <span className="text-[10px] font-normal text-slate-500"> /ctn</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 whitespace-nowrap">
                    {formatRate(unitRetailRate)}
                    <span className="text-[10px] text-slate-500"> /pc</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-0.5 whitespace-nowrap">
                    Stock: {product.cartonStock} Ctn
                  </div>
                </div>
              </div>

              {/* Steppers for Cartons and Pieces (Touch-Friendly 48px min) */}
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5">
                {/* Cartons Stepper */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 mb-1.5">
                    <span>Cartons</span>
                    <span className="font-mono text-slate-400 whitespace-nowrap">({product.packSize}x)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCartonDelta(product.id, -1)}
                      className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-extrabold text-base text-slate-900 px-2 whitespace-nowrap">
                      {qty.cartons}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCartonDelta(product.id, 1)}
                      className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center hover:bg-amber-700 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Loose Pieces Stepper */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 mb-1.5">
                    <span>Loose Pieces</span>
                    <span className="font-mono text-slate-400 whitespace-nowrap text-[10px]">
                      (@{formatRate(unitRetailRate)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handlePiecesDelta(product.id, -1, product.packSize)}
                      className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-extrabold text-base text-slate-900 px-2 whitespace-nowrap">
                      {qty.pieces}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePiecesDelta(product.id, 1, product.packSize)}
                      className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center hover:bg-amber-700 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Item Math & Discount Summary if selected */}
              {isSelected && (
                <div className="mt-2.5 pt-2 border-t border-dashed border-amber-300 bg-amber-50/70 p-2 rounded-lg flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-amber-900 whitespace-nowrap">
                      Total Units: <strong>{itemUnits}</strong> ({qty.cartons}c + {qty.pieces}p)
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">Disc%:</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={qty.discountPercent || ''}
                        onChange={(e) =>
                          handleDiscountChange(product.id, parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-12 bg-white border border-slate-300 rounded px-1 py-0.5 text-center font-mono text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="font-mono font-black text-amber-950 text-sm whitespace-nowrap">
                    {formatAmount(itemNet)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart Review Bar - Anchored above bottom navigation */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 w-full bg-slate-900/98 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl text-white z-40">
          <div className="w-full sm:max-w-xl mx-auto space-y-2.5">
            {/* Quick Math Breakdown */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 whitespace-nowrap">
                Units: <strong className="text-white">{totalUnits}</strong> ({totalCartons} Ctn / {totalPieces} Pcs)
              </span>
              <div className="flex items-center gap-2 whitespace-nowrap">
                {totalDiscount > 0 && (
                  <span className="text-rose-400 font-mono text-[11px] whitespace-nowrap">
                    Disc: -{formatAmount(totalDiscount)}
                  </span>
                )}
                <span className="font-mono text-base font-black text-amber-400 whitespace-nowrap">
                  Net: {formatAmount(netBill)}
                </span>
              </div>
            </div>

            {/* Payment Term Selector */}
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setPaymentType('credit')}
                className={`min-h-[48px] h-12 py-2 rounded-xl font-bold border transition-colors cursor-pointer text-center flex items-center justify-center ${
                  paymentType === 'credit'
                    ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                Full Credit
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('cash')}
                className={`min-h-[48px] h-12 py-2 rounded-xl font-bold border transition-colors cursor-pointer text-center flex items-center justify-center ${
                  paymentType === 'cash'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                Cash Spot
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('partial')}
                className={`min-h-[48px] h-12 py-2 rounded-xl font-bold border transition-colors cursor-pointer text-center flex items-center justify-center ${
                  paymentType === 'partial'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                Partial
              </button>
            </div>

            {/* Partial Cash Input */}
            {paymentType === 'partial' && (
              <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-xl text-xs">
                <span className="text-slate-300 text-[11px] shrink-0 whitespace-nowrap">Cash Collected:</span>
                <input
                  type="number"
                  value={cashCollected || ''}
                  onChange={(e) => setCashCollected(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 20000"
                  className="w-full min-h-[38px] bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-emerald-400 font-bold focus:outline-none"
                />
                <span className="text-slate-400 font-mono text-[10px] shrink-0 whitespace-nowrap">
                  Bal: {formatAmount(Math.max(0, netBill - cashCollected))}
                </span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              onClick={handleSubmitOrder}
              disabled={isSaving}
              className="w-full min-h-[48px] h-12 bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="whitespace-nowrap font-bold">
                {isSaving
                  ? 'Saving to IndexedDB...'
                  : `Book Order (${formatAmount(netBill)})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Order Booking Success Modal with Thermal Receipt */}
      {savedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Order Saved Offline!
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {savedOrder.orderNo}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSavedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-200">
              Order committed to <strong>Dexie.js (IndexedDB)</strong> with SHA-256 integrity hash.
              {savedOrder.cashPaid > 0 && (
                <span> Auto-logged <strong className="whitespace-nowrap font-mono">{formatAmount(savedOrder.cashPaid)}</strong> to Field Roznamcha!</span>
              )}
            </div>

            {/* Render 80mm Thermal Receipt */}
            <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex justify-center overflow-x-auto">
              <Thermal80mmReceipt
                order={savedOrder}
                customer={selectedCustomer || undefined}
                showPrintButton={true}
              />
            </div>

            <button
              onClick={() => setSavedOrder(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 cursor-pointer"
            >
              Done &amp; Continue Next Shop
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
