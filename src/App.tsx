import React, { useState, useEffect } from 'react';
import {
  Patient,
  ChargeEntry,
  PriceListItem,
  ActivityLogEntry,
  AppRole,
  CompiledInvoiceData,
  InvoiceRecord,
  ChargeCategory,
  DischargeEventType,
} from './types.js';
import { Header } from './components/Header.js';
import { WardBoard } from './components/WardBoard.js';
import { PatientLedger } from './components/PatientLedger.js';
import { FamilyView } from './components/FamilyView.js';
import { InvoiceReviewModal } from './components/InvoiceReviewModal.js';
import { ShareInvoiceModal } from './components/ShareInvoiceModal.js';
import { PayModal } from './components/PayModal.js';
import { ActivityLogModal } from './components/ActivityLogModal.js';
import { PriceListModal } from './components/PriceListModal.js';
import { ClearanceCard } from './components/ClearanceCard.js';
import { Shield, Sparkles, Building2 } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<AppRole>('NURSE');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>('pat-1'); // Default to Ramesh K. (Bed 12)
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [charges, setCharges] = useState<ChargeEntry[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceRecord | null>(null);
  const [priceList, setPriceList] = useState<PriceListItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);

  // Navigation: 'BOARD' | 'LEDGER'
  const [view, setView] = useState<'BOARD' | 'LEDGER'>('BOARD');

  // Compiler & Review Modal
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledInvoiceData, setCompiledInvoiceData] = useState<CompiledInvoiceData | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Share & Pay Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isPriceListOpen, setIsPriceListOpen] = useState(false);

  // Load initial patients & price list
  useEffect(() => {
    fetchPatients();
    fetchPriceList();
    fetchActivityLog();
  }, []);

  // Fetch single patient whenever selectedPatientId changes
  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
    }
  }, [selectedPatientId]);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      setPatients(data.patients || []);
      if (!selectedPatientId && data.patients?.length > 0) {
        setSelectedPatientId(data.patients[0].id);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchPatientDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/patients/${id}`);
      const data = await res.json();
      setCurrentPatient(data.patient || null);
      setCharges(data.charges || []);
      setCurrentInvoice(data.currentInvoice || null);
    } catch (err) {
      console.error('Error fetching patient details:', err);
    }
  };

  const fetchPriceList = async () => {
    try {
      const res = await fetch('/api/price-list');
      const data = await res.json();
      setPriceList(data.priceList || []);
    } catch (err) {
      console.error('Error fetching price list:', err);
    }
  };

  const fetchActivityLog = async () => {
    try {
      const res = await fetch('/api/activity-log');
      const data = await res.json();
      setActivityLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching activity log:', err);
    }
  };

  // Add Charge
  const handleAddCharge = async (chargeData: {
    category: ChargeCategory;
    description: string;
    quantity: number;
    unitPrice: number;
    loggedBy: string;
  }) => {
    if (!selectedPatientId) return;
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/charges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chargeData),
      });
      if (res.ok) {
        await fetchPatientDetails(selectedPatientId);
        await fetchPatients();
        await fetchActivityLog();
      }
    } catch (err) {
      console.error('Failed to add charge', err);
    }
  };

  // Void Charge
  const handleVoidCharge = async (chargeId: string, reason: string, voidedBy: string) => {
    try {
      const res = await fetch(`/api/charges/${chargeId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, voidedBy }),
      });
      if (res.ok) {
        if (selectedPatientId) {
          await fetchPatientDetails(selectedPatientId);
        }
        await fetchPatients();
        await fetchActivityLog();
      }
    } catch (err) {
      console.error('Failed to void charge', err);
    }
  };

  // Mark Event
  const handleMarkEvent = async (type: DischargeEventType, notes?: string) => {
    if (!selectedPatientId) return;
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, notes }),
      });
      if (res.ok) {
        await fetchPatientDetails(selectedPatientId);
        await fetchPatients();
        await fetchActivityLog();

        // Promptly trigger compile invoice after discharge event
        handleTriggerCompile(selectedPatientId, type);
      }
    } catch (err) {
      console.error('Failed to mark event', err);
    }
  };

  // Trigger AI Invoice Compiler
  const handleTriggerCompile = async (patientId: string, eventType?: DischargeEventType) => {
    setIsCompiling(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/compile-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType }),
      });
      const data = await res.json();
      if (data.compiledData) {
        setCompiledInvoiceData(data.compiledData);
        setCurrentInvoice(data.invoice);
        setIsReviewModalOpen(true);
        await fetchPatientDetails(patientId);
        await fetchPatients();
        await fetchActivityLog();
      }
    } catch (err) {
      console.error('Failed to compile invoice', err);
    } finally {
      setIsCompiling(false);
    }
  };

  // Approve & Send Invoice (Billing Desk)
  const handleApproveAndSend = async (
    updatedData: CompiledInvoiceData,
    familyLanguage: string
  ) => {
    if (!currentInvoice) return;
    setIsApproving(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: currentInvoice.invoiceNumber,
          updatedCompiledData: updatedData,
          familyLanguage,
          actor: 'Billing Desk Officer',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsReviewModalOpen(false);
        if (selectedPatientId) {
          await fetchPatientDetails(selectedPatientId);
        }
        await fetchPatients();
        await fetchActivityLog();
        setIsShareModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to approve invoice', err);
    } finally {
      setIsApproving(false);
    }
  };

  // Simulate Payment
  const handlePaymentSuccess = async (invoiceNumber: string, payerName: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceNumber}/mock-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payerName, method: 'PayPal (USD Direct)' }),
      });
      if (res.ok) {
        if (selectedPatientId) {
          await fetchPatientDetails(selectedPatientId);
        }
        await fetchPatients();
        await fetchActivityLog();
        setIsShareModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to process payment', err);
    }
  };

  // Notify Ward
  const handleNotifyWard = async () => {
    if (!currentInvoice) return;
    try {
      await fetch(`/api/invoices/${currentInvoice.invoiceNumber}/notify-ward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      await fetchActivityLog();
    } catch (err) {
      console.error('Failed to notify ward', err);
    }
  };

  const handleOpenLedgerForPatient = (id: string) => {
    setSelectedPatientId(id);
    setView('LEDGER');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-[#0070BA]/20 selection:text-[#0070BA]">
      {/* Top Header */}
      <Header
        currentRole={role}
        onRoleChange={(newRole) => {
          setRole(newRole);
          // If switching to billing or family, ensure we have context
          if (newRole === 'BILLING' && currentPatient?.currentInvoiceId) {
            // Can open review
          }
        }}
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelectPatient={(id) => {
          setSelectedPatientId(id);
          fetchPatientDetails(id);
        }}
        onOpenActivityLog={() => {
          fetchActivityLog();
          setIsActivityLogOpen(true);
        }}
        onOpenPriceList={() => setIsPriceListOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Role Helper Banner */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-semibold text-slate-700">Active View:</span>
            <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-medium">
              {role === 'NURSE' && '👩‍⚕️ Ward Nurse (Charge Capture & Events)'}
              {role === 'BILLING' && '📑 Billing Desk (AI Anomaly Audit & Approval)'}
              {role === 'FAMILY' && '👨‍👩‍👧 Family View (Running Bill & PayPal Settlement)'}
            </span>
          </div>

          {role === 'NURSE' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setView('BOARD')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  view === 'BOARD'
                    ? 'bg-[#0070BA] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Ward Board (All Beds)
              </button>
              <button
                onClick={() => setView('LEDGER')}
                disabled={!selectedPatientId}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  view === 'LEDGER'
                    ? 'bg-[#0070BA] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Patient Ledger {currentPatient ? `(${currentPatient.bedNumber})` : ''}
              </button>
            </div>
          )}
        </div>

        {/* Clearance Card Banner if patient is Financially Cleared */}
        {currentPatient && currentPatient.status === 'Financially Cleared' && (
          <ClearanceCard
            patient={currentPatient}
            invoice={currentInvoice}
            onNotifyWard={handleNotifyWard}
          />
        )}

        {/* View Switcher based on Role and View Mode */}
        {role === 'NURSE' && (
          <>
            {view === 'BOARD' ? (
              <WardBoard
                patients={patients}
                onSelectPatient={(id) => {
                  setSelectedPatientId(id);
                  fetchPatientDetails(id);
                }}
                onOpenLedger={handleOpenLedgerForPatient}
                onCompileInvoice={(id) => {
                  setSelectedPatientId(id);
                  handleTriggerCompile(id);
                }}
              />
            ) : currentPatient ? (
              <PatientLedger
                patient={currentPatient}
                charges={charges}
                priceList={priceList}
                onBackToBoard={() => setView('BOARD')}
                onAddCharge={handleAddCharge}
                onVoidCharge={handleVoidCharge}
                onMarkEvent={handleMarkEvent}
                onCompileInvoice={() => selectedPatientId && handleTriggerCompile(selectedPatientId)}
                isCompiling={isCompiling}
              />
            ) : null}
          </>
        )}

        {role === 'BILLING' && (
          <div className="space-y-6">
            {/* Billing Desk Hub */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#0070BA]" />
                    <span>Billing Desk Audit & Approval Terminal</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select any admitted patient to trigger AI compilation or review compiled invoices.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      selectedPatientId && handleTriggerCompile(selectedPatientId)
                    }
                    disabled={isCompiling}
                    className="px-4 py-2 bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isCompiling ? 'Auditing with AI...' : 'Audit Selected Patient'}</span>
                  </button>
                </div>
              </div>

              {/* Patient Selector Cards for Billing Officer */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {patients.map((p) => {
                  const isSelected = p.id === selectedPatientId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        fetchPatientDetails(p.id);
                      }}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#0070BA] bg-sky-50/40 ring-2 ring-[#0070BA]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {p.bedNumber}: {p.name}
                        </span>
                        <span className="font-semibold text-slate-500">{p.status}</span>
                      </div>
                      <div className="mt-2 text-slate-500 flex justify-between">
                        <span>Stay: {p.daysAdmitted || 1}d</span>
                        <span className="font-mono font-bold text-slate-800">
                          Due: ${p.balanceDue?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* If patient is selected, display ledger review and trigger compile */}
            {currentPatient && (
              <PatientLedger
                patient={currentPatient}
                charges={charges}
                priceList={priceList}
                onBackToBoard={() => setRole('NURSE')}
                onAddCharge={handleAddCharge}
                onVoidCharge={handleVoidCharge}
                onMarkEvent={handleMarkEvent}
                onCompileInvoice={() => selectedPatientId && handleTriggerCompile(selectedPatientId)}
                isCompiling={isCompiling}
              />
            )}
          </div>
        )}

        {role === 'FAMILY' && currentPatient && (
          <FamilyView
            patient={currentPatient}
            charges={charges}
            invoice={currentInvoice}
            onOpenPayModal={() => setIsPayModalOpen(true)}
            onNotifyWard={handleNotifyWard}
          />
        )}
      </main>

      {/* Footer Safety Disclaimer */}
      <footer className="border-t border-slate-200 bg-white mt-12 py-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400 shrink-0" />
            <p>
              <strong className="text-slate-700">Safety & Compliance:</strong> WardLedger AI
              organizes and explains hospital charges for transparency. It does not provide medical
              diagnoses, treatment evaluations, or clinical advice.
            </p>
          </div>
          <div className="text-[11px] text-slate-400">
            Gemini 3.8 Flash • PayPal Sandbox Ready • Fictional Demo Data
          </div>
        </div>
      </footer>

      {/* Modals */}
      <InvoiceReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        compiledData={compiledInvoiceData}
        onApproveAndSend={handleApproveAndSend}
        isApproving={isApproving}
      />

      <ShareInvoiceModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        invoice={currentInvoice}
        patient={currentPatient}
        onSimulatePay={() => {
          setIsShareModalOpen(false);
          setIsPayModalOpen(true);
        }}
      />

      {currentPatient && (
        <PayModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          patient={currentPatient}
          invoice={currentInvoice}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      <ActivityLogModal
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        logs={activityLogs}
      />

      <PriceListModal
        isOpen={isPriceListOpen}
        onClose={() => setIsPriceListOpen(false)}
        priceList={priceList}
      />
    </div>
  );
}
