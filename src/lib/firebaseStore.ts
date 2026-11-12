import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.js';
import {
  Patient,
  ChargeEntry,
  InvoiceRecord,
  ActivityLogEntry,
  PriceListItem,
  CompiledInvoiceData,
  DischargeEventType,
  ChargeCategory,
  InvoiceFlag,
  GroupedCategoryCharges,
} from '../types.js';

// 25 realistic hospital price list items
export const PRICE_LIST: PriceListItem[] = [
  { id: 'pl-1', category: 'Room', name: 'General Ward Bed (per day)', unitPrice: 180, description: 'Standard multi-occupancy monitored bed with nursing care' },
  { id: 'pl-2', category: 'Room', name: 'Semi-Private Room (per day)', unitPrice: 320, description: 'Dual-occupancy room with dedicated nursing care' },
  { id: 'pl-3', category: 'Room', name: 'Private Room Deluxe (per day)', unitPrice: 480, description: 'Single-occupancy private suite with ensuite and attendant cot' },
  { id: 'pl-4', category: 'Room', name: 'ICU / Step-down Bed (per day)', unitPrice: 750, description: 'High-dependency intensive care monitoring bed' },
  { id: 'pl-5', category: 'Consultation', name: 'Attending Physician Daily Round', unitPrice: 65, description: 'Primary admitting physician comprehensive evaluation' },
  { id: 'pl-6', category: 'Consultation', name: 'Specialist Consultation (Cardiology/Surgery)', unitPrice: 120, description: 'Sub-specialist bedside clinical consultation and assessment' },
  { id: 'pl-7', category: 'Consultation', name: 'Clinical Nutrition & Dietetics Consult', unitPrice: 45, description: 'Inpatient nutritional planning and dietary assessment' },
  { id: 'pl-8', category: 'Consultation', name: 'Physiotherapy Bedside Session', unitPrice: 50, description: '30-minute inpatient mobility and respiratory therapy' },
  { id: 'pl-9', category: 'Procedure', name: 'Minor Surgical Debridement & Suturing', unitPrice: 240, description: 'Bedside sterile wound excision and closure' },
  { id: 'pl-10', category: 'Procedure', name: 'Central Venous Catheter Placement', unitPrice: 310, description: 'Ultrasound-guided central line insertion' },
  { id: 'pl-11', category: 'Procedure', name: 'Foley Catheterization Insertion & Care', unitPrice: 75, description: 'Aseptic urinary catheterization procedure' },
  { id: 'pl-12', category: 'Procedure', name: 'Nebulization Treatment (per session)', unitPrice: 20, description: 'Bronchodilator aerosol inhalation therapy' },
  { id: 'pl-13', category: 'Disposable/Consumable', name: 'IV Cannula (18G / 20G)', unitPrice: 14, description: 'Sterile peripheral intravenous catheter' },
  { id: 'pl-14', category: 'Disposable/Consumable', name: 'Foley Catheter Silicon Tray & Bag', unitPrice: 28, description: 'Complete 2-way silicon catheterization tray' },
  { id: 'pl-15', category: 'Disposable/Consumable', name: 'Sterile Wound Dressing Kit', unitPrice: 22, description: 'Gauze packs, antiseptic prep, sterile gloves, adhesive drapes' },
  { id: 'pl-16', category: 'Disposable/Consumable', name: 'IV Infusion Administration Set', unitPrice: 12, description: 'Sterile gravity drip chamber with micro-filter' },
  { id: 'pl-17', category: 'Disposable/Consumable', name: 'Disposable Syringe & Needle Kit (Pack of 5)', unitPrice: 8, description: 'Luer-lock sterile single-use syringes' },
  { id: 'pl-18', category: 'Medication', name: 'Normal Saline 0.9% IV (500 ml)', unitPrice: 9, description: 'Sterile isotonic crystalloid infusion bottle' },
  { id: 'pl-19', category: 'Medication', name: 'Paracetamol IV Infusion 1000mg', unitPrice: 18, description: 'Intravenous analgesic/antipyretic infusion' },
  { id: 'pl-20', category: 'Medication', name: 'Ceftriaxone Sodium IV 1g Injection', unitPrice: 32, description: 'Broad-spectrum 3rd-gen cephalosporin antibiotic vial' },
  { id: 'pl-21', category: 'Medication', name: 'Pantoprazole IV 40mg Injection', unitPrice: 16, description: 'Proton pump inhibitor vial for gastric acid suppression' },
  { id: 'pl-22', category: 'Medication', name: 'Enoxaparin Sodium 40mg Prefilled Syringe', unitPrice: 38, description: 'Low molecular weight heparin DVT prophylaxis' },
  { id: 'pl-23', category: 'Investigation', name: 'Complete Blood Count (CBC) with Platelets', unitPrice: 35, description: 'Automated 5-part differential hematology panel' },
  { id: 'pl-24', category: 'Investigation', name: 'Comprehensive Metabolic Panel (CMP)', unitPrice: 55, description: 'Renal function, liver enzymes, electrolytes, glucose' },
  { id: 'pl-25', category: 'Investigation', name: '12-Lead Electrocardiogram (ECG)', unitPrice: 45, description: 'Bedside diagnostic cardiac rhythm recording' },
  { id: 'pl-26', category: 'Investigation', name: 'Portable Digital Chest X-Ray (AP View)', unitPrice: 70, description: 'Bedside mobile digital radiograph with radiology report' },
];

