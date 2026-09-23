import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  ShieldCheck,
  DollarSign,
  Fuel,
  Wrench,
  Navigation,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  PlusCircle,
  User,
  Smartphone,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Customer, Order, RoznamchaCategory, RoznamchaEntry, StaffMember, AttendanceRecord } from '../../types';

interface MobileStaffAttendanceProps {
  orders: Order[];
  customers: Customer[];
  cashInHand: number;
  isOnline: boolean;
  onAddRoznamchaEntry: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
  onSelectCustomerForOrder?: (customer: Customer) => void;
}

export const MobileStaffAttendance: React.FC<MobileStaffAttendanceProps> = ({
  orders,
  customers,
  cashInHand,
  isOnline,
  onAddRoznamchaEntry,
  onSelectCustomerForOrder,
}) => {
  // Staff profile state (Defaults to Niaz Khan EMP-104)
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(true);
  const [checkInTime, setCheckInTime] = useState<string>('07:45 AM');
  const [showExpenseDrawer, setShowExpenseDrawer] = useState<boolean>(false);
  const [showPayrollAccordion, setShowPayrollAccordion] = useState<boolean>(true);

  // Field Expense form
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<RoznamchaCategory>('Fleet & Fuel');
  const [expenseNarration, setExpenseNarration] = useState<string>('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState<boolean>(false);
  const [expenseFeedback, setExpenseFeedback] = useState<string | null>(null);

  // Sync button simulation
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('FORCE INSTANT HQ SYNC');

  // Customer visits progress
  const visitedCustomerIds = new Set(orders.map((o) => o.customerId));
  const visitedCount = visitedCustomerIds.size;
  const totalRouteCustomers = Math.max(customers.length, 42);
  const progressPercent = Math.min(100, Math.round((visitedCount / totalRouteCustomers) * 100));

  // Daily TA/DA Allowance Rate
  const dailyAllowance = 200; // Rs. 200/day
  const monthlyAccruedTADA = 5200; // 26 days * 200
  const baseMonthlySalary = 45000;
  const staffCashAdvance = 5000;
  const projectedTakeHome = baseMonthlySalary + monthlyAccruedTADA - staffCashAdvance;

  const handleToggleCheckIn = () => {
    if (!isCheckedIn) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setIsCheckedIn(true);
      setCheckInTime(timeStr);
    } else {
      if (confirm('Lock checkout and finish field shift for today?')) {
        setIsCheckedIn(false);
      }
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const narrationText = expenseNarration.trim()
        ? expenseNarration.trim()
        : `${expenseCategory} claim by Niaz Khan (OB-04) on Van #04`;

      await onAddRoznamchaEntry({
        date: new Date().toISOString(),
        type: 'cash_out',
        category: expenseCategory,
        amount: amountNum,
        slipNo: `EXP-${Math.floor(100 + Math.random() * 900)}`,
        narration: narrationText,
        recordedBy: 'Niaz Khan (EMP-104)',
      });

      setExpenseFeedback(`✓ Recorded Rs. ${amountNum.toLocaleString()} debit in cash register!`);
      setExpenseAmount('');
      setExpenseNarration('');
      setTimeout(() => {
        setExpenseFeedback(null);
        setShowExpenseDrawer(false);
      }, 1600);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleForceSync = () => {
    setIsSyncing(true);
    setSyncStatusText('COMMITTING SQLITE DATA...');
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatusText('DATABASE RECONCILED (0 PENDING)');
      setTimeout(() => {
        setSyncStatusText('FORCE INSTANT HQ SYNC');
      }, 2500);
    }, 900);
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-20">
      {/* Top Field Telemetry & Profile Card */}
      <section className="flex flex-col bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold text-lg shadow-sm">
              NK
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 truncate">Niaz Khan</span>
                <span className="bg-slate-800 text-white text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  EMP-104
                </span>
              </div>
              <span className="text-xs text-slate-500 truncate">Senior Order Booker • Field Division</span>
            </div>
          </div>
          <div
            className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0"
            title="Security Token Bound"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Telemetry Sub-ribbon */}
        <div className="mt-3 pt-3 flex flex-col gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-800 text-xs font-semibold">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">Mingora Central Route #04 (42 Retailers)</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
            <span className="truncate">IMEI: 864209041289104</span>
            <span className="text-emerald-700 font-semibold shrink-0 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              GPS Locked
            </span>
          </div>
        </div>
      </section>

      {/* Hero: Daily Attendance & TA/DA Allowance Accrual */}
      <section className="flex flex-col bg-white rounded-2xl p-4 shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wider text-amber-700 font-extrabold">
            Daily Field Telemetry
          </span>
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isCheckedIn ? `CHECKED-IN ${checkInTime}` : 'CHECKED-OUT'}</span>
          </div>
        </div>

        {/* TA/DA Accrual Card */}
        <div className="flex items-center justify-between bg-amber-500 text-white p-4 rounded-2xl shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-amber-100 uppercase tracking-wide">
              TA / DA Allowance Earned Today
            </span>
            <span className="text-3xl font-extrabold font-mono text-white mt-0.5">
              Rs. {isCheckedIn ? dailyAllowance.toFixed(2) : '0.00'}
            </span>
            <span className="text-[11px] text-amber-100 font-medium">
              Instant Daily Debit to Cash Register
            </span>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <DollarSign className="w-7 h-7" />
          </div>
        </div>

        {/* Route and GPS Details Grid */}
        <div className="grid grid-cols-1 gap-2.5 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-slate-500">Logistics Carrier & Driver</span>
              <span className="text-xs text-slate-900 font-bold truncate">Van #04 • Driver: Tariq Mehmood</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pt-1 border-t border-slate-200/60">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-slate-500">GPS Depot Lockpoint</span>
              <span className="font-mono text-xs text-slate-800 font-semibold truncate">
                34.7717° N, 72.3602° E (Depot Gate 1)
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons (Strict Minimum 48px Height) */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleToggleCheckIn}
            className={`w-full min-h-[48px] h-12 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-transform cursor-pointer ${
              isCheckedIn
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
            type="button"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCheckedIn ? 'CHECKED-IN & ROUTE LOCKED' : 'TAP TO CHECK-IN & CLAIM RS. 200'}</span>
          </button>

          <button
            onClick={() => setShowExpenseDrawer((prev) => !prev)}
            className="w-full min-h-[48px] h-12 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-slate-200 cursor-pointer"
            type="button"
          >
            <PlusCircle className="w-4 h-4 text-amber-600" />
            <span>Log Unscheduled Field Expense (Fuel / Maintenance)</span>
          </button>
        </div>

        {/* Inline Unscheduled Expense Drawer */}
        {showExpenseDrawer && (
          <form
            onSubmit={handleRecordExpense}
            className="flex flex-col gap-2.5 bg-slate-50 border border-slate-200 p-3.5 rounded-xl animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Rapid Fuel / Puncture / Meal Claim</span>
              <span className="text-[11px] text-slate-400">Debits cash register</span>
            </div>

            {expenseFeedback && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg">
                {expenseFeedback}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as RoznamchaCategory)}
                className="h-11 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="Fleet & Fuel">Fleet & Fuel</option>
                <option value="Driver Meal & Wages">Driver Meal & Wages</option>
                <option value="Van Repair & Toll">Van Repair & Toll</option>
                <option value="Loading / Labor">Loading / Labor</option>
                <option value="Other">Other Expense</option>
              </select>

              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="Amount (Rs.)"
                className="h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <input
              type="text"
              value={expenseNarration}
              onChange={(e) => setExpenseNarration(e.target.value)}
              placeholder="Narration e.g. Diesel refill PSO bypass / tyre punch"
              className="h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
            />

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowExpenseDrawer(false)}
                className="flex-1 min-h-[44px] h-11 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingExpense}
                className="flex-2 min-h-[44px] h-11 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 cursor-pointer shadow-sm"
              >
                {isSubmittingExpense ? 'Recording...' : 'Record to Roznamcha'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Route Progress Tracker */}
      <section className="flex flex-col bg-white rounded-2xl p-4 shadow-sm border border-slate-200 gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-slate-900">Today's Route Visits</span>
          </div>
          <span className="font-mono text-xs text-amber-700 font-extrabold">
            {visitedCount} / {totalRouteCustomers} ({progressPercent}%)
          </span>
        </div>

        {/* Progress Track Bar */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="bg-amber-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(12, progressPercent)}%` }}
          ></div>
        </div>

        {/* Customer Dispatch Cards List */}
        <div className="flex flex-col gap-2 pt-1">
          {/* Store 1: Al-Madina General Store */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[48px]">
            <div className="flex flex-col min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate">
                  Madina Cash & Carry Superstore
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              </div>
              <span className="text-[11px] text-slate-500 truncate">
                Mingora Bazaar • Visited 08:30 AM
              </span>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-xs font-mono font-bold text-amber-700">Rs. 18,500</span>
              <span className="text-[10px] font-semibold text-emerald-700">Synced</span>
            </div>
          </div>

          {/* Store 2: Barikot Superstore */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[48px]">
            <div className="flex flex-col min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate">
                  Barikot Superstore & Sons
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              </div>
              <span className="text-[11px] text-slate-500 truncate">
                Main Road • Visited 09:15 AM
              </span>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-xs font-mono font-bold text-amber-700">Rs. 58,032</span>
              <span className="text-[10px] font-semibold text-emerald-700">Synced</span>
            </div>
          </div>

          {/* Store 3: Pending in Sequence */}
          <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200 rounded-xl min-h-[48px]">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-bold text-slate-900 truncate">Swat Cash & Carry</span>
              <span className="text-[11px] text-amber-800 truncate">Square #2 • Next in sequence</span>
            </div>
            <button
              onClick={() => {
                const target = customers.find((c) => c.shopName.includes('Madina') || c.shopName.includes('Khyber')) || customers[0];
                if (target && onSelectCustomerForOrder) {
                  onSelectCustomerForOrder(target);
                }
              }}
              className="min-h-[40px] px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shrink-0 shadow-sm cursor-pointer"
              type="button"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Navigate</span>
            </button>
          </div>
        </div>
      </section>

      {/* Payroll & Allowance Accordion Summary */}
      <section className="flex flex-col bg-white rounded-2xl p-4 shadow-sm border border-slate-200 gap-3">
        <div
          onClick={() => setShowPayrollAccordion((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-700" />
            <span className="text-sm font-bold text-slate-900">Monthly Accruals & Advance</span>
          </div>
          <div className="w-8 h-8 flex items-center justify-center text-slate-500">
            {showPayrollAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {/* Accordion Body */}
        {showPayrollAccordion && (
          <div className="flex flex-col gap-2.5 pt-1 border-t border-slate-100 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500">Accrued TA/DA (26d)</span>
                <span className="text-base font-mono font-extrabold text-slate-900 mt-0.5">
                  Rs. {monthlyAccruedTADA.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">@ Rs. 200/day</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500">Base Monthly Pay</span>
                <span className="text-base font-mono font-extrabold text-slate-900 mt-0.5">
                  Rs. {baseMonthlySalary.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">Grade L3 Field Officer</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-700 font-medium">Staff Cash Advance (Deduction)</span>
              <span className="font-mono font-bold text-rose-600">- Rs. {staffCashAdvance.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-amber-500 text-white rounded-xl">
              <span className="text-xs font-bold text-amber-100 uppercase">Projected Take-Home Pay</span>
              <span className="text-lg font-mono font-extrabold text-white">
                Rs. {projectedTakeHome.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Offline SQLite Buffer & Immediate Push Button */}
      <section className="flex flex-col bg-slate-900 text-white p-4 rounded-2xl shadow-sm gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white">SQLite / Dexie Buffer Active</span>
            <span className="text-[11px] text-slate-400 truncate">
              Local DB Synced with Central ERP Ledger
            </span>
          </div>
        </div>

        <button
          onClick={handleForceSync}
          disabled={isSyncing}
          className={`w-full min-h-[48px] h-12 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all mt-2 cursor-pointer ${
            syncStatusText.includes('RECONCILED')
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
          type="button"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{syncStatusText}</span>
        </button>
      </section>
    </div>
  );
};
