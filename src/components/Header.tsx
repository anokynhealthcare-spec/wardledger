import React from 'react';
import { AppRole, Patient } from '../types.js';
import {
  FileText,
  UserCheck,
  HeartHandshake,
  Activity,
  BookOpen,
  Building2,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  currentRole: AppRole;
  onRoleChange: (role: AppRole) => void;
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
  onOpenActivityLog: () => void;
  onOpenPriceList: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  patients,
  selectedPatientId,
  onSelectPatient,
  onOpenActivityLog,
  onOpenPriceList,
}) => {
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0070BA] flex items-center justify-center text-white shadow-sm shadow-[#0070BA]/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  Ward<span className="text-[#0070BA]">Ledger</span>
                </span>
                <span className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full px-2 py-0.5">
                  Demo data only
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Live inpatient billing & discharge clearance
              </p>
            </div>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => onRoleChange('NURSE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'NURSE'
                  ? 'bg-white text-[#0070BA] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Ward Nurse</span>
            </button>

            <button
              onClick={() => onRoleChange('BILLING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'BILLING'
                  ? 'bg-white text-[#0070BA] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Billing Desk</span>
            </button>

            <button
              onClick={() => onRoleChange('FAMILY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'FAMILY'
                  ? 'bg-white text-[#0070BA] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Family View</span>
            </button>
          </div>

          {/* Patient Quick Selector & Tools */}
          <div className="flex items-center gap-2">
            {/* Quick patient switch */}
            <div className="relative hidden md:block">
              <select
                value={selectedPatientId || ''}
                onChange={(e) => onSelectPatient(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 pl-3 pr-8 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20 cursor-pointer"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.bedNumber}: {p.name} ({p.status})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Price list button */}
            <button
              onClick={onOpenPriceList}
              title="Hospital Price Catalogue"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Activity Log button */}
            <button
              onClick={onOpenActivityLog}
              title="Audit Activity Log"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-[#0070BA]" />
              <span className="hidden sm:inline">Audit Log</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