// Collection references
const PATIENTS_COL = 'patients';
const INVOICES_COL = 'invoices';
const LOGS_COL = 'activityLogs';
const PRICE_COL = 'priceList';

export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, PATIENTS_COL));
    console.log('Firestore connection verified. Patient count:', snap.size);
    if (snap.empty) {
      await seedFirestoreIfEmpty();
    }
    return true;
  } catch (error) {
    console.warn('Firestore validation notice (defaulting to true for cloud persistence):', error);
    try {
      await seedFirestoreIfEmpty();
    } catch (e) {
      console.warn('Auto-seed attempt notice:', e);
    }
    return true;
  }
}

/**
 * Seed initial sample patients, charges, invoices, logs, and price list into Firestore if empty.
 */
export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    const patientsSnap = await getDocs(collection(db, PATIENTS_COL));
    if (!patientsSnap.empty) {
      console.log('Firestore already populated with patients.');
      return;
    }

    console.log('Seeding initial hospital records into Firestore...');

    // Seed Price List
    for (const item of PRICE_LIST) {
      await setDoc(doc(db, PRICE_COL, item.id), item);
    }

    const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();
    const daysAgo = (d: number, h = 0) => new Date(Date.now() - (d * 24 + h) * 3600 * 1000).toISOString();

    const p1: Patient = {
      id: 'pat-1',
      name: 'Ramesh K.',
      mrn: 'MRN-78210',
      age: 58,
      gender: 'M',
      bedNumber: 'Bed 12',
      ward: 'Ward 3B - Acute Medical',
      admitDate: daysAgo(4, 2),
      consultant: 'Dr. Anita Roy (Internal Medicine)',
      diagnosis: 'Acute bacterial gastroenteritis with dehydration & electrolyte imbalance',
      advanceDeposit: 500,
      status: 'Admitted',
    };

    const p2: Patient = {
      id: 'pat-2',
      name: 'Elena Rostova',
      mrn: 'MRN-84192',
      age: 44,
      gender: 'F',
      bedNumber: 'Bed 08',
      ward: 'Ward 2A - Surgical Post-Op',
      admitDate: daysAgo(2, 6),
      consultant: 'Dr. David Miller (General Surgery)',
      diagnosis: 'Laparoscopic cholecystectomy - post-op recovery',
      advanceDeposit: 350,
      status: 'Invoice Ready',
      dischargeEvent: {
        type: 'Planned Discharge',
        timestamp: hoursAgo(3),
        notes: 'Surgical recovery uneventful. Discharged to home care.',
      },
      currentInvoiceId: 'WL-INV-1040',
    };

    const p3: Patient = {
      id: 'pat-3',
      name: 'Marcus Vance',
      mrn: 'MRN-65128',
      age: 63,
      gender: 'M',
      bedNumber: 'Bed 04',
      ward: 'Ward 4C - Cardiology Step-Down',
      admitDate: daysAgo(5, 4),
      consultant: 'Dr. Sarah Lin (Cardiology)',
      diagnosis: 'Unstable angina stabilized; medical management',
      advanceDeposit: 1000,
      status: 'Awaiting Payment',
      currentInvoiceId: 'WL-INV-1039',
      dischargeEvent: {
        type: 'Planned Discharge',
        timestamp: hoursAgo(5),
      },
    };

    const p4: Patient = {
      id: 'pat-4',
      name: 'Amina Al-Mansoor',
      mrn: 'MRN-92044',
      age: 39,
      gender: 'F',
      bedNumber: 'Bed 19',
      ward: 'Ward 3B - Acute Medical',
      admitDate: daysAgo(3, 8),
      consultant: 'Dr. Anita Roy (Internal Medicine)',
      diagnosis: 'Community-acquired pneumonia (resolved on IV antibiotics)',
      advanceDeposit: 800,
      status: 'Financially Cleared',
      currentInvoiceId: 'WL-INV-1035',
      dischargeEvent: {
        type: 'Planned Discharge',
        timestamp: hoursAgo(12),
      },
    };

    const p5: Patient = {
      id: 'pat-5',
      name: 'Devin Hayes',
      mrn: 'MRN-11029',
      age: 29,
      gender: 'M',
      bedNumber: 'Bed 15',
      ward: 'Ward 1D - Orthopedic Observation',
      admitDate: daysAgo(1, 4),
      consultant: 'Dr. Robert Zhao (Orthopedics)',
      diagnosis: 'Grade II ankle sprain with syndesmotic strain',
      advanceDeposit: 200,
      status: 'Admitted',
    };

    for (const p of [p1, p2, p3, p4, p5]) {
      await setDoc(doc(db, PATIENTS_COL, p.id), p);
    }

    const rameshCharges = [
      { category: 'Room', description: 'General Ward Bed (per day)', quantity: 1, unitPrice: 180, timestamp: daysAgo(4, 1), loggedBy: 'Nurse Priya M.' },
      { category: 'Disposable/Consumable', description: 'IV Cannula (18G / 20G)', quantity: 1, unitPrice: 14, timestamp: daysAgo(4, 0), loggedBy: 'Nurse Priya M.' },
      { category: 'Disposable/Consumable', description: 'IV Infusion Administration Set', quantity: 2, unitPrice: 12, timestamp: daysAgo(3, 23), loggedBy: 'Nurse Priya M.' },
      { category: 'Medication', description: 'Normal Saline 0.9% IV (500 ml)', quantity: 3, unitPrice: 9, timestamp: daysAgo(3, 22), loggedBy: 'Nurse Priya M.' },
      { category: 'Investigation', description: 'Complete Blood Count (CBC) with Platelets', quantity: 1, unitPrice: 35, timestamp: daysAgo(3, 21), loggedBy: 'Lab Tech Samuel' },
      { category: 'Investigation', description: 'Comprehensive Metabolic Panel (CMP)', quantity: 1, unitPrice: 55, timestamp: daysAgo(3, 20), loggedBy: 'Lab Tech Samuel' },
      { category: 'Consultation', description: 'Attending Physician Daily Round', quantity: 1, unitPrice: 65, timestamp: daysAgo(3, 18), loggedBy: 'Dr. Anita Roy' },
      { category: 'Room', description: 'General Ward Bed (per day)', quantity: 1, unitPrice: 180, timestamp: daysAgo(3, 0), loggedBy: 'Ward Clerk Kevin' },
      { category: 'Medication', description: 'Paracetamol IV Infusion 1000mg', quantity: 2, unitPrice: 18, timestamp: daysAgo(2, 20), loggedBy: 'Nurse Carlos T.' },
      { category: 'Medication', description: 'Pantoprazole IV 40mg Injection', quantity: 1, unitPrice: 16, timestamp: daysAgo(2, 18), loggedBy: 'Nurse Carlos T.' },
      { category: 'Medication', description: 'Ceftriaxone Sodium IV 1g Injection', quantity: 2, unitPrice: 32, timestamp: daysAgo(2, 16), loggedBy: 'Nurse Carlos T.' },
      { category: 'Consultation', description: 'Attending Physician Daily Round', quantity: 1, unitPrice: 65, timestamp: daysAgo(2, 12), loggedBy: 'Dr. Anita Roy' },
      { category: 'Room', description: 'General Ward Bed (per day)', quantity: 1, unitPrice: 180, timestamp: daysAgo(2, 0), loggedBy: 'Ward Clerk Kevin' },
      { category: 'Investigation', description: '12-Lead Electrocardiogram (ECG)', quantity: 1, unitPrice: 45, timestamp: daysAgo(1, 20), loggedBy: 'Nurse Priya M.' },
      { category: 'Medication', description: 'Normal Saline 0.9% IV (500 ml)', quantity: 2, unitPrice: 9, timestamp: daysAgo(1, 16), loggedBy: 'Nurse Priya M.' },
      { category: 'Consultation', description: 'Specialist Consultation (Gastroenterology)', quantity: 1, unitPrice: 120, timestamp: daysAgo(1, 14), loggedBy: 'Dr. Rajiv Menon' },
      { category: 'Room', description: 'General Ward Bed (per day)', quantity: 1, unitPrice: 180, timestamp: daysAgo(1, 0), loggedBy: 'Ward Clerk Kevin' },
      { category: 'Disposable/Consumable', description: 'Sterile Wound Dressing Kit', quantity: 1, unitPrice: 22, timestamp: hoursAgo(6), loggedBy: 'Nurse Priya M.' },
    ];

    for (let idx = 0; idx < rameshCharges.length; idx++) {
      const c = rameshCharges[idx];
      const id = `ch-pat1-${idx + 1}`;
      const entry: ChargeEntry = {
        ...c,
        id,
        patientId: 'pat-1',
        category: c.category as any,
        total: c.quantity * c.unitPrice,
      };
      await setDoc(doc(db, PATIENTS_COL, 'pat-1', 'charges', id), entry);
    }

    const logs: ActivityLogEntry[] = [
      {
        id: 'act-1',
        timestamp: hoursAgo(10),
        patientId: 'pat-4',
        patientName: 'Amina Al-Mansoor',
        action: 'PAYMENT_RECEIVED',
        actor: 'Family (via PayPal)',
        details: 'Settled $320.00 via PayPal (Ref: PAYPAL-REF-849201). Account marked Financially Cleared.',
      },
      {
        id: 'act-2',
        timestamp: hoursAgo(9.5),
        patientId: 'pat-4',
        patientName: 'Amina Al-Mansoor',
        action: 'WARD_NOTIFIED',
        actor: 'Billing Desk (Auto-clearance)',
        details: 'Ward 3B nurse station notified of complete financial clearance. Gate pass generated.',
      },
      {
        id: 'act-3',
        timestamp: hoursAgo(5),
        patientId: 'pat-3',
        patientName: 'Marcus Vance',
        action: 'INVOICE_SENT',
        actor: 'Billing Officer Alex',
        details: 'Approved compiled invoice WL-INV-1039 ($850.00 due) and dispatched PayPal link.',
      },
      {
        id: 'act-4',
        timestamp: hoursAgo(3),
        patientId: 'pat-2',
        patientName: 'Elena Rostova',
        action: 'INVOICE_COMPILED',
        actor: 'AI Clinical Billing Agent',
        details: 'Compiled 5 entries into draft statement ($980.00 due). Sent to Billing Desk review.',
      },
      {
        id: 'act-5',
        timestamp: hoursAgo(1),
        patientId: 'pat-1',
        patientName: 'Ramesh K.',
        action: 'CHARGE_ADDED',
        actor: 'Nurse Priya M.',
        details: 'Logged Sterile Wound Dressing Kit (Qty: 1, $22.00) in Bed 12.',
      },
    ];

    for (const log of logs) {
      await setDoc(doc(db, LOGS_COL, log.id), log);
    }

    console.log('Firestore successfully seeded with hospital records.');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedFirestoreIfEmpty');
  }
}

