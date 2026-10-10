/**
 * Image Validation & Automatic Compression Utility (Parts 23–28)
 * Target size: ~200 KB to 250 KB while preserving aspect ratio, EXIF orientation, and visual legibility.
 * Also provides cryptographic Device ID Hashing and Trusted Device management (Parts 8–19).
 */

export interface CompressedImageResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  mimeType: string;
}

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024; // 15 MB max raw input before compression
const TARGET_MIN_BYTES = 200 * 1024; // 200 KB target minimum
const TARGET_MAX_BYTES = 250 * 1024; // 250 KB target maximum

/**
 * Validates file signature (magic bytes) to prevent disguised non-image uploads.
 */
export async function validateImageMagicBytes(file: File): Promise<boolean> {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
    return false;
  }
  const slice = file.slice(0, 12);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4) return false;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return true;
  }
  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }
  return false;
}

/**
 * Reads, validates, corrects EXIF orientation, resizes (preserving aspect ratio),
 * and compresses an image targeting ~200 KB – 250 KB without destroying visual quality.
 */
export async function compressAndValidateImage(rawFile: File): Promise<CompressedImageResult> {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(rawFile.type.toLowerCase())) {
    throw new Error('Unsupported file format. Only JPG, JPEG, PNG, and WebP images are accepted.');
  }
  if (rawFile.size <= 0) {
    throw new Error('Selected image file is empty.');
  }
  if (rawFile.size > MAX_RAW_FILE_BYTES) {
    throw new Error('Original image exceeds 15 MB limit. Please select a valid photo.');
  }

  const validSignature = await validateImageMagicBytes(rawFile);
  if (!validSignature) {
    throw new Error(
      'File content failed image signature validation. Only genuine JPG, PNG, or WebP images are permitted.'
    );
  }

  // Correct orientation from EXIF metadata where supported by the browser
  let imageBitmap: ImageBitmap;
  try {
    imageBitmap = await createImageBitmap(rawFile, { imageOrientation: 'from-image' });
  } catch {
    imageBitmap = await createImageBitmap(rawFile);
  }

  const origWidth = imageBitmap.width;
  const origHeight = imageBitmap.height;

  // Preserve original aspect ratio while capping max dimension to 1600px
  const maxDimension = 1600;
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (origWidth > maxDimension || origHeight > maxDimension) {
    const ratio = origWidth / origHeight;
    if (origWidth >= origHeight) {
      targetWidth = maxDimension;
      targetHeight = Math.round(maxDimension / ratio);
    } else {
      targetHeight = maxDimension;
      targetWidth = Math.round(maxDimension * ratio);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    imageBitmap.close();
    throw new Error('Canvas 2D context unavailable for image optimization.');
  }

  // Fill white background before drawing in case of transparent PNG converted to JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  imageBitmap.close();

  const outputMime = 'image/jpeg';
  const qualities = [0.92, 0.86, 0.8, 0.74, 0.68, 0.6, 0.52];
  let chosenBlob: Blob | null = null;

  for (const q of qualities) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), outputMime, q)
    );
    if (!blob) continue;
    chosenBlob = blob;
    if (blob.size <= TARGET_MAX_BYTES && blob.size >= TARGET_MIN_BYTES) {
      break;
    }
    if (blob.size < TARGET_MIN_BYTES) {
      // Already below 200 KB at high quality; do not degrade visual quality further
      break;
    }
  }

  if (chosenBlob && chosenBlob.size > TARGET_MAX_BYTES) {
    // Scale down canvas slightly (e.g. max 1150px) while preserving aspect ratio
    const scale = Math.min(1, 1150 / Math.max(targetWidth, targetHeight));
    targetWidth = Math.max(320, Math.round(targetWidth * scale));
    targetHeight = Math.max(240, Math.round(targetHeight * scale));
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = targetWidth;
    smallCanvas.height = targetHeight;
    const smallCtx = smallCanvas.getContext('2d');
    if (smallCtx) {
      smallCtx.fillStyle = '#FFFFFF';
      smallCtx.fillRect(0, 0, targetWidth, targetHeight);
      smallCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
      for (const q of [0.78, 0.7, 0.62, 0.54]) {
        const b = await new Promise<Blob | null>((resolve) =>
          smallCanvas.toBlob((res) => resolve(res), outputMime, q)
        );
        if (b) {
          chosenBlob = b;
          if (b.size <= TARGET_MAX_BYTES) break;
        }
      }
    }
  }

  if (!chosenBlob) {
    throw new Error('Failed to optimize image.');
  }

  const cleanBaseName = rawFile.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const optimizedFile = new File([chosenBlob], `${cleanBaseName || 'photo'}_opt.jpg`, {
    type: outputMime,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    originalBytes: rawFile.size,
    compressedBytes: optimizedFile.size,
    width: targetWidth,
    height: targetHeight,
    mimeType: outputMime,
  };
}

/**
 * Converts a validated, compressed image File into a base64 Data URL for Firebase persistence.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode compressed image.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read compressed image file.'));
    reader.readAsDataURL(file);
  });
}

const TRUSTED_DEVICE_STORAGE_KEY = 'dera_apna_trusted_device_id_v1';

/**
 * Returns or generates a persistent cryptographic device identifier for Trusted Device sessions.
 */
export function getOrCreateTrustedDeviceId(): string {
  let existing = localStorage.getItem(TRUSTED_DEVICE_STORAGE_KEY);
  if (existing && /^[a-zA-Z0-9_-]{12,64}$/.test(existing)) {
    return existing;
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  existing = `dev_${hex}`;
  localStorage.setItem(TRUSTED_DEVICE_STORAGE_KEY, existing);
  return existing;
}

/**
 * Computes a non-reversible SHA-256 hash of the device identifier so raw device tokens
 * are not exposed in `deviceLoginRequests` or `trustedDeviceSessions` (Part 10).
 */
export async function getDeviceIdHash(): Promise<string> {
  const rawDeviceId = getOrCreateTrustedDeviceId();
  const encoded = new TextEncoder().encode(`dera_apna_device_v1:${rawDeviceId}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashBytes = new Uint8Array(hashBuffer);
  const hex = Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `dhash_${hex.slice(0, 40)}`;
}

/**
 * Rotates the local device identifier (used on Complete Sign Out or when testing New Device flow).
 */
export function rotateLocalDeviceId(): string {
  localStorage.removeItem(TRUSTED_DEVICE_STORAGE_KEY);
  return getOrCreateTrustedDeviceId();
}

/**
 * Returns non-sensitive device label and platform summary for Admin New Device Approval view (Part 10 & 11).
 */
export function getDeviceMetadata(): { deviceName: string; platform: string } {
  if (typeof navigator === 'undefined') {
    return { deviceName: 'Web Browser', platform: 'Web' };
  }
  const ua = navigator.userAgent || '';
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Apple Safari';

  let os = 'Desktop';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Win/i.test(ua)) os = 'Windows';
  else if (/Mac/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return {
    deviceName: `${browser} on ${os}`,
    platform: os,
  };
}

export function clearLocalTrustedDeviceState(): void {
  localStorage.removeItem(TRUSTED_DEVICE_STORAGE_KEY);
  localStorage.removeItem('dera_apna_trusted_owner_mobile');
  localStorage.removeItem('dera_apna_trusted_admin_email');
  localStorage.removeItem('dera_apna_trusted_admin_uid');
}

