import React from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  X,
  Server,
  Database,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { SUPABASE_URL } from '../../db/supabase';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  onSyncNow: () => void;
  syncQueueCount: number;
  supabaseCounts: {
    products: number;
    customers: number;
    orders: number;
    roznamcha: number;
  };
  lastSyncedAt: string | null;
  connectionStatus: 'connected' | 'connecting' | 'error' | 'offline';
  errorMessage?: string;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  isSyncing,
  onSyncNow,
  syncQueueCount,
  supabaseCounts,
  lastSyncedAt,
  connectionStatus,
  errorMessage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Live Supabase Cloud Sync
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/90 border border-emerald-500/40 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Live Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {SUPABASE_URL.replace('https://', '')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isOnline
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-bold text-sm text-white mb-0.5">
                {isOnline ? 'Active Cloud Synchronization' : 'Simulated Offline Mode'}
              </div>
              {isOnline ? (
                <p className="text-emerald-300/90 leading-relaxed">
                  All booked orders, master products, customer balances, and Roznamcha cash entries
                  automatically sync to your remote Supabase PostgreSQL tables in real time.
                </p>
              ) : (
                <p className="text-amber-300/90 leading-relaxed">
                  Transactions are queued safely in Dexie.js (IndexedDB). They will automatically
                  upload to Supabase once connectivity is restored.
                </p>
              )}
            </div>
          </div>

          {/* Remote Supabase Table Metrics */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Supabase Remote Table Registry
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Tenant: <span className="text-amber-400 font-semibold">primelink-main</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Sales Orders */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70 flex flex-col">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">sales_orders</span>
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xl font-black font-mono text-white">
                  {supabaseCounts.orders}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Synced
                </div>
              </div>

              {/* Products */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70 flex flex-col">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">products</span>
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-black font-mono text-white">
                  {supabaseCounts.products}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Synced
                </div>
              </div>

              {/* Financial Roznamcha */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70 flex flex-col">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">financial_roznamcha</span>
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black font-mono text-white">
                  {supabaseCounts.roznamcha}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Synced
                </div>
              </div>

              {/* Customers */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70 flex flex-col">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">customers</span>
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xl font-black font-mono text-white">
                  {supabaseCounts.customers}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Synced
                </div>
              </div>
            </div>
          </div>

          {/* Connection Details */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Supabase Endpoint</span>
              <span className="font-mono text-slate-200">{SUPABASE_URL}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Offline Queue</span>
              <span className="font-mono text-amber-400 font-bold">
                {syncQueueCount} pending changes
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Last Synced</span>
              <span className="font-mono text-slate-200">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Just now'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PostgREST API v1 • TLS Encrypted</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronizing...' : 'Sync All to Cloud'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
