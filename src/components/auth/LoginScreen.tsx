import React, { useState } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  Smartphone,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  Sparkles,
  WifiOff,
  Truck,
  Building2,
  ShoppingBag,
  DollarSign,
  Package,
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import { authenticateUser, getLiveUsersForQuickLogin, DEFAULT_USERS } from '../../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  isOnline: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, isOnline }) => {
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickUsers, setQuickUsers] = useState<UserAccount[]>(DEFAULT_USERS);

  React.useEffect(() => {
    getLiveUsersForQuickLogin().then((users) => {
      if (users && users.length > 0) {
        setQuickUsers(users);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await authenticateUser(identifier, pin, rememberMe);
      setIsSubmitting(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Invalid credentials. Please verify your ID and PIN.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Authentication error. Please try again.');
    }
  };

  const handleSelectQuickRole = async (user: UserAccount) => {
    setIdentifier(user.employeeId);
    setPin(user.pin);
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await authenticateUser(user.employeeId, user.pin, rememberMe);
      setIsSubmitting(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 shadow-xl shadow-amber-600/30 mb-3 border border-amber-400/40">
            <span className="text-2xl font-black text-white tracking-tight">OS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            OmniSales <span className="text-amber-400 font-extrabold">ERP</span>
          </h1>
          <p className="text-sm font-semibold text-slate-300 mt-1">
            PrimeLink Distribution &amp; Logistics
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800/90 text-amber-300 border border-slate-700/80">
              Role-Based Access (RBAC)
            </span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                isOnline
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700/50'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Cloud Ready</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>Offline Dexie Cache</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60">
          <div className="mb-5 pb-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Employee Sign In</h2>
              <p className="text-xs text-slate-400">Enter your Employee ID or Mobile &amp; 4-Digit PIN</p>
            </div>
            <ShieldCheck className="w-6 h-6 text-amber-500" />
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2">
              <span className="shrink-0 mt-0.5 font-bold">⚠️</span>
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
                Employee ID or Mobile
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. EMP-101 or 0300-1122334"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
                4-Digit Security PIN / Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  maxLength={10}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono tracking-widest"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span>Remember me on this phone/device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-[0.99] text-white font-extrabold rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to OmniSales</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Test Logins (1-Tap Switch)
              </span>
              <span className="text-[10px] text-amber-400/90 font-mono">Demo Accounts</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {quickUsers.map((usr) => {
                const getRoleIcon = (role: UserRole) => {
                  switch (role) {
                    case 'ADMIN':
                      return <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
                    case 'ORDER_BOOKER':
                      return <ShoppingBag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                    case 'DELIVERY_DRIVER':
                      return <Truck className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
                    case 'WAREHOUSE_SUPERVISOR':
                      return <Package className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
                    case 'ACCOUNTANT':
                      return <DollarSign className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
                  }
                };

                return (
                  <button
                    key={usr.id}
                    type="button"
                    onClick={() => handleSelectQuickRole(usr)}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {getRoleIcon(usr.role)}
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300 truncate">
                          {usr.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: <span className="text-slate-300 font-bold">{usr.employeeId}</span> • PIN: <span className="text-amber-400 font-bold">{usr.pin}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 group-hover:bg-amber-600 group-hover:text-white shrink-0 ml-2">
                      {usr.role.replace('_', ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-slate-400">
          <p>© 2026 PrimeLink Distribution &amp; Logistics. All rights reserved.</p>
          <p className="mt-0.5 text-slate-400">Offline-First IndexedDB Architecture with Supabase Sync</p>
        </div>
      </div>
    </div>
  );
};
