import React, { useState } from 'react';
import { Patient, ChargeEntry, InvoiceRecord } from '../types.js';
import { formatCurrency, formatDate, getCategoryIcon } from '../utils.js';
import { familyChatLocally } from '../lib/firebaseStore.js';
import {
  HeartHandshake,
  MessageSquare,
  Sparkles,
  CreditCard,
  Send,
  Globe2,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  Building2,
} from 'lucide-react';

interface FamilyViewProps {
  patient: Patient;
  charges: ChargeEntry[];
  invoice: InvoiceRecord | null;
  onOpenPayModal: () => void;
  onNotifyWard: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  groundedInCharges?: string[];
  timestamp: string;
}

export const FamilyView: React.FC<FamilyViewProps> = ({
  patient,
  charges,
  invoice,
  onOpenPayModal,
  onNotifyWard,
}) => {
  const [chatLanguage, setChatLanguage] = useState<string>('English');
  const [chatInput, setChatInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am WardLedger's Patient & Family Billing Assistant. I can help explain any item on ${patient.name}'s inpatient statement in clear, simple terms. You can also ask me questions in Tamil, Hindi, Telugu, or Malayalam.`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const activeCharges = charges.filter((c) => !c.isVoided);
  const grossTotal = activeCharges.reduce((acc, c) => acc + c.total, 0);
  const totalDue = Math.max(0, grossTotal - patient.advanceDeposit);
  const isCleared = patient.status === 'Financially Cleared';

  // Group by category for clear family readability
  const categoryMap = new Map<string, { total: number; count: number }>();
  activeCharges.forEach((c) => {
    const existing = categoryMap.get(c.category) || { total: 0, count: 0 };
    existing.total += c.total;
    existing.count += c.quantity;
    categoryMap.set(c.category, existing);
  });

  const handleSendMessage = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const q = customQuestion || chatInput.trim();
    if (!q || isAsking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toISOString(),
    };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAsking(true);

    try {
      let data: { answer: string; groundedInCharges?: string[] } = { answer: '' };
      try {
        const res = await fetch('/api/family-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: patient.id,
            question: q,
            language: chatLanguage,
          }),
        });
        if (res.ok) {
          data = await res.json();
        } else {
          throw new Error('API route unavailable');
        }
      } catch {
        // Fallback to local grounded chat
        data = familyChatLocally(patient, charges, q, chatLanguage);
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.answer || 'Thank you for your question. Please consult the ward desk.',
        groundedInCharges: data.groundedInCharges,
        timestamp: new Date().toISOString(),
      };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'We could not reach the billing assistant right now. Please check with the ward desk.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const sampleQuestions = [
    'Why is there a charge for a catheter?',
    'What is included in the room charge?',
    'How is my $500 advance deposit deducted?',
  ];

  return (
    <div className="space-y-6">
      {/* Patient Care Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#003087] text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-mono px-2 py-0.5 rounded-md">
                {patient.bedNumber}
              </span>
              <span className="text-xs text-sky-200">MRN: {patient.mrn}</span>
              {isCleared ? (
                <span className="bg-emerald-500/90 text-white text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Financially Cleared
                </span>
              ) : (
                <span className="bg-sky-400/20 text-sky-200 border border-sky-300/30 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Running Care Statement
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">{patient.name}</h1>
            <p className="text-xs text-slate-300">
              {patient.ward} • Attending: {patient.consultant} • Admitted {formatDate(patient.admitDate)}
            </p>
          </div>

          {/* Amount Due Card & Pay Action */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
            <div>
              <span className="text-xs text-sky-200 block uppercase font-medium">
                {isCleared ? 'Amount Settled' : 'Net Balance Due'}
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {formatCurrency(totalDue)}
              </span>
              <span className="text-[11px] text-emerald-300 block">
                (${patient.advanceDeposit} deposit deducted)
              </span>
            </div>

            {!isCleared ? (
              <button
                onClick={onOpenPayModal}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-black/20 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Now with PayPal</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-2 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span className="font-semibold">Cleared for Discharge</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pay From Abroad Note */}
      <div className="bg-sky-50 border border-sky-200/80 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-sky-900">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0070BA] text-white">
            <Globe2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold">Pay from abroad:</p>
            <p className="text-slate-600">
              Family overseas can pay in USD via PayPal using any international credit card or PayPal account.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-block font-mono text-[11px] bg-white border border-sky-200 px-2.5 py-1 rounded-md text-[#0070BA] font-semibold">
          USD • Secure PayPal Checkout
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Running Bill Breakdown (Left 6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Itemized Care Breakdown ({activeCharges.length} items)
              </h2>
              <span className="text-[11px] text-slate-400">USD Standard Hospital Rates</span>
            </div>

            {/* Category summary bars */}
            <div className="mt-4 space-y-3">
              {Array.from(categoryMap.entries()).map(([cat, data]) => (
                <div key={cat} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(cat as any)}
                      <span>{cat}</span>
                      <span className="text-slate-400 font-normal text-[11px]">
                        ({data.count} unit{data.count > 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className="font-mono">{formatCurrency(data.total)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Item List */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                All Logged Ward Charges
              </h3>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                {activeCharges.map((c) => (
                  <div key={c.id} className="py-2 flex items-center justify-between text-slate-600">
                    <div>
                      <span className="font-medium text-slate-800">{c.description}</span>
                      <span className="text-slate-400 ml-2 text-[11px]">
                        Qty: {c.quantity} • {formatDate(c.timestamp)}
                      </span>
                    </div>
                    <span className="font-mono text-slate-900 font-semibold">
                      {formatCurrency(c.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Balance Card */}
            <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Hospital Charges:</span>
                <span className="font-mono">{formatCurrency(grossTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Advance Deposit Credit:</span>
                <span className="font-mono">-{formatCurrency(patient.advanceDeposit)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-white">
                <span>Remaining Balance Due:</span>
                <span className="font-mono text-sky-400">{formatCurrency(totalDue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* "Ask about my bill" Chat Box (Right 6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[520px] overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#0070BA] text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Ask about my bill</h3>
                  <p className="text-[11px] text-slate-500">
                    Grounded strictly in {patient.name}&apos;s verified ledger
                  </p>
                </div>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                <Globe2 className="w-3.5 h-3.5 text-[#0070BA]" />
                <select
                  value={chatLanguage}
                  onChange={(e) => setChatLanguage(e.target.value)}
                  className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Malayalam">Malayalam (മലയാളം)</option>
                </select>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-4 py-2 bg-sky-50/40 border-b border-sky-100/60 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
              <span className="text-slate-400 font-medium shrink-0">Try asking:</span>
              {sampleQuestions.map((sq, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(undefined, sq)}
                  className="bg-white border border-sky-200/80 hover:border-[#0070BA] text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
                >
                  {sq}
                </button>
              ))}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#0070BA] text-white rounded-br-xs'
                        : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.sender === 'user' ? 'You' : `Billing Assistant (${chatLanguage})`}
                  </span>
                </div>
              ))}

              {isAsking && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic p-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-[#0070BA]" />
                  <span>Checking ledger records in {chatLanguage}...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => handleSendMessage(e)}
              className="p-3 border-t border-slate-200 bg-white shrink-0 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask in ${chatLanguage} (e.g. "Why is there a charge for a catheter?")...`}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isAsking}
                className="p-2.5 bg-[#0070BA] hover:bg-[#005ea6] text-white rounded-xl transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