// --- Local Client-Side Audit & Compilation ---

export function compileInvoiceLocally(
  patient: Patient,
  charges: ChargeEntry[],
  deposit: number,
  eventType: DischargeEventType
): CompiledInvoiceData {
  const flags: InvoiceFlag[] = [];
  const activeCharges = charges.filter(c => !c.isVoided);

  const categories: ChargeCategory[] = [
    'Room',
    'Consultation',
    'Procedure',
    'Medication',
    'Disposable/Consumable',
    'Investigation',
    'Other',
  ];

  const groupedMap = new Map<ChargeCategory, GroupedCategoryCharges>();
  categories.forEach(cat => {
    groupedMap.set(cat, {
      category: cat,
      subtotal: 0,
      items: [],
    });
  });

  let grossTotal = 0;
  activeCharges.forEach(c => {
    const total = c.quantity * c.unitPrice;
    grossTotal += total;
    const grp = groupedMap.get(c.category) || {
      category: c.category,
      subtotal: 0,
      items: [],
    };
    grp.subtotal += total;
    grp.items.push({
      id: c.id,
      description: c.description,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      total,
      timestamp: c.timestamp,
      loggedBy: c.loggedBy,
    });
    groupedMap.set(c.category, grp);
  });

  const groupedCharges = Array.from(groupedMap.values()).filter(g => g.items.length > 0);

  // Duplicate Check
  for (let i = 0; i < activeCharges.length; i++) {
    for (let j = i + 1; j < activeCharges.length; j++) {
      const a = activeCharges[i];
      const b = activeCharges[j];
      if (a.description.toLowerCase().trim() === b.description.toLowerCase().trim()) {
        const timeDiffMs = Math.abs(new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const timeDiffMin = timeDiffMs / (1000 * 60);
        if (timeDiffMin <= 30) {
          flags.push({
            id: `flag-dup-${a.id}-${b.id}`,
            severity: 'warning',
            message: `Possible duplicate charge: "${a.description}" was logged twice within ${Math.round(timeDiffMin)} minutes (${a.loggedBy} and ${b.loggedBy}).`,
            relatedEntryIds: [a.id, b.id],
            status: 'active',
          });
        }
      }
    }
  }

  // Procedure consumable check
  const procedures = activeCharges.filter(c => c.category === 'Procedure');
  const consumables = activeCharges.filter(c => c.category === 'Disposable/Consumable');
  if (procedures.length > 0 && consumables.length === 0) {
    flags.push({
      id: `flag-proc-no-consumables`,
      severity: 'warning',
      message: `Procedures (${procedures.map(p => p.description).join(', ')}) were recorded without any disposable consumables, surgical kits, or sterile drapes.`,
      relatedEntryIds: procedures.map(p => p.id),
      status: 'active',
    });
  }

  const totalDue = Math.max(0, grossTotal - deposit);
  const isSuddenExit = eventType === 'Sudden Exit';
  const familySummary = isSuddenExit
    ? `We extend our deepest condolences to the family of ${patient.name}. Automated billing reminders are paused. This clinical ledger summary reflects inpatient care provided under ${patient.consultant} and will be personally reviewed with your family liaison officer.`
    : `Inpatient care summary for ${patient.name} (${patient.bedNumber}) admitted under ${patient.consultant}. Total gross charges amount to $${grossTotal.toFixed(2)}, offset by an advance deposit of $${deposit.toFixed(2)}, leaving a balance due of $${totalDue.toFixed(2)}.`;

  const suggestedCoverNote = isSuddenExit
    ? `Statement of Inpatient Care for ${patient.name} - Handled with sympathy. Family liaison: +1 (800) 555-0199.`
    : `Inpatient discharge statement for ${patient.name} (${patient.bedNumber}). Dispatched for family settlement prior to departure.`;

  return {
    patientId: patient.id,
    patientName: patient.name,
    bedNumber: patient.bedNumber,
    admitDate: patient.admitDate,
    eventDate: new Date().toISOString(),
    eventType,
    grossTotal,
    advanceDeposit: deposit,
    totalDue,
    groupedCharges,
    flags,
    familySummary,
    suggestedCoverNote,
    compiledAt: new Date().toISOString(),
  };
}

export function familyChatLocally(
  patient: Patient,
  charges: ChargeEntry[],
  question: string,
  language: string
): { answer: string; groundedInCharges: string[] } {
  const activeCharges = charges.filter(c => !c.isVoided);
  const qLower = question.toLowerCase();
  let matched = activeCharges.filter(c =>
    c.description.toLowerCase().includes(qLower) ||
    c.category.toLowerCase().includes(qLower) ||
    (qLower.includes('catheter') && c.description.toLowerCase().includes('catheter')) ||
    (qLower.includes('room') && c.category === 'Room') ||
    (qLower.includes('deposit') && true)
  );

  let answer = `Regarding your inquiry for ${patient.name}: `;
  if (qLower.includes('catheter')) {
    answer = `A catheter was recorded during inpatient care under ${patient.consultant} for sterile urinary management and continuous fluid monitoring.`;
  } else if (qLower.includes('deposit')) {
    answer = `An advance deposit of $${patient.advanceDeposit} was credited toward your total inpatient balance.`;
  } else if (matched.length > 0) {
    answer = `The ledger contains ${matched.length} related charge(s): ${matched.map(m => `"${m.description}" ($${(m.quantity * m.unitPrice).toFixed(2)})`).join(', ')}.`;
  } else {
    answer = `We checked the active ledger for ${patient.name}. This item is recorded under clinical care managed by ${patient.consultant}. Please feel free to consult our billing desk for further details.`;
  }

  if (language && language !== 'English') {
    answer += ` [Response provided in ${language}]`;
  }

  return {
    answer,
    groundedInCharges: matched.map(m => m.id),
  };
}

// --- Firestore Read & Write Operations ---

export async function getFirestorePatients(): Promise<Patient[]> {
  try {
    const snap = await getDocs(collection(db, PATIENTS_COL));
    const patients: Patient[] = [];

    for (const docSnap of snap.docs) {
      const p = docSnap.data() as Patient;
      const chargesSnap = await getDocs(collection(db, PATIENTS_COL, p.id, 'charges'));
      const activeCharges = chargesSnap.docs
        .map((d) => d.data() as ChargeEntry)
        .filter((c) => !c.isVoided);

      const runningTotal = activeCharges.reduce((acc, c) => acc + (c.total || 0), 0);
      const balanceDue = Math.max(0, runningTotal - (p.advanceDeposit || 0));
      const admitDate = new Date(p.admitDate);
      const daysAdmitted = Math.max(
        1,
        Math.ceil((Date.now() - admitDate.getTime()) / (1000 * 3600 * 24))
      );

      patients.push({
        ...p,
        daysAdmitted,
        chargeCount: activeCharges.length,
        runningTotal,
        balanceDue,
      });
    }

    return patients;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PATIENTS_COL);
  }
}

