import React, { useState, useEffect } from 'react';
import { InvoiceRecord, Patient } from '../types.js';
import {
  Send,
  Copy,
  Check,
  Languages,
  ExternalLink,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface ShareInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceRecord | null;
  patient: Patient | null;
  onSimulatePay: () => void;
}

export const ShareInvoiceModal: React.FC<ShareInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  patient,
  onSimulatePay,
}) => {
  const [language, setLanguage] = useState<string>('English');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [shareText, setShareText] = useState<{ subject: string; message: string }>({
    subject: '',
    message: '',
  });
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);

  useEffect(() => {
    if (invoice && isOpen) {
      loadShareMessage(language);
    }
  }, [invoice, isOpen, language]);

  const loadShareMessage = async (lang: string) => {
    if (!invoice || !patient) return;
    setIsLoadingMessage(true);
    try {
      const totalDue = invoice.compiledData.totalDue;
      const invNum = invoice.invoiceNumber;
      const isSudden = patient.dischargeEvent?.type === 'Sudden Exit';
      const fullUrl = `${window.location.origin}${invoice.paymentLink}`;

      let subject = `WardLedger Statement #${invNum} - ${patient.name}`;
      let message = `Dear Family,\n\nInpatient care statement for ${patient.name} (${patient.bedNumber}) under ${patient.consultant} is ready. Total balance due: $${totalDue.toFixed(2)} (after advance deposit credit).\n\nSecure PayPal payment link:\n${fullUrl}\n\nThank you for choosing WardLedger.`;

      if (isSudden) {
        subject = `Inpatient Care Summary - ${patient.name}`;
        message = `Dear Family,\n\nWe extend our deepest condolences on the passing of ${patient.name}. Automated billing reminders are paused. This statement reflects inpatient care under ${patient.consultant}.\n\nFamily Liaison Contact: +1 (800) 555-0199.`;
      } else if (lang === 'Tamil') {
        subject = `மருத்துவமனை கட்டண அறிக்கை - ${patient.name}`;
        message = `அன்புள்ள குடும்பத்தினருக்கு,\n\n${patient.name} (${patient.bedNumber}) அவர்களின் மருத்துவ கட்டண அறிக்கை தயார். செலுத்த வேண்டிய தொகை: $${totalDue.toFixed(2)}.\n\nபாதுகாப்பான PayPal கட்டண இணைப்பு:\n${fullUrl}\n\nநன்றி.`;
      } else if (lang === 'Hindi') {
        subject = `अस्पताल बिल विवरण - ${patient.name}`;
        message = `प्रिय परिवार,\n\n${patient.name} (${patient.bedNumber}) का अस्पताल बिल तैयार है। शेष देय राशि: $${totalDue.toFixed(2)}।\n\nसुरक्षित PayPal भुगतान लिंक:\n${fullUrl}\n\nधन्यवाद।`;
      } else if (lang === 'Telugu') {
        subject = `హాస్పిటల్ బిల్లు వివరాలు - ${patient.name}`;
        message = `प्रिय కుటుంబ సభ్యులకు,\n\n${patient.name} (${patient.bedNumber}) యొక్క హాస్పిటల్ బిల్లు సిద్ధంగా ఉంది. చెల్లించవలసిన మొత్తం: $${totalDue.toFixed(2)}.\n\nసురక్షిత PayPal చెల్లింపు లింక్:\n${fullUrl}\n\nధన్యవాదాలు.`;
      } else if (lang === 'Malayalam') {
        subject = `ആശുപത്രി ബിൽ വിവരങ്ങൾ - ${patient.name}`;
        message = `പ്രിയ കുടുംബാംഗങ്ങൾക്ക്,\n\n${patient.name} (${patient.bedNumber})-ൻ്റെ ആശുപത്രി ബിൽ തയ്യാറാണ്. അടയ്ക്കേണ്ട തുക: $${totalDue.toFixed(2)}.\n\nസുരക്ഷിതമായ PayPal പേയ്മെൻ്റ് ലിങ്ക്:\n${fullUrl}\n\nനന്ദി.`;
      }

      setShareText({ subject, message });
    } catch (err) {
      console.error('Failed to load share message', err);
    } finally {
      setIsLoadingMessage(false);
    }
  };

  if (!isOpen || !invoice || !patient) return null;

  const fullPaymentUrl = `${window.location.origin}${invoice.paymentLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullPaymentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(`${shareText.subject}\n\n${shareText.message}`);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const isSuddenExit = patient.dischargeEvent?.type === 'Sudden Exit';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Invoice Dispatched: {invoice.invoiceNumber}
              </h3>
              <p className="text-[11px] text-slate-500">
                Status: <span className="font-semibold text-sky-700">Awaiting Payment</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Payment Link Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Direct PayPal Payment Link
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullPaymentUrl}
                className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono text-slate-800 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-700'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Multilingual Selector */}
          <div className="flex items-center justify-between bg-sky-50/60 p-3 rounded-xl border border-sky-100">
            <div className="flex items-center gap-2 text-sky-900">
              <Languages className="w-4 h-4 text-[#0070BA]" />
              <span className="font-semibold text-xs">Family Message Language:</span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
              <option value="Malayalam">Malayalam (മലയാളം)</option>
            </select>
          </div>

          {/* AI Generated Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#0070BA]" />
                WhatsApp / Email Dispatched Text ({language})
              </span>
              {isSuddenExit && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                  Sympathy wording
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-semibold text-slate-800 pb-1 border-b border-slate-200">
                {shareText.subject}
              </div>
              <p className="whitespace-pre-line text-slate-600 leading-relaxed font-sans">
                {isLoadingMessage ? 'Translating with Gemini...' : shareText.message}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={handleCopyMessage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 shadow-xs"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? 'Message Copied!' : 'Copy WhatsApp Text'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onSimulatePay}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs shadow-emerald-600/30"
              >
                Simulate Payment Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
