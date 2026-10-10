# Dera Apna — Find Your Perfect Stay

Production-oriented PG and hostel discovery, owner management, and administrative platform built with React, TypeScript, Tailwind CSS, Firebase Authentication, Cloud Firestore, Firebase Storage, and Google Maps Platform.

---

## Project Structure

```text
Dera-Apna/
├── public/
│   ├── .well-known/
│   │   └── assetlinks.json
│   ├── brand/
│   │   ├── dera-apna-logo.png
│   │   ├── favicon.png
│   │   └── apple-touch-icon.png
│   ├── manifest.json
│   ├── metadata.json
│   └── robots.txt
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── firebase.ts
│   ├── firebase-applet-config.json
│   ├── components/
│   │   ├── AdminViews.tsx
│   │   ├── BrandLogo.tsx
│   │   ├── CascadingLocationSelector.tsx
│   │   ├── CustomerViews.tsx
│   │   ├── MapComponents.tsx
│   │   ├── OwnerViews.tsx
│   │   ├── PhotoUploadControl.tsx
│   │   └── TopBar.tsx
│   ├── config/
│   │   ├── brand.ts
│   │   └── branding.ts
│   ├── data/
│   │   └── indiaLocations.ts
│   ├── i18n/
│   │   └── translations.ts
│   ├── types/
│   │   └── models.ts
│   └── utils/
│       ├── crypto.ts
│       ├── imageCompression.ts
│       └── searchAndSort.ts
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase-applet-config.json
├── firebase-blueprint.json
├── security_spec.md
├── index.html
├── metadata.json
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Self-Contained Assets Included in Repository

- **Brand Assets (`public/brand/`)**:
  - `dera-apna-logo.png`: Official approved Dera Apna Concept #13 logo.
  - `favicon.png`: Browser favicon generated from the approved Dera Apna logo.
  - `apple-touch-icon.png`: iOS/PWA home screen icon generated from the approved Dera Apna logo.
- **Central Brand Config (`src/config/brand.ts` & `src/config/branding.ts`)**:
  - Centralizes `LOGO_PATH = '/brand/dera-apna-logo.png'`, `FAVICON_PATH`, `APPLE_TOUCH_ICON_PATH`, and `CLOUDINARY_LOGO_SOURCE`.
- **Web / PWA Metadata (`public/manifest.json`, `public/metadata.json`, `public/robots.txt`, `metadata.json`)**:
  - Configured with official Dera Apna identity and local brand icon paths.
- **Security Rules & Indexes (`firestore.rules`, `firestore.indexes.json`, `storage.rules`)**:
  - Default-deny role-based security rules for Customer, Approved PG Owner, and single official Admin account.

---

## External / Secret Configuration Requiring Manual Setup

1. **Environment Variables (`.env` from `.env.example`)**:
   - `VITE_GOOGLE_MAPS_API_KEY`: Restricted Google Maps Platform API key.
2. **Android Digital Asset Links (`public/.well-known/assetlinks.json`) — MANUAL CONFIGURATION REQUIRED**:
   - Replace `"MANUAL_CONFIGURATION_REQUIRED"` in `public/.well-known/assetlinks.json` with your verified Android `package_name` and release `sha256_cert_fingerprints` when publishing an Android APK/AAB wrapper.
3. **Firebase Cloud Storage Bucket Provisioning**:
   - Provisioning the default Firebase Cloud Storage bucket requires the Firebase project to be on the Blaze billing plan, after which `storage.rules` can be deployed via `firebase deploy --only storage`.
4. **Firebase Deployment Credentials**:
   - Authenticate with `firebase login` to deploy `firestore.rules`, `firestore.indexes.json`, and `storage.rules` when exporting outside AI Studio.

---

## Development & Build Commands

```bash
npm install
npm run dev      # Starts Vite dev server on port 3000
npm run lint     # Type-checks the project with tsc --noEmit
npm run build    # Produces production bundle in dist/
```
