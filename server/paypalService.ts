/**
 * PayPal Sandbox REST API Checkout Service
 * Uses PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET from server environment variables.
 * Missing credentials return an explicit error without simulated payment success.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
const ORDERS_COL = 'paypalOrders';

export interface PayPalOrderResponse {
  orderId: string;
  approvalUrl: string;
  amount: number;
}

export interface PayPalCaptureResponse {
  success: boolean;
  captureId: string;
  status: string;
  amount: string;
  currency: string;
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials (PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET) are missing. Explicit error returned without simulated payment success.');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to obtain PayPal Sandbox access token: ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export const paypalService = {
  async mapOrderToInvoice(orderId: string, invoiceNumber: string): Promise<void> {
    try {
      await setDoc(doc(db, ORDERS_COL, orderId), {
        orderId,
        invoiceNumber,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to map order to invoice in Firestore:', err);
    }
  },

  async getInvoiceForOrder(orderId: string): Promise<string | undefined> {
    try {
      const snap = await getDoc(doc(db, ORDERS_COL, orderId));
      if (snap.exists()) {
        return snap.data()?.invoiceNumber;
      }
    } catch (err) {
      console.error('Failed to fetch invoice for order from Firestore:', err);
    }
    return undefined;
  },

  async createOrder(invoiceNumber: string, amount: number, currency = 'USD'): Promise<PayPalOrderResponse> {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: invoiceNumber,
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
            description: `WardLedger Inpatient Statement Settlement - Invoice #${invoiceNumber}`,
          },
        ],
        application_context: {
          return_url: `${process.env.APP_URL || 'http://localhost:3000'}/pay/success`,
          cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/pay/cancel`,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PayPal Sandbox create order error: ${errText}`);
    }

    const data = await response.json();
    const orderId = data.id;
    const approvalLink = data.links?.find((l: any) => l.rel === 'approve');

    await this.mapOrderToInvoice(orderId, invoiceNumber);

    return {
      orderId,
      approvalUrl: approvalLink?.href || `/pay/${invoiceNumber}`,
      amount,
    };
  },

  async captureOrder(orderId: string): Promise<PayPalCaptureResponse> {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PayPal Sandbox capture order error: ${errText}`);
    }

    const data = await response.json();
    const status = data.status; // 'COMPLETED'
    const captureUnit = data.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = captureUnit?.id || `CAP-${Date.now()}`;
    const amount = captureUnit?.amount?.value || '0.00';
    const currency = captureUnit?.amount?.currency_code || 'USD';

    return {
      success: status === 'COMPLETED',
      captureId,
      status,
      amount,
      currency,
    };
  },
};
