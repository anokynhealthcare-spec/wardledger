export type ChargeCategory =
  | 'Room'
  | 'Consultation'
  | 'Procedure'
  | 'Medication'
  | 'Disposable/Consumable'
  | 'Investigation'
  | 'Other';

export type PatientStatus =
  | 'Admitted'
  | 'Discharge Initiated'
  | 'Invoice Ready'
  | 'Awaiting Payment'
  | 'Financially Cleared';

export type DischargeEventType =
  | 'Planned Discharge'
  | 'Early Discharge'
  | 'Transfer to Another Facility'
  | 'Discharge Against Medical Advice'
  | 'Sudden Exit';

export interface ChargeEntry {
  id: string;
  patientId: string;
  category: ChargeCategory;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  timestamp: string; // ISO
  loggedBy: string;
  isVoided?: boolean;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
}

export interface Patient {
  id: string;
  name: string;
  mrn: string; // Medical Record Number
  age: number;
  gender: 'M' | 'F' | 'Other';
  bedNumber: string;
  ward: string;
  admitDate: string; // ISO string
  consultant: string;
  diagnosis: string;
  advanceDeposit: number;
  status: PatientStatus;
  dischargeEvent?: {
    type: DischargeEventType;
    timestamp: string;
    notes?: string;
    remindersPaused?: boolean;
  };
  currentInvoiceId?: string;
}

export interface PriceListItem {
  id: string;
  category: ChargeCategory;
  name: string;
  unitPrice: number;
  description?: string;
}

export interface InvoiceFlag {
  id: string;
  severity: 'info' | 'warning';
  message: string;
  relatedEntryIds: string[];
  status?: 'active' | 'resolved' | 'dismissed';
  resolutionNote?: string;
}

export interface GroupedCategoryCharges {
  category: ChargeCategory;
  subtotal: number;
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    timestamp: string;
    loggedBy: string;
  }[];
}

export interface CompiledInvoiceData {
  patientId: string;
  patientName: string;
  bedNumber: string;
  admitDate: string;
  eventDate: string;
  eventType: DischargeEventType;
  groupedCharges: GroupedCategoryCharges[];
  grossTotal: number;
  advanceDeposit: number;
  totalDue: number;
  flags: InvoiceFlag[];
  familySummary: string;
  suggestedCoverNote: string;
  compiledAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  patientId: string;
  compiledData: CompiledInvoiceData;
  status: 'Draft' | 'Sent' | 'Paid';
  paymentLink: string;
  createdAt: string;
  paidAt?: string;
  paymentReference?: string;
  paymentMethod?: string;
  familyMessageLang?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  patientId?: string;
  patientName?: string;
  action:
    | 'CHARGE_ADDED'
    | 'CHARGE_EDITED'
    | 'CHARGE_VOIDED'
    | 'EVENT_MARKED'
    | 'INVOICE_COMPILED'
    | 'INVOICE_APPROVED'
    | 'INVOICE_SENT'
    | 'PAYMENT_RECEIVED'
    | 'WARD_NOTIFIED'
    | 'FAMILY_INQUIRY';
  actor: string; // e.g. "Nurse Priya (Ward)", "Billing Officer Alex", "Family Member"
  details: string;
}
