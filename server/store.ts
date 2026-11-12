import {
  Patient,
  ChargeEntry,
  PriceListItem,
  ActivityLogEntry,
  InvoiceRecord,
  CompiledInvoiceData,
  DischargeEventType,
} from './types.js';

// 25 realistic mock hospital price list items
export const PRICE_LIST: PriceListItem[] = [
  // Room
  { id: 'pl-1', category: 'Room', name: 'General Ward Bed (per day)', unitPrice: 180, description: 'Standard multi-occupancy monitored bed with nursing care' },
  { id: 'pl-2', category: 'Room', name: 'Semi-Private Room (per day)', unitPrice: 320, description: 'Dual-occupancy room with dedicated nursing care' },
  { id: 'pl-3', category: 'Room', name: 'Private Room Deluxe (per day)', unitPrice: 480, description: 'Single-occupancy private suite with ensuite and attendant cot' },
  { id: 'pl-4', category: 'Room', name: 'ICU / Step-down Bed (per day)', unitPrice: 750, description: 'High-dependency intensive care monitoring bed' },

  // Consultation
  { id: 'pl-5', category: 'Consultation', name: 'Attending Physician Daily Round', unitPrice: 65, description: 'Primary admitting physician comprehensive evaluation' },
  { id: 'pl-6', category: 'Consultation', name: 'Specialist Consultation (Cardiology/Surgery)', unitPrice: 120, description: 'Sub-specialist bedside clinical consultation and assessment' },
  { id: 'pl-7', category: 'Consultation', name: 'Clinical Nutrition & Dietetics Consult', unitPrice: 45, description: 'Inpatient nutritional planning and dietary assessment' },
  { id: 'pl-8', category: 'Consultation', name: 'Physiotherapy Bedside Session', unitPrice: 50, description: '30-minute inpatient mobility and respiratory therapy' },

  // Procedure
  { id: 'pl-9', category: 'Procedure', name: 'Minor Surgical Debridement & Suturing', unitPrice: 240, description: 'Bedside sterile wound excision and closure' },
  { id: 'pl-10', category: 'Procedure', name: 'Central Venous Catheter Placement', unitPrice: 310, description: 'Ultrasound-guided central line insertion' },
  { id: 'pl-11', category: 'Procedure', name: 'Foley Catheterization Insertion & Care', unitPrice: 75, description: 'Aseptic urinary catheterization procedure' },
  { id: 'pl-12', category: 'Procedure', name: 'Nebulization Treatment (per session)', unitPrice: 20, description: 'Bronchodilator aerosol inhalation therapy' },

  // Disposable / Consumable
  { id: 'pl-13', category: 'Disposable/Consumable', name: 'IV Cannula (18G / 20G)', unitPrice: 14, description: 'Sterile peripheral intravenous catheter' },
  { id: 'pl-14', category: 'Disposable/Consumable', name: 'Foley Catheter Silicon Tray & Bag', unitPrice: 28, description: 'Complete 2-way silicon catheterization tray' },
  { id: 'pl-15', category: 'Disposable/Consumable', name: 'Sterile Wound Dressing Kit', unitPrice: 22, description: 'Gauze packs, antiseptic prep, sterile gloves, adhesive drapes' },
  { id: 'pl-16', category: 'Disposable/Consumable', name: 'IV Infusion Administration Set', unitPrice: 12, description: 'Sterile gravity drip chamber with micro-filter' },
  { id: 'pl-17', category: 'Disposable/Consumable', name: 'Disposable Syringe & Needle Kit (Pack of 5)', unitPrice: 8, description: 'Luer-lock sterile single-use syringes' },

  // Medication
  { id: 'pl-18', category: 'Medication', name: 'Normal Saline 0.9% IV (500 ml)', unitPrice: 9, description: 'Sterile isotonic crystalloid infusion bottle' },
  { id: 'pl-19', category: 'Medication', name: 'Paracetamol IV Infusion 1000mg', unitPrice: 18, description: 'Intravenous analgesic/antipyretic infusion' },
  { id: 'pl-20', category: 'Medication', name: 'Ceftriaxone Sodium IV 1g Injection', unitPrice: 32, description: 'Broad-spectrum 3rd-gen cephalosporin antibiotic vial' },
  { id: 'pl-21', category: 'Medication', name: 'Pantoprazole IV 40mg Injection', unitPrice: 16, description: 'Proton pump inhibitor vial for gastric acid suppression' },
  { id: 'pl-22', category: 'Medication', name: 'Enoxaparin Sodium 40mg Prefilled Syringe', unitPrice: 38, description: 'Low molecular weight heparin DVT prophylaxis' },

  // Investigation
  { id: 'pl-23', category: 'Investigation', name: 'Complete Blood Count (CBC) with Platelets', unitPrice: 35, description: 'Automated 5-part differential hematology panel' },
  { id: 'pl-24', category: 'Investigation', name: 'Comprehensive Metabolic Panel (CMP)', unitPrice: 55, description: 'Renal function, liver enzymes, electrolytes, glucose' },
  { id: 'pl-25', category: 'Investigation', name: '12-Lead Electrocardiogram (ECG)', unitPrice: 45, description: 'Bedside diagnostic cardiac rhythm recording' },
  { id: 'pl-26', category: 'Investigation', name: 'Portable Digital Chest X-Ray (AP View)', unitPrice: 70, description: 'Bedside mobile digital radiograph with radiology report' },
];

