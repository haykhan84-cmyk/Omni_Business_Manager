import React, { useState } from 'react';
import {
  MapPin,
  UserCheck,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Navigation,
  ShoppingCart,
  DollarSign,
  Package,
  Calendar,
  Cloud,
  Wifi,
  WifiOff,
  Store,
} from 'lucide-react';
import { Customer, Order, RoznamchaEntry, SalesRoute, UserAccount } from '../../types';
import { formatAmount, formatPKR, formatDateTime } from '../../utils/calculations';
import { Thermal80mmReceipt } from '../shared/PrintTemplates';

interface MobileRouteSyncProps {
  orders: Order[];
  customers: Customer[];
  roznamcha: RoznamchaEntry[];
  currentUser?: UserAccount;
  isOnline: boolean;
  isSyncing?: boolean;
  syncQueueCount?: number;
  onSyncNow?: () => Promise<void>;
  onSelectCustomerForOrder: (customer: Customer) => void;
}

export const MobileRouteSync: React.FC<MobileRouteSyncProps> = ({
  orders,
  customers,
  roznamcha,
  currentUser,
  isOnline,
  isSyncing = false,
  syncQueueCount = 0,
  onSyncNow,
  onSelectCustomerForOrder,
}) => {
  const [activeSubView, setActiveSubView] = useState<'summary' | 'print'>('summary');
  const [zeroSaleReason, setZeroSaleReason] = useState<string>('');
  const [selectedCustForZeroSale, setSelectedCustForZeroSale] = useState<string>('');
  const [zeroSaleSuccess, setZeroSaleSuccess] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.date.slice(0, 10) === todayStr);
  const todayRecoveries = roznamcha.filter(
    (r) => r.type === 'cash_in' && r.date.slice(0, 10) === todayStr
  );

  const totalBookedAmount = todayOrders.reduce((sum, o) => sum + (o.netBill || 0), 0);
  const totalCartons = todayOrders.reduce((sum, o) => sum + (o.totalCartons || 0), 0);
  const totalPieces = todayOrders.reduce((sum, o) => sum + (o.totalPieces || 0), 0);
  const totalCashRecovered = todayRecoveries.reduce((sum, r) => sum + (r.amount || 0), 0);

  const latestOrder = orders.length > 0 ? orders[orders.length - 1] : null;

  const handleLogZeroSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustForZeroSale || !zeroSaleReason) return;

    const cust = customers.find((c) => c.id === selectedCustForZeroSale);
    setZeroSaleSuccess(`Zero-sale logged for ${cust?.shopName || 'Shop'}: ${zeroSaleReason}`);
    setSelectedCustForZeroSale('');
    setZeroSaleReason('');

    setTimeout(() => {
      setZeroSaleSuccess(null);
    }, 3500);
  };

  return (
    <div className="space-y-4 pb-28 w-full overflow-x-hidden">
      {/* Route & Officer Identity Card */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md w-full">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block font-bold">
              Active Field Route
            </span>
            <h2 className="text-base font-black text-white">
              {currentUser?.assignedRoute || 'Swat Valley - Route A (Main Beat)'}
            </h2>
            <div className="text-xs text-slate-300 mt-0.5">
              Officer: <span className="font-bold text-white">{currentUser?.name || 'Field Officer'}</span> • {currentUser?.employeeId || 'EMP-101'}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>GPS Tracking Active</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {todayStr}
            </div>
          </div>
        </div>
      </div>

      {/* Cloud & Offline Sync Trigger Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>{isOnline ? 'Cloud Sync Online' : 'Offline Mode (Dexie.js)'}</span>
              {syncQueueCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {syncQueueCount} pending
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              {isOnline
                ? 'All spot orders & recoveries backed to Supabase'
                : 'Transactions saved securely in local IndexedDB'}
            </div>
          </div>
        </div>

        {onSyncNow && (
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="w-full sm:w-auto min-h-[48px] h-12 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
      </div>

      {/* Today's Sales & Dispatch KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Orders Booked</span>
          <div className="font-mono text-lg font-black text-slate-900 mt-0.5">
            {todayOrders.length}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Today's Visits</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Units Dispatched</span>
          <div className="font-mono text-lg font-black text-slate-900 mt-0.5 whitespace-nowrap">
            {totalCartons}c / {totalPieces}p
          </div>
          <span className="text-[10px] text-slate-500">Cartons / Pieces</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Net Booking (Rs.)</span>
          <div className="font-mono text-lg font-black text-amber-600 mt-0.5 whitespace-nowrap">
            {formatAmount(totalBookedAmount)}
          </div>
          <span className="text-[10px] text-slate-500">Retail Value</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Cash Collected</span>
          <div className="font-mono text-lg font-black text-emerald-600 mt-0.5 whitespace-nowrap">
            {formatAmount(totalCashRecovered)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Field Wasooli</span>
        </div>
      </div>

      {/* Sub-view toggle (Route Plan vs Thermal Slip) */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl">
        <button
          onClick={() => setActiveSubView('summary')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubView === 'summary' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Route Shops &amp; Zero-Sale Call
        </button>
        <button
          onClick={() => setActiveSubView('print')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeSubView === 'print' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Thermal 80mm Slip</span>
        </button>
      </div>

      {activeSubView === 'summary' && (
        <div className="space-y-4">
          {/* Zero-Sale Call Logger */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Log Zero-Sale Call (Shop Visited But No Order)
              </h3>
            </div>

            {zeroSaleSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{zeroSaleSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLogZeroSale} className="space-y-2.5">
              <select
                value={selectedCustForZeroSale}
                onChange={(e) => setSelectedCustForZeroSale(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              >
                <option value="">Select Retailer Visited...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shopName} ({c.name})
                  </option>
                ))}
              </select>

              <select
                value={zeroSaleReason}
                onChange={(e) => setZeroSaleReason(e.target.value)}
                className="w-full min-h-[48px] h-12 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Select Reason for Zero Sale...</option>
                <option value="Shop Closed / Proprietor Away">Shop Closed / Proprietor Away</option>
                <option value="Sufficient Stock Available">Sufficient Stock Available</option>
                <option value="Credit Payment Dispute / Refused">Credit Payment Dispute / Refused</option>
                <option value="Price Too High Compared to Competitor">Price Too High Compared to Competitor</option>
                <option value="Owner Asked to Revisit Tomorrow">Owner Asked to Revisit Tomorrow</option>
              </select>

              <button
                type="submit"
                disabled={!selectedCustForZeroSale || !zeroSaleReason}
                className="w-full min-h-[48px] h-12 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Submit Zero-Sale Reason
              </button>
            </form>
          </div>

          {/* Quick Route Stops List */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5 w-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-slate-900">Assigned Route Retailers</h3>
              <span className="text-xs text-slate-500 font-bold">{customers.length} Shops</span>
            </div>

            {customers.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs font-medium">
                0 Shops Found. Click 'Bulk Import (CSV)' or '+ Add Retailer' to onboard your outlets.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {customers.map((c, idx) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-extrabold text-slate-900">{c.shopName}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.name} • {c.phone}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-slate-900 block whitespace-nowrap">
                          {formatAmount(c.currentBalance)}
                        </span>
                        <span className="text-[10px] text-slate-400">Balance</span>
                      </div>
                      <button
                        onClick={() => onSelectCustomerForOrder(c)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer transition-all shadow-2xs"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubView === 'print' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col items-center">
          <div className="text-center mb-3">
            <h3 className="font-extrabold text-sm text-slate-900">Thermal 80mm ESC/POS Slip</h3>
            <p className="text-xs text-slate-500">Instant print for latest spot order</p>
          </div>

          {latestOrder ? (
            <Thermal80mmReceipt
              order={latestOrder}
              customer={customers.find((c) => c.id === latestOrder.customerId)}
              showPrintButton={true}
            />
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No orders booked yet. Book an order to print thermal receipt.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
