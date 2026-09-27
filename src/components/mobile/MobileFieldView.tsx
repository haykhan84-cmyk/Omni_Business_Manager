import React, { useState } from 'react';
import {
  ShoppingBag,
  Store,
  DollarSign,
  Navigation,
  CheckCircle2,
  Wifi,
  WifiOff,
  User,
  LogOut,
} from 'lucide-react';
import { Customer, Order, Product, RoznamchaEntry, UserAccount } from '../../types';
import { MobileOrderBooking } from './MobileOrderBooking';
import { MobileCashIn } from './MobileCashIn';
import { MobileClientLedger } from './MobileClientLedger';
import { MobileRouteSync } from './MobileRouteSync';

interface MobileFieldViewProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  roznamcha: RoznamchaEntry[];
  cashInHand: number;
  openingCash: number;
  isOnline: boolean;
  currentUser?: UserAccount;
  onSaveOrder: (order: Order, cashCollected: number) => Promise<void>;
  onAddRoznamchaEntry: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'currentBalance'>) => Promise<void>;
  onBulkAddCustomers?: (customers: Customer[]) => Promise<void>;
  onDeleteRoznamchaEntry?: (entryId: string) => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
  onSyncNow?: () => Promise<void>;
  isSyncing?: boolean;
  syncQueueCount?: number;
}

export const MobileFieldView: React.FC<MobileFieldViewProps> = ({
  products,
  customers,
  orders,
  roznamcha,
  cashInHand,
  openingCash,
  isOnline,
  currentUser,
  onSaveOrder,
  onAddRoznamchaEntry,
  onAddCustomer,
  onBulkAddCustomers,
  onDeleteRoznamchaEntry,
  onDeleteOrder,
  onSyncNow,
  isSyncing,
  syncQueueCount,
}) => {
  // 4 Core Field Tabs: [Book Order], [Shops / Khatay], [Cash In], [My Route & Sync]
  const [activeTab, setActiveTab] = useState<'booking' | 'shops' | 'cash_in' | 'route_sync'>('booking');

  // Customer selected from Ledger to book order
  const handleSelectCustomerForOrder = (customer: Customer) => {
    setActiveTab('booking');
  };

  return (
    <div className="w-full min-h-screen min-h-[100dvh] flex flex-col bg-slate-100 overflow-x-hidden relative">
      {/* Mobile Top Bar */}
      <div className="w-full bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center font-black text-white text-xs shrink-0 shadow-md">
            {currentUser?.role === 'ADMIN' ? 'HQ' : 'FS'}
          </div>
          <div>
            <div className="text-xs font-black leading-tight flex items-center gap-1.5">
              <span className="truncate max-w-[180px] sm:max-w-[260px]">
                {currentUser?.name || 'Field Sales Officer'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-bold shrink-0">
                {currentUser?.employeeId || 'FSO-01'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[220px] sm:max-w-md">
              {currentUser?.assignedRoute || 'Live Beat • Active Dispatch'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-emerald-950/90 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-700/60 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>GPS Active</span>
          </div>
        </div>
      </div>

      {/* Main Tab Body - Full Width Edge to Edge with Safe Bottom Spacing */}
      <div className="flex-1 w-full p-3 sm:p-4 overflow-y-auto overflow-x-hidden pb-24">
        {/* 1. [📦 Book Order] */}
        {activeTab === 'booking' && (
          <MobileOrderBooking
            products={products}
            customers={customers}
            orders={orders}
            currentUser={currentUser}
            onSaveOrder={onSaveOrder}
            onBulkAddCustomers={onBulkAddCustomers}
            isOnline={isOnline}
          />
        )}

        {/* 2. [🏪 Shops / Khatay] */}
        {activeTab === 'shops' && (
          <MobileClientLedger
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
            onSelectCustomerForOrder={handleSelectCustomerForOrder}
            onAddCustomer={onAddCustomer}
            onBulkAddCustomers={onBulkAddCustomers}
          />
        )}

        {/* 3. [💵 Cash In] */}
        {activeTab === 'cash_in' && (
          <MobileCashIn
            customers={customers}
            roznamcha={roznamcha}
            currentUser={currentUser}
            onAddEntry={onAddRoznamchaEntry}
            isOnline={isOnline}
          />
        )}

        {/* 4. [📊 My Route & Sync] */}
        {activeTab === 'route_sync' && (
          <MobileRouteSync
            orders={orders}
            customers={customers}
            roznamcha={roznamcha}
            currentUser={currentUser}
            isOnline={isOnline}
            isSyncing={isSyncing}
            syncQueueCount={syncQueueCount}
            onSyncNow={onSyncNow}
            onSelectCustomerForOrder={handleSelectCustomerForOrder}
          />
        )}
      </div>

      {/* Modern Touch-Friendly Mobile Bottom Navigation Bar (< 768px) */}
      {/* Anchored firmly at bottom with full width and touch targets */}
      <nav className="fixed bottom-0 left-0 right-0 w-full bg-slate-900 border-t border-slate-800 z-50 pb-safe h-16 flex items-center justify-around px-2 text-white shadow-2xl">
        <button
          onClick={() => setActiveTab('booking')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all cursor-pointer ${
            activeTab === 'booking' ? 'text-amber-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'booking' ? 'bg-amber-500/20' : ''}`}>
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 whitespace-nowrap font-medium">Book Order</span>
        </button>

        <button
          onClick={() => setActiveTab('shops')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all cursor-pointer ${
            activeTab === 'shops' ? 'text-amber-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'shops' ? 'bg-amber-500/20' : ''}`}>
            <Store className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 whitespace-nowrap font-medium">Shops / Khatay</span>
        </button>

        <button
          onClick={() => setActiveTab('cash_in')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all cursor-pointer ${
            activeTab === 'cash_in' ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'cash_in' ? 'bg-emerald-500/20' : ''}`}>
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 whitespace-nowrap font-medium">Cash In</span>
        </button>

        <button
          onClick={() => setActiveTab('route_sync')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-all cursor-pointer ${
            activeTab === 'route_sync' ? 'text-amber-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'route_sync' ? 'bg-amber-500/20' : ''}`}>
            <Navigation className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 whitespace-nowrap font-medium">My Route &amp; Sync</span>
        </button>
      </nav>
    </div>
  );
};
