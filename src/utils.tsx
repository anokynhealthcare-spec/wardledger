import React from 'react';
import {
  Bed,
  Stethoscope,
  Scissors,
  Pill,
  Syringe,
  Microscope,
  HelpCircle,
} from 'lucide-react';
import { ChargeCategory, PatientStatus } from './types.js';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getCategoryIcon(category: ChargeCategory): React.ReactElement {
  switch (category) {
    case 'Room':
      return <Bed className="w-4 h-4 text-indigo-600" />;
    case 'Consultation':
      return <Stethoscope className="w-4 h-4 text-teal-600" />;
    case 'Procedure':
      return <Scissors className="w-4 h-4 text-rose-600" />;
    case 'Medication':
      return <Pill className="w-4 h-4 text-blue-600" />;
    case 'Disposable/Consumable':
      return <Syringe className="w-4 h-4 text-amber-600" />;
    case 'Investigation':
      return <Microscope className="w-4 h-4 text-purple-600" />;
    default:
      return <HelpCircle className="w-4 h-4 text-slate-600" />;
  }
}

export function getCategoryBadgeClass(category: ChargeCategory): string {
  switch (category) {
    case 'Room':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Consultation':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Procedure':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Medication':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Disposable/Consumable':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Investigation':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function getStatusBadge(status: PatientStatus): {
  label: string;
  className: string;
  dotColor: string;
} {
  switch (status) {
    case 'Admitted':
      return {
        label: 'Admitted',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500',
      };
    case 'Discharge Initiated':
      return {
        label: 'Discharge Initiated',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
      };
    case 'Invoice Ready':
      return {
        label: 'Invoice Ready',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
        dotColor: 'bg-purple-500',
      };
    case 'Awaiting Payment':
      return {
        label: 'Awaiting Payment',
        className: 'bg-sky-50 text-sky-700 border-sky-200',
        dotColor: 'bg-sky-500',
      };
    case 'Financially Cleared':
      return {
        label: 'Financially Cleared',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
      };
    default:
      return {
        label: status,
        className: 'bg-slate-50 text-slate-700 border-slate-200',
        dotColor: 'bg-slate-400',
      };
  }
}