// Helper to compute ISO dates relative to now
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000).toISOString();
const daysAgo = (days: number, extraHours = 0) => new Date(Date.now() - (days * 24 + extraHours) * 3600 * 1000).toISOString();

export class Store {
  patients: Map<string, Patient> = new Map();
  charges: Map<string, ChargeEntry> = new Map();
  invoices: Map<string, InvoiceRecord> = new Map();
  activityLog: ActivityLogEntry[] = [];

  constructor() {
    this.seed();
  }

  seed() {
    // 1. Patient 1: Ramesh K. - 4-day stay, 18 entries, $500 deposit.
    const pat1: Patient = {
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

    // 2. Patient 2: Elena Rostova - 2-day stay, $350 deposit, Invoice Ready
    const pat2: Patient = {
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
    };

    // 3. Patient 3: Marcus Vance - 5-day stay, $1,000 deposit, Awaiting Payment
    const pat3: Patient = {
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

    // 4. Patient 4: Amina Al-Mansoor - 3-day stay, $800 deposit, Financially Cleared
    const pat4: Patient = {
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

    // 5. Patient 5: Devin Hayes - 1-day stay, $200 deposit, Admitted
    const pat5: Patient = {
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

    [pat1, pat2, pat3, pat4, pat5].forEach(p => this.patients.set(p.id, p));

    // Seed Ramesh K. (pat-1) with 18 detailed charges across 4 days
    const rameshCharges: Array<Omit<ChargeEntry, 'id' | 'patientId' | 'total'> & { total?: number }> = [
      // Day 1
      { category: 'Room', description: 'General Ward Bed (per day)', quantity: 1, unitPrice: 180, timestamp: daysAgo(4, 1), loggedBy: 'Nurse Priya M.' },
      { category: 'Disposable/Consumable', description: 'IV Cannula (18G / 20G)', quantity: 1, unitPrice: 14, timestamp: daysAgo(4, 0), loggedBy: 'Nurse Priya M.' },
      { category: 'Disposable/Consumable', description: 'IV Infusion Administration Set', quantity: 2, unitPrice: 12, timestamp: daysAgo(3, 23), loggedBy: 'Nurse Priya M.' },
      { category: 'Medication', description: 'Normal Saline 0.9% IV (500 ml)', quantity: 3, unitPrice: 9, timestamp: daysAgo(3, 22), loggedBy: 'Nurse Priya M.' },
      { category: 'Investigation', description: 'Complete Blood Count (CBC) with Platelets', quantity: 1, unitPrice: 35, timestamp: daysAgo(3, 21), loggedBy: 'Lab Tech Samuel' },
      { category: 'Investigation', description: 'Comprehensive Metabolic Panel (CMP)', quantity: 1, unitPrice: 55, timestamp: daysAgo(3, 20), loggedBy: 'Lab Tech Samuel' },
      { category: 'Consultation', description: 'Attending Physician Daily Round', quantity: 1, unitPrice: 65, timestamp: daysAgo(3, 18), loggedBy: 'Dr. Anita Roy' },

      // Day 2
      { category: 'Room', description: 'General Ward Bed (per day)', quantity: 1, unitPrice: 180, timestamp: daysAgo(3, 0), loggedBy: 'Ward Clerk Kevin' },
      { category: 'Medication', description: 'Paracetamol IV Infusion 1000mg', quantity: 2, unitPrice: 18, timestamp: daysAgo(2, 20), loggedBy: 'Nurse Carlos T.' },
      { category: 'Medication', description: 'Pantoprazole IV 40mg Injection', quantity: 1, unitPrice: 16, timestamp: daysAgo(2, 18), loggedBy: 'Nurse Carlos T.' },
      { category: 'Medication', description: 'Ceftriaxone Sodium IV 1g Injection', quantity: 2, unitPrice: 32, timestamp: daysAgo(2, 16), loggedBy: 'Nurse Carlos T.' },
      { category: 'Consultation', description: 'Attending Physician Daily Round', quantity: 1, unitPrice: 65, timestamp: daysAgo(2, 12), loggedBy: 'Dr. Anita Roy' },

      // Day 3
      { category: 'Room', description: 'General Ward Bed (per day)', quantity: 1, unitPrice: 180, timestamp: daysAgo(2, 0), loggedBy: 'Ward Clerk Kevin' },
      { category: 'Investigation', description: '12-Lead Electrocardiogram (ECG)', quantity: 1, unitPrice: 45, timestamp: daysAgo(1, 20), loggedBy: 'Nurse Priya M.' },
      { category: 'Medication', description: 'Normal Saline 0.9% IV (500 ml)', quantity: 2, unitPrice: 9, timestamp: daysAgo(1, 16), loggedBy: 'Nurse Priya M.' },
      { category: 'Consultation', description: 'Specialist Consultation (Gastroenterology)', quantity: 1, unitPrice: 120, timestamp: daysAgo(1, 14), loggedBy: 'Dr. Rajiv Menon' },

      // Day 4
      { category: 'Room', description: 'General Ward Bed (per day)', quantity: 1, unitPrice: 180, timestamp: daysAgo(1, 0), loggedBy: 'Ward Clerk Kevin' },
      { category: 'Disposable/Consumable', description: 'Sterile Wound Dressing Kit', quantity: 1, unitPrice: 22, timestamp: hoursAgo(6), loggedBy: 'Nurse Priya M.' },
    ];

    rameshCharges.forEach((c, idx) => {
      const id = `ch-pat1-${idx + 1}`;
      const entry: ChargeEntry = {
        ...c,
        id,
        patientId: 'pat-1',
        total: c.quantity * c.unitPrice,
      };
      this.charges.set(id, entry);
    });

    // Seed Elena (pat-2) charges
    const elenaCharges = [
      { category: 'Room', description: 'Semi-Private Room (per day)', quantity: 2, unitPrice: 320, timestamp: daysAgo(2), loggedBy: 'Nurse Carlos T.' },
      { category: 'Procedure', description: 'Laparoscopic Surgical Tray & Recovery', quantity: 1, unitPrice: 480, timestamp: daysAgo(2, 3), loggedBy: 'Dr. David Miller' },
      { category: 'Disposable/Consumable', description: 'Sterile Wound Dressing Kit', quantity: 2, unitPrice: 22, timestamp: daysAgo(1, 5), loggedBy: 'Nurse Carlos T.' },
      { category: 'Medication', description: 'Paracetamol IV Infusion 1000mg', quantity: 2, unitPrice: 18, timestamp: daysAgo(1), loggedBy: 'Nurse Carlos T.' },
      { category: 'Consultation', description: 'Attending Physician Daily Round', quantity: 2, unitPrice: 65, timestamp: hoursAgo(8), loggedBy: 'Dr. David Miller' },
    ];
    elenaCharges.forEach((c, idx) => {
      const id = `ch-pat2-${idx + 1}`;
      this.charges.set(id, {
        ...c,
        category: c.category as any,
        id,
        patientId: 'pat-2',
        total: c.quantity * c.unitPrice,
      });
    });

    // Seed Elena's compiled invoice
    const elenaGross = 2 * 320 + 480 + 2 * 22 + 2 * 18 + 2 * 65; // 640 + 480 + 44 + 36 + 130 = 1330
    const elenaDeposit = 350;
    const elenaCompiled: CompiledInvoiceData = {
      patientId: 'pat-2',
      patientName: 'Elena Rostova',
      bedNumber: 'Bed 08',
      admitDate: pat2.admitDate,
      eventDate: hoursAgo(3),
      eventType: 'Planned Discharge',
      grossTotal: elenaGross,
      advanceDeposit: elenaDeposit,
      totalDue: elenaGross - elenaDeposit,
      groupedCharges: [
        {
          category: 'Room',
          subtotal: 640,
          items: [{ id: 'ch-pat2-1', description: 'Semi-Private Room (per day)', quantity: 2, unitPrice: 320, total: 640, timestamp: daysAgo(2), loggedBy: 'Nurse Carlos T.' }],
        },
        {
          category: 'Procedure',
          subtotal: 480,
          items: [{ id: 'ch-pat2-2', description: 'Laparoscopic Surgical Tray & Recovery', quantity: 1, unitPrice: 480, total: 480, timestamp: daysAgo(2, 3), loggedBy: 'Dr. David Miller' }],
        },
        {
          category: 'Disposable/Consumable',
          subtotal: 44,
          items: [{ id: 'ch-pat2-3', description: 'Sterile Wound Dressing Kit', quantity: 2, unitPrice: 22, total: 44, timestamp: daysAgo(1, 5), loggedBy: 'Nurse Carlos T.' }],
        },
        {
          category: 'Medication',
          subtotal: 36,
          items: [{ id: 'ch-pat2-4', description: 'Paracetamol IV Infusion 1000mg', quantity: 2, unitPrice: 18, total: 36, timestamp: daysAgo(1), loggedBy: 'Nurse Carlos T.' }],
        },
        {
          category: 'Consultation',
          subtotal: 130,
          items: [{ id: 'ch-pat2-5', description: 'Attending Physician Daily Round', quantity: 2, unitPrice: 65, total: 130, timestamp: hoursAgo(8), loggedBy: 'Dr. David Miller' }],
        },
      ],
      flags: [
        {
          id: 'flag-e1',
          severity: 'info',
          message: 'Post-op dressing kits match standard protocol for 2-day laparoscopic recovery.',
          relatedEntryIds: ['ch-pat2-3'],
          status: 'resolved',
        },
      ],
      familySummary: 'Elena has recovered smoothly following her laparoscopic gallbladder procedure. The bill includes 2 days of semi-private accommodation, operating suite consumables, post-operative analgesics, and daily surgeon evaluations. Her $350 advance deposit has been deducted.',
      suggestedCoverNote: 'Discharge statement for Elena Rostova - surgical post-op clearance pending billing approval.',
      compiledAt: hoursAgo(3),
    };

    const elenaInvoice: InvoiceRecord = {
      id: 'WL-INV-1040',
      invoiceNumber: 'WL-INV-1040',
      patientId: 'pat-2',
      compiledData: elenaCompiled,
      status: 'Draft',
      paymentLink: '/pay/WL-INV-1040',
      createdAt: hoursAgo(3),
    };
    this.invoices.set('WL-INV-1040', elenaInvoice);
    pat2.currentInvoiceId = 'WL-INV-1040';

    // Seed Marcus Vance (pat-3) charges & invoice (Awaiting Payment)
    const marcusGross = 1850;
    const marcusInvoice: InvoiceRecord = {
      id: 'WL-INV-1039',
      invoiceNumber: 'WL-INV-1039',
      patientId: 'pat-3',
      compiledData: {
        patientId: 'pat-3',
        patientName: 'Marcus Vance',
        bedNumber: 'Bed 04',
        admitDate: pat3.admitDate,
        eventDate: hoursAgo(5),
        eventType: 'Planned Discharge',
        grossTotal: marcusGross,
        advanceDeposit: 1000,
        totalDue: marcusGross - 1000,
        groupedCharges: [
          {
            category: 'Room',
            subtotal: 1100,
            items: [{ id: 'ch-m1', description: 'Semi-Private Room (per day)', quantity: 3, unitPrice: 320, total: 960, timestamp: daysAgo(5), loggedBy: 'Ward Clerk Kevin' }],
          },
          {
            category: 'Investigation',
            subtotal: 450,
            items: [
              { id: 'ch-m2', description: '12-Lead Electrocardiogram (ECG)', quantity: 2, unitPrice: 45, total: 90, timestamp: daysAgo(4), loggedBy: 'Nurse Priya M.' },
              { id: 'ch-m3', description: 'Cardiac Troponin & Enzyme Panel', quantity: 3, unitPrice: 120, total: 360, timestamp: daysAgo(3), loggedBy: 'Lab Tech Samuel' },
            ],
          },
          {
            category: 'Consultation',
            subtotal: 300,
            items: [
              { id: 'ch-m4', description: 'Specialist Consultation (Cardiology)', quantity: 2, unitPrice: 120, total: 240, timestamp: daysAgo(2), loggedBy: 'Dr. Sarah Lin' },
              { id: 'ch-m5', description: 'Clinical Nutrition & Dietetics Consult', quantity: 1, unitPrice: 60, total: 60, timestamp: daysAgo(1), loggedBy: 'Dietitian Sarah' },
            ],
          },
        ],
        flags: [],
        familySummary: 'Marcus completed 5 days in cardiology step-down observation. Cardiac enzyme markers have normalized. The statement reflects daily bed monitoring, cardiac laboratory profiles, and specialist cardiology reviews, offset by the $1,000 advance deposit.',
        suggestedCoverNote: 'Final inpatient settlement for Marcus Vance. PayPal payment link dispatched to family liaison.',
        compiledAt: hoursAgo(5),
      },
      status: 'Sent',
      paymentLink: '/pay/WL-INV-1039',
      createdAt: hoursAgo(5),
    };
    this.invoices.set('WL-INV-1039', marcusInvoice);

    // Seed Amina (pat-4) invoice (Financially Cleared)
    const aminaGross = 1120;
    const aminaInvoice: InvoiceRecord = {
      id: 'WL-INV-1035',
      invoiceNumber: 'WL-INV-1035',
      patientId: 'pat-4',
      compiledData: {
        patientId: 'pat-4',
        patientName: 'Amina Al-Mansoor',
        bedNumber: 'Bed 19',
        admitDate: pat4.admitDate,
        eventDate: hoursAgo(12),
        eventType: 'Planned Discharge',
        grossTotal: aminaGross,
        advanceDeposit: 800,
        totalDue: aminaGross - 800,
        groupedCharges: [
          {
            category: 'Room',
            subtotal: 540,
            items: [{ id: 'ch-a1', description: 'General Ward Bed (per day)', quantity: 3, unitPrice: 180, total: 540, timestamp: daysAgo(3), loggedBy: 'Ward Clerk Kevin' }],
          },
          {
            category: 'Medication',
            subtotal: 260,
            items: [{ id: 'ch-a2', description: 'Ceftriaxone Sodium IV 1g Injection', quantity: 6, unitPrice: 32, total: 192, timestamp: daysAgo(2), loggedBy: 'Nurse Priya M.' }],
          },
          {
            category: 'Investigation',
            subtotal: 190,
            items: [{ id: 'ch-a3', description: 'Portable Digital Chest X-Ray (AP View)', quantity: 2, unitPrice: 70, total: 140, timestamp: daysAgo(3), loggedBy: 'Radiology Tech Leo' }],
          },
          {
            category: 'Consultation',
            subtotal: 130,
            items: [{ id: 'ch-a4', description: 'Attending Physician Daily Round', quantity: 2, unitPrice: 65, total: 130, timestamp: daysAgo(1), loggedBy: 'Dr. Anita Roy' }],
          },
        ],
        flags: [],
        familySummary: 'Amina has completed successful antibiotic resolution for community-acquired pneumonia. The balance of $320 due after the $800 deposit has been fully settled via PayPal.',
        suggestedCoverNote: 'Discharge settlement receipt for Amina Al-Mansoor. Account financially cleared.',
        compiledAt: hoursAgo(12),
      },
      status: 'Paid',
      paymentLink: '/pay/WL-INV-1035',
      createdAt: hoursAgo(12),
      paidAt: hoursAgo(10),
      paymentReference: 'PAYPAL-REF-849201',
      paymentMethod: 'PayPal (USD Direct)',
    };
    this.invoices.set('WL-INV-1035', aminaInvoice);

    // Seed Devin Hayes (pat-5) initial charges
    const devinCharges = [
      { category: 'Room', description: 'General Ward Bed (per day)', quantity: 1, unitPrice: 180, timestamp: daysAgo(1), loggedBy: 'Ward Clerk Kevin' },
      { category: 'Investigation', description: 'Complete Blood Count (CBC) with Platelets', quantity: 1, unitPrice: 35, timestamp: daysAgo(1, 2), loggedBy: 'Lab Tech Samuel' },
      { category: 'Consultation', description: 'Specialist Consultation (Orthopedics)', quantity: 1, unitPrice: 120, timestamp: hoursAgo(14), loggedBy: 'Dr. Robert Zhao' },
      { category: 'Medication', description: 'Paracetamol IV Infusion 1000mg', quantity: 1, unitPrice: 18, timestamp: hoursAgo(8), loggedBy: 'Nurse Carlos T.' },
    ];
    devinCharges.forEach((c, idx) => {
      const id = `ch-pat5-${idx + 1}`;
      this.charges.set(id, {
        ...c,
        category: c.category as any,
        id,
        patientId: 'pat-5',
        total: c.quantity * c.unitPrice,
      });
    });

    // Seed initial activity log
    this.activityLog = [
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
  }

  // --- Patients ---
  getPatients(): Patient[] {
    return Array.from(this.patients.values());
  }

  getPatient(id: string): Patient | undefined {
    return this.patients.get(id);
  }

  updatePatientStatus(id: string, status: Patient['status'], invoiceId?: string) {
    const p = this.patients.get(id);
    if (p) {
      p.status = status;
      if (invoiceId) p.currentInvoiceId = invoiceId;
    }
  }

  // --- Charges ---
  getChargesForPatient(patientId: string): ChargeEntry[] {
    return Array.from(this.charges.values())
      .filter(c => c.patientId === patientId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  addCharge(entry: Omit<ChargeEntry, 'id' | 'total'>): ChargeEntry {
    const id = `ch-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
    const newEntry: ChargeEntry = {
      ...entry,
      id,
      total: entry.quantity * entry.unitPrice,
    };
    this.charges.set(id, newEntry);

    const patient = this.patients.get(entry.patientId);
    this.logActivity({
      action: 'CHARGE_ADDED',
      actor: entry.loggedBy || 'Ward Staff',
      patientId: entry.patientId,
      patientName: patient?.name,
      details: `Added ${entry.description} (Qty: ${entry.quantity}, $${newEntry.total.toFixed(2)}) to ${patient?.bedNumber || 'bed'}.`,
    });

    return newEntry;
  }

  updateCharge(id: string, updates: Partial<ChargeEntry>, actor = 'Staff Nurse'): ChargeEntry | null {
    const existing = this.charges.get(id);
    if (!existing) return null;

    const updated: ChargeEntry = {
      ...existing,
      ...updates,
      total: (updates.quantity ?? existing.quantity) * (updates.unitPrice ?? existing.unitPrice),
    };
    this.charges.set(id, updated);

    const patient = this.patients.get(existing.patientId);
    this.logActivity({
      action: 'CHARGE_EDITED',
      actor,
      patientId: existing.patientId,
      patientName: patient?.name,
      details: `Edited charge ${updated.description} (Now Qty: ${updated.quantity}, $${updated.total.toFixed(2)}).`,
    });

    return updated;
  }

  voidCharge(id: string, reason: string, voidedBy: string): ChargeEntry | null {
    const charge = this.charges.get(id);
    if (!charge) return null;

    charge.isVoided = true;
    charge.voidReason = reason;
    charge.voidedAt = new Date().toISOString();
    charge.voidedBy = voidedBy;

    const patient = this.patients.get(charge.patientId);
    this.logActivity({
      action: 'CHARGE_VOIDED',
      actor: voidedBy,
      patientId: charge.patientId,
      patientName: patient?.name,
      details: `Voided "${charge.description}" ($${charge.total.toFixed(2)}). Reason: ${reason}`,
    });

    return charge;
  }

  // --- Discharge Events ---
  markPatientEvent(
    patientId: string,
    type: DischargeEventType,
    notes?: string,
    actor = 'Ward Supervisor'
  ): Patient | null {
    const p = this.patients.get(patientId);
    if (!p) return null;

    const isSuddenExit = type === 'Sudden Exit';

    p.dischargeEvent = {
      type,
      timestamp: new Date().toISOString(),
      notes,
      remindersPaused: isSuddenExit,
    };

    if (p.status === 'Admitted') {
      p.status = 'Discharge Initiated';
    }

    this.logActivity({
      action: 'EVENT_MARKED',
      actor,
      patientId: p.id,
      patientName: p.name,
      details: isSuddenExit
        ? `Marked Sudden Exit. Dignified liaison protocol initiated; automated billing communications paused.`
        : `Marked event "${type}" for ${p.name} (${p.bedNumber}).`,
    });

    return p;
  }

  // --- Invoices ---
  saveCompiledInvoice(invoiceData: CompiledInvoiceData): InvoiceRecord {
    const invoiceNumber = `WL-INV-${Date.now().toString().slice(-4)}`;
    const invoiceRecord: InvoiceRecord = {
      id: invoiceNumber,
      invoiceNumber,
      patientId: invoiceData.patientId,
      compiledData: invoiceData,
      status: 'Draft',
      paymentLink: `/pay/${invoiceNumber}`,
      createdAt: new Date().toISOString(),
    };

    this.invoices.set(invoiceNumber, invoiceRecord);
    this.invoices.set(invoiceRecord.id, invoiceRecord);

    const p = this.patients.get(invoiceData.patientId);
    if (p) {
      p.status = 'Invoice Ready';
      p.currentInvoiceId = invoiceNumber;
    }

    this.logActivity({
      action: 'INVOICE_COMPILED',
      actor: 'AI Clinical Billing Agent',
      patientId: invoiceData.patientId,
      patientName: invoiceData.patientName,
      details: `Compiled final invoice #${invoiceNumber} ($${invoiceData.totalDue.toFixed(2)} due after $${invoiceData.advanceDeposit} deposit). Flags: ${invoiceData.flags.length}.`,
    });

    return invoiceRecord;
  }

  getInvoice(idOrNumber: string): InvoiceRecord | undefined {
    return this.invoices.get(idOrNumber);
  }

  approveAndSendInvoice(
    invoiceNumber: string,
    updatedData?: Partial<CompiledInvoiceData>,
    familyLang = 'English',
    actor = 'Billing Desk'
  ): InvoiceRecord | null {
    const inv = this.invoices.get(invoiceNumber);
    if (!inv) return null;

    if (updatedData) {
      inv.compiledData = {
        ...inv.compiledData,
        ...updatedData,
      };
    }

    inv.status = 'Sent';
    inv.familyMessageLang = familyLang;

    const p = this.patients.get(inv.patientId);
    if (p) {
      p.status = 'Awaiting Payment';
    }

    this.logActivity({
      action: 'INVOICE_APPROVED',
      actor,
      patientId: inv.patientId,
      patientName: inv.compiledData.patientName,
      details: `Approved invoice #${invoiceNumber}. Dispatched statement and PayPal payment link in ${familyLang}.`,
    });

    return inv;
  }

  markInvoicePaid(
    invoiceNumber: string,
    paymentRef: string,
    method = 'PayPal (USD)',
    actor = 'Family (PayPal Checkout)'
  ): { invoice: InvoiceRecord; patient: Patient } | null {
    const inv = this.invoices.get(invoiceNumber);
    if (!inv) return null;

    inv.status = 'Paid';
    inv.paidAt = new Date().toISOString();
    inv.paymentReference = paymentRef;
    inv.paymentMethod = method;

    const p = this.patients.get(inv.patientId);
    if (p) {
      p.status = 'Financially Cleared';
    }

    this.logActivity({
      action: 'PAYMENT_RECEIVED',
      actor,
      patientId: inv.patientId,
      patientName: inv.compiledData.patientName,
      details: `Payment received of $${inv.compiledData.totalDue.toFixed(2)} (Ref: ${paymentRef}). Patient status updated to Financially Cleared.`,
    });

    return { invoice: inv, patient: p! };
  }

  // --- Activity Log ---
  logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) {
    const logItem: ActivityLogEntry = {
      ...entry,
      id: `act-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
    };
    this.activityLog.unshift(logItem);
  }

  getActivityLog(patientId?: string): ActivityLogEntry[] {
    if (!patientId) return this.activityLog;
    return this.activityLog.filter(a => a.patientId === patientId);
  }
}

export const store = new Store();
