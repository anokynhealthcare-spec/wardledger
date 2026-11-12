import { Router, Request, Response } from 'express';
import { store, PRICE_LIST } from './store.js';
import { geminiService } from './geminiService.js';
import { paypalService } from './paypalService.js';
import { DischargeEventType } from './types.js';

export const apiRouter = Router();

// GET /api/price-list - catalog of standard hospital items
apiRouter.get('/price-list', (req: Request, res: Response) => {
  res.json({ priceList: PRICE_LIST });
});

// GET /api/patients - list all patients with calculated totals
apiRouter.get('/patients', (req: Request, res: Response) => {
  const patients = store.getPatients();
  const summary = patients.map(p => {
    const charges = store.getChargesForPatient(p.id);
    const activeCharges = charges.filter(c => !c.isVoided);
    const runningTotal = activeCharges.reduce((acc, c) => acc + c.total, 0);
    const balanceDue = Math.max(0, runningTotal - p.advanceDeposit);
    const admitDate = new Date(p.admitDate);
    const daysAdmitted = Math.max(1, Math.ceil((Date.now() - admitDate.getTime()) / (1000 * 3600 * 24)));

    return {
      ...p,
      daysAdmitted,
      chargeCount: activeCharges.length,
      runningTotal,
      balanceDue,
    };
  });
  res.json({ patients: summary });
});

