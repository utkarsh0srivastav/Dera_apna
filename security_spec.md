# Dera Apna — Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default Deny**: All unmatched paths in Firestore and Cloud Storage are unconditionally denied (`allow read, write: if false;`).
2. **Role Separation & Verification**:
   - **Admin**: Strictly restricted to the single bootstrapped authorized Admin Google account (`request.auth.token.email_verified == true`) and verified `/admins/$(request.auth.uid)` document.
   - **PG Owner**: Can only create `/owners/{ownerId}` if `/ownerPreRegistrations/{mobile}` exists, has `status == 'Approved'`, and its `approvedGoogleEmail == request.auth.token.email`.
   - **Customer**: Can only read/write their own `/customers/{uid}` and `/customerSecrets/{uid}` where `uid == request.auth.uid`.
3. **Credential Isolation**:
   - PINs and Security Answers are hashed via PBKDF2-SHA256 with unique cryptographic salts and stored in `/customerSecrets/{uid}`, `/ownerSecrets/{uid}`, and `/admins/{uid}`.
   - No customer can read another customer's `/customers/{uid}` or `/customerSecrets/{uid}`.
4. **Relational Integrity (Master Gate)**:
   - Every `/pgListings/{pgId}` write requires `incoming().ownerId == request.auth.uid` and an active, non-blocked `/owners/$(request.auth.uid)` record.
   - Every `/rooms/{roomId}` write requires `incoming().ownerId == request.auth.uid` and `get(/databases/$(database)/documents/pgListings/$(incoming().pgId)).data.ownerId == request.auth.uid`.
   - Every `/inquiries/{inquiryId}` create requires `incoming().customerId == request.auth.uid`, an existing `/pgListings/$(incoming().pgId)`, and `incoming().ownerId == get(/databases/$(database)/documents/pgListings/$(incoming().pgId)).data.ownerId`.
   - Every `/advertisements/{advertisementId}` write is strictly restricted to `isAdmin()`.
5. **Temporal Integrity**:
   - Every `create` enforces `createdAt == request.time` (or `timestamp == request.time`).
   - Every `update` enforces `updatedAt == request.time` and immutability of primary/foreign ownership keys (`ownerId`, `customerId`, `pgId`, `createdAt`).

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Privilege Escalation — Self-Admin Creation)**: Unauthorized user (`evil@example.com`) attempts `setDoc(doc(db, 'admins', uid), { adminId: uid, email: 'evil@example.com', ... })` -> `PERMISSION_DENIED`.
2. **Payload 2 (Unapproved Owner Registration)**: Authenticated user attempts to create `/owners/{uid}` with a mobile number that is not `Approved` in `/ownerPreRegistrations/{mobile}` -> `PERMISSION_DENIED`.
3. **Payload 3 (Google Account Mismatch on Owner)**: User `wrong@gmail.com` attempts to claim pre-registration for mobile `9876543210` approved for `owner@gmail.com` -> `PERMISSION_DENIED`.
4. **Payload 4 (Cross-Customer PII Theft)**: Customer A attempts `getDoc(doc(db, 'customers', customerBUid))` or `getDoc(doc(db, 'customerSecrets', customerBUid))` -> `PERMISSION_DENIED`.
5. **Payload 5 (Shadow Field Injection)**: Customer attempts to update `/customers/{uid}` with `{ isAdmin: true, role: 'admin' }` -> Rejected by `hasOnly()` schema check (`PERMISSION_DENIED`).
6. **Payload 6 (Cross-Owner PG Modification)**: Owner A attempts to update `/pgListings/{pgB}` owned by Owner B -> `PERMISSION_DENIED`.
7. **Payload 7 (Orphaned Room Creation)**: Owner A attempts to create a room with `pgId` belonging to Owner B -> `PERMISSION_DENIED`.
8. **Payload 8 (Fake Sponsorship Creation by Owner)**: Owner attempts `setDoc(doc(db, 'advertisements', adId), ...)` -> `PERMISSION_DENIED`.
9. **Payload 9 (Cross-Owner Inquiry Snooping)**: Owner A queries `/inquiries` where `ownerId == ownerB` -> `PERMISSION_DENIED`.
10. **Payload 10 (Spoofed Inquiry Creation)**: Customer A attempts to create an inquiry with `customerId: customerBUid` -> `PERMISSION_DENIED`.
11. **Payload 11 (Timestamp Forgery)**: Client sends `createdAt: Timestamp.fromMillis(1000000)` instead of `serverTimestamp()` -> `PERMISSION_DENIED`.
12. **Payload 12 (Resource Exhaustion / Oversized Payload)**: Client sends a 50,000-character string in `propertyName` or `comment` -> `PERMISSION_DENIED`.
