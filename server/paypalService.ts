/**
 * PayPal Invoicing & Payment Service
 * Currently mock implementations ready to be swapped with PayPal Sandbox REST API in the next phase.
 */

export interface MockPayPalInvoice {
  paypalInvoiceId: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
  amount: number;
  currency: string;
  paymentUrl: string;
  createTime: string;
  paidTime?: string;
  transactionId?: string;
  payerEmail?: string;
}

// In-memory registry of mock PayPal invoices
const mockInvoices = new Map<string, MockPayPalInvoice>();

let invoiceCounter = 1042;

export const paypalService = {
  /**
   * Generates a PayPal invoice draft and returns checkout URL
   */
  async createInvoice(params: {
    patientId: string;
    patientName: string;
    amount: number;
    description: string;
    currency?: string;
  }): Promise<{
    paypalInvoiceId: string;
    invoiceNumber: string;
    paymentUrl: string;
  }> {
    invoiceCounter += 1;
    const invoiceNumber = `WL-INV-${invoiceCounter}`;
    const paypalInvoiceId = `PAYPAL-INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const currency = params.currency || 'USD';
    const paymentUrl = `/pay/${invoiceNumber}`;

    const invoice: MockPayPalInvoice = {
      paypalInvoiceId,
      invoiceNumber,
      status: 'SENT',
      amount: params.amount,
      currency,
      paymentUrl,
      createTime: new Date().toISOString(),
    };

    mockInvoices.set(invoiceNumber, invoice);
    mockInvoices.set(paypalInvoiceId, invoice);

    return {
      paypalInvoiceId,
      invoiceNumber,
      paymentUrl,
    };
  },

  /**
   * Retrieves invoice status
   */
  async getInvoiceStatus(invoiceIdOrNumber: string): Promise<MockPayPalInvoice | null> {
    return mockInvoices.get(invoiceIdOrNumber) || null;
  },

  /**
   * Simulates a successful payment (PayPal checkout or card)
   */
  async processMockPayment(invoiceNumber: string, details?: { method?: string; payerName?: string }): Promise<{
    success: boolean;
    transactionId: string;
    paymentReference: string;
    paidAt: string;
  }> {
    const invoice = mockInvoices.get(invoiceNumber);
    const transactionId = `PP-TX-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const paymentReference = `PAYPAL-REF-${Math.floor(100000 + Math.random() * 900000)}`;
    const paidAt = new Date().toISOString();

    if (invoice) {
      invoice.status = 'PAID';
      invoice.paidTime = paidAt;
      invoice.transactionId = transactionId;
    }

    return {
      success: true,
      transactionId,
      paymentReference,
      paidAt,
    };
  },

  /**
   * Send reminder - returns false if reminders are paused (e.g., sudden exit)
   */
  async sendReminder(invoiceNumber: string, isPaused: boolean): Promise<{ sent: boolean; message: string }> {
    if (isPaused) {
      return {
        sent: false,
        message: 'Automated reminders are paused for this account as per hospital liaison protocol.',
      };
    }
    return {
      sent: true,
      message: 'PayPal payment reminder sent to primary contact.',
    };
  },
};
