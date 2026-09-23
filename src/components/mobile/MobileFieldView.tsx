import React, { useState } from 'react';
import { ShoppingCart, DollarSign, Users, Printer, Store, MapPin, Wifi, WifiOff, UserCheck } from 'lucide-react';
import { Customer, Order, Product, RoznamchaEntry } from '../../types';
import { MobileOrderBooking } from './MobileOrderBooking';
import { MobileRoznamcha } from './MobileRoznamcha';
import { MobileClientLedger } from './MobileClientLedger';
import { MobileStaffAttendance } from './MobileStaffAttendance';
import { Thermal80mmReceipt } from '../shared/PrintTemplates';

interface MobileFieldViewProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  roznamcha: RoznamchaEntry[];
  cashInHand: number;
  openingCash: number;
  isOnline: boolean;
  onSaveOrder: (order: Order, cashCollected: number) => Promise<void>;
  onAddRoznamchaEntry: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'currentBalance'>) => Promise<void>;
}

export const MobileFieldView: React.FC<MobileFieldViewProps> = ({
  products,
  customers,
  orders,
  roznamcha,
  cashInHand,
  openingCash,
  isOnline,
  onSaveOrder,
  onAddRoznamchaEntry,
  onAddCustomer,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'booking' | 'roznamcha' | 'clients' | 'print'>('attendance');

  // Customer selected from Ledger to book order
  const handleSelectCustomerForOrder = (customer: Customer) => {
    setActiveTab('booking');
  };

  const latestOrder = orders.length > 0 ? orders[orders.length - 1] : null;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col min-h-[calc(100vh-4rem)] bg-slate-100 sm:border sm:border-slate-300 sm:rounded-3xl sm:my-4 sm:shadow-2xl overflow-hidden relative">
      {/* Mobile Top Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center font-bold text-white text-xs">
            NK
          </div>
          <div>
            <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>Niaz Khan</span>
              <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-amber-400">
                EMP-104
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Van #04 • Mingora Route #04</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-emerald-950/80 text-emerald-400 px-2 py-1 rounded-full text-[10px] font-bold border border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>GPS Locked</span>
          </div>
        </div>
      </div>

      {/* Main Tab Body */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
        {activeTab === 'attendance' && (
          <MobileStaffAttendance
            orders={orders}
            customers={customers}
            cashInHand={cashInHand}
            isOnline={isOnline}
            onAddRoznamchaEntry={onAddRoznamchaEntry}
            onSelectCustomerForOrder={handleSelectCustomerForOrder}
          />
        )}

        {activeTab === 'booking' && (
          <MobileOrderBooking
            products={products}
            customers={customers}
            onSaveOrder={onSaveOrder}
            isOnline={isOnline}
          />
        )}

        {activeTab === 'roznamcha' && (
          <MobileRoznamcha
            entries={roznamcha}
            customers={customers}
            cashInHand={cashInHand}
            openingCash={openingCash}
            onAddEntry={onAddRoznamchaEntry}
            isOnline={isOnline}
          />
        )}

        {activeTab === 'clients' && (
          <MobileClientLedger
            customers={customers}
            orders={orders}
            roznamcha={roznamcha}
            onSelectCustomerForOrder={handleSelectCustomerForOrder}
            onAddCustomer={onAddCustomer}
          />
        )}

        {activeTab === 'print' && (
          <div className="space-y-4 pb-20">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
              <h3 className="font-extrabold text-base text-slate-900">
                Thermal 80mm Print Station
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Print last booked spot order or generate Bluetooth ESC/POS receipt
              </p>
            </div>

            {latestOrder ? (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col items-center">
                <Thermal80mmReceipt
                  order={latestOrder}
                  customer={customers.find((c) => c.id === latestOrder.customerId)}
                  showPrintButton={true}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
                No orders booked yet. Book an order from the "Booking" tab to print thermal slip.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Mobile Navigation Bar */}
      <nav className="fixed sm:absolute bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 h-16 flex items-center justify-around px-1 text-white">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'attendance' ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Check-In</span>
        </button>

        <button
          onClick={() => setActiveTab('booking')}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'booking' ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Booking</span>
        </button>

        <button
          onClick={() => setActiveTab('roznamcha')}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'roznamcha' ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Roznamcha</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'clients' ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Clients</span>
        </button>

        <button
          onClick={() => setActiveTab('print')}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'print' ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Printer className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Thermal</span>
        </button>
      </nav>
    </div>
  );
};
