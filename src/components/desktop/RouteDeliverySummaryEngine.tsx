import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  MapPin,
  Calendar,
  Users,
  Truck,
  Check,
  X,
  CreditCard,
  Building,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Customer,
  Order,
  RoznamchaEntry,
  SalesRoute,
  RouteDeliverySummary,
  RouteSummaryShopRow,
  Employee,
} from '../../types';
import { db } from '../../db';
import {
  getTenantRouteSummaries,
  saveRouteSummary,
  updateRouteSummary,
  getTenantRoutes,
  getTenantRouteStops,
  ACTIVE_TENANT_ID,
} from '../../db/localDb';
import {
  getNextSequenceNumber,
  formatSummaryId,
  formatShopId,
  formatInvoiceId,
  formatRouteId,
} from '../../utils/sequenceNumbering';
import { formatAmount, formatPKR, formatDateTime } from '../../utils/calculations';
import { syncCustomerToSupabase, syncRoznamchaEntryToSupabase } from '../../db/supabase';

interface RouteDeliverySummaryEngineProps {
  orders: Order[];
  customers: Customer[];
  routes: SalesRoute[];
  employees?: Employee[];
  roznamcha?: RoznamchaEntry[];
  onAddRoznamchaEntry?: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export const RouteDeliverySummaryEngine: React.FC<RouteDeliverySummaryEngineProps> = ({
  orders,
  customers,
  routes,
  employees = [],
  roznamcha = [],
  onAddRoznamchaEntry,
  onRefreshData,
}) => {
  const [summaries, setSummaries] = useState<RouteDeliverySummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSummary, setSelectedSummary] = useState<RouteDeliverySummary | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);

  // New Summary Form State
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [genRouteId, setGenRouteId] = useState<string>('');
  const [genDate, setGenDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [genDriverName, setGenDriverName] = useState<string>('');
  const [genBookerName, setGenBookerName] = useState<string>('');
  const [genVehicleNo, setGenVehicleNo] = useState<string>('');

  // Evening Reconciliation Form State (holds edited rows before commit)
  const [reconcileRows, setReconcileRows] = useState<RouteSummaryShopRow[]>([]);
  const [reconcileSuccessMsg, setReconcileSuccessMsg] = useState<string | null>(null);

  // Print Mode State
  const [printFormat, setPrintFormat] = useState<'a4' | 'pos80'>('a4');

  // Load summaries on mount
  const loadSummaries = async () => {
    setIsLoading(true);
    try {
      const data = await getTenantRouteSummaries();
      setSummaries(data);
      if (data.length > 0 && !selectedSummary) {
        setSelectedSummary(data[0]);
      }
    } catch (err) {
      console.error('Failed to load route delivery summaries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummaries();
  }, []);

  // When route changes in generator modal, auto-fill assigned staff and vehicle
  useEffect(() => {
    if (routes.length > 0 && !genRouteId) {
      const r = routes[0];
      setGenRouteId(r.id);
      setGenDriverName(r.assigned_driver_name || 'Tariq Driver (Van 04)');
      setGenBookerName(r.assigned_booker_name || 'Bilal Swati (Order Booker)');
      setGenVehicleNo(r.vehicle_number || 'SWT-8821');
    }
  }, [routes, genRouteId]);

  const handleRouteChange = (rId: string) => {
    setGenRouteId(rId);
    const r = routes.find((x) => x.id === rId);
    if (r) {
      setGenDriverName(r.assigned_driver_name || 'Tariq Driver (Van 04)');
      setGenBookerName(r.assigned_booker_name || 'Bilal Swati (Order Booker)');
      setGenVehicleNo(r.vehicle_number || 'SWT-8821');
    }
  };

  // Generate a brand new Route Delivery & Recovery Summary
  const handleGenerateSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    const route = routes.find((r) => r.id === genRouteId);
    if (!route) {
      alert('Please select a route');
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Determine next sequential summary number (Summary #1, Summary #2...)
      const nextNum = getNextSequenceNumber(summaries, (s) => s.summaryNumber || s.summaryCode, 1);
      const summaryCode = formatSummaryId(nextNum);

      // 2. Load route stops to preserve sequence
      const stops = await getTenantRouteStops(route.id, ACTIVE_TENANT_ID);

      // 3. Find matching customers for this route
      const routeCustomers = customers.filter(
        (c) =>
          c.route === route.route_name ||
          stops.some((s) => s.customer_id === c.id)
      );

      // 4. Sort customers by stop sequence
      routeCustomers.sort((a, b) => {
        const seqA = stops.find((s) => s.customer_id === a.id)?.stop_sequence ?? 999;
        const seqB = stops.find((s) => s.customer_id === b.id)?.stop_sequence ?? 999;
        return seqA - seqB;
      });

      // 5. Find orders booked today for this route
      const targetDate = genDate;
      const todayRouteOrders = orders.filter((o) => {
        const orderDateStr = o.date ? o.date.slice(0, 10) : '';
        const matchDate = orderDateStr === targetDate;
        const matchRoute =
          o.route === route.route_name ||
          routeCustomers.some((c) => c.id === o.customerId);
        return matchDate && matchRoute;
      });

      // 6. Build shop rows combining Today's Invoices and Previous Debt (Purana Baqaya)
      const shopRows: RouteSummaryShopRow[] = [];
      let totalSales = 0;
      let totalOldDebt = 0;

      // Group customers: either has an order today OR has outstanding debt
      const activeCustomers = routeCustomers.length > 0 ? routeCustomers : customers.slice(0, 10);

      activeCustomers.forEach((cust, index) => {
        // Find if this shop has an order booked today
        const custOrder = todayRouteOrders.find((o) => o.customerId === cust.id);
        const todayNetBill = custOrder ? custOrder.netBill : 0;
        
        // Customer ledger balance: if order was booked, currentBalance may already include netBill
        // Purana Baqaya (Previous Debt) is the balance before today's unpaid bill
        const rawBalance = cust.currentBalance || 0;
        const prevDebt = custOrder
          ? Math.max(0, rawBalance - (custOrder.remainingBalance || custOrder.netBill))
          : rawBalance;

        const totalDue = todayNetBill + prevDebt;

        if (totalDue > 0 || custOrder) {
          totalSales += todayNetBill;
          totalOldDebt += prevDebt;

          const seq = index + 1;
          const billNo = custOrder ? custOrder.orderNo : '—';

          shopRows.push({
            stopSequence: seq,
            customerId: cust.id,
            shopNumber: cust.shopNumber || seq,
            shopName: cust.shopName || cust.name,
            ownerName: cust.name,
            billNo,
            orderId: custOrder?.id,
            todayNetBill,
            previousDebt: prevDebt,
            totalDue,
            cashCollected: custOrder ? custOrder.cashPaid : 0,
            remainingDebt: Math.max(0, totalDue - (custOrder ? custOrder.cashPaid : 0)),
            status: custOrder && custOrder.remainingBalance === 0 ? 'settled' : 'pending',
          });
        }
      });

      const totalTarget = totalSales + totalOldDebt;
      const totalCollectedInit = shopRows.reduce((sum, r) => sum + r.cashCollected, 0);

      const newSummary: RouteDeliverySummary = {
        id: `sum-${nextNum}-${Date.now().toString().slice(-4)}`,
        summaryNumber: nextNum,
        summaryCode,
        routeId: route.id,
        routeName: route.route_name,
        routeCode: route.route_code || formatRouteId(nextNum),
        dispatchDate: genDate,
        driverName: genDriverName || 'Tariq Driver',
        salesmanName: genBookerName || 'Bilal Swati',
        vehicleNumber: genVehicleNo || 'SWT-8821',
        shops: shopRows,
        totalRouteSalesToday: totalSales,
        totalOldDebtCarried: totalOldDebt,
        totalCollectibleTarget: totalTarget,
        totalCashCollected: totalCollectedInit,
        totalRemainingDebt: Math.max(0, totalTarget - totalCollectedInit),
        status: 'Dispatched',
      };

      await saveRouteSummary(newSummary);
      setSummaries((prev) => [newSummary, ...prev]);
      setSelectedSummary(newSummary);
      setShowGenerateModal(false);
    } catch (err) {
      console.error('Failed to create route summary:', err);
      alert('Error creating route summary');
    } finally {
      setIsGenerating(false);
    }
  };

  // Open Evening Reconciliation
  const handleOpenReconcile = (sum: RouteDeliverySummary) => {
    setSelectedSummary(sum);
    // Clone shops rows for live editing
    setReconcileRows(JSON.parse(JSON.stringify(sum.shops)));
    setIsReconciling(true);
  };

  // Update a single shop's collected cash in reconciliation
  const handleCashCollectedChange = (index: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setReconcileRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      row.cashCollected = Math.max(0, val);
      row.remainingDebt = Math.max(0, row.totalDue - row.cashCollected);
      row.status = row.remainingDebt === 0 ? 'settled' : row.cashCollected > 0 ? 'partial' : 'pending';
      next[index] = row;
      return next;
    });
  };

  // Row Quick Button: Full Paid
  const handleSetRowFullPaid = (index: number) => {
    setReconcileRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      row.cashCollected = row.totalDue;
      row.remainingDebt = 0;
      row.status = 'settled';
      next[index] = row;
      return next;
    });
  };

  // Row Quick Button: Zero / Unpaid
  const handleSetRowUnpaid = (index: number) => {
    setReconcileRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      row.cashCollected = 0;
      row.remainingDebt = row.totalDue;
      row.status = 'pending';
      next[index] = row;
      return next;
    });
  };

  // Reconciliation Live Totals
  const liveTotalCashCollected = useMemo(() => {
    return reconcileRows.reduce((sum, r) => sum + (r.cashCollected || 0), 0);
  }, [reconcileRows]);

  const liveTotalRemainingDebt = useMemo(() => {
    return reconcileRows.reduce((sum, r) => sum + (r.remainingDebt || 0), 0);
  }, [reconcileRows]);

  const settledCount = useMemo(() => {
    return reconcileRows.filter((r) => r.status === 'settled').length;
  }, [reconcileRows]);

  // Master Action: "Confirm & Settle Summary #[ID]"
  const handleConfirmAndSettleSummary = async () => {
    if (!selectedSummary) return;

    const confirm = window.confirm(
      `Confirm Evening Reconciliation for ${selectedSummary.summaryCode}?\n\n` +
      `Total Physical Cash Collected: ${formatAmount(liveTotalCashCollected)}\n` +
      `Carried-Forward Market Credit: ${formatAmount(liveTotalRemainingDebt)}\n\n` +
      `This will update customer subsidiary ledgers and post ONE consolidated CASH_IN entry to Daily Roznamcha.`
    );
    if (!confirm) return;

    try {
      // 1. Update customer subsidiary ledgers: for each shop, credit the collected cash
      for (const row of reconcileRows) {
        if (row.cashCollected > 0) {
          const cust = await db.customers.get(row.customerId);
          if (cust) {
            const updatedBal = Math.max(0, row.remainingDebt);
            await db.customers.update(row.customerId, { currentBalance: updatedBal });
            await syncCustomerToSupabase({ ...cust, currentBalance: updatedBal });
          }
        }
      }

      // 2. Post ONE single consolidated cash entry into Daily Roznamcha:
      const rozEntryId = `roz-rec-${Date.now().toString().slice(-6)}`;
      const rozNarration = `Cash recovery from ${selectedSummary.routeName} via ${selectedSummary.summaryCode} (${settledCount}/${reconcileRows.length} shops cleared)`;

      const consolidatedRoznamchaEntry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'> = {
        date: new Date().toISOString(),
        type: 'cash_in',
        category: 'Customer Recovery',
        amount: liveTotalCashCollected,
        narration: rozNarration,
        recordedBy: `${selectedSummary.driverName} / ${selectedSummary.salesmanName} (${selectedSummary.summaryCode})`,
        customerName: `${selectedSummary.routeName} • ${selectedSummary.summaryCode}`,
      };

      if (onAddRoznamchaEntry) {
        await onAddRoznamchaEntry(consolidatedRoznamchaEntry);
      } else {
        const fullRoz: RoznamchaEntry = {
          ...consolidatedRoznamchaEntry,
          id: rozEntryId,
          entryNo: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
          synced: true,
        };
        await db.roznamcha.add(fullRoz);
        await syncRoznamchaEntryToSupabase(fullRoz);
      }

      // 3. Update Summary record status to 'Reconciled & Closed'
      const updatedSum: RouteDeliverySummary = {
        ...selectedSummary,
        shops: reconcileRows,
        totalCashCollected: liveTotalCashCollected,
        totalRemainingDebt: liveTotalRemainingDebt,
        status: 'Reconciled & Closed',
        reconciledAt: new Date().toISOString(),
        reconciledBy: 'Cashier / Supervisor',
        roznamchaEntryId: rozEntryId,
      };

      await updateRouteSummary(updatedSum);
      setSummaries((prev) =>
        prev.map((s) => (s.id === updatedSum.id ? updatedSum : s))
      );
      setSelectedSummary(updatedSum);
      setIsReconciling(false);
      setReconcileSuccessMsg(
        `✓ ${selectedSummary.summaryCode} successfully reconciled! Consolidated cash of ${formatAmount(liveTotalCashCollected)} posted to Daily Roznamcha.`
      );
      setTimeout(() => setReconcileSuccessMsg(null), 5000);

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error('Failed to commit evening reconciliation:', err);
      alert('Error during reconciliation');
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Success Notification Alert */}
      {reconcileSuccessMsg && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{reconcileSuccessMsg}</span>
          </div>
          <button onClick={() => setReconcileSuccessMsg(null)} className="hover:opacity-80">✕</button>
        </div>
      )}

      {/* Control Banner & Summary Navigation Ribbon */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Route Delivery &amp; Recovery Summary Module
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black uppercase tracking-wider font-mono">
              Summary #1, #2... Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Combines today's invoices and purana baqaya into one unified delivery challan with evening per-shop cash reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Generate Route Summary</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Summaries List & Right Sheet / Reconciliation View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: List of Summaries */}
        <div className="lg:col-span-4 flex flex-col gap-3 print:hidden">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" /> Dispatched Route Sheets
              </span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {summaries.length} Summaries
              </span>
            </div>

            {summaries.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No route summaries generated yet.
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="block mx-auto mt-2 text-amber-600 font-bold hover:underline"
                >
                  Generate Summary #1 Now
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                {summaries.map((sum) => (
                  <div
                    key={sum.id}
                    onClick={() => {
                      setSelectedSummary(sum);
                      setIsReconciling(false);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedSummary?.id === sum.id
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-slate-900">
                        {sum.summaryCode}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          sum.status === 'Reconciled & Closed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {sum.status}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                      {sum.routeName}
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                      <span>{sum.dispatchDate}</span>
                      <span>•</span>
                      <span>{sum.shops.length} Shops</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-slate-700 whitespace-nowrap">
                        {formatAmount(sum.totalCollectibleTarget)}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Driver: {sum.driverName}</span>
                      <span className="text-amber-700 font-bold font-mono whitespace-nowrap">
                        Rec: {formatAmount(sum.totalCashCollected)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sheet Display or Evening Reconciliation Table */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {!selectedSummary ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              Select or generate a Route Delivery &amp; Recovery Summary to view printable sheets or perform evening reconciliation.
            </div>
          ) : isReconciling ? (
            /* EVENING RECONCILIATION FAST-ENTRY TABLE */
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-amber-600">
                      {selectedSummary.summaryCode}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      Evening Reconciliation &amp; Per-Shop Settlement
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter physical cash collected per shop or use [Full Paid] / [Zero / Unpaid] quick buttons.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsReconciling(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Back to Sheet
                  </button>
                  <button
                    onClick={handleConfirmAndSettleSummary}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm &amp; Settle {selectedSummary.summaryCode}</span>
                  </button>
                </div>
              </div>

              {/* Fast-Entry Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                      <th className="py-2.5 px-3">Stop #</th>
                      <th className="py-2.5 px-3">Shop # &amp; Outlet Name</th>
                      <th className="py-2.5 px-3">Bill #</th>
                      <th className="py-2.5 px-3 text-right">Total Due</th>
                      <th className="py-2.5 px-3 min-w-[140px] text-right">Cash Collected</th>
                      <th className="py-2.5 px-3 text-right">Remaining Debt</th>
                      <th className="py-2.5 px-3 text-center">Quick Helpers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reconcileRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                          #{row.stopSequence}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{formatShopId(row.shopNumber || (idx + 1))}: {row.shopName}</div>
                          <div className="text-[10px] text-slate-400">{row.ownerName}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                          {row.billNo}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatAmount(row.totalDue)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            value={row.cashCollected}
                            onChange={(e) => handleCashCollectedChange(idx, e.target.value)}
                            className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          <span className={row.remainingDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            {formatAmount(row.remainingDebt)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetRowFullPaid(idx)}
                              className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer transition-colors"
                              title="Set Cash Collected = Total Due"
                            >
                              Full Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetRowUnpaid(idx)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer transition-colors"
                              title="Set Cash Collected = 0"
                            >
                              Zero / Unpaid
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Real-Time Live Counters Ribbon */}
              <div className="mt-3 p-4 bg-slate-900 text-white rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Live Total Cash Collected
                  </span>
                  <span className="font-mono font-black text-emerald-400 text-base whitespace-nowrap">
                    {formatAmount(liveTotalCashCollected)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Carried-Forward Market Credit
                  </span>
                  <span className="font-mono font-black text-rose-400 text-base whitespace-nowrap">
                    {formatAmount(liveTotalRemainingDebt)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Settlement Status
                  </span>
                  <span className="font-bold text-amber-300 text-sm">
                    {settledCount} of {reconcileRows.length} Shops Cleared
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* PRINTABLE / AUDIT SHEET VIEW */
            <div className="flex flex-col gap-4">
              {/* Header Actions */}
              <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-sm text-slate-900">
                    {selectedSummary.summaryCode}
                  </span>
                  <span className="text-xs text-slate-500">• {selectedSummary.routeName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setPrintFormat('a4')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        printFormat === 'a4' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      A4 Format
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintFormat('pos80')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        printFormat === 'pos80' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      80mm Thermal
                    </button>
                  </div>

                  <button
                    onClick={handlePrintSummary}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Sheet</span>
                  </button>

                  {selectedSummary.status !== 'Reconciled & Closed' && (
                    <button
                      onClick={() => handleOpenReconcile(selectedSummary)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Evening Reconcile</span>
                    </button>
                  )}
                </div>
              </div>

              {/* RENDER SHEET: A4 FORMAT */}
              {printFormat === 'a4' && (
                <div
                  id="route-summary-a4"
                  className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-md text-slate-900 font-sans text-xs print:p-0 print:border-none print:shadow-none"
                >
                  {/* Top Branding & Sequential Title */}
                  <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
                    <div>
                      <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                        PRIMELINK DISTRIBUTION MANAGEMENT
                      </h1>
                      <div className="text-xs font-bold text-slate-600 uppercase">
                        Route Delivery &amp; Recovery Summary Sheet
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Mingora Wholesale Market Depot • KPK Distribution Region
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-block bg-slate-900 text-white font-mono font-black text-sm px-3 py-1 rounded uppercase tracking-wider mb-1">
                        {selectedSummary.summaryCode}
                      </div>
                      <div className="text-xs font-bold text-amber-700">
                        Route: {selectedSummary.routeName}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Date: {selectedSummary.dispatchDate}
                      </div>
                    </div>
                  </div>

                  {/* Logistics Meta Box */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Driver Name</span>
                      <strong className="text-slate-900">{selectedSummary.driverName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Salesman / Booker</span>
                      <strong className="text-slate-900">{selectedSummary.salesmanName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Vehicle Reg #</span>
                      <strong className="text-slate-900 font-mono">{selectedSummary.vehicleNumber || 'SWT-8821'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Dispatch Status</span>
                      <strong className="text-emerald-700 uppercase font-mono">{selectedSummary.status}</strong>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <table className="w-full text-left border-collapse text-xs border border-slate-200 mb-4">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 uppercase font-extrabold text-[10px] border-b border-slate-300">
                        <th className="p-2 border-r border-slate-200 text-center w-10">Stop</th>
                        <th className="p-2 border-r border-slate-200">Shop # &amp; Outlet Name</th>
                        <th className="p-2 border-r border-slate-200 text-center">Bill #</th>
                        <th className="p-2 border-r border-slate-200 text-right">Today Bill</th>
                        <th className="p-2 border-r border-slate-200 text-right">Purana Baqaya</th>
                        <th className="p-2 border-r border-slate-200 text-right">Total Due</th>
                        <th className="p-2 border-r border-slate-200 text-right w-28">Cash Collected</th>
                        <th className="p-2 border-r border-slate-200 text-right">Remaining</th>
                        <th className="p-2 text-center w-28">Shopkeeper Stamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedSummary.shops.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                            #{row.stopSequence}
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            <div className="font-bold text-slate-900">{formatShopId(row.shopNumber || (idx + 1))}: {row.shopName}</div>
                            <div className="text-[10px] text-slate-500">{row.ownerName}</div>
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center font-mono font-semibold text-slate-800">
                            {row.billNo}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono whitespace-nowrap">
                            {formatAmount(row.todayNetBill)}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600 whitespace-nowrap">
                            {formatAmount(row.previousDebt)}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                            {formatAmount(row.totalDue)}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {row.cashCollected > 0 ? formatAmount(row.cashCollected) : (
                              <div className="w-full h-6 border border-dashed border-slate-300 rounded bg-slate-50/50"></div>
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                            {formatAmount(row.remainingDebt)}
                          </td>
                          <td className="p-2 text-center">
                            <div className="w-full h-6 border-b border-dotted border-slate-300"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary Sheet Footer & Totals */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200 mb-6 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-bold">Total Route Sales</span>
                      <strong className="text-slate-900 text-sm whitespace-nowrap">{formatAmount(selectedSummary.totalRouteSalesToday)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-bold">Total Old Debt Carried</span>
                      <strong className="text-slate-900 text-sm whitespace-nowrap">{formatAmount(selectedSummary.totalOldDebtCarried)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-bold">Total Recovery Target</span>
                      <strong className="text-amber-700 text-sm font-black whitespace-nowrap">{formatAmount(selectedSummary.totalCollectibleTarget)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-bold">Total Cash Reconciled</span>
                      <strong className="text-emerald-700 text-sm font-black whitespace-nowrap">{formatAmount(selectedSummary.totalCashCollected)}</strong>
                    </div>
                  </div>

                  {/* Cash Count Breakdown & Sign-off Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t-2 border-slate-800 text-xs">
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                      <div className="font-bold text-[11px] uppercase text-slate-700 mb-2">
                        Physical Cash Denomination Count
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-600">
                        <div>Rs. 5,000 × ___</div>
                        <div>Rs. 1,000 × ___</div>
                        <div>Rs. 500 × ___</div>
                        <div>Rs. 100 × ___</div>
                        <div>Rs. 50 × ___</div>
                        <div>Coins / Change: ___</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-end">
                      <div className="text-center">
                        <div className="border-b border-slate-400 mb-1 h-8"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-600">
                          Van Driver / Salesman Signature
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="border-b border-slate-400 mb-1 h-8"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-600">
                          Depot Cashier / Manager Signature
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER SHEET: CONDENSED 80MM THERMAL ROLL */}
              {printFormat === 'pos80' && (
                <div
                  id="route-summary-thermal"
                  className="w-[300px] mx-auto bg-white text-black p-4 font-mono text-xs border border-gray-300 shadow-sm print:shadow-none print:border-none print:w-full print:p-0 leading-relaxed"
                >
                  <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
                    <div className="font-extrabold text-base tracking-wider uppercase">
                      PRIMELINK DMS
                    </div>
                    <div className="text-[10px] text-gray-700 font-sans font-bold">
                      ROUTE DELIVERY SUMMARY
                    </div>
                    <div className="text-sm font-black font-mono mt-1 bg-black text-white py-0.5 px-2 rounded">
                      {selectedSummary.summaryCode}
                    </div>
                    <div className="text-[10px] text-gray-700 mt-1">
                      Route: {selectedSummary.routeName}
                    </div>
                    <div className="text-[10px] text-gray-600">
                      Date: {selectedSummary.dispatchDate} • Driver: {selectedSummary.driverName}
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-dashed border-gray-400 pb-2 mb-2 text-[10px]">
                    {selectedSummary.shops.map((row, idx) => (
                      <div key={idx} className="border-b border-dotted border-gray-200 pb-1">
                        <div className="font-bold flex justify-between">
                          <span>#{row.stopSequence} • {formatShopId(row.shopNumber || (idx + 1))}</span>
                          <span>{row.billNo}</span>
                        </div>
                        <div className="truncate font-sans font-bold text-[11px]">{row.shopName}</div>
                        <div className="flex justify-between text-gray-600">
                          <span>Bill: {formatAmount(row.todayNetBill)}</span>
                          <span>Old: {formatAmount(row.previousDebt)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-black">
                          <span>Total Due:</span>
                          <span className="font-mono">{formatAmount(row.totalDue)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 font-bold">
                          <span>Cash Vasooli:</span>
                          <span className="font-mono">{row.cashCollected > 0 ? formatAmount(row.cashCollected) : '[ ______ ]'}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-[11px] font-bold border-b border-dashed border-gray-400 pb-2 mb-2">
                    <div className="flex justify-between">
                      <span>Total Route Sales:</span>
                      <span>{formatAmount(selectedSummary.totalRouteSalesToday)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Old Debt:</span>
                      <span>{formatAmount(selectedSummary.totalOldDebtCarried)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t border-gray-300">
                      <span>TOTAL TARGET:</span>
                      <span>{formatAmount(selectedSummary.totalCollectibleTarget)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>TOTAL RECOVERED:</span>
                      <span>{formatAmount(selectedSummary.totalCashCollected)}</span>
                    </div>
                  </div>

                  <div className="pt-2 text-center text-[9px] text-gray-500">
                    * * * END OF ROUTE SUMMARY * * *
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GENERATE ROUTE SUMMARY MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm uppercase">
                  Generate Route Delivery &amp; Recovery Summary
                </h3>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateSummary} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Target Route / Territory Beat *
                </label>
                <select
                  value={genRouteId}
                  onChange={(e) => handleRouteChange(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white focus:outline-none focus:border-amber-500"
                >
                  {routes.map((r, idx) => (
                    <option key={r.id} value={r.id}>
                      {r.route_code || formatRouteId(idx + 1)} — {r.route_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={genDate}
                    onChange={(e) => setGenDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Van Reg #
                  </label>
                  <input
                    type="text"
                    value={genVehicleNo}
                    onChange={(e) => setGenVehicleNo(e.target.value)}
                    placeholder="e.g. SWT-8821"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Assigned Driver
                  </label>
                  <input
                    type="text"
                    value={genDriverName}
                    onChange={(e) => setGenDriverName(e.target.value)}
                    placeholder="e.g. Tariq Driver"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Order Booker / Salesman
                  </label>
                  <input
                    type="text"
                    value={genBookerName}
                    onChange={(e) => setGenBookerName(e.target.value)}
                    placeholder="e.g. Bilal Swati"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                ⚡ Automatically combines Today's Booked Orders with Purana Baqaya (Previous Debt) for all shops on this beat, assigning the next sequential number (Summary #1, Summary #2...).
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase shadow-sm cursor-pointer"
                >
                  {isGenerating ? 'Generating...' : 'Create Summary Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
