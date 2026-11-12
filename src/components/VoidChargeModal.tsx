import React, { useState } from 'react';
import { ChargeEntry } from '../types.js';
import { AlertOctagon, X } from 'lucide-react';
import { formatCurrency } from '../utils.js';

interface VoidChargeModalProps {
  charge: ChargeEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmVoid: (chargeId: string, reason: string, voidedBy: string) => void;
}

export const VoidChargeModal: React.FC<VoidChargeModalProps> = ({
  charge,
  isOpen,
  onClose,
  onConfirmVoid,
}) => {
  const [reason, setReason] = useState('');
  const [voidedBy, setVoidedBy] = useState('Staff Nurse Priya M.');
  const [error, setError] = useState('');

  if (!isOpen || !charge) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 4) {
      setError('Please provide a specific clinical or clerical reason for voiding this charge.');
      return;
    }
    onConfirmVoid(charge.id, reason.trim(), voidedBy.trim());
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-sm">Void Charge Entry</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Item:</span>
              <span className="font-semibold text-slate-900">{charge.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount:</span>
              <span className="font-semibold text-rose-600">{formatCurrency(charge.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Originally Logged By:</span>
              <span>{charge.loggedBy}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Voiding removes this charge from the bill total. Hospital audit protocol requires an explicit reason.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Void Justification / Clinical Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Duplicate entry by day shift, item cancelled before sterile pack opened, wrong patient bed selected..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
            />
            {error && <p className="text-[11px] text-rose-600 mt-1 font-medium">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Authorizing Staff Member
            </label>
            <input
              type="text"
              value={voidedBy}
              onChange={(e) => setVoidedBy(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs shadow-rose-600/30"
            >
              Confirm Void
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
