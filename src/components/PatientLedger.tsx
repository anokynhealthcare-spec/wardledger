import React, { useState } from 'react';
import {
  Patient,
  ChargeEntry,
  ChargeCategory,
  PriceListItem,
  DischargeEventType,
} from '../types.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getCategoryIcon,
  getCategoryBadgeClass,
  getStatusBadge,
} from '../utils.js';
import {
  PlusCircle,
  Sparkles,
  CalendarCheck,
  Ban,
  Clock,
  ChevronLeft,
  Search,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { VoidChargeModal } from './VoidChargeModal.js';
import { EventModal } from './EventModal.js';

interface PatientLedgerProps {
  patient: Patient;
  charges: ChargeEntry[];
  priceList: PriceListItem[];
  onBackToBoard: () => void;
  onAddCharge: (charge: {
    category: ChargeCategory;
    description: string;
    quantity: number;
    unitPrice: number;
    loggedBy: string;
  }) => Promise<void>;
  onVoidCharge: (chargeId: string, reason: string, voidedBy: string) => Promise<void>;
  onMarkEvent: (type: DischargeEventType, notes?: string) => Promise<void>;
  onCompileInvoice: () => void;
  isCompiling?: boolean;
}

export const PatientLedger: React.FC<PatientLedgerProps> = ({
  patient,
  charges,
  priceList,
  onBackToBoard,
  onAddCharge,
  onVoidCharge,
  onMarkEvent,
  onCompileInvoice,
  isCompiling = false,
}) => {
  // Quick-Add Form State
  const [category, setCategory] = useState<ChargeCategory>('Disposable/Consumable');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(14);
  const [loggedBy, setLoggedBy] = useState('Nurse Priya M.');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [formFeedback, setFormFeedback] = useState<string>('');

  // Modals state
  const [voidModalCharge, setVoidModalCharge] = useState<ChargeEntry | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Active charges vs voided
  const activeCharges = charges.filter((c) => !c.isVoided);
  const voidedCharges = charges.filter((c) => c.isVoided);
  const grossTotal = activeCharges.reduce((acc, c) => acc + c.total, 0);
  const totalDue = Math.max(0, grossTotal - patient.advanceDeposit);
  const statusInfo = getStatusBadge(patient.status);

  // Handle Catalog Selection
  const handleCatalogSelect = (itemId: string) => {
    setSelectedCatalogItem(itemId);
    const item = priceList.find((p) => p.id === itemId);
    if (item) {
      setDescription(item.name);
      setUnitPrice(item.unitPrice);
      setCategory(item.category);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || quantity <= 0 || unitPrice < 0) return;

    await onAddCharge({
      category,
      description: description.trim(),
      quantity,
      unitPrice,
      loggedBy: loggedBy.trim() || 'Staff Nurse',
    });

    setFormFeedback(`Added "${description}" ($${(quantity * unitPrice).toFixed(2)})`);
    setTimeout(() => setFormFeedback(''), 3000);

    // Reset some form items
    setDescription('');
    setSelectedCatalogItem('');
    setQuantity(1);
  };

  // Filtered timeline charges
  const displayCharges = charges.filter((c) => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'VOIDED') return c.isVoided;
    return c.category === filterCategory;
  });

  return (
    <div className="space-y-6">
      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={onBackToBoard}
                className="p-1 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Ward Board</span>
              </button>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#0070BA]/10 text-[#0070BA] border border-[#0070BA]/20">
                {patient.bedNumber}
              </span>
              <span className="text-xs text-slate-400 font-mono">{patient.mrn}</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.className}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                {statusInfo.label}
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {patient.name}
              <span className="text-sm font-normal text-slate-500">
                ({patient.gender}, {patient.age}y)
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Ward:</span> {patient.ward}
              </div>
              <div>
                <span className="text-slate-400">Consultant:</span> {patient.consultant}
              </div>
              <div>
                <span className="text-slate-400">Admit Date:</span> {formatDate(patient.admitDate)} (
                {patient.daysAdmitted || 1} day{(patient.daysAdmitted || 1) > 1 ? 's' : ''})
              </div>
            </div>

            {patient.dischargeEvent && (
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-lg">
                <span className="font-semibold">Event Marked:</span>
                <span>{patient.dischargeEvent.type}</span>
                {patient.dischargeEvent.remindersPaused && (
                  <span className="text-[10px] font-bold bg-amber-200 px-1.5 py-0.5 rounded text-amber-900">
                    Reminders Paused
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Running Balance Overview & Direct Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <div className="grid grid-cols-3 gap-3 text-center sm:text-left pr-0 sm:pr-4 sm:border-r border-slate-200">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                  Gross Charges
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(grossTotal)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                  Deposit Paid
                </span>
                <span className="text-sm font-semibold text-emerald-600">
                  -{formatCurrency(patient.advanceDeposit)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                  Total Due
                </span>
                <span className="text-sm font-extrabold text-[#0070BA]">
                  {formatCurrency(totalDue)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 transition-colors shadow-xs"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>Mark Event</span>
              </button>

              <button
                onClick={onCompileInvoice}
                disabled={isCompiling}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white transition-all shadow-xs shadow-[#0070BA]/30 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isCompiling ? 'Compiling...' : 'Compile Final Bill'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Add Charge Form (Left 5 Cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#0070BA]" />
                <h2 className="font-bold text-sm text-slate-900">Log Live Charge Entry</h2>
              </div>
              <span className="text-[11px] text-slate-400">Mobile-friendly</span>
            </div>

            {formFeedback && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{formFeedback}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5">
              {/* Searchable Hospital Price Catalogue Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select from Hospital Price List (25 Standard Items)
                </label>
                <div className="relative">
                  <select
                    value={selectedCatalogItem}
                    onChange={(e) => handleCatalogSelect(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20 cursor-pointer"
                  >
                    <option value="">-- Choose item to autofill price & category --</option>
                    {priceList.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.category}] {item.name} (${item.unitPrice})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Charge Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ChargeCategory)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20"
                >
                  <option value="Room">Room & Bed Care</option>
                  <option value="Consultation">Consultation & Rounds</option>
                  <option value="Procedure">Procedure & Surgery</option>
                  <option value="Medication">Medication & Pharmacy</option>
                  <option value="Disposable/Consumable">Disposable & Consumables</option>
                  <option value="Investigation">Investigation & Labs</option>
                  <option value="Other">Other Hospital Services</option>
                </select>
              </div>

              {/* Item Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. IV Cannula (18G / 20G)"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20"
                />
              </div>

              {/* Quantity and Unit Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Price ($) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20 font-mono"
                  />
                </div>
              </div>

              {/* Logged by staff name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logged By (Staff Name / Role)
                </label>
                <input
                  type="text"
                  value={loggedBy}
                  onChange={(e) => setLoggedBy(e.target.value)}
                  placeholder="e.g. Nurse Priya M."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20"
                />
              </div>

              {/* Total preview & Submit */}
              <div className="pt-2 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Subtotal</span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {formatCurrency(quantity * unitPrice)}
                  </span>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold rounded-xl transition-colors shadow-xs shadow-[#0070BA]/20"
                >
                  Post to Ledger
                </button>
              </div>

              {/* Quick Anomaly Testing Helper note */}
              <div className="bg-sky-50/70 p-2.5 rounded-xl border border-sky-100 text-[11px] text-sky-800">
                <span className="font-semibold">💡 Seed scenario tip:</span> Log &quot;IV Cannula&quot; twice within a few minutes to trigger the AI duplicate charge warning flag!
              </div>
            </form>
          </div>
        </div>

        {/* Live Charge Timeline (Right 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            {/* Timeline Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h2 className="font-bold text-sm text-slate-900">
                  Live Charge Timeline ({charges.length} items logged)
                </h2>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'Room', label: 'Room' },
                  { id: 'Medication', label: 'Meds' },
                  { id: 'Disposable/Consumable', label: 'Consumables' },
                  { id: 'Investigation', label: 'Labs' },
                  { id: 'VOIDED', label: `Voided (${voidedCharges.length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterCategory(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      filterCategory === f.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chronological List of Entries */}
            <div className="mt-4 divide-y divide-slate-100">
              {displayCharges.map((charge) => {
                const isVoided = charge.isVoided;
                const badgeClass = getCategoryBadgeClass(charge.category);

                return (
                  <div
                    key={charge.id}
                    className={`py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 transition-colors ${
                      isVoided ? 'opacity-60 bg-rose-50/20 px-2 rounded-xl' : 'hover:bg-slate-50/50 px-2 rounded-xl'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                        {getCategoryIcon(charge.category)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badgeClass}`}
                          >
                            {charge.category}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatDateTime(charge.timestamp)}
                          </span>
                        </div>

                        <h4
                          className={`text-xs font-bold ${
                            isVoided ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {charge.description}
                        </h4>

                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span>
                            {charge.quantity} × {formatCurrency(charge.unitPrice)}
                          </span>
                          <span>•</span>
                          <span>Logged by: {charge.loggedBy}</span>
                        </div>

                        {/* Voided Details Banner */}
                        {isVoided && (
                          <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800">
                            <span className="font-bold">VOIDED:</span> {charge.voidReason}
                            <span className="block text-[10px] text-rose-600 mt-0.5">
                              Voided by {charge.voidedBy || 'Staff'} at{' '}
                              {formatDateTime(charge.voidedAt || '')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side: Amount and Void Action */}
                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-bold font-mono ${
                          isVoided ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {formatCurrency(charge.total)}
                      </div>

                      {!isVoided && (
                        <button
                          onClick={() => setVoidModalCharge(charge)}
                          title="Void charge entry with mandatory reason"
                          className="mt-2 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-md border border-rose-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Void</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {displayCharges.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  No charge records match the selected filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <VoidChargeModal
        charge={voidModalCharge}
        isOpen={!!voidModalCharge}
        onClose={() => setVoidModalCharge(null)}
        onConfirmVoid={onVoidCharge}
      />

      <EventModal
        patient={patient}
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onConfirmEvent={onMarkEvent}
      />
    </div>
  );
};
