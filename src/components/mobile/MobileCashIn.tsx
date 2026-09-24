import React, { useState } from 'react';
import {
  DollarSign,
  Search,
  CheckCircle2,
  Building,
  User,
  CreditCard,
  Send,
  Calendar,
  AlertCircle,
  Receipt,
  Smartphone,
  Landmark,
} from 'lucide-react';
import { Customer, RoznamchaEntry, UserAccount } from '../../types';
import { formatAmount, formatPKR, formatDateTime } from '../../utils/calculations';

interface MobileCashInProps {
  customers: Customer[];
  roznamcha: RoznamchaEntry[];
  currentUser?: UserAccount;
  onAddEntry: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
  isOnline: boolean;
}

export const MobileCashIn: React.FC<MobileCashInProps> = ({
  customers,
  roznamcha,
  currentUser,
  onAddEntry,
  isOnline,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank AL Habib / Raast' | 'EasyPaisa' | 'Cheque'>('Cash');
  const [slipNo, setSlipNo] = useState(`RCP-${Date.now().toString().slice(-5)}`);
  const [narration, setNarration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const filteredCustomers = customers.filter(
    (c) =>
      c.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.route.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddQuickAmount = (val: number) => {
    setAmount((prev) => (Number(prev) || 0) + val);
  };

  const handleSetFullOutstanding = () => {
    if (selectedCustomer && selectedCustomer.currentBalance > 0) {
      setAmount(selectedCustomer.currentBalance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const recordedByName = currentUser?.name || 'Order Booker';
      await onAddEntry({
        date: new Date().toISOString(),
        type: 'cash_in',
        category: 'Customer Recovery',
        amount: numAmount,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer ? `${selectedCustomer.shopName} (${selectedCustomer.name})` : 'Spot Retailer',
        slipNo: slipNo.trim() || `RCP-${Date.now().toString().slice(-5)}`,
        narration: narration.trim() || `Cash Recovery received via ${paymentMethod}`,
        recordedBy: recordedByName,
        paymentMethod: paymentMethod,
      });

      setSuccessToast(`Successfully received ${formatAmount(numAmount)} from ${selectedCustomer?.shopName || 'Retailer'}`);
      setAmount('');
      setNarration('');
      setSlipNo(`RCP-${Date.now().toString().slice(-5)}`);

      setTimeout(() => {
        setSuccessToast(null);
      }, 3500);
    } catch (err) {
      console.error('Error logging cash recovery:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter today's cash in entries
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecoveries = roznamcha.filter(
    (r) => r.type === 'cash_in' && r.date.slice(0, 10) === todayStr
  );
  const todayTotalRecovered = todayRecoveries.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-4 pb-20 w-full">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 rounded-2xl shadow-sm border border-emerald-700/50">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
              Field Cash Recovery
            </span>
            <h2 className="text-lg font-black tracking-tight">Spot Cash In &amp; Wasooli</h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-emerald-200 block">Today Recovered</span>
            <span className="font-mono text-xl font-black text-amber-300 whitespace-nowrap">
              {formatAmount(todayTotalRecovered)}
            </span>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
        {/* Customer Select / Search */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
            Select Retailer / Shop
          </label>
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by shop or owner name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
          >
            {filteredCustomers.length === 0 ? (
              <option value="">No matching shops found</option>
            ) : (
              filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shopName} - {c.name} ({c.route}) • Bal: {formatAmount(c.currentBalance)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Selected Customer Snapshot Card */}
        {selectedCustomer && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <div className="font-extrabold text-slate-900">{selectedCustomer.shopName}</div>
              <div className="text-[11px] text-slate-500">
                {selectedCustomer.name} • {selectedCustomer.phone}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Outstanding Khatta</span>
              <span className="font-mono text-sm font-black text-rose-600 whitespace-nowrap">
                {formatAmount(selectedCustomer.currentBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Amount Input & Quick Chips */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
            Amount Collected
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold font-mono text-sm">
              Rs.
            </div>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-base text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Quick Denomination Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {[1000, 2000, 5000, 10000, 20000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleAddQuickAmount(val)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                +{formatAmount(val)}
              </button>
            ))}
            {selectedCustomer && selectedCustomer.currentBalance > 0 && (
              <button
                type="button"
                onClick={handleSetFullOutstanding}
                className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Full Clear ({formatAmount(selectedCustomer.currentBalance)})
              </button>
            )}
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
            Payment Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['Cash', 'Bank AL Habib / Raast', 'EasyPaisa', 'Cheque'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  paymentMethod === method
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {method === 'Cash' && <DollarSign className="w-3.5 h-3.5" />}
                {method === 'Bank AL Habib / Raast' && <Landmark className="w-3.5 h-3.5" />}
                {method === 'EasyPaisa' && <Smartphone className="w-3.5 h-3.5" />}
                {method === 'Cheque' && <Receipt className="w-3.5 h-3.5" />}
                <span className="truncate">{method.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Slip / Receipt No & Narration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Slip / Receipt #
            </label>
            <input
              type="text"
              value={slipNo}
              onChange={(e) => setSlipNo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Remarks / Narration
            </label>
            <input
              type="text"
              placeholder="e.g. Regular Monday recovery"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !amount || Number(amount) <= 0}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white font-black rounded-xl shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
        >
          <Send className="w-4 h-4" />
          <span>
            {isSubmitting
              ? 'Posting Recovery...'
              : `Confirm Cash Recovery (${amount ? formatAmount(Number(amount)) : '0'})`}
          </span>
        </button>
      </form>

      {/* Today's Recoveries History */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-extrabold text-sm text-slate-900">Today's Recoveries</h3>
          <span className="text-xs font-bold text-slate-500">{todayRecoveries.length} entries</span>
        </div>

        {todayRecoveries.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No cash recovery entries recorded yet today.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayRecoveries.map((rec) => (
              <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{rec.customerName || 'Spot Customer'}</div>
                  <div className="text-[11px] text-slate-500">
                    {rec.slipNo} • {rec.paymentMethod || 'Cash'} • {formatDateTime(rec.date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                    +{formatAmount(rec.amount)}
                  </div>
                  <span className="text-[10px] text-slate-400">{rec.synced ? 'Synced' : 'Local'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
