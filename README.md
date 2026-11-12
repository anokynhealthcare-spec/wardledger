# WardLedger

> **"Live inpatient billing that turns ward activity into one clear invoice, and clears discharge when it's paid."**

WardLedger eliminates the stressful last-minute hospital discharge billing bottleneck. By capturing charges live at the bedside, running server-side AI audits to catch anomalies, and generating secure PayPal checkout links for families locally and abroad, inpatient discharge delay is reduced to zero.

---

## The Problem
In hospital inpatient wards, consumables, medications, specialist consultations, lab tests, and room-day charges are logged by multiple shift nurses, doctors, and lab technicians. Often, the final bill is only assembled at the moment of discharge—delaying family departure, causing billing errors, and confusing relatives.

## How WardLedger Solves It
1. **Live Bedside Ledger:** Ward nurses log charges in real time via a searchable 25-item hospital price catalogue.
2. **AI Invoice Compiler & Clinical Auditor (Gemini 3.8 Flash):**
   - Automatically groups charges into transparent categories (Room, Consultation, Procedure, Medication, Consumables, Labs).
   - Reconciles advance deposits against total gross charges.
   - Audits for discrepancies: duplicate entries within short intervals, procedures lacking sterile consumables/drapes, stay-duration room mismatches, excessive quantities, and voided charges lacking clinical justification.
   - Drafts compassionate, jargon-free plain-language summaries for patients and families.
3. **Ethics-First Sudden Exit Protocol:**
   - Designed for bereavement care (patient demise). Automatically halts all reminder notifications, collection-style messages, or urgent payment prompts, routing the statement directly to a dedicated hospital family liaison.
4. **PayPal Settlement for Local & Overseas Relatives:**
   - Generates instant PayPal checkout links in USD, allowing overseas relatives to settle bills remotely with direct card or PayPal account options.
   - Automatically updates patient status to **Financially Cleared** upon payment and triggers a gate pass notification to the ward nurse station.
5. **Grounded Multilingual Family Chat:**
   - An "Ask about my bill" Q&A assistant grounded strictly in the patient's actual ledger records, available in **English, Tamil, Hindi, Telugu, and Malayalam**.

---

## Technology Stack
- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend:** Node.js, Express, tsx.
- **AI Engine:** Google Gemini (`gemini-3.8-flash`) via the official `@google/genai` TypeScript SDK (server-side only, no exposed keys).
- **Payment Architecture:** `paypalService` module (currently running high-fidelity sandbox simulations ready for PayPal Invoicing API).

---

## Quick Start / How to Run
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables in .env
# GEMINI_API_KEY=your_gemini_api_key
# PORT=3000

# 3. Start development server (Node Express + Vite middleware)
npm run dev

# 4. Build for production
npm run build

# 5. Run production server
npm start
```

---

## Seed Verification Scenarios
1. **Bed 12 (Ramesh K.):** 4-day stay, 18 entries, $500 deposit. Click **Mark Event** -> **Planned Discharge** to trigger the AI compiler and view the audit breakdown.
2. **Duplicate Flag Test:** Log "IV Cannula" twice within a minute to test real-time duplicate anomaly detection.
3. **Procedure Consumable Test:** Add "Minor Surgical Debridement" without consumables to test missing drape/kit detection.
4. **Family Chat:** Switch role to **Family View** and ask *"Why is there a charge for a catheter?"* in English or Tamil.
5. **Sudden Exit:** Select Sudden Exit to verify that automated reminders pause and dignified wording appears.
6. **PayPal Checkout:** Click **Pay Now** to settle the remaining balance and verify the **Financially Cleared** confirmation.
