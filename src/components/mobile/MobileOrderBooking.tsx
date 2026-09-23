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
} from 'lucide-react';
import { Customer, Order, OrderItem, Product, SalesRoute, RouteStop, ZeroSaleCall } from '../../types';
import { calculateOrderItem, formatPKR } from '../../utils/calculations';
import { Thermal80mmReceipt } from '../shared/PrintTemplates';
import { getTenantRoutes, getTenantRouteStops, logZeroSaleCall, ACTIVE_TENANT_ID } from '../../db/localDb';

interface MobileOrderBookingProps {
  products: Product[];
  customers: Customer[];
  onSaveOrder: (order: Order, cashCollected: number) => Promise<void>;
  isOnline: boolean;
}

export const MobileOrderBooking: React.FC<MobileOrderBookingProps> = ({
  products,
  customers,
  onSaveOrder,
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
    const list: { id: string; name: string; code?: string; schedule?: string[] }[] = [];
    dbRoutes.forEach((r) => {
      list.push({ id: r.id, name: r.route_name, code: r.route_code, schedule: r.schedule_days });
    });
    // Add any customer routes not in dbRoutes
    customers.forEach((c) => {
      if (c.route && !list.some((l) => l.name === c.route)) {
        list.push({ id: `cust-${c.route}`, name: c.route, code: 'BEAT' });
      }
    });
    return list;
  }, [dbRoutes, customers]);

  const [selectedRouteName, setSelectedRouteName] = useState<string>(
    routeOptions[0]?.name || 'Mingora Central Sector'
  );

  useEffect(() => {
    if (routeOptions.length > 0 && !routeOptions.some((r) => r.name === selectedRouteName)) {
      setSelectedRouteName(routeOptions[0].name);
    }
  }, [routeOptions, selectedRouteName]);

  const currentDbRoute = useMemo(() => {
    return dbRoutes.find((r) => r.route_name === selectedRouteName);
  }, [dbRoutes, selectedRouteName]);

  // Route customers ordered by stop sequence
  const routeCustomers = useMemo(() => {
    const matchingCusts = customers.filter((c) => {
      if (currentDbRoute) {
        const isAssignedInStops = dbStops.some(
          (s) => s.route_id === currentDbRoute.id && s.customer_id === c.id
        );
        return isAssignedInStops || c.route === selectedRouteName;
      }
      return c.route === selectedRouteName;
    });

    if (currentDbRoute) {
      const stopsForRoute = dbStops.filter((s) => s.route_id === currentDbRoute.id);
      return matchingCusts.sort((a, b) => {
        const seqA = stopsForRoute.find((s) => s.customer_id === a.id)?.stop_sequence ?? 999;
        const seqB = stopsForRoute.find((s) => s.customer_id === b.id)?.stop_sequence ?? 999;
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
    if (routeCustomers.length > 0 && !routeCustomers.some((c) => c.id === selectedCustomerId)) {
      setSelectedCustomerId(routeCustomers[0].id);
    }
  }, [routeCustomers, selectedCustomerId]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

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

      const calc = calculateOrderItem(
        qty.cartons,
        qty.pieces,
        prod.packSize,
        prod.tradePrice,
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
        tradePrice: prod.tradePrice,
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
      const orderNo = `ORD-${Date.now().toString().slice(-6)}`;
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNo,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        shopName: selectedCustomer.shopName,
        route: selectedRouteName,
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
    <div className="flex flex-col space-y-4 pb-24">
      {/* Zero Sale Success Alert */}
      {zeroSaleSuccessMsg && (
        <div className="bg-amber-900 text-amber-100 p-3 rounded-xl border border-amber-700 text-xs flex items-center justify-between">
          <span>{zeroSaleSuccessMsg}</span>
          <button onClick={() => setZeroSaleSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Route & Shop Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm text-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Route Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
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
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {routeOptions.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.code ? `[${r.code}] ` : ''}{r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shop Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                Drop Sequence (Shops)
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
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {routeCustomers.length === 0 ? (
                <option value="">No outlets found on this route</option>
              ) : (
                routeCustomers.map((c, idx) => (
                  <option key={c.id} value={c.id}>
                    Stop #{idx + 1}: {c.shopName} ({c.name})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Selected Customer Financial Snapshot */}
        {selectedCustomer && (
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-800/60 p-2 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Outstanding</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {formatPKR(selectedCustomer.currentBalance)}
              </span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Credit Limit</span>
              <span className="font-mono font-semibold text-slate-200">
                {formatPKR(selectedCustomer.creditLimit)}
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
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-2xl p-5 shadow-2xl">
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowZeroSaleModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
                >
                  Save Zero-Sale
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
            Projected balance after this order ({formatPKR(projectedBalance)}) exceeds the authorized limit of{' '}
            {formatPKR(customerCreditLimit)}. Collect on-spot cash to proceed smoothly.
          </div>
        </div>
      )}

      {/* Product Search & Category Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search SKU, Brand, Dalda, Tapal, Barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold cursor-pointer transition-all ${
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
      <div className="space-y-3">
        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-800">No Products Found</div>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              No SKUs in catalog matching your filter. Switch to the Master Catalog in Desktop Console to add items.
            </p>
          </div>
        )}

        {filteredProducts.map((product) => {
          const qty = cartQuantities[product.id] || { cartons: 0, pieces: 0, discountPercent: 0 };
          const itemUnits = qty.cartons * product.packSize + qty.pieces;
          const unitPrice = product.tradePrice / product.packSize;
          const itemGross = itemUnits * unitPrice;
          const itemNet = itemGross - (itemGross * qty.discountPercent) / 100;
          const isSelected = itemUnits > 0;

          return (
            <div
              key={product.id}
              className={`bg-white rounded-2xl p-3.5 border transition-all shadow-sm ${
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
                      {product.sku}
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
                  <div className="text-sm font-extrabold font-mono text-slate-900">
                    {formatPKR(product.tradePrice)}
                    <span className="text-[10px] font-normal text-slate-500"> /ctn</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600">
                    Unit: {formatPKR(unitPrice)}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                    Stock: {product.cartonStock} Ctn
                  </div>
                </div>
              </div>

              {/* Steppers for Cartons and Pieces */}
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                {/* Cartons Stepper */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 mb-1">
                    <span>Cartons</span>
                    <span className="font-mono text-slate-400">({product.packSize}x)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleCartonDelta(product.id, -1)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-extrabold text-base text-slate-900 px-2">
                      {qty.cartons}
                    </span>
                    <button
                      onClick={() => handleCartonDelta(product.id, 1)}
                      className="w-8 h-8 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center hover:bg-amber-700 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Loose Pieces Stepper */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 mb-1">
                    <span>Loose Pieces</span>
                    <span className="font-mono text-slate-400">(@{Math.round(unitPrice)})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handlePiecesDelta(product.id, -1, product.packSize)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-extrabold text-base text-slate-900 px-2">
                      {qty.pieces}
                    </span>
                    <button
                      onClick={() => handlePiecesDelta(product.id, 1, product.packSize)}
                      className="w-8 h-8 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center hover:bg-amber-700 active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Item Math & Discount Summary if selected */}
              {isSelected && (
                <div className="mt-2.5 pt-2 border-t border-dashed border-amber-300 bg-amber-50/70 p-2 rounded-lg flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-amber-900">
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
                  <div className="font-mono font-black text-amber-950 text-sm">
                    {formatPKR(itemNet)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart Review Bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl text-white">
          <div className="max-w-lg mx-auto space-y-2.5">
            {/* Quick Math Breakdown */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">
                Units: <strong className="text-white">{totalUnits}</strong> ({totalCartons} Ctn / {totalPieces} Pcs)
              </span>
              <div className="flex items-center gap-2">
                {totalDiscount > 0 && (
                  <span className="text-rose-400 font-mono text-[11px]">
                    Disc: -{formatPKR(totalDiscount)}
                  </span>
                )}
                <span className="font-mono text-base font-black text-amber-400">
                  Net: {formatPKR(netBill)}
                </span>
              </div>
            </div>

            {/* Payment Term Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setPaymentType('credit')}
                className={`flex-1 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                  paymentType === 'credit'
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                Full Credit
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('cash')}
                className={`flex-1 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                  paymentType === 'cash'
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                Cash Spot
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('partial')}
                className={`flex-1 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                  paymentType === 'partial'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                Partial
              </button>
            </div>

            {/* Partial Cash Input */}
            {paymentType === 'partial' && (
              <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg text-xs">
                <span className="text-slate-300 text-[11px] shrink-0">Cash Collected:</span>
                <input
                  type="number"
                  value={cashCollected || ''}
                  onChange={(e) => setCashCollected(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 20000"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-emerald-400 font-bold focus:outline-none"
                />
                <span className="text-slate-400 font-mono text-[10px] shrink-0">
                  Bal: {formatPKR(Math.max(0, netBill - cashCollected))}
                </span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              onClick={handleSubmitOrder}
              disabled={isSaving}
              className="w-full min-h-[48px] bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>
                {isSaving
                  ? 'Saving to IndexedDB...'
                  : `Book Order (${formatPKR(netBill)})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Order Booking Success Modal with Thermal Receipt */}
      {savedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col space-y-4">
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
                <span> Auto-logged <strong>{formatPKR(savedOrder.cashPaid)}</strong> to Field Roznamcha!</span>
              )}
            </div>

            {/* Render 80mm Thermal Receipt */}
            <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex justify-center overflow-x-auto">
              <Thermal80mmReceipt
                order={savedOrder}
                customer={selectedCustomer}
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
