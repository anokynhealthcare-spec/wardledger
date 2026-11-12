import React, { useState } from 'react';
import { CompiledInvoiceData, InvoiceFlag } from '../types.js';
import { formatCurrency, formatDate, getCategoryIcon } from '../utils.js';
import {
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  FileCheck,
  Send,
  X,
  Edit3,
  RotateCcw,
  ShieldCheck,
  Languages,
} from 'lucide-react';

interface InvoiceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  compiledData: CompiledInvoiceData | null;
  onApproveAndSend: (
    updatedData: CompiledInvoiceData,
    familyLanguage: string
  ) => Promise<void>;
  isApproving?: boolean;
}

export const InvoiceReviewModal: React.FC<InvoiceReviewModalProps> = ({
  isOpen,
  onClose,
  compiledData,
  onApproveAndSend,
  isApproving = false,
}) => {
  if (!isOpen || !compiledData) return null;

  // Local state for editable summary and interactive flags
  const [flags, setFlags] = useState<InvoiceFlag[]>(compiledData.flags || []);
  const [familySummary, setFamilySummary] = useState(compiledData.familySummary);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [familyLanguage, setFamilyLanguage] = useState<string>('English');

  // Check if any warnings are still active (not resolved or dismissed)
  const activeWarningCount = flags.filter(
    (f) => f.severity === 'warning' && (!f.status || f.status === 'active')
  ).length;

  const canApprove = activeWarningCount === 0;

  const handleFlagAction = (flagId: string, action: 'resolved' | 'dismissed') => {
    setFlags((prev) =>
      prev.map((f) => (f.id === flagId ? { ...f, status: action } : f))
    );
  };

  const handleApprove = async () => {
    const updated: CompiledInvoiceData = {
      ...compiledData,
      flags,
      familySummary,
    };
    await onApproveAndSend(updated, familyLanguage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#0070BA] text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  AI Final Invoice Compiler & Billing Audit
                </h2>
                <span className="text-[11px] font-semibold bg-sky-100 text-[#0070BA] border border-sky-200 px-2 py-0.5 rounded-full">
                  Billing Desk Review
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {compiledData.patientName} • {compiledData.bedNumber} • Discharge Event:{' '}
                <span className="font-semibold text-slate-700">{compiledData.eventType}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Propose vs Approve Banner */}
        <div className="bg-sky-50/80 border-b border-sky-100 px-6 py-2.5 flex items-center justify-between text-xs text-sky-900 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0070BA]" />
            <span className="font-semibold">Clinical Billing Governance:</span>
            <span>The AI compiles and flags anomalies; clinical & billing staff verify and approve.</span>
          </div>
          {activeWarningCount > 0 ? (
            <span className="font-bold text-amber-700 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md">
              {activeWarningCount} warning flag{activeWarningCount > 1 ? 's' : ''} require action
            </span>
          ) : (
            <span className="font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All audit warnings cleared
            </span>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Flags & Anomaly Panel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>AI Automated Anomaly & Compliance Flags ({flags.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Checks for duplicates, procedure consumables, room days, and void reasons
              </span>
            </div>

            {flags.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Clean ledger audit! No duplicate charges or clinical discrepancies detected.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {flags.map((flag) => {
                  const isWarning = flag.severity === 'warning';
                  const isResolved = flag.status === 'resolved';
                  const isDismissed = flag.status === 'dismissed';
                  const isCleared = isResolved || isDismissed;

                  return (
                    <div
                      key={flag.id}
                      className={`p-3.5 rounded-xl border text-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCleared
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : isWarning
                          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                          : 'bg-sky-50/70 border-sky-200 text-sky-950'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {isCleared ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-[#0070BA] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                isWarning
                                  ? 'bg-amber-200/80 text-amber-900'
                                  : 'bg-sky-200/80 text-sky-900'
                              }`}
                            >
                              {flag.severity}
                            </span>
                            {flag.status && (
                              <span className="text-[10px] font-semibold text-slate-500">
                                ({flag.status})
                              </span>
                            )}
                          </div>
                          <p className="mt-1 font-medium leading-relaxed">{flag.message}</p>
                        </div>
                      </div>

                      {/* Interactive Actions for Billing Desk */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {!isCleared ? (
                          <>
                            <button
                              onClick={() => handleFlagAction(flag.id, 'resolved')}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            >
                              Accept / Fixed
                            </button>
                            <button
                              onClick={() => handleFlagAction(flag.id, 'dismissed')}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-colors"
                            >
                              Dismiss
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              setFlags((prev) =>
                                prev.map((f) =>
                                  f.id === flag.id ? { ...f, status: 'active' } : f
                                )
                              )
                            }
                            className="text-[11px] text-slate-400 hover:text-slate-700 underline"
                          >
                            Re-open flag
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grouped Line Items by Category */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Grouped Itemized Charges
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 text-xs">
              {compiledData.groupedCharges.map((group) => (
                <div key={group.category} className="p-4 bg-white">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(group.category)}
                      <span className="font-bold text-slate-900">{group.category}</span>
                      <span className="text-[11px] text-slate-400">
                        ({group.items.length} item{group.items.length > 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(group.subtotal)}
                    </span>
                  </div>

                  <div className="space-y-1.5 pl-6">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-slate-600"
                      >
                        <div>
                          <span>{item.description}</span>
                          <span className="text-slate-400 ml-2 text-[11px]">
                            ({item.quantity} × {formatCurrency(item.unitPrice)})
                          </span>
                        </div>
                        <span className="font-mono text-slate-800">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deposit and Total Settlement Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Patient Stay:</span> {formatDate(compiledData.admitDate)} to Present
              </div>
              <div>
                <span className="text-slate-400">Suggested Cover:</span>{' '}
                <span className="italic">{compiledData.suggestedCoverNote}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                  Gross Charges
                </span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {formatCurrency(compiledData.grossTotal)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                  Advance Deposit
                </span>
                <span className="text-sm font-semibold text-emerald-600 font-mono">
                  -{formatCurrency(compiledData.advanceDeposit)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                  Total Due
                </span>
                <span className="text-base font-extrabold text-[#0070BA] font-mono">
                  {formatCurrency(compiledData.totalDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Editable Family Summary Paragraph */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#0070BA]" />
                <span>Plain-Language Family Bill Summary</span>
              </label>
              <button
                onClick={() => setFamilySummary(compiledData.familySummary)}
                className="text-[11px] text-[#0070BA] hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to AI Draft</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={familySummary}
              onChange={(e) => setFamilySummary(e.target.value)}
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20 leading-relaxed text-slate-800 bg-slate-50/50"
            />
            <p className="text-[11px] text-slate-400">
              This explanation is included in the family share link and WhatsApp dispatch message.
            </p>
          </div>

          {/* Preferred Language for Family Dispatch */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <Languages className="w-4 h-4 text-[#0070BA]" />
            <span className="text-xs font-semibold text-slate-700">Dispatch message language:</span>
            <select
              value={familyLanguage}
              onChange={(e) => setFamilyLanguage(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20 cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
              <option value="Malayalam">Malayalam (മലയാളം)</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            {!canApprove ? (
              <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please Accept or Dismiss remaining warnings to enable final approval.
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Audit requirements verified. Ready to dispatch invoice & PayPal checkout link.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleApprove}
              disabled={!canApprove || isApproving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white transition-all shadow-md shadow-[#0070BA]/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isApproving ? 'Generating Invoice...' : 'Approve & Send to Family'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
