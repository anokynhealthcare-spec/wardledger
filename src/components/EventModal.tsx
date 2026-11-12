import React, { useState } from 'react';
import { DischargeEventType, Patient } from '../types.js';
import {
  CalendarCheck,
  Clock,
  ArrowRightLeft,
  AlertTriangle,
  Heart,
  X,
  ShieldAlert,
} from 'lucide-react';

interface EventModalProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
  onConfirmEvent: (type: DischargeEventType, notes?: string) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  patient,
  isOpen,
  onClose,
  onConfirmEvent,
}) => {
  const [selectedType, setSelectedType] = useState<DischargeEventType>('Planned Discharge');
  const [notes, setNotes] = useState('');
  const [showSuddenExitConfirmation, setShowSuddenExitConfirmation] = useState(false);

  if (!isOpen) return null;

  const eventOptions: Array<{
    type: DischargeEventType;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      type: 'Planned Discharge',
      label: 'Planned Discharge',
      description: 'Scheduled completion of treatment; consultant has signed discharge order.',
      icon: <CalendarCheck className="w-5 h-5 text-emerald-600" />,
      color: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/30',
    },
    {
      type: 'Early Discharge',
      label: 'Early Discharge',
      description: 'Patient stabilized earlier than anticipated with home care prescription.',
      icon: <Clock className="w-5 h-5 text-sky-600" />,
      color: 'border-sky-200 hover:border-sky-400 bg-sky-50/30',
    },
    {
      type: 'Transfer to Another Facility',
      label: 'Transfer to Another Facility',
      description: 'Inter-hospital transfer for tertiary or specialty surgical procedures.',
      icon: <ArrowRightLeft className="w-5 h-5 text-indigo-600" />,
      color: 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/30',
    },
    {
      type: 'Discharge Against Medical Advice',
      label: 'Discharge Against Medical Advice (DAMA)',
      description: 'Patient or family requested immediate departure prior to clinical advice.',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      color: 'border-amber-200 hover:border-amber-400 bg-amber-50/30',
    },
    {
      type: 'Sudden Exit',
      label: 'Sudden Exit (Bereavement / Demise)',
      description: 'Patient demise during inpatient stay. Strict ethics protocol triggered.',
      icon: <Heart className="w-5 h-5 text-slate-700" />,
      color: 'border-slate-300 hover:border-slate-500 bg-slate-50',
    },
  ];

  const handleProceed = () => {
    if (selectedType === 'Sudden Exit') {
      setShowSuddenExitConfirmation(true);
    } else {
      onConfirmEvent(selectedType, notes.trim());
      onClose();
    }
  };

  const handleConfirmSuddenExit = () => {
    onConfirmEvent('Sudden Exit', notes.trim() || 'Bereavement care liaison initiated.');
    setShowSuddenExitConfirmation(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
        {showSuddenExitConfirmation ? (
          /* Dignified Sudden Exit Screen */
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <Heart className="w-5 h-5 text-rose-600 fill-rose-100" />
                <h3 className="font-bold text-base">Bereavement Care & Sudden Exit Protocol</h3>
              </div>
              <button
                onClick={() => setShowSuddenExitConfirmation(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-700 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold text-slate-900 leading-relaxed">
                  Automated reminders are paused. The final statement will be reviewed by a family liaison.
                </p>
              </div>
              <p className="text-slate-600 leading-relaxed pl-6">
                WardLedger will bypass all automated overdue reminders, collections, or urgent payment notices. The compiled care statement is respectfully formatted for the hospital family counselor to walk through in person or through gentle liaison.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-slate-500 font-medium">Patient:</div>
              <div className="text-slate-900 font-bold text-sm">
                {patient.name} ({patient.bedNumber})
              </div>
              <div className="text-slate-500">Attending: {patient.consultant}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Liaison & Nursing Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Next of kin contacted. Statement to be handed to family counselor Dr. Verma."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowSuddenExitConfirmation(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSuddenExit}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition-colors shadow-sm"
              >
                Confirm & Pause Automated Reminders
              </button>
            </div>
          </div>
        ) : (
          /* Standard Event Selection */
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Mark Ward Discharge Event</h3>
                <p className="text-xs text-slate-500">
                  {patient.name} • {patient.bedNumber} • {patient.ward}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Radio List */}
            <div className="space-y-2">
              {eventOptions.map((opt) => (
                <label
                  key={opt.type}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    opt.color
                  } ${
                    selectedType === opt.type
                      ? 'ring-2 ring-[#0070BA] border-transparent bg-white shadow-xs'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="eventType"
                    value={opt.type}
                    checked={selectedType === opt.type}
                    onChange={() => setSelectedType(opt.type)}
                    className="mt-1 text-[#0070BA] focus:ring-[#0070BA]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <span className="font-bold text-xs text-slate-900">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Additional notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discharge Notes / Destination
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Fit for home discharge, follow-up OPD visit in 5 days with Dr. Roy."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20"
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
                type="button"
                onClick={handleProceed}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white transition-colors shadow-xs shadow-[#0070BA]/20"
              >
                Continue to Final Bill Compile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
