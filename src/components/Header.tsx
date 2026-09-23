import React from 'react';
import {
  Smartphone,
  Monitor,
  Wifi,
  WifiOff,
  RefreshCw,
  Wallet,
  RotateCcw,
  CheckCircle2,
  Cloud,
} from 'lucide-react';
import { formatPKR } from '../utils/calculations';

interface HeaderProps {
  currentMode: 'mobile' | 'desktop';
  onModeChange: (mode: 'mobile' | 'desktop') => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  syncQueueCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
  cashInHand: number;
  onOpenSupabaseModal?: () => void;
  supabaseConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  isOnline,
  onToggleOnline,
  syncQueueCount,
  isSyncing,
  onSyncNow,
  cashInHand,
  onOpenSupabaseModal,
  supabaseConnected = true,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 text-white shadow-md print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand identity */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-600 flex items-center justify-center font-bold text-white shadow-sm">
            <span className="text-base sm:text-lg font-black tracking-tight">OS</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                OmniSales <span className="text-amber-500 font-black">ERP</span>
              </span>
              <span className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                v4.8 • PrimeLink
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-block">
              FMCG &amp; Pharma Distribution
            </span>
          </div>
        </div>

        {/* Mode Switcher Toggle Pill */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80 shadow-inner">
          <button
            onClick={() => onModeChange('mobile')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentMode === 'mobile'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to Mobile Field View (Order Booker / Van Driver)"
          >
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Mobile Field</span>
            <span className="xs:hidden">Mobile</span>
          </button>
          <button
            onClick={() => onModeChange('desktop')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentMode === 'desktop'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to Desktop Management Console (Owner / Office)"
          >
            <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Desktop Console</span>
            <span className="xs:hidden">Console</span>
          </button>
        </div>

        {/* Right Status Group: Cash In Hand, Online Toggle, Sync Queue */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Cash In Hand Chip */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-xs"
            title="Current Roznamcha Live Cash in Hand"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 text-[11px]">Vault Cash:</span>
            <span className="font-mono font-bold text-emerald-400">
              {formatPKR(cashInHand)}
            </span>
          </div>

          {/* Supabase Cloud Live Status Pill */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${
                supabaseConnected
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-amber-950/80 border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
              }`}
              title="Supabase Cloud PostgreSQL Status (vgwfimosnvhcipapxyjx) - Click to inspect tables"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Supabase</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </button>
          )}

          {/* Online / Offline Simulator Toggle */}
          <button
            onClick={onToggleOnline}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${
              isOnline
                ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-rose-950/80 border-rose-600/50 text-rose-300 hover:bg-rose-900/60'
            }`}
            title="Click to toggle simulated offline/online state to test offline Dexie DB"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="hidden md:inline">Offline Mode</span>
              </>
            )}
          </button>

          {/* Sync Queue & Trigger */}
          {/* Cloud Re-fetch & Sync Trigger (Never deletes data; pulls cloud updates & syncs local DB) */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
              syncQueueCount > 0
                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Re-fetch latest data from Supabase Cloud and synchronize local IndexedDB storage (Safe: Never clears tables)"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-300' : 'text-amber-400'}`}
            />
            {isSyncing ? (
              <span>Syncing Cloud...</span>
            ) : syncQueueCount > 0 ? (
              <span>Sync Cloud ({syncQueueCount})</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="hidden sm:inline">Refresh & Sync</span>
                <span className="sm:hidden">Sync</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
