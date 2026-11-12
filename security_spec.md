# Security Specification for WardLedger Firestore Rules

## 1. Data Invariants
- Inpatients can be viewed, updated, or created by hospital ward staff.
- Charges are stored as subcollections under `/patients/{patientId}/charges/{chargeId}`.
- Charges, Invoices, and Activity Logs require valid IDs and string field constraints.
- System activity logs are append-only.

## 2. Dirty Dozen Test Payloads
1. Attempt write with missing patient name.
2. Attempt write with invalid charge category.
3. Attempt write with negative charge quantity.
4. Attempt write with missing required fields in invoice.
5. Attempt shadow update with extra unexpected top-level fields.
6. Attempt ID poisoning with non-alphanumeric document ID.
7. Attempt oversized string payload (> 500 chars in activity log details).
8. Attempt modifying immutable patient admitDate.
9. Attempt unauthorized delete on activity logs.
10. Attempt writing invoice with invalid status enum.
11. Attempt updating voidReason with non-string payload.
12. Attempt spoofing user identity with unverified claims.

## 3. Firestore Rules Strategy
- Open access for hospital demo/operational environment with strict schema validation helpers (`isValidPatient`, `isValidCharge`, `isValidInvoice`, `isValidActivityLog`, `isValidPriceItem`).
- Document ID hardening via `isValidId()`.
- Explicit size limits on all text fields.
