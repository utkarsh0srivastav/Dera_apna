/**
 * Dera Apna — Safe Static Shell Service Worker
 * - Caches ONLY static public shell assets (index, manifest, brand icons)
 * - NEVER caches private Customer, Owner, or Admin Firestore responses
 * - NEVER caches authenticated session or Google Auth responses
 * - Fails gracefully when offline
 */

const CACHE_NAME = 'dera-apna-shell-v3';
const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/brand/dera-apna-logo.png',
  '/brand/favicon.png',
  '/brand/favicon-32x32.png',
  '/brand/favicon-16x16.png',
  '/brand/apple-touch-icon.png',
  '/brand/icon-192.png',
  '/brand/icon-512.png',
  '/brand/icon-512-maskable.png',
  '/brand/icon-512-monochrome.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_SHELL_ASSETS))
      .catch(() => {
        // Non-fatal if any static asset fails during install
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve(false);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

function isPrivateOrApiRequest(requestUrl, request) {
  if (request.method !== 'GET') return true;
  if (request.headers && request.headers.get('Authorization')) return true;

  const host = requestUrl.hostname.toLowerCase();
  const path = requestUrl.pathname.toLowerCase();

  // Never intercept or cache Firebase, Firestore, Google Auth, Maps, or API traffic
  if (
    host.includes('googleapis.com') ||
    host.includes('firebaseio.com') ||
    host.includes('firebasestorage.app') ||
    host.includes('gstatic.com') ||
    host.includes('google.com') ||
    host.includes('googleusercontent.com') ||
    path.startsWith('/__/auth') ||
    path.startsWith('/api/')
  ) {
    return true;
  }

  return false;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  let requestUrl;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (isPrivateOrApiRequest(requestUrl, request)) {
    return;
  }

  // Navigation requests: network-first, fall back to cached shell offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then(
          (cached) =>
            cached ||
            new Response('Offline — Please check your internet connection and try again.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
        )
      )
    );
    return;
  }

  // Static public shell assets (/brand/*, /manifest.json, /assets/*)
  const isStaticAsset =
    STATIC_SHELL_ASSETS.includes(requestUrl.pathname) ||
    requestUrl.pathname.startsWith('/brand/') ||
    requestUrl.pathname.startsWith('/assets/');

  if (isStaticAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic' &&
            !response.headers.get('Cache-Control')?.includes('no-store')
          ) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response('', {
                status: 504,
                statusText: 'Offline',
              })
          )
        )
    );
  }
});