// GET /api/patients/:id - single patient details, charges, and current invoice
apiRouter.get('/patients/:id', (req: Request, res: Response) => {
  const patient = store.getPatient(req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const charges = store.getChargesForPatient(patient.id);
  const activeCharges = charges.filter(c => !c.isVoided);
  const runningTotal = activeCharges.reduce((acc, c) => acc + c.total, 0);
  const balanceDue = Math.max(0, runningTotal - patient.advanceDeposit);
  const admitDate = new Date(patient.admitDate);
  const daysAdmitted = Math.max(1, Math.ceil((Date.now() - admitDate.getTime()) / (1000 * 3600 * 24)));

  let currentInvoice = null;
  if (patient.currentInvoiceId) {
    currentInvoice = store.getInvoice(patient.currentInvoiceId);
  }

  res.json({
    patient: {
      ...patient,
      daysAdmitted,
      runningTotal,
      balanceDue,
    },
    charges,
    currentInvoice,
  });
});

// POST /api/patients/:id/charges - add quick charge
apiRouter.post('/patients/:id/charges', (req: Request, res: Response) => {
  const patient = store.getPatient(req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const { category, description, quantity, unitPrice, timestamp, loggedBy } = req.body;

  if (!description || !category || typeof quantity !== 'number' || typeof unitPrice !== 'number') {
    return res.status(400).json({ error: 'Missing required charge fields or invalid quantities' });
  }

  if (quantity <= 0 || unitPrice < 0) {
    return res.status(400).json({ error: 'Quantity must be positive and unit price cannot be negative' });
  }

  const newCharge = store.addCharge({
    patientId: patient.id,
    category,
    description: description.trim(),
    quantity,
    unitPrice,
    timestamp: timestamp || new Date().toISOString(),
    loggedBy: loggedBy?.trim() || 'Staff Nurse',
  });

  res.status(201).json({ charge: newCharge });
});

// PUT /api/charges/:id - edit charge
apiRouter.put('/charges/:id', (req: Request, res: Response) => {
  const { quantity, unitPrice, description, category, loggedBy } = req.body;
  const updated = store.updateCharge(
    req.params.id,
    {
      quantity,
      unitPrice,
      description,
      category,
    },
    loggedBy || 'Staff Nurse'
  );

  if (!updated) {
    return res.status(404).json({ error: 'Charge not found' });
  }

  res.json({ charge: updated });
});

// POST /api/charges/:id/void - void charge with mandatory reason
apiRouter.post('/charges/:id/void', (req: Request, res: Response) => {
  const { reason, voidedBy } = req.body;

  if (!reason || reason.trim().length < 3) {
    return res.status(400).json({ error: 'A valid clinical or clerical justification is required to void a charge' });
  }

  const voided = store.voidCharge(req.params.id, reason.trim(), voidedBy || 'Staff Nurse');
  if (!voided) {
    return res.status(404).json({ error: 'Charge not found' });
  }

  res.json({ charge: voided });
});

// POST /api/patients/:id/event - mark discharge event
apiRouter.post('/patients/:id/event', (req: Request, res: Response) => {
  const { type, notes, actor } = req.body;
  const validEvents: DischargeEventType[] = [
    'Planned Discharge',
    'Early Discharge',
    'Transfer to Another Facility',
    'Discharge Against Medical Advice',
    'Sudden Exit',
  ];

  if (!validEvents.includes(type)) {
    return res.status(400).json({ error: 'Invalid discharge event type' });
  }

  const updatedPatient = store.markPatientEvent(req.params.id, type, notes, actor || 'Ward Supervisor');
  if (!updatedPatient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  res.json({ patient: updatedPatient });
});

// POST /api/patients/:id/compile-invoice - AI compiles ledger into structured draft
apiRouter.post('/patients/:id/compile-invoice', async (req: Request, res: Response) => {
  const patient = store.getPatient(req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const charges = store.getChargesForPatient(patient.id);
  const eventType: DischargeEventType =
    req.body.eventType || patient.dischargeEvent?.type || 'Planned Discharge';

  try {
    const compiledData = await geminiService.compileInvoice(
      patient,
      charges,
      patient.advanceDeposit,
      eventType
    );

    // Save as draft invoice
    const invoiceRecord = store.saveCompiledInvoice(compiledData);

    res.json({
      invoice: invoiceRecord,
      compiledData,
    });
  } catch (err: any) {
    console.error('Error compiling invoice:', err);
    res.status(500).json({ error: 'Failed to compile invoice', details: err?.message });
  }
});

// POST /api/invoices - approve invoice & generate payment link (dispatches to family)
apiRouter.post('/invoices', async (req: Request, res: Response) => {
  const { invoiceNumber, updatedCompiledData, familyLanguage, actor } = req.body;

  if (!invoiceNumber) {
    return res.status(400).json({ error: 'invoiceNumber is required' });
  }

  const existing = store.getInvoice(invoiceNumber);
  if (!existing) {
    return res.status(404).json({ error: 'Invoice record not found' });
  }

  // Create PayPal order
  const paypalResult = await paypalService.createOrder(
    invoiceNumber,
    existing.compiledData.totalDue,
    'USD'
  );

  const approved = store.approveAndSendInvoice(
    invoiceNumber,
    {
      ...updatedCompiledData,
    },
    familyLanguage || 'English',
    actor || 'Billing Desk'
  );

  res.json({
    invoiceId: approved?.id,
    invoiceNumber: approved?.invoiceNumber,
    paymentLink: approved?.paymentLink,
    paypalOrderId: paypalResult.orderId,
    status: approved?.status,
    patientId: approved?.patientId,
  });
});

// GET /api/invoices/:id - fetch invoice
apiRouter.get('/invoices/:id', (req: Request, res: Response) => {
  const invoice = store.getInvoice(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  res.json({ invoice });
});

// GET /api/invoices/:id/status - fetch invoice status
apiRouter.get('/invoices/:id/status', async (req: Request, res: Response) => {
  const invoice = store.getInvoice(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json({
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    paidAt: invoice.paidAt,
    paymentReference: invoice.paymentReference,
  });
});

// POST /api/paypal/create-order - create PayPal sandbox order for invoice amount
apiRouter.post('/paypal/create-order', async (req: Request, res: Response) => {
  const { invoiceNumber } = req.body;
  if (!invoiceNumber) {
    return res.status(400).json({ error: 'invoiceNumber is required' });
  }

  const invoice = store.getInvoice(invoiceNumber);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const amount = invoice.compiledData.totalDue;

  try {
    const orderResult = await paypalService.createOrder(invoiceNumber, amount, 'USD');
    res.json({
      success: true,
      orderId: orderResult.orderId,
      approvalUrl: orderResult.approvalUrl,
      amount: orderResult.amount,
      currency: 'USD',
    });
  } catch (err: any) {
    console.error('PayPal create-order error:', err);
    res.status(500).json({ error: 'Failed to create PayPal sandbox order', details: err?.message });
  }
});

// POST /api/paypal/capture - capture PayPal order and mark invoice paid with actual capture ID
apiRouter.post('/paypal/capture', async (req: Request, res: Response) => {
  const { orderId, invoiceNumber, payerName } = req.body;
  if (!orderId || !invoiceNumber) {
    return res.status(400).json({ error: 'orderId and invoiceNumber are required' });
  }

  const mappedInvoice = paypalService.getInvoiceForOrder(orderId);
  if (mappedInvoice && mappedInvoice !== invoiceNumber) {
    return res.status(400).json({ error: 'Order ID does not match invoice number' });
  }

  const invoice = store.getInvoice(invoiceNumber);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  try {
    const captureResult = await paypalService.captureOrder(orderId);
    if (!captureResult.success || captureResult.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'PayPal payment capture was not completed successfully' });
    }

    const expectedAmount = Number(invoice.compiledData.totalDue.toFixed(2));
    const capturedAmount = Number(Number(captureResult.amount).toFixed(2));
    if (captureResult.currency && captureResult.currency !== 'USD') {
      return res.status(400).json({ error: 'Invalid payment currency' });
    }
    if (capturedAmount > 0 && Math.abs(capturedAmount - expectedAmount) > 0.05) {
      return res.status(400).json({ error: 'Captured payment amount does not match invoice due amount' });
    }

    const paidResult = store.markInvoicePaid(
      invoiceNumber,
      captureResult.captureId,
      'PayPal Sandbox (USD Direct)',
      payerName || 'Family Member'
    );

    res.json({
      success: true,
      captureId: captureResult.captureId,
      invoice: paidResult?.invoice,
      patient: paidResult?.patient,
    });
  } catch (err: any) {
    console.error('PayPal capture error:', err);
    res.status(500).json({ error: 'Failed to capture PayPal payment', details: err?.message });
  }
});

// POST /api/invoices/:id/share-message - generate localized family copy
apiRouter.post('/invoices/:id/share-message', async (req: Request, res: Response) => {
  const invoice = store.getInvoice(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const patient = store.getPatient(invoice.patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const language = req.body.language || 'English';
  const isSuddenExit = patient.dischargeEvent?.type === 'Sudden Exit';

  const shareData = await geminiService.generateShareMessage({
    patient,
    invoiceNumber: invoice.invoiceNumber,
    totalDue: invoice.compiledData.totalDue,
    paymentLink: `${process.env.APP_URL || ''}${invoice.paymentLink}`,
    language,
    isSuddenExit,
  });

  res.json(shareData);
});

// POST /api/invoices/:id/notify-ward - notify ward after clearance
apiRouter.post('/invoices/:id/notify-ward', (req: Request, res: Response) => {
  const invoice = store.getInvoice(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  const patient = store.getPatient(invoice.patientId);

  store.logActivity({
    action: 'WARD_NOTIFIED',
    actor: req.body.actor || 'Discharge Liaison',
    patientId: invoice.patientId,
    patientName: invoice.compiledData.patientName,
    details: `Notified Ward ${patient?.ward || ''} (${patient?.bedNumber || ''}): Financial clearance confirmed. Ready for gate pass and physical discharge.`,
  });

  res.json({
    success: true,
    message: `Ward ${patient?.ward} informed. Gate pass ready for ${patient?.name}.`,
  });
});

// POST /api/family-chat - grounded Q&A with Gemini
apiRouter.post('/family-chat', async (req: Request, res: Response) => {
  const { patientId, question, language = 'English' } = req.body;

  if (!patientId || !question) {
    return res.status(400).json({ error: 'patientId and question are required' });
  }

  const patient = store.getPatient(patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const charges = store.getChargesForPatient(patientId);

  try {
    const result = await geminiService.answerFamilyQuestion({
      patient,
      charges,
      question: question.trim(),
      language,
    });

    store.logActivity({
      action: 'FAMILY_INQUIRY',
      actor: `Family Member (${language})`,
      patientId: patient.id,
      patientName: patient.name,
      details: `Asked: "${question.length > 50 ? question.slice(0, 50) + '...' : question}"`,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Family chat error:', err);
    res.status(500).json({ error: 'Failed to process inquiry', details: err?.message });
  }
});

// GET /api/activity-log - retrieve audit trail
apiRouter.get('/activity-log', (req: Request, res: Response) => {
  const patientId = req.query.patientId as string | undefined;
  const logs = store.getActivityLog(patientId);
  res.json({ logs });
});
