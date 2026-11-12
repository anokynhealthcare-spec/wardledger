import React, { useState } from 'react';
import { InvoiceRecord, Patient } from '../types.js';
import { formatCurrency } from '../utils.js';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  X,
  CheckCircle2,
  Globe2,
} from 'lucide-react';

interface PayModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  invoice: InvoiceRecord | null;
  onPaymentSuccess: (invoiceNumber: string, payerName: string) => Promise<void>;
}

export const PayModal: React.FC<PayModalProps> = ({
  isOpen,
  onClose,
  patient,
  invoice,
  onPaymentSuccess,
}) => {
  const [payerName, setPayerName] = useState('Anand Kumar (Family Liaison)');
  const [payMethod, setPayMethod] = useState<'PAYPAL' | 'CARD'>('PAYPAL');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const totalDue = invoice?.compiledData.totalDue ?? patient.balanceDue ?? 0;
  const invoiceNum = invoice?.invoiceNumber ?? patient.currentInvoiceId ?? 'WL-INV-DRAFT';

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      // 1. Create PayPal Sandbox Order
      const createRes = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNumber: invoiceNum }),
      });
      if (!createRes.ok) {
        throw new Error('Failed to create PayPal sandbox order');
      }
      const orderData = await createRes.json();
      const orderId = orderData.orderId;

      // 2. Capture PayPal Sandbox Order
      const captureRes = await fetch('/api/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          invoiceNumber: invoiceNum,
          payerName,
        }),
      });
      if (!captureRes.ok) {
        throw new Error('PayPal payment capture failed');
      }
      const captureData = await captureRes.json();

      if (captureData.success) {
        await onPaymentSuccess(invoiceNum, payerName);
        onClose();
      } else {
        throw new Error('Payment was not completed');
      }
    } catch (err) {
      console.error('PayPal Sandbox payment error', err);
      alert('Payment processing failed. Please check server logs or PayPal sandbox credentials.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* PayPal Header */}
        <div className="bg-[#003087] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tighter italic">
              PayPal <span className="font-normal text-xs text-sky-200">Checkout</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount to pay */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">
              Inpatient Settlement Total
            </span>
            <div className="text-3xl font-black text-slate-900 font-mono mt-1">
              {formatCurrency(totalDue)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Patient: <span className="font-semibold text-slate-800">{patient.name}</span> (
              {patient.bedNumber})
            </div>
          </div>

          <form onSubmit={handlePay} className="space-y-4">
            {/* Payment Method Switcher */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPayMethod('PAYPAL')}
                className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1 transition-all ${
                  payMethod === 'PAYPAL'
                    ? 'border-[#0070BA] bg-sky-50/50 text-[#0070BA] ring-2 ring-[#0070BA]/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>PayPal USD</span>
                <span className="text-[10px] font-normal text-slate-400">Direct wallet / bank</span>
              </button>

              <button
                type="button"
                onClick={() => setPayMethod('CARD')}
                className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1 transition-all ${
                  payMethod === 'CARD'
                    ? 'border-[#0070BA] bg-sky-50/50 text-[#0070BA] ring-2 ring-[#0070BA]/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Debit / Card</span>
                </div>
                <span className="text-[10px] font-normal text-slate-400">Visa / Mastercard / Amex</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payer Full Name / Relative Contact
              </label>
              <input
                type="text"
                required
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <Globe2 className="w-4 h-4 text-[#0070BA] shrink-0 mt-0.5" />
              <span>
                Overseas relatives can settle in USD from any country. Instant confirmation triggers
                automatic discharge clearance.
              </span>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#0070BA]/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {isProcessing
                  ? 'Authorizing PayPal Settlement...'
                  : `Complete Payment of ${formatCurrency(totalDue)}`}
              </span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>PayPal Sandbox REST API • 256-bit encryption</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