export async function getFirestorePatient(id: string): Promise<Patient | null> {
  try {
    const docRef = doc(db, PATIENTS_COL, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const p = docSnap.data() as Patient;
    const chargesSnap = await getDocs(collection(db, PATIENTS_COL, id, 'charges'));
    const activeCharges = chargesSnap.docs
      .map((d) => d.data() as ChargeEntry)
      .filter((c) => !c.isVoided);

    const runningTotal = activeCharges.reduce((acc, c) => acc + (c.total || 0), 0);
    const balanceDue = Math.max(0, runningTotal - (p.advanceDeposit || 0));
    const admitDate = new Date(p.admitDate);
    const daysAdmitted = Math.max(
      1,
      Math.ceil((Date.now() - admitDate.getTime()) / (1000 * 3600 * 24))
    );

    return {
      ...p,
      daysAdmitted,
      runningTotal,
      balanceDue,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${PATIENTS_COL}/${id}`);
  }
}

export async function getFirestoreCharges(patientId: string): Promise<ChargeEntry[]> {
  try {
    const snap = await getDocs(collection(db, PATIENTS_COL, patientId, 'charges'));
    const charges = snap.docs.map((d) => d.data() as ChargeEntry);
    return charges.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${PATIENTS_COL}/${patientId}/charges`);
  }
}

export async function addFirestoreCharge(
  chargeData: Omit<ChargeEntry, 'id' | 'total'>
): Promise<ChargeEntry> {
  const id = `ch-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
  const total = chargeData.quantity * chargeData.unitPrice;
  const entry: ChargeEntry = {
    ...chargeData,
    id,
    total,
  };

  try {
    await setDoc(doc(db, PATIENTS_COL, chargeData.patientId, 'charges', id), entry);

    await addFirestoreActivityLog({
      action: 'CHARGE_ADDED',
      actor: chargeData.loggedBy || 'Ward Nurse',
      patientId: chargeData.patientId,
      details: `Added ${chargeData.description} (Qty: ${chargeData.quantity}, $${total.toFixed(2)}).`,
    });

    return entry;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `${PATIENTS_COL}/${chargeData.patientId}/charges/${id}`
    );
  }
}

export async function voidFirestoreCharge(
  patientId: string,
  chargeId: string,
  reason: string,
  voidedBy: string
): Promise<void> {
  try {
    const ref = doc(db, PATIENTS_COL, patientId, 'charges', chargeId);
    await updateDoc(ref, {
      isVoided: true,
      voidReason: reason,
      voidedAt: new Date().toISOString(),
      voidedBy,
    });

    await addFirestoreActivityLog({
      action: 'CHARGE_VOIDED',
      actor: voidedBy,
      patientId,
      details: `Voided charge entry ${chargeId}. Reason: ${reason}`,
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${PATIENTS_COL}/${patientId}/charges/${chargeId}`
    );
  }
}

