import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Building2,
  CreditCard,
  QrCode,
  Smartphone,
  MapPin,
  FileText,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Edit2,
  Save,
} from 'lucide-react';
import { BankAccount, CompanyProfile } from '../../types';
import { formatPKR } from '../../utils/calculations';

interface BankAccountsManagementProps {
  bankAccount: BankAccount;
  companyProfile: CompanyProfile;
  onUpdateBankAccount: (account: BankAccount) => Promise<void> | void;
  onUpdateCompanyProfile: (profile: CompanyProfile) => Promise<void> | void;
  calculatedBankBalance?: number;
}

export const BankAccountsManagement: React.FC<BankAccountsManagementProps> = ({
  bankAccount,
  companyProfile,
  onUpdateBankAccount,
  onUpdateCompanyProfile,
  calculatedBankBalance,
}) => {
  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'bank' | 'company'>('bank');

  // Bank Form State
  const [bankName, setBankName] = useState(bankAccount.bankName || 'Bank AL Habib');
  const [accountTitle, setAccountTitle] = useState(bankAccount.accountTitle || 'PrimeLink Enterprises');
  const [accountNumber, setAccountNumber] = useState(bankAccount.accountNumber || '1023-0981-002341-01');
  const [iban, setIban] = useState(bankAccount.iban || 'PK52BAHL1023098100234101');
  const [branchName, setBranchName] = useState(bankAccount.branchName || 'Mingora City Branch, Swat');
  const [raastId, setRaastId] = useState(bankAccount.raastId || '03009821450');
  const [openingBalance, setOpeningBalance] = useState(bankAccount.openingBalance?.toString() || '0');

  // Company Form State
  const [companyName, setCompanyName] = useState(companyProfile.companyName || 'PrimeLink Distribution & Logistics');
  const [tradingName, setTradingName] = useState(companyProfile.tradingName || 'PrimeLink Enterprises');
  const [proprietor, setProprietor] = useState(companyProfile.proprietor || 'Haji Noor Mohammad');
  const [phone, setPhone] = useState(companyProfile.phone || '0300-9821450');
  const [email, setEmail] = useState(companyProfile.email || 'accounts@primelink.com.pk');
  const [address, setAddress] = useState(companyProfile.address || 'Main Bypass & Gate 1 Wholesale Market');
  const [city, setCity] = useState(companyProfile.city || 'Mingora, Swat');
  const [ntn, setNtn] = useState(companyProfile.ntn || '7291048-2');
  const [strn, setStrn] = useState(companyProfile.strn || '327787612345');
  const [drugLicenseNo, setDrugLicenseNo] = useState(companyProfile.drugLicenseNo || 'DL-SWAT-2024-9812');
  const [tagline, setTagline] = useState(companyProfile.tagline || 'Authorized FMCG & Pharma Distributors');

  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync state if props change externally
  useEffect(() => {
    setBankName(bankAccount.bankName || 'Bank AL Habib');
    setAccountTitle(bankAccount.accountTitle || 'PrimeLink Enterprises');
    setAccountNumber(bankAccount.accountNumber || '1023-0981-002341-01');
    setIban(bankAccount.iban || 'PK52BAHL1023098100234101');
    setBranchName(bankAccount.branchName || 'Mingora City Branch, Swat');
    setRaastId(bankAccount.raastId || '03009821450');
    setOpeningBalance(bankAccount.openingBalance?.toString() || '0');
  }, [bankAccount]);

  useEffect(() => {
    setCompanyName(companyProfile.companyName || '');
    setTradingName(companyProfile.tradingName || '');
    setProprietor(companyProfile.proprietor || '');
    setPhone(companyProfile.phone || '');
    setEmail(companyProfile.email || '');
    setAddress(companyProfile.address || '');
    setCity(companyProfile.city || '');
    setNtn(companyProfile.ntn || '');
    setStrn(companyProfile.strn || '');
    setDrugLicenseNo(companyProfile.drugLicenseNo || '');
    setTagline(companyProfile.tagline || '');
  }, [companyProfile]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BankAccount = {
      ...bankAccount,
      bankName: bankName.trim(),
      accountTitle: accountTitle.trim(),
      accountNumber: accountNumber.trim(),
      iban: iban.trim().toUpperCase().replace(/\s+/g, ''),
      branchName: branchName.trim(),
      raastId: raastId.trim(),
      openingBalance: Number(openingBalance) || 0,
      currentBalance: (Number(openingBalance) || 0) + (calculatedBankBalance ? (calculatedBankBalance - bankAccount.openingBalance) : 0),
      isPrimary: true,
    };
    await onUpdateBankAccount(updated);
    setSavedSuccess('Official Bank Details & Raast ID saved successfully! These are live in the top header and on all printed invoices.');
    setTimeout(() => setSavedSuccess(null), 4000);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CompanyProfile = {
      companyName: companyName.trim(),
      tradingName: tradingName.trim(),
      proprietor: proprietor.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      ntn: ntn.trim(),
      strn: strn.trim(),
      drugLicenseNo: drugLicenseNo.trim(),
      tagline: tagline.trim(),
    };
    await onUpdateCompanyProfile(updated);
    setSavedSuccess('Company Profile updated! Header branding and invoice titles have been updated.');
    setTimeout(() => setSavedSuccess(null), 4000);
  };

  const displayCurrentBankBalance = calculatedBankBalance !== undefined ? calculatedBankBalance : (Number(openingBalance) || 0);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-950 text-sm">{savedSuccess}</p>
              <p className="text-xs text-emerald-700">Changes are committed to Dexie and reflected across the ERP.</p>
            </div>
          </div>
          <button
            onClick={() => setSavedSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Sub-Tabs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            <Landmark className="w-4 h-4 text-cyan-600" />
            <span>Corporate Governance</span>
            <span>/</span>
            <span className="text-slate-800">Financial Profile &amp; Banking</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">Bank Accounts &amp; Company Profile</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Configure official corporate bank credentials (IBAN, Raast ID, Opening Bank Balance) and entity metadata. These automatically print on customer invoices and challans so retailers can settle dues via digital bank transfer.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'bank'
                ? 'bg-white shadow-xs text-cyan-800 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-4 h-4 text-cyan-600" />
            <span>Bank Account &amp; Raast ID</span>
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'company'
                ? 'bg-white shadow-xs text-slate-900 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>Company Profile &amp; FBR</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BANK ACCOUNT & RAAST CONFIGURATION */}
      {activeTab === 'bank' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Bank Setup Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Commercial Bank Account Setup</h3>
                  <p className="text-xs text-slate-500">Corporate settlement account for retailer recovery &amp; online transfers</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-900 font-mono text-xs font-extrabold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" /> Primary Settlement
              </span>
            </div>

            <form onSubmit={handleSaveBank} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bank Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Bank AL Habib, Faysal Bank, Meezan Bank"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {['Bank AL Habib', 'Meezan Bank', 'Faysal Bank', 'HBL'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBankName(b)}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer font-medium"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Account Title / Beneficiary *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountTitle}
                    onChange={(e) => setAccountTitle(e.target.value)}
                    placeholder="e.g. PrimeLink Enterprises"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Exact name as registered with SBP/Bank</p>
                </div>
              </div>

              {/* Account Number & 24-digit IBAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 1023-0981-002341-01"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    24-Digit IBAN (PK...) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={32}
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="e.g. PK52BAHL1023098100234101"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white tracking-wider transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Formatted for Interbank 1LINK / Raast routing</p>
                </div>
              </div>

              {/* Branch Name / City & Raast ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Branch Name / City *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Mingora City Branch, Swat"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Raast ID / Registered Mobile *
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={raastId}
                      onChange={(e) => setRaastId(e.target.value)}
                      placeholder="e.g. 03009821450"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Instant zero-fee transfer via Raast ID</p>
                </div>
              </div>

              {/* Opening Bank Balance */}
              <div className="p-4 bg-cyan-50/50 rounded-2xl border border-cyan-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-950">
                    Starting / Opening Bank Balance (PKR) *
                  </label>
                  <span className="font-mono text-xs font-bold text-cyan-900">
                    Current: {formatPKR(displayCurrentBankBalance)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-cyan-800 text-sm">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="Enter starting cleared bank balance (e.g. 1500000)"
                    className="w-full bg-white border border-cyan-300 rounded-xl pl-12 pr-4 py-2.5 text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-cyan-800 leading-relaxed">
                  Reflects cleared funds available in the commercial bank account as of cycle start. Bank deposits from Roznamcha and online customer receipts increase this cleared total.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Bank Account &amp; Update System</span>
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: Live Preview Card (What Retailers See) (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Real Bank Card Mockup */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 text-white rounded-3xl p-6 shadow-xl border border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between relative z-10 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-xs">
                    <Landmark className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">
                      Commercial Account
                    </span>
                    <span className="font-extrabold text-sm text-white tracking-wide">{bankName || 'Bank Name'}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/30">
                  RAAST ENABLED
                </span>
              </div>

              <div className="space-y-4 relative z-10">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Beneficiary / Account Title</span>
                  <span className="font-black text-lg text-white tracking-tight">{accountTitle || 'Company Name'}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-700/60 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Account #:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tracking-wider">{accountNumber || '—'}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(accountNumber, 'acc')}
                        className="text-slate-400 hover:text-cyan-400 p-0.5 cursor-pointer"
                        title="Copy Account #"
                      >
                        {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400 text-[11px]">IBAN:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-300 tracking-wider text-[11px] break-all">{iban || '—'}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(iban, 'iban')}
                        className="text-slate-400 hover:text-cyan-400 p-0.5 cursor-pointer shrink-0"
                        title="Copy IBAN"
                      >
                        {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400 text-[11px]">Raast ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400 font-mono">{raastId || '—'}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(raastId, 'raast')}
                        className="text-slate-400 hover:text-emerald-400 p-0.5 cursor-pointer"
                        title="Copy Raast ID"
                      >
                        {copiedField === 'raast' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    <span>{branchName || 'Branch'}</span>
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">
                    Balance: {formatPKR(displayCurrentBankBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* How this helps Retailers notice */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-cyan-700" />
                <span>Automated Invoice &amp; Delivery Challan Stamp</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                When salesmen print bills in <strong>Print Studio</strong> or book van sales orders, this official payment footer is automatically attached. Shopkeepers can scan the Raast ID or transfer directly from their mobile banking apps (BAHL Mobile, Meezan, EasyPaisa, HBL Mobile) without needing physical cash collections.
              </p>
              <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[10px] text-cyan-900">
                  Invoice Payment Advice Sample:
                </div>
                <div className="text-[10px] text-slate-600">
                  "Please transfer net invoice dues to: <strong>{bankName}</strong> | IBAN: <strong>{iban}</strong> | Raast: <strong>{raastId}</strong> ({accountTitle})"
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY PROFILE & STATUTORY SETUP */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Company &amp; Distribution Entity Profile</h3>
                <p className="text-xs text-slate-500">Legal entity registration, NTN, STRN, Drug License, and Depot location</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold">
              FBR Validated
            </span>
          </div>

          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Registered Legal Company Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Registered Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. PrimeLink Distribution & Logistics"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Trading / Brand Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Trading / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  placeholder="e.g. PrimeLink Enterprises"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Proprietor / Managing Director */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Proprietor / MD Name *
                </label>
                <input
                  type="text"
                  required
                  value={proprietor}
                  onChange={(e) => setProprietor(e.target.value)}
                  placeholder="e.g. Haji Noor Mohammad"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Official Phone / UAN */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Official Phone / UAN *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0300-9821450"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Official Accounts Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. accounts@primelink.com.pk"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* City & Division */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  City &amp; Region *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mingora, Swat"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Warehouse / Depot Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Central Warehouse &amp; Depot Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Main Bypass & Gate 1 Wholesale Market, Mingora Swat"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            {/* Statutory Tax IDs: NTN, STRN, Drug License */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  National Tax Number (NTN) *
                </label>
                <input
                  type="text"
                  required
                  value={ntn}
                  onChange={(e) => setNtn(e.target.value)}
                  placeholder="e.g. 7291048-2"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Sales Tax Reg No (STRN) *
                </label>
                <input
                  type="text"
                  required
                  value={strn}
                  onChange={(e) => setStrn(e.target.value)}
                  placeholder="e.g. 327787612345"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Pharma Drug License #
                </label>
                <input
                  type="text"
                  value={drugLicenseNo}
                  onChange={(e) => setDrugLicenseNo(e.target.value)}
                  placeholder="e.g. DL-SWAT-2024-9812"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Company Slogan / Category Scope
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Authorized FMCG & Pharma Distributors"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Company Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
