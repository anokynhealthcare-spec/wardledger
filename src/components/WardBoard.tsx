import React, { useState } from 'react';
import { Patient } from '../types.js';
import { formatCurrency, formatDate, getStatusBadge } from '../utils.js';
import {
  Users,
  Search,
  ArrowRight,
  Clock,
  Sparkles,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';

interface WardBoardProps {
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
  onOpenLedger: (patientId: string) => void;
  onCompileInvoice: (patientId: string) => void;
}

export const WardBoard: React.FC<WardBoardProps> = ({
  patients,
  onOpenLedger,
  onCompileInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.consultant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return p.status === 'Admitted' || p.status === 'Discharge Initiated';
    if (statusFilter === 'INVOICING') return p.status === 'Invoice Ready' || p.status === 'Awaiting Payment';
    if (statusFilter === 'CLEARED') return p.status === 'Financially Cleared';
    return true;
  });

  const totalAdmitted = patients.length;
  const inDischarge = patients.filter((p) => p.status === 'Discharge Initiated').length;
  const inInvoice = patients.filter((p) => p.status === 'Invoice Ready' || p.status === 'Awaiting Payment').length;
  const cleared = patients.filter((p) => p.status === 'Financially Cleared').length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Scenario Highlights */}
      <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-white border border-sky-100 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0070BA] text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                Inpatient Ward Activity & Live Billing
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Log live ward charges, run AI anomaly audits, and settle invoices with instant discharge clearance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs bg-white/80 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Real-time deposit reconciliation & PayPal checkout</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Inpatients
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalAdmitted}</span>
            <span className="text-xs text-slate-500">beds monitored</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
              Discharge Initiated
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{inDischarge}</span>
            <span className="text-xs text-amber-600">awaiting bill compile</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-600 uppercase tracking-wider">
              Invoice In Review / Sent
            </span>
            <CreditCard className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700">{inInvoice}</span>
            <span className="text-xs text-purple-600">settlement pipeline</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
              Financially Cleared
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{cleared}</span>
            <span className="text-xs text-emerald-600">discharge approved</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, bed (e.g. Bed 12), consultant, or diagnosis..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20 focus:bg-white text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Beds' },
            { id: 'ACTIVE', label: 'Admitted' },
            { id: 'INVOICING', label: 'Invoicing' },
            { id: 'CLEARED', label: 'Cleared' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-[#0070BA] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => {
          const statusInfo = getStatusBadge(patient.status);
          const isRamesh = patient.id === 'pat-1';

          return (
            <div
              key={patient.id}
              className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                isRamesh
                  ? 'border-sky-300 ring-2 ring-sky-100 shadow-xs'
                  : 'border-slate-200 shadow-xs'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {patient.bedNumber}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {patient.mrn}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                      {patient.name}
                      <span className="text-xs font-normal text-slate-500">
                        ({patient.gender}, {patient.age}y)
                      </span>
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.className}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                    {statusInfo.label}
                  </span>
                </div>

                {/* Clinical Context */}
                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div className="truncate">
                    <span className="font-medium text-slate-700">Ward:</span> {patient.ward}
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-slate-700">Consultant:</span> {patient.consultant}
                  </div>
                  <div className="text-slate-500 line-clamp-1 italic">
                    "{patient.diagnosis}"
                  </div>
                </div>

                {/* Admission & Stay Metrics */}
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Admitted On</span>
                    <span className="font-medium text-slate-700">{formatDate(patient.admitDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Length of Stay</span>
                    <span className="font-semibold text-slate-900">
                      {patient.daysAdmitted || 1} day{(patient.daysAdmitted || 1) > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Discharge Event Tag if any */}
                {patient.dischargeEvent && (
                  <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                    <span className="font-medium">Event: {patient.dischargeEvent.type}</span>
                    {patient.dischargeEvent.remindersPaused && (
                      <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded font-semibold text-amber-900">
                        Reminders Paused
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Financial Summary & Actions Footer */}
              <div className="p-5 pt-3 bg-slate-50/70 rounded-b-2xl border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-3">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Running Total</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatCurrency(patient.runningTotal || 0)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Deposit Credit</span>
                    <span className="font-medium text-emerald-600">
                      -{formatCurrency(patient.advanceDeposit)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Balance Due</span>
                    <span className="font-bold text-[#0070BA] text-sm">
                      {formatCurrency(patient.balanceDue || 0)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenLedger(patient.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors shadow-xs"
                  >
                    <span>Open Ledger</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {patient.status === 'Discharge Initiated' || patient.status === 'Admitted' ? (
                    <button
                      onClick={() => onCompileInvoice(patient.id)}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white transition-colors shadow-xs shadow-[#0070BA]/20"
                      title="Run AI Invoice Compiler"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Compile</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPatients.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No patients matched your filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing the search box or selecting "All Beds".</p>
        </div>
      )}
    </div>
  );
};
