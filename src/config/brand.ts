/**
 * Centralized Brand Asset & Identity Configuration for Dera Apna
 * Concept #13 Approved Logo Asset
 *
 * Canonical local brand assets live in /public/brand/:
 * - /brand/dera-apna-logo.png
 * - /brand/favicon.png
 * - /brand/apple-touch-icon.png
 *
 * Official Admin Google Identity is verified via irreversible SHA-256 digest
 * so the private Admin email address is never exposed in source code or UI.
 */

import { sha256HexSync } from '../utils/crypto';

export const LOGO_PATH = '/brand/dera-apna-logo.png';
export const FAVICON_PATH = '/brand/favicon.png';
export const APPLE_TOUCH_ICON_PATH = '/brand/apple-touch-icon.png';
export const CLOUDINARY_LOGO_SOURCE =
  'https://res.cloudinary.com/rzuikrlw/image/upload/f_auto,q_auto/1000486510';

const OFFICIAL_ADMIN_EMAIL_SHA256 =
  'a3b479fb4acc839b57f50f06f48f99b91c0b66a1591ad531aea9514cde711bec';

export interface BrandingConfig {
  appName: string;
  tagline: string;
  logoUrl: string;
  fallbackLogoUrl: string;
  faviconUrl: string;
  appleTouchIconUrl: string;
  authorizedAdminEmailHash: string;
}

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return sha256HexSync(normalized) === OFFICIAL_ADMIN_EMAIL_SHA256;
}

export const BRANDING: BrandingConfig = {
  appName: 'Dera Apna',
  tagline: 'Find Your Perfect Stay',
  logoUrl: LOGO_PATH,
  fallbackLogoUrl: CLOUDINARY_LOGO_SOURCE,
  faviconUrl: FAVICON_PATH,
  appleTouchIconUrl: APPLE_TOUCH_ICON_PATH,
  authorizedAdminEmailHash: OFFICIAL_ADMIN_EMAIL_SHA256,
};

export const CONTROLLED_SECURITY_QUESTIONS: readonly string[] = [
  'What was the name of your first school?',
  'What is your favorite childhood place?',
  'What was your childhood nickname?',
  'What was your favorite subject?',
  'What is the name of a memorable place?',
] as const;

