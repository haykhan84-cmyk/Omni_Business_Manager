import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Wifi,
  WifiOff,
  RefreshCw,
  Wallet,
  Landmark,
  Cloud,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Building2,
  Truck,
  ShoppingBag,
  DollarSign,
  Package,
} from 'lucide-react';
import { formatPKR } from '../utils/calculations';
import { UserAccount, UserRole } from '../types';

interface HeaderProps {
  currentMode: 'mobile' | 'desktop';
  onModeChange: (mode: 'mobile' | 'desktop') => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  syncQueueCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
  cashInHand: number;
  bankBalance?: number;
  onOpenSupabaseModal?: () => void;
  supabaseConnected?: boolean;
  currentUser?: UserAccount;
  onSignOut?: () => void;
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
  bankBalance = 0,
  onOpenSupabaseModal,
  supabaseConnected = true,
  currentUser,
  onSignOut,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const canSwitchMode = !currentUser || currentUser.role === 'ADMIN';

  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ORDER_BOOKER':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'DELIVERY_DRIVER':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'WAREHOUSE_SUPERVISOR':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'ACCOUNTANT':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

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
                PrimeLink
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-block">
              FMCG &amp; Pharma Distribution
            </span>
          </div>
        </div>

        {/* Mode Switcher Toggle Pill (Only for ADMIN / OWNER) */}
        {canSwitchMode ? (
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
        ) : (
          <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300 font-bold">Field Mode</span>
            <span className="text-[10px] text-slate-400 font-mono">(Locked)</span>
          </div>
        )}

        {/* Right Status Group: Cash In Hand, Online Toggle, Sync Queue, User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Vault Cash Chip (Only visible if Admin or Accountant) */}
          {(!currentUser || currentUser.role === 'ADMIN' || currentUser.role === 'ACCOUNTANT') && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-xs"
              title="Current Roznamcha Physical Cash in Vault / Drawer"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 text-[11px]">Vault:</span>
              <span className="font-mono font-bold text-emerald-400 whitespace-nowrap">
                {formatPKR(cashInHand)}
              </span>
            </div>
          )}

          {/* Supabase Cloud Live Status Pill */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${
                supabaseConnected
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-amber-950/80 border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
              }`}
              title="Supabase Cloud PostgreSQL Status - Click to inspect tables"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Supabase</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </button>
          )}

          {/* Online / Offline Simulator Toggle */}
          <button
            onClick={onToggleOnline}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${
              isOnline
                ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-rose-950/80 border-rose-600/50 text-rose-300 hover:bg-rose-900/60'
            }`}
            title="Toggle offline/online state to test offline Dexie DB"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="hidden md:inline">Offline</span>
              </>
            )}
          </button>

          {/* Sync Trigger Button */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
              syncQueueCount > 0
                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Sync Cloud and local IndexedDB"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-300' : 'text-amber-400'}`}
            />
            {isSyncing ? (
              <span className="hidden xs:inline">Syncing...</span>
            ) : syncQueueCount > 0 ? (
              <span>Sync ({syncQueueCount})</span>
            ) : (
              <span className="hidden sm:inline">Sync</span>
            )}
          </button>

          {/* User Profile & Sign Out Dropdown */}
          {currentUser && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-left transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden md:block max-w-[110px] truncate">
                  <div className="text-xs font-bold text-white truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono truncate">
                    {currentUser.role.replace('_', ' ')}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-slate-200 animate-in fade-in slide-in-from-top-2">
                    <div className="p-2.5 border-b border-slate-800">
                      <div className="font-extrabold text-sm text-white truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        ID: {currentUser.employeeId}
                      </div>
                      <div className="mt-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                            currentUser.role
                          )}`}
                        >
                          {currentUser.role.replace('_', ' ')}
                        </span>
                      </div>
                      {currentUser.assignedRoute && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          Route: <span className="text-slate-300 font-semibold">{currentUser.assignedRoute}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-1.5">
                      {onSignOut && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onSignOut();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
