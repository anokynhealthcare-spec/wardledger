import React, { useState } from 'react';
import { Patient, InvoiceRecord } from '../types.js';
import { formatDateTime } from '../utils.js';
import {
  ShieldCheck,
  BellRing,
  CheckCircle2,
  Printer,
  Download,
  Building,
} from 'lucide-react';

interface ClearanceCardProps {
  patient: Patient;
  invoice: InvoiceRecord | null;
  onNotifyWard: () => Promise<void>;
}

export const ClearanceCard: React.FC<ClearanceCardProps> = ({
  patient,
  invoice,
  onNotifyWard,
}) => {
  const [notified, setNotified] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const handleNotify = async () => {
    setIsNotifying(true);
    await onNotifyWard();
    setIsNotifying(false);
    setNotified(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-200 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded-full">
                GATE PASS AUTHORIZED
              </span>
              <span className="text-xs text-emerald-700 font-mono font-medium">
                Ref: {invoice?.paymentReference || 'PAYPAL-REF-849201'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-emerald-950">
              Cleared for Discharge — {patient.name}
            </h2>
            <p className="text-xs text-emerald-800">
              Payment confirmed via PayPal. Account balance settled in full at{' '}
              {formatDateTime(invoice?.paidAt || new Date().toISOString())}.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleNotify}
            disabled={notified || isNotifying}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              notified
                ? 'bg-emerald-200 text-emerald-900 cursor-default'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            {notified ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-900" />
                <span>Ward Notified (Pass Ready)</span>
              </>
            ) : (
              <>
                <BellRing className="w-4 h-4" />
                <span>{isNotifying ? 'Notifying...' : 'Notify Ward Nurse Station'}</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100/50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