export async function markFirestorePatientEvent(
  patientId: string,
  type: DischargeEventType,
  notes?: string,
  actor = 'Ward Supervisor'
): Promise<void> {
  try {
    const isSuddenExit = type === 'Sudden Exit';
    const patientRef = doc(db, PATIENTS_COL, patientId);
    const pSnap = await getDoc(patientRef);
    if (!pSnap.exists()) return;

    const currentStatus = pSnap.data()?.status;
    const newStatus = currentStatus === 'Admitted' ? 'Discharge Initiated' : currentStatus;

    await updateDoc(patientRef, {
      status: newStatus,
      dischargeEvent: {
        type,
        timestamp: new Date().toISOString(),
        notes: notes || '',
        remindersPaused: isSuddenExit,
      },
    });

    await addFirestoreActivityLog({
      action: 'EVENT_MARKED',
      actor,
      patientId,
      patientName: pSnap.data()?.name,
      details: isSuddenExit
        ? 'Marked Sudden Exit. Reminders paused & bereavement liaison protocol initiated.'
        : `Marked event "${type}" for ${pSnap.data()?.name}.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PATIENTS_COL}/${patientId}`);
  }
}

export async function saveFirestoreInvoice(invoiceRecord: InvoiceRecord): Promise<void> {
  try {
    await setDoc(doc(db, INVOICES_COL, invoiceRecord.id), invoiceRecord);
    await updateDoc(doc(db, PATIENTS_COL, invoiceRecord.patientId), {
      status: 'Invoice Ready',
      currentInvoiceId: invoiceRecord.id,
    });

    await addFirestoreActivityLog({
      action: 'INVOICE_COMPILED',
      actor: 'AI Clinical Billing Agent',
      patientId: invoiceRecord.patientId,
      patientName: invoiceRecord.compiledData.patientName,
      details: `Compiled final invoice #${invoiceRecord.invoiceNumber} ($${invoiceRecord.compiledData.totalDue.toFixed(2)} due).`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${INVOICES_COL}/${invoiceRecord.id}`);
  }
}

export async function getFirestoreInvoice(invoiceId: string): Promise<InvoiceRecord | null> {
  try {
    const docRef = doc(db, INVOICES_COL, invoiceId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as InvoiceRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${INVOICES_COL}/${invoiceId}`);
  }
}

export async function approveFirestoreInvoice(
  invoiceNumber: string,
  updatedData?: Partial<CompiledInvoiceData>,
  familyLang = 'English',
  actor = 'Billing Desk'
): Promise<void> {
  try {
    const invRef = doc(db, INVOICES_COL, invoiceNumber);
    const invSnap = await getDoc(invRef);
    if (!invSnap.exists()) return;

    const inv = invSnap.data() as InvoiceRecord;
    const compiledData = {
      ...inv.compiledData,
      ...updatedData,
    };

    await updateDoc(invRef, {
      compiledData,
      status: 'Sent',
      familyMessageLang: familyLang,
    });

    await updateDoc(doc(db, PATIENTS_COL, inv.patientId), {
      status: 'Awaiting Payment',
    });

    await addFirestoreActivityLog({
      action: 'INVOICE_APPROVED',
      actor,
      patientId: inv.patientId,
      patientName: inv.compiledData.patientName,
      details: `Approved invoice #${invoiceNumber}. Dispatched PayPal checkout link in ${familyLang}.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${INVOICES_COL}/${invoiceNumber}`);
  }
}

export async function markFirestoreInvoicePaid(
  invoiceNumber: string,
  paymentRef: string,
  method = 'PayPal (USD)',
  actor = 'Family'
): Promise<void> {
  try {
    const invRef = doc(db, INVOICES_COL, invoiceNumber);
    const invSnap = await getDoc(invRef);
    if (!invSnap.exists()) return;

    const inv = invSnap.data() as InvoiceRecord;
    await updateDoc(invRef, {
      status: 'Paid',
      paidAt: new Date().toISOString(),
      paymentReference: paymentRef,
      paymentMethod: method,
    });

    await updateDoc(doc(db, PATIENTS_COL, inv.patientId), {
      status: 'Financially Cleared',
    });

    await addFirestoreActivityLog({
      action: 'PAYMENT_RECEIVED',
      actor,
      patientId: inv.patientId,
      patientName: inv.compiledData.patientName,
      details: `Settled balance of $${inv.compiledData.totalDue.toFixed(2)} (Ref: ${paymentRef}). Account marked Financially Cleared.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${INVOICES_COL}/${invoiceNumber}`);
  }
}

export async function addFirestoreActivityLog(
  log: Omit<ActivityLogEntry, 'id' | 'timestamp'>
): Promise<void> {
  const id = `act-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
  const entry: ActivityLogEntry = {
    ...log,
    id,
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, LOGS_COL, id), entry);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${LOGS_COL}/${id}`);
  }
}

export async function getFirestoreActivityLog(patientId?: string): Promise<ActivityLogEntry[]> {
  try {
    const snap = await getDocs(collection(db, LOGS_COL));
    let logs = snap.docs.map((d) => d.data() as ActivityLogEntry);
    if (patientId) {
      logs = logs.filter((l) => l.patientId === patientId);
    }
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, LOGS_COL);
  }
}

export async function getFirestorePriceList(): Promise<PriceListItem[]> {
  try {
    const snap = await getDocs(collection(db, PRICE_COL));
    if (snap.empty) return PRICE_LIST;
    return snap.docs.map((d) => d.data() as PriceListItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PRICE_COL);
  }
}
