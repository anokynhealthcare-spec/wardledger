import React from 'react';
import { ActivityLogEntry } from '../types.js';
import { formatDateTime } from '../utils.js';
import {
  Activity,
  X,
  CreditCard,
  PlusCircle,
  FileCheck,
  Send,
  Ban,
  BellRing,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLogEntry[];
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  if (!isOpen) return null;

  const getActionIcon = (action: ActivityLogEntry['action']) => {
    switch (action) {
      case 'CHARGE_ADDED':
        return <PlusCircle className="w-4 h-4 text-sky-600" />;
      case 'CHARGE_VOIDED':
        return <Ban className="w-4 h-4 text-rose-600" />;
      case 'INVOICE_COMPILED':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'INVOICE_APPROVED':
      case 'INVOICE_SENT':
        return <Send className="w-4 h-4 text-indigo-600" />;
      case 'PAYMENT_RECEIVED':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'WARD_NOTIFIED':
        return <BellRing className="w-4 h-4 text-amber-600" />;
      case 'FAMILY_INQUIRY':
        return <HelpCircle className="w-4 h-4 text-teal-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-900 text-white">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Hospital Billing Audit Log</h3>
              <p className="text-[11px] text-slate-500">
                Immutable record of clinical charges, AI audits, and payment events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Log Entries List */}
        <div className="p-6 overflow-y-auto space-y-3 divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="pt-3 first:pt-0 flex items-start gap-3 text-xs">
              <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                {getActionIcon(log.action)}
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {log.patientName ? `${log.patientName} • ` : ''}
                    {log.action.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{log.details}</p>
                <div className="text-[10px] text-slate-400">
                  Logged by: <span className="font-medium text-slate-600">{log.actor}</span>
                </div>
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No audit records currently available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
