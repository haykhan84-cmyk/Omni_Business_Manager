import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Fuel,
  Users,
  Wrench,
  Coffee,
  CheckCircle2,
  Clock,
  Camera,
  Coins,
  ShieldCheck,
  Building,
  Trash2,
} from 'lucide-react';
import { Customer, RoznamchaCategory, RoznamchaEntry } from '../../types';
import { formatPKR, formatDateTime } from '../../utils/calculations';

interface MobileRoznamchaProps {
  entries: RoznamchaEntry[];
  customers: Customer[];
  cashInHand: number;
  openingCash: number;
  onAddEntry: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
  onDeleteEntry?: (entryId: string) => Promise<void>;
  isOnline: boolean;
}

export const MobileRoznamcha: React.FC<MobileRoznamchaProps> = ({
  entries,
  customers,
  cashInHand,
  openingCash,
  onAddEntry,
  onDeleteEntry,
  isOnline,
}) => {
  const [entryType, setEntryType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [category, setCategory] = useState<RoznamchaCategory>('Customer Recovery');
  const [amount, setAmount] = useState<number>(0);
  const [slipNo, setSlipNo] = useState<string>('');
  const [narration, setNarration] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<RoznamchaEntry | null>(null);

  // Sync category if entry type switches
  const handleTypeSwitch = (type: 'cash_in' | 'cash_out') => {
    setEntryType(type);
    if (type === 'cash_in') {
      setCategory('Customer Recovery');
    } else {
      setCategory('Fleet & Fuel');
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const addDenomination = (val: number) => {
    setAmount((prev) => (prev || 0) + val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    setIsSubmitting(true);
    try {
      await onAddEntry({
        date: new Date().toISOString(),
        type: entryType,
        category,
        amount,
        customerId: entryType === 'cash_in' ? selectedCustomer?.id : undefined,
        customerName: entryType === 'cash_in' ? selectedCustomer?.shopName : undefined,
        slipNo: slipNo.trim() || `VCH-${Math.floor(1000 + Math.random() * 9000)}`,
        narration: narration.trim() || (entryType === 'cash_in' ? 'Recovery collected' : `${category} expense`),
        recordedBy: 'Tariq Khan (OB-04)',
      });

      setSuccessToast(
        entryType === 'cash_in'
          ? `Cash Recovery of ${formatPKR(amount)} logged successfully!`
          : `Expense Voucher of ${formatPKR(amount)} logged to Roznamcha!`
      );
      setTimeout(() => setSuccessToast(null), 3000);

      // Reset
      setAmount(0);
      setSlipNo('');
      setNarration('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category list with icons for cash out
  const expenseCategories: { name: RoznamchaCategory; icon: React.ReactNode }[] = [
    { name: 'Fleet & Fuel', icon: <Fuel className="w-4 h-4" /> },
    { name: 'Driver Meal & Wages', icon: <Users className="w-4 h-4" /> },
    { name: 'Loading / Labor', icon: <Building className="w-4 h-4" /> },
    { name: 'Van Repair & Toll', icon: <Wrench className="w-4 h-4" /> },
    { name: 'Office & Pantry', icon: <Coffee className="w-4 h-4" /> },
    { name: 'Supplier Payment', icon: <Coins className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col space-y-4 pb-20">
      {/* Live Vault Balance Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Till #04 • Van Swat Cash Vault
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
            Live Reconciled
          </span>
        </div>

        <div className="mt-3">
          <div className="text-xs text-slate-400">Current Cash in Hand:</div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 tracking-tight mt-0.5">
            {formatPKR(cashInHand)}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Opening Cash: {formatPKR(openingCash)}</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Offline Hash Safe
          </span>
        </div>
      </div>

      {/* Quick Entry Roznamcha Form */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        {/* Inflow vs Outflow Segmented Control (52px touch-friendly) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => handleTypeSwitch('cash_in')}
            className={`min-h-[48px] rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              entryType === 'cash_in'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>+ Cash In (Recovery)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeSwitch('cash_out')}
            className={`min-h-[48px] rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              entryType === 'cash_out'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>- Cash Out (Expense)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Conditional: Customer Selection for Recovery */}
          {entryType === 'cash_in' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Shopkeeper for Recovery
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shopName} — Bal: {formatPKR(c.currentBalance)}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex justify-between items-center text-amber-950 font-mono">
                  <span>Current Outstanding:</span>
                  <span className="font-bold text-amber-900 text-sm">
                    {formatPKR(selectedCustomer.currentBalance)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Cash Out Category Chips */
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Expense Head / Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {expenseCategories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                      category === cat.name
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className={category === cat.name ? 'text-rose-600' : 'text-slate-400'}>
                      {cat.icon}
                    </span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount Input with Large Display */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Voucher Amount (PKR)
              </label>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                  entryType === 'cash_in'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {entryType === 'cash_in' ? 'CASH RECEIVED' : 'CASH DISBURSED'}
              </span>
            </div>
            <div className="relative flex items-center bg-slate-50 border border-slate-300 rounded-xl px-3 py-1">
              <span className="text-xl font-bold text-slate-400 mr-2 font-mono select-none">Rs.</span>
              <input
                type="number"
                min="1"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-transparent py-2 text-2xl font-black font-mono text-slate-900 focus:outline-none"
              />
              {amount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(0)}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Denominations */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                type="button"
                onClick={() => addDenomination(500)}
                className="min-h-[40px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer"
              >
                + Rs. 500
              </button>
              <button
                type="button"
                onClick={() => addDenomination(1000)}
                className="min-h-[40px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer"
              >
                + Rs. 1,000
              </button>
              <button
                type="button"
                onClick={() => addDenomination(5000)}
                className="min-h-[40px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer"
              >
                + Rs. 5,000
              </button>
            </div>
          </div>

          {/* Slip # and Narration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Slip / Challan / Receipt #
              </label>
              <input
                type="text"
                value={slipNo}
                onChange={(e) => setSlipNo(e.target.value)}
                placeholder="e.g. SLIP-8920 or PSO-44"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Narration / Details
              </label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="e.g. Diesel 40L, Tyre repair, or invoice recovery"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Photo bill attachment simulation */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-300 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-slate-500" />
              <span>Attach Physical Bill / Receipt Photo</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              Ready
            </span>
          </div>

          {/* Submit Action (min 52px touch-friendly) */}
          <button
            type="submit"
            disabled={isSubmitting || amount <= 0}
            className={`w-full min-h-[52px] rounded-xl font-extrabold text-white text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer ${
              entryType === 'cash_in'
                ? 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300'
                : 'bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'Writing to IndexedDB...'
                : entryType === 'cash_in'
                ? `Confirm Cash Recovery (${formatPKR(amount)})`
                : `Log Expense Voucher (${formatPKR(amount)})`}
            </span>
          </button>
        </form>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="fixed top-20 inset-x-4 z-50 bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Today's Local Field Daybook Stream */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Today's Field Roznamcha Daybook</h3>
            <span className="text-xs text-slate-500">{entries.length} Transactions logged</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600">
            Vault: {formatPKR(cashInHand)}
          </span>
        </div>

        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              No transactions recorded yet today.
            </div>
          ) : (
            entries.map((entry) => {
              const isIn = entry.type === 'cash_in';
              return (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isIn ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {entry.customerName || entry.category}
                        </span>
                        <span className="font-mono text-[10px] bg-slate-200/80 px-1 py-0.2 rounded text-slate-700">
                          {entry.slipNo || entry.entryNo}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {entry.narration}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(entry.date)}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          {entry.synced ? '• Synced' : '• Local DB'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span
                        className={`font-mono font-extrabold text-sm ${
                          isIn ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isIn ? '+' : '-'}
                        {formatPKR(entry.amount)}
                      </span>
                    </div>

                    {onDeleteEntry && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEntryToDelete(entry);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete entry"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Safety Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="p-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
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
                  <span className="text-slate-500">Slip / Ref:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {entryToDelete.slipNo || entryToDelete.entryNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Party / Entity:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[180px]">
                    {entryToDelete.customerName || 'Operational Expense'}
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
                  if (onDeleteEntry && entryToDelete) {
                    await onDeleteEntry(entryToDelete.id);
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
    </div>
  );
};
