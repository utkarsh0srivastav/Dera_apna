/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { WifiOff } from 'lucide-react';

import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  handleFirestoreListenerError,
  OperationType,
  storage,
} from './firebase';
import { CONTROLLED_SECURITY_QUESTIONS, isAuthorizedAdminEmail } from './config/branding';
import {
  buildCustomAreaId,
  findDuplicateAreaInCity,
  mergeLocationNodes,
  validateCustomAreaName,
} from './data/indiaLocations';
import { TRANSLATIONS } from './i18n/translations';
import {
  AdvertisementRecord,
  AppRole,
  AuditLogRecord,
  CustomerProfile,
  DeviceLoginRequest,
  InquiryRecord,
  LocationNode,
  OwnerPreRegistration,
  OwnerProfile,
  PgListing,
  ReviewRecord,
  RoomRecord,
  SearchFilterState,
  SupportedLanguage,
  ThemeMode,
  UploadedPhotoMetadata,
  VisitRecord,
} from './types/models';
import {
  hashPin,
  hashSecurityAnswer,
  isValidIndianMobile,
  isValidPinFormat,
  sanitizeInput,
  verifyPin,
  verifySecurityAnswer,
} from './utils/crypto';
import {
  clearLocalTrustedDeviceState,
  fileToDataUrl,
  getDeviceIdHash,
  getDeviceMetadata,
  getOrCreateTrustedDeviceId,
  rotateLocalDeviceId,
} from './utils/imageCompression';
import { DEFAULT_SEARCH_FILTERS } from './utils/searchAndSort';
import { TopBar } from './components/TopBar';
import {
  CustomerHomeView,
  CustomerLoginView,
  CustomerRegisterView,
  PgDetailView,
  PublicEntryView,
  RoomDetailView,
} from './components/CustomerViews';
import { OwnerDashboardTab, OwnerDashboardView, OwnerLoginView } from './components/OwnerViews';
import { AdminDashboardView, AdminLoginView } from './components/AdminViews';

type ViewScreen =
  | 'public_entry'
  | 'customer_login'
  | 'customer_register'
  | 'explore'
  | 'pg_detail'
  | 'room_detail'
  | 'owner_login'
  | 'owner_dashboard'
  | 'admin_login'
  | 'admin_dashboard';

type AuthResolutionState = 'initializing' | 'public' | 'resolving' | 'authorized' | 'unauthorized';

export default function App() {
  // Theme & Language Persistence
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('dera_apna_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('dera_apna_lang') as SupportedLanguage;
    return saved && TRANSLATIONS[saved] ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('dera_apna_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('dera_apna_lang', language);
  }, [language]);

  const t = useCallback(
    (key: string): string => {
      return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
    },
    [language]
  );

  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Network & GMP Quota States
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onGmpQuota = () => setGmpQuotaExceeded(true);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('gmp-quota-exceeded', onGmpQuota);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('gmp-quota-exceeded', onGmpQuota);
    };
  }, []);

  // Navigation Stack
  const [screenHistory, setScreenHistory] = useState<ViewScreen[]>(['public_entry']);
  const currentScreen = screenHistory[screenHistory.length - 1];

  const navigateTo = (next: ViewScreen) => {
    setScreenHistory((prev) => [...prev, next]);
    setAuthError(null);
  };

  const navigateBack = () => {
    setScreenHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : ['public_entry']));
    setAuthError(null);
  };

  // ============================================================
  // ROLE & AUTHENTICATION STATE MACHINE (Sections 7, 8, 47, 48)
  // ============================================================
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authResolution, setAuthResolution] = useState<AuthResolutionState>('initializing');
  const [roleResolving, setRoleResolving] = useState<boolean>(false);

  const [customerSession, setCustomerSession] = useState<CustomerProfile | null>(null);
  const [ownerSession, setOwnerSession] = useState<OwnerProfile | null>(null);
  const [ownerActiveTab, setOwnerActiveTab] = useState<OwnerDashboardTab>('overview');
  const [adminSessionActive, setAdminSessionActive] = useState<boolean>(false);
  const [adminDocVerified, setAdminDocVerified] = useState<boolean>(false);
  const [trustedAdminHasPin, setTrustedAdminHasPin] = useState<boolean>(false);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Firestore Live Data
  const [customLocations, setCustomLocations] = useState<LocationNode[]>([]);
  const [publicListings, setPublicListings] = useState<PgListing[]>([]);
  const [publicRooms, setPublicRooms] = useState<RoomRecord[]>([]);
  const [publicReviews, setPublicReviews] = useState<ReviewRecord[]>([]);
  const [activeAds, setActiveAds] = useState<AdvertisementRecord[]>([]);

  // Owner-scoped Data
  const [ownerListings, setOwnerListings] = useState<PgListing[]>([]);
  const [ownerListingsLoading, setOwnerListingsLoading] = useState<boolean>(false);
  const [ownerRooms, setOwnerRooms] = useState<RoomRecord[]>([]);
  const [ownerInquiries, setOwnerInquiries] = useState<InquiryRecord[]>([]);
  const [ownerVisits, setOwnerVisits] = useState<VisitRecord[]>([]);
  const [pendingOwnerDeviceRequest, setPendingOwnerDeviceRequest] =
    useState<DeviceLoginRequest | null>(null);

  // Admin-scoped Data
  const [adminCustomers, setAdminCustomers] = useState<CustomerProfile[]>([]);
  const [adminOwnerPreRegs, setAdminOwnerPreRegs] = useState<OwnerPreRegistration[]>([]);
  const [adminAllListings, setAdminAllListings] = useState<PgListing[]>([]);
  const [adminAllAds, setAdminAllAds] = useState<AdvertisementRecord[]>([]);
  const [adminAllInquiries, setAdminAllInquiries] = useState<InquiryRecord[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AuditLogRecord[]>([]);
  const [adminDeviceRequests, setAdminDeviceRequests] = useState<DeviceLoginRequest[]>([]);

  // Search, Selected PG, Selected Room, Geolocation & Inquiry states
  const [searchFilters, setSearchFilters] = useState<SearchFilterState>(DEFAULT_SEARCH_FILTERS);
  const [selectedPg, setSelectedPg] = useState<PgListing | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomRecord | null>(null);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submittingInquiryTargetId, setSubmittingInquiryTargetId] = useState<string | null>(null);
  const [inquirySuccessTargetIds, setInquirySuccessTargetIds] = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const allLocations = useMemo(() => mergeLocationNodes(customLocations), [customLocations]);

  /**
   * Step 1-4: Track Firebase Auth state & enforce strict role session isolation for PG_OWNER and ADMIN.
   * Note: Customers do NOT use Google Authentication; Customer sessions are managed via Mobile + PIN and verified against Firestore.
   */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setOwnerSession(null);
        setAdminSessionActive(false);
        setAdminDocVerified(false);
        setTrustedAdminHasPin(false);
        setAuthResolution((prev) => (prev === 'initializing' ? 'public' : prev));
        return;
      }

      const isOfficialAdminAccount =
        user.emailVerified && isAuthorizedAdminEmail(user.email);

      // Immediately clear any Owner/Admin session belonging to a different UID or email
      setOwnerSession((prev) => (prev && prev.ownerId === user.uid ? prev : null));
      if (!isOfficialAdminAccount) {
        setAdminSessionActive(false);
        setAdminDocVerified(false);
        setTrustedAdminHasPin(false);
      } else {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          const exists = adminDoc.exists();
          setTrustedAdminHasPin(exists);
          setAdminDocVerified(exists);
        } catch {
          setTrustedAdminHasPin(false);
          setAdminDocVerified(false);
        }
      }

      setAuthResolution((prev) => (prev === 'initializing' ? 'public' : prev));
    });
    return () => unsub();
  }, []);

  /**
   * Verify and restore active Customer session from Firestore on startup (Section 27:
   * Never trust localStorage alone; verify both trustedDeviceSessions/{sessionId} and customers/{customerId} in Firestore).
   */
  useEffect(() => {
    const rawSession = localStorage.getItem('dera_apna_customer_session');
    if (!rawSession) return;

    let cancelled = false;
    (async () => {
      try {
        const parsed = JSON.parse(rawSession) as {
          customerId?: string;
          sessionId?: string;
          deviceId?: string;
        };
        const localDeviceId = getOrCreateTrustedDeviceId();
        if (
          !parsed.customerId ||
          !parsed.sessionId ||
          !parsed.deviceId ||
          parsed.deviceId !== localDeviceId
        ) {
          localStorage.removeItem('dera_apna_customer_session');
          return;
        }

        const [tdSnap, custSnap] = await Promise.all([
          getDoc(doc(db, 'trustedDeviceSessions', parsed.sessionId)),
          getDoc(doc(db, 'customers', parsed.customerId)),
        ]);

        if (cancelled) return;

        if (!tdSnap.exists() || !custSnap.exists()) {
          localStorage.removeItem('dera_apna_customer_session');
          return;
        }

        const tdData = tdSnap.data() as {
          userId: string;
          role: string;
          deviceId: string;
          trusted: boolean;
        };
        const custData = custSnap.data() as CustomerProfile;

        if (
          tdData.trusted !== true ||
          tdData.role !== 'CUSTOMER' ||
          tdData.userId !== parsed.customerId ||
          tdData.deviceId !== localDeviceId ||
          custData.status !== 'active'
        ) {
          localStorage.removeItem('dera_apna_customer_session');
          return;
        }

        setCustomerSession(custData);
        setAuthResolution('authorized');
      } catch {
        // Ignore transient offline errors during startup session check
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // ROLE-GATED FIRESTORE LISTENERS (Sections 8, 9–20, 48, 49, 50)
  // ============================================================

  /**
   * 1. Public / Customer Discovery Listeners:
   * Only active when the user is viewing 'explore' or 'pg_detail' (or when Owner/Admin is adding locations).
   * Constrained by status == 'active' and optional cityId filter (Section 15 & 18).
   */
  useEffect(() => {
    const needsDiscoveryData =
      currentScreen === 'explore' ||
      currentScreen === 'pg_detail' ||
      currentScreen === 'room_detail' ||
      currentScreen === 'owner_dashboard' ||
      currentScreen === 'admin_dashboard';

    if (!needsDiscoveryData) {
      return;
    }

    const qLocations = query(
      collection(db, 'locations'),
      where('level', 'in', ['state', 'district', 'city', 'area'])
    );
    const unsubLocations = onSnapshot(
      qLocations,
      (snap) => {
        setCustomLocations(snap.docs.map((d) => d.data() as LocationNode));
      },
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'locations')
    );

    let unsubListings: (() => void) | undefined;
    let unsubAds: (() => void) | undefined;
    let unsubRooms: (() => void) | undefined;

    if (currentScreen === 'explore' || currentScreen === 'pg_detail' || currentScreen === 'room_detail') {
      const qListings = searchFilters.cityId
        ? query(
            collection(db, 'pgListings'),
            where('status', '==', 'active'),
            where('cityId', '==', searchFilters.cityId),
            limit(500)
          )
        : query(collection(db, 'pgListings'), where('status', '==', 'active'), limit(500));

      unsubListings = onSnapshot(
        qListings,
        (snap) => {
          setPublicListings(snap.docs.map((d) => d.data() as PgListing));
        },
        (err) => handleFirestoreListenerError(err, OperationType.LIST, 'pgListings')
      );

      const qAds = searchFilters.cityId
        ? query(
            collection(db, 'advertisements'),
            where('status', '==', 'active'),
            where('cityId', '==', searchFilters.cityId),
            limit(500)
          )
        : query(collection(db, 'advertisements'), where('status', '==', 'active'), limit(500));

      unsubAds = onSnapshot(
        qAds,
        (snap) => {
          const todayIso = new Date().toISOString().slice(0, 10);
          const validAds = snap.docs
            .map((d) => d.data() as AdvertisementRecord)
            .filter((ad) => {
              const notExpired = !ad.endDate || ad.endDate >= todayIso;
              const started = !ad.startDate || ad.startDate <= todayIso;
              return ad.status === 'active' && started && notExpired;
            });
          setActiveAds(validAds);
        },
        (err) => handleFirestoreListenerError(err, OperationType.LIST, 'advertisements')
      );

      const qAvailableRooms = query(
        collection(db, 'rooms'),
        where('availability', '==', true),
        limit(1000)
      );
      unsubRooms = onSnapshot(
        qAvailableRooms,
        (snap) => {
          setPublicRooms(snap.docs.map((d) => d.data() as RoomRecord));
        },
        (err) => handleFirestoreListenerError(err, OperationType.LIST, 'rooms')
      );
    }

    return () => {
      unsubLocations();
      if (unsubListings) unsubListings();
      if (unsubAds) unsubAds();
      if (unsubRooms) unsubRooms();
    };
  }, [currentScreen, searchFilters.cityId]);

  /**
   * 2. PG Detail Reviews Listener:
   * Scoped strictly to the selected PG (`pgId == selectedPg.pgId` and `status == 'published'`).
   */
  const selectedPgId = selectedPg?.pgId || '';
  useEffect(() => {
    if ((currentScreen !== 'pg_detail' && currentScreen !== 'room_detail') || !selectedPgId) {
      setPublicReviews([]);
      return;
    }

    const qReviews = query(
      collection(db, 'reviews'),
      where('pgId', '==', selectedPgId),
      where('status', '==', 'published'),
      limit(200)
    );
    const unsubReviews = onSnapshot(
      qReviews,
      (snap) => {
        setPublicReviews(snap.docs.map((d) => d.data() as ReviewRecord));
      },
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'reviews')
    );

    return () => {
      unsubReviews();
    };
  }, [currentScreen, selectedPgId]);

  /**
   * 3. Customer Own Profile Listener (Sections 9, 10, 28, 30):
   * Reads ONLY `customers/{customerSession.customerId}` — NEVER `collection(db, 'customers')`.
   */
  useEffect(() => {
    if (!customerSession || !customerSession.customerId || roleResolving) {
      return;
    }

    const custDocRef = doc(db, 'customers', customerSession.customerId);
    const unsubSelf = onSnapshot(
      custDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CustomerProfile;
          if (data.status === 'blocked') {
            localStorage.removeItem('dera_apna_customer_session');
            setCustomerSession(null);
            setAuthError('Your customer account has been blocked by Admin.');
            setScreenHistory(['public_entry']);
          } else {
            setCustomerSession(data);
          }
        }
      },
      (err) =>
        handleFirestoreListenerError(
          err,
          OperationType.GET,
          `customers/${customerSession.customerId}`
        )
    );

    return () => {
      unsubSelf();
    };
  }, [customerSession?.customerId, roleResolving]);

  /**
   * 4. Owner-Scoped Listeners (Sections 12, 16, 48, 49 & Single Active Trusted Device Enforcement):
   * Only active when an Approved Owner is authenticated and their UID matches `ownerSession.ownerId`.
   * Every query is strictly constrained with `where('ownerId', '==', uid)`.
   */
  useEffect(() => {
    const isAuthorizedOwner =
      Boolean(ownerSession) &&
      Boolean(firebaseUser) &&
      firebaseUser?.emailVerified === true &&
      ownerSession?.ownerId === firebaseUser?.uid &&
      ownerSession?.accountStatus === 'Approved' &&
      !roleResolving;

    if (!isAuthorizedOwner || !ownerSession || !firebaseUser) {
      setOwnerListings([]);
      setOwnerListingsLoading(false);
      setOwnerRooms([]);
      setOwnerInquiries([]);
      setOwnerVisits([]);
      return;
    }

    const uid = firebaseUser.uid;
    setOwnerListingsLoading(true);

    // Watch Owner profile for Block/Delete or Single Active Trusted Device revocation
    const unsubOwnerSelf = onSnapshot(
      doc(db, 'owners', uid),
      async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as OwnerProfile;
        if (data.accountStatus === 'Blocked' || data.accountStatus === 'Deleted') {
          setOwnerSession(null);
          setAuthError(`Your PG Owner account has been ${data.accountStatus} by Admin.`);
          setScreenHistory(['public_entry']);
          return;
        }
        if (data.activeDeviceIdHash) {
          const localHash = await getDeviceIdHash();
          if (data.activeDeviceIdHash !== localHash) {
            setOwnerSession(null);
            setAuthError(tRef.current('device.revokedOtherDevice'));
            setScreenHistory(['public_entry', 'owner_login']);
            return;
          }
        }
        setOwnerSession(data);
      },
      (err) => handleFirestoreListenerError(err, OperationType.GET, `owners/${uid}`)
    );

    const unsubPg = onSnapshot(
      query(collection(db, 'pgListings'), where('ownerId', '==', uid), limit(100)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as PgListing);
        setOwnerListings(list);
        setOwnerListingsLoading(false);
        const activePg = list.find((p) => p.status !== 'deleted');
        if (!activePg) {
          setOwnerActiveTab('initial_setup');
        }
      },
      (err) => {
        setOwnerListingsLoading(false);
        handleFirestoreListenerError(err, OperationType.LIST, 'pgListings');
      }
    );

    const unsubRm = onSnapshot(
      query(collection(db, 'rooms'), where('ownerId', '==', uid), limit(300)),
      (snap) => setOwnerRooms(snap.docs.map((d) => d.data() as RoomRecord)),
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'rooms')
    );

    const unsubInq = onSnapshot(
      query(collection(db, 'inquiries'), where('ownerId', '==', uid), limit(500)),
      (snap) => setOwnerInquiries(snap.docs.map((d) => d.data() as InquiryRecord)),
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'inquiries')
    );

    const unsubVis = onSnapshot(
      query(collection(db, 'visits'), where('ownerId', '==', uid), limit(1000)),
      (snap) => setOwnerVisits(snap.docs.map((d) => d.data() as VisitRecord)),
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'visits')
    );

    return () => {
      unsubOwnerSelf();
      unsubPg();
      unsubRm();
      unsubInq();
      unsubVis();
    };
  }, [ownerSession?.ownerId, ownerSession?.accountStatus, firebaseUser, roleResolving]);

  /**
   * 4b. Real-Time Listener for Pending New-Device Login Request on Owner Login Screen
   */
  useEffect(() => {
    if (!pendingOwnerDeviceRequest || pendingOwnerDeviceRequest.status !== 'PENDING') {
      return;
    }
    const reqId = pendingOwnerDeviceRequest.requestId;
    const unsubReq = onSnapshot(
      doc(db, 'deviceLoginRequests', reqId),
      async (snap) => {
        if (!snap.exists()) {
          setPendingOwnerDeviceRequest(null);
          return;
        }
        const data = snap.data() as DeviceLoginRequest;
        if (data.status === 'APPROVED') {
          setPendingOwnerDeviceRequest(null);
          setAuthError(null);
          try {
            const ownerSnap = await getDoc(doc(db, 'owners', data.ownerId));
            if (ownerSnap.exists()) {
              const ownerData = ownerSnap.data() as OwnerProfile;
              localStorage.setItem('dera_apna_trusted_owner_mobile', data.mobile);
              await recordTrustedDeviceSession(
                data.ownerId,
                'PG_OWNER',
                data.mobile,
                data.email
              );
              setOwnerListingsLoading(true);
              setOwnerSession(ownerData);
              setAuthResolution('authorized');
              setScreenHistory(['public_entry', 'owner_dashboard']);
            }
          } catch (err) {
            setAuthError(
              err instanceof Error ? err.message : 'Failed to activate approved device session.'
            );
          }
        } else if (data.status === 'REJECTED') {
          setPendingOwnerDeviceRequest(null);
          setAuthError(tRef.current('device.rejectedByAdmin'));
        } else if (data.status === 'EXPIRED' || data.status === 'CANCELLED') {
          setPendingOwnerDeviceRequest(null);
          setAuthError(tRef.current('device.expiredRequest'));
        } else {
          setPendingOwnerDeviceRequest(data);
        }
      },
      (err) =>
        handleFirestoreListenerError(err, OperationType.GET, `deviceLoginRequests/${reqId}`)
    );

    return () => unsubReq();
  }, [pendingOwnerDeviceRequest?.requestId, pendingOwnerDeviceRequest?.status]);

  /**
   * 5. Admin-Scoped Listeners (Sections 10, 13, 17, 18, 19, 20, 43, 48, 49):
   * Strictly gated on:
   * - `adminSessionActive === true`
   * - `firebaseUser` signed in, emailVerified, and verified via `isAuthorizedAdminEmail`
   * - `adminDocVerified === true` (meaning `admins/{firebaseUser.uid}` exists in Firestore)
   * - `!roleResolving`
   * Never runs for Customer or Owner accounts.
   */
  useEffect(() => {
    const isAuthorizedAdmin =
      Boolean(adminSessionActive) &&
      Boolean(firebaseUser) &&
      firebaseUser?.emailVerified === true &&
      isAuthorizedAdminEmail(firebaseUser?.email) &&
      adminDocVerified === true &&
      !roleResolving;

    if (!isAuthorizedAdmin) {
      setAdminCustomers([]);
      setAdminOwnerPreRegs([]);
      setAdminAllListings([]);
      setAdminAllAds([]);
      setAdminAllInquiries([]);
      setAdminAuditLogs([]);
      setAdminDeviceRequests([]);
      return;
    }

    const unsubCust = onSnapshot(
      query(collection(db, 'customers'), limit(500)),
      (snap) => setAdminCustomers(snap.docs.map((d) => d.data() as CustomerProfile)),
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'customers')
    );

    const unsubPreReg = onSnapshot(
      query(collection(db, 'ownerPreRegistrations'), limit(500)),
      (snap) => setAdminOwnerPreRegs(snap.docs.map((d) => d.data() as OwnerPreRegistration)),
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'ownerPreRegistrations')
    );

    const unsubPgs = onSnapshot(
      query(collection(db, 'pgListings'), limit(500)),
      (snap) => setAdminAllListings(snap.docs.map((d) => d.data() as PgListing)),
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'pgListings')
    );

    const unsubAds = onSnapshot(
      query(collection(db, 'advertisements'), limit(500)),
      (snap) => setAdminAllAds(snap.docs.map((d) => d.data() as AdvertisementRecord)),
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'advertisements')
    );

    const unsubInq = onSnapshot(
      query(collection(db, 'inquiries'), limit(500)),
      (snap) => setAdminAllInquiries(snap.docs.map((d) => d.data() as InquiryRecord)),
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'inquiries')
    );

    const unsubAudit = onSnapshot(
      query(collection(db, 'auditLogs'), limit(500)),
      (snap) => setAdminAuditLogs(snap.docs.map((d) => d.data() as AuditLogRecord)),
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'auditLogs')
    );

    const unsubDevReq = onSnapshot(
      query(collection(db, 'deviceLoginRequests'), limit(500)),
      (snap) => setAdminDeviceRequests(snap.docs.map((d) => d.data() as DeviceLoginRequest)),
      (err) => handleFirestoreListenerError(err, OperationType.LIST, 'deviceLoginRequests')
    );

    return () => {
      unsubCust();
      unsubPreReg();
      unsubPgs();
      unsubAds();
      unsubInq();
      unsubAudit();
      unsubDevReq();
    };
  }, [adminSessionActive, firebaseUser, adminDocVerified, roleResolving]);

  // Persist Trusted Device Session in Firestore & LocalStorage (Sections 27 & 38–41)
  const recordTrustedDeviceSession = async (
    userId: string,
    role: 'CUSTOMER' | 'PG_OWNER' | 'ADMIN',
    mobile: string,
    email: string
  ) => {
    if (role === 'PG_OWNER' && mobile) {
      localStorage.setItem('dera_apna_trusted_owner_mobile', mobile);
    }
    if (role === 'ADMIN' && userId) {
      localStorage.removeItem('dera_apna_trusted_admin_email');
      localStorage.setItem('dera_apna_trusted_admin_uid', userId);
    }
    const deviceId = getOrCreateTrustedDeviceId();
    const sessionId = `td_${userId}_${role}_${deviceId}`
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 120);

    if (role === 'CUSTOMER') {
      localStorage.setItem(
        'dera_apna_customer_session',
        JSON.stringify({ customerId: userId, sessionId, deviceId })
      );
    }

    try {
      await setDoc(doc(db, 'trustedDeviceSessions', sessionId), {
        sessionId,
        userId,
        role,
        mobile: mobile || '',
        email: role === 'ADMIN' ? '' : email || '',
        deviceId,
        trusted: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal if offline or transient
    }
  };

  const revokeCustomerDeviceSession = async (customerId?: string) => {
    const rawSession = localStorage.getItem('dera_apna_customer_session');
    localStorage.removeItem('dera_apna_customer_session');
    const deviceId = getOrCreateTrustedDeviceId();
    let sessionId: string | undefined;
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession) as { sessionId?: string };
        sessionId = parsed.sessionId;
      } catch {
        // Ignore parse error
      }
    }
    if (!sessionId && customerId) {
      sessionId = `td_${customerId}_CUSTOMER_${deviceId}`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 120);
    }
    if (sessionId) {
      try {
        await updateDoc(doc(db, 'trustedDeviceSessions', sessionId), {
          trusted: false,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Ignore if session doc does not exist
      }
    }
  };

  // Write Admin Audit Log
  const recordAdminAuditLog = async (
    action: string,
    targetType: string,
    targetId: string,
    metadata: string
  ) => {
    if (!auth.currentUser || !adminDocVerified) return;
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await setDoc(doc(db, 'auditLogs', logId), {
        logId,
        adminUid: auth.currentUser.uid,
        action: sanitizeInput(action, 100),
        targetType: sanitizeInput(targetType, 64),
        targetId: sanitizeInput(targetId, 128),
        metadata: sanitizeInput(metadata, 1000),
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `auditLogs/${logId}`);
    }
  };

  const inFlightInquiryUpdatesRef = useRef<Set<string>>(new Set());
  const inFlightInquirySubmitRef = useRef<boolean>(false);
  const inFlightReviewSubmitRef = useRef<boolean>(false);

  // ============================================================
  // CUSTOMER AUTHENTICATION HANDLERS (MOBILE + PIN, NO GOOGLE AUTH)
  // ============================================================
  const handleRegisterCustomer = async (payload: {
    name: string;
    mobile: string;
    email: string;
    gender: 'Male' | 'Female';
    pin: string;
    confirmPin: string;
    securityQuestion: string;
    securityAnswer: string;
  }) => {
    if (!isOnline) {
      setAuthError(t('common.offline'));
      return;
    }
    setAuthError(null);
    const cleanName = sanitizeInput(payload.name, 100);
    const cleanMobile = payload.mobile.trim();
    const cleanEmail = sanitizeInput(payload.email, 150).trim().toLowerCase();

    if (!cleanName) {
      setAuthError(t('auth.error.missingName'));
      return;
    }
    if (!isValidIndianMobile(cleanMobile)) {
      setAuthError(t('auth.error.invalidMobile'));
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError(t('auth.error.invalidEmail'));
      return;
    }
    if (payload.gender !== 'Male' && payload.gender !== 'Female') {
      setAuthError(t('auth.error.selectGender'));
      return;
    }
    if (!isValidPinFormat(payload.pin)) {
      setAuthError(t('auth.error.invalidPin'));
      return;
    }
    if (payload.pin !== payload.confirmPin) {
      setAuthError(t('auth.error.pinMismatch'));
      return;
    }
    if (!CONTROLLED_SECURITY_QUESTIONS.includes(payload.securityQuestion)) {
      setAuthError(t('auth.error.invalidSecurityQuestion'));
      return;
    }
    if (payload.securityAnswer.trim().length < 2) {
      setAuthError(t('auth.error.invalidSecurityAnswer'));
      return;
    }

    setAuthLoading(true);
    setRoleResolving(true);
    try {
      // Clear any previous Owner/Admin sessions before starting Customer registration
      setOwnerSession(null);
      setAdminSessionActive(false);
      setAdminDocVerified(false);

      const targetCustomerId = `cust_${cleanMobile}`;
      const mobileIdxRef = doc(db, 'customerMobileIndex', cleanMobile);
      const targetCustRef = doc(db, 'customers', targetCustomerId);

      const [mobileIdxSnap, targetCustSnap] = await Promise.all([
        getDoc(mobileIdxRef),
        getDoc(targetCustRef),
      ]);

      if (mobileIdxSnap.exists() || targetCustSnap.exists()) {
        setAuthError(t('auth.error.duplicateMobile'));
        return;
      }

      const { pinHash, pinSalt } = await hashPin(payload.pin);
      const { securityAnswerHash, securityAnswerSalt } = await hashSecurityAnswer(
        payload.securityAnswer
      );

      const profileData: CustomerProfile = {
        customerId: targetCustomerId,
        name: cleanName,
        mobile: cleanMobile,
        email: cleanEmail,
        gender: payload.gender,
        status: 'active',
        language,
        theme,
      };

      const batch = writeBatch(db);
      batch.set(targetCustRef, {
        ...profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(mobileIdxRef, {
        mobile: cleanMobile,
        customerId: targetCustomerId,
        securityQuestion: payload.securityQuestion,
        createdAt: serverTimestamp(),
      });

      batch.set(doc(db, 'customerSecrets', targetCustomerId), {
        customerId: targetCustomerId,
        pinHash,
        pinSalt,
        securityQuestion: payload.securityQuestion,
        securityAnswerHash,
        securityAnswerSalt,
        failedAttempts: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      await recordTrustedDeviceSession(targetCustomerId, 'CUSTOMER', cleanMobile, profileData.email);

      setCustomerSession(profileData);
      setAuthResolution('authorized');
      setScreenHistory((prev) =>
        selectedPg && selectedRoom && prev.includes('room_detail')
          ? ['public_entry', 'explore', 'pg_detail', 'room_detail']
          : selectedPg && prev.includes('pg_detail')
          ? ['public_entry', 'explore', 'pg_detail']
          : ['public_entry', 'explore']
      );
    } catch {
      setAuthError(t('auth.error.createAccountFailed'));
    } finally {
      setRoleResolving(false);
      setAuthLoading(false);
    }
  };

  const handleLoginCustomer = async (mobile: string, pin: string) => {
    if (!isOnline) {
      setAuthError(t('common.offline'));
      return;
    }
    setAuthError(null);
    const cleanMobile = mobile.trim();
    if (!isValidIndianMobile(cleanMobile)) {
      setAuthError(t('auth.error.invalidMobile'));
      return;
    }
    if (!isValidPinFormat(pin)) {
      setAuthError(t('auth.error.invalidPin'));
      return;
    }

    setAuthLoading(true);
    setRoleResolving(true);
    try {
      // Clear any previous Owner/Admin sessions
      setOwnerSession(null);
      setAdminSessionActive(false);
      setAdminDocVerified(false);

      const mobileIdxSnap = await getDoc(doc(db, 'customerMobileIndex', cleanMobile));
      if (!mobileIdxSnap.exists()) {
        setAuthError(t('auth.accountNotFound'));
        return;
      }

      const { customerId } = mobileIdxSnap.data() as {
        customerId: string;
      };

      const secretRef = doc(db, 'customerSecrets', customerId);
      const secretSnap = await getDoc(secretRef);
      if (!secretSnap.exists()) {
        setAuthError('Security credentials not found for this account.');
        return;
      }

      const secretData = secretSnap.data() as {
        pinHash: string;
        pinSalt: string;
        failedAttempts: number;
      };

      if (secretData.failedAttempts >= 5) {
        setAuthError(
          'Account temporarily locked due to too many failed PIN attempts. Use Forgot PIN to verify your security question and reset.'
        );
        return;
      }

      const isPinValid = await verifyPin(pin, secretData.pinHash, secretData.pinSalt);
      if (!isPinValid) {
        await updateDoc(secretRef, {
          failedAttempts: (secretData.failedAttempts || 0) + 1,
          updatedAt: serverTimestamp(),
        });
        setAuthError(t('auth.error.incorrectPin'));
        return;
      }

      if (secretData.failedAttempts > 0) {
        await updateDoc(secretRef, {
          failedAttempts: 0,
          updatedAt: serverTimestamp(),
        });
      }

      const custSnap = await getDoc(doc(db, 'customers', customerId));
      if (!custSnap.exists()) {
        setAuthError(t('auth.accountNotFound'));
        return;
      }

      const custProfile = custSnap.data() as CustomerProfile;
      if (custProfile.status === 'blocked') {
        setAuthResolution('unauthorized');
        setAuthError('Your customer account has been blocked by Admin.');
        return;
      }

      await recordTrustedDeviceSession(customerId, 'CUSTOMER', cleanMobile, custProfile.email);

      setCustomerSession(custProfile);
      setAuthResolution('authorized');
      setScreenHistory((prev) =>
        selectedPg && selectedRoom && prev.includes('room_detail')
          ? ['public_entry', 'explore', 'pg_detail', 'room_detail']
          : selectedPg && prev.includes('pg_detail')
          ? ['public_entry', 'explore', 'pg_detail']
          : ['public_entry', 'explore']
      );
    } catch {
      setAuthError('Login failed. Please verify your mobile number and PIN.');
    } finally {
      setRoleResolving(false);
      setAuthLoading(false);
    }
  };

  const handleLookupForgotPinQuestion = async (mobile: string): Promise<string | null> => {
    setAuthError(null);
    const cleanMobile = mobile.trim();
    if (!isValidIndianMobile(cleanMobile)) {
      setAuthError(t('auth.error.invalidMobile'));
      return null;
    }
    setAuthLoading(true);
    try {
      const snap = await getDoc(doc(db, 'customerMobileIndex', cleanMobile));
      if (!snap.exists()) {
        setAuthError(t('auth.accountNotFound'));
        return null;
      }
      const data = snap.data() as { securityQuestion: string };
      return data.securityQuestion;
    } catch {
      setAuthError('Unable to verify mobile number. Please try again.');
      return null;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetCustomerPin = async (
    mobile: string,
    securityAnswer: string,
    newPin: string,
    confirmNewPin: string
  ): Promise<boolean> => {
    setAuthError(null);
    const cleanMobile = mobile.trim();
    if (!isValidIndianMobile(cleanMobile)) {
      setAuthError(t('auth.error.invalidMobile'));
      return false;
    }
    if (securityAnswer.trim().length < 2) {
      setAuthError(t('auth.error.invalidSecurityAnswer'));
      return false;
    }
    if (!isValidPinFormat(newPin)) {
      setAuthError(t('auth.error.invalidPin'));
      return false;
    }
    if (newPin !== confirmNewPin) {
      setAuthError(t('auth.error.pinMismatch'));
      return false;
    }

    setAuthLoading(true);
    setRoleResolving(true);
    try {
      setOwnerSession(null);
      setAdminSessionActive(false);
      setAdminDocVerified(false);

      const idxSnap = await getDoc(doc(db, 'customerMobileIndex', cleanMobile));
      if (!idxSnap.exists()) {
        setAuthError(t('auth.accountNotFound'));
        return false;
      }

      const { customerId } = idxSnap.data() as {
        customerId: string;
      };

      const secretRef = doc(db, 'customerSecrets', customerId);
      const secretSnap = await getDoc(secretRef);
      if (!secretSnap.exists()) {
        setAuthError('Customer credentials not found.');
        return false;
      }

      const secretData = secretSnap.data() as {
        securityAnswerHash: string;
        securityAnswerSalt: string;
        failedAttempts: number;
      };

      if (secretData.failedAttempts >= 8) {
        setAuthError('Too many failed recovery attempts. Account recovery is rate-limited.');
        return false;
      }

      const answerMatched = await verifySecurityAnswer(
        securityAnswer,
        secretData.securityAnswerHash,
        secretData.securityAnswerSalt
      );

      if (!answerMatched) {
        await updateDoc(secretRef, {
          failedAttempts: (secretData.failedAttempts || 0) + 1,
          updatedAt: serverTimestamp(),
        });
        setAuthError(t('auth.error.incorrectSecurityAnswer'));
        return false;
      }

      const { pinHash, pinSalt } = await hashPin(newPin);
      await updateDoc(secretRef, {
        pinHash,
        pinSalt,
        failedAttempts: 0,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch {
      setAuthError('Unable to reset PIN. Please try again.');
      return false;
    } finally {
      setRoleResolving(false);
      setAuthLoading(false);
    }
  };

  // ============================================================
  // PG OWNER AUTHENTICATION & MANAGEMENT HANDLERS
  // ============================================================
  const handleCheckOwnerPreReg = async (mobile: string): Promise<OwnerPreRegistration | null> => {
    try {
      // Exact single-document getDoc lookup (never lists all ownerPreRegistrations)
      const snap = await getDoc(doc(db, 'ownerPreRegistrations', mobile.trim()));
      if (!snap.exists()) return null;
      return snap.data() as OwnerPreRegistration;
    } catch {
      return null;
    }
  };

  const handleCheckOwnerAuthState = async (
    mobile: string
  ): Promise<{ hasPin: boolean; trustedDeviceActive: boolean }> => {
    try {
      const preSnap = await getDoc(doc(db, 'ownerPreRegistrations', mobile.trim()));
      if (!preSnap.exists()) return { hasPin: false, trustedDeviceActive: false };
      const preData = preSnap.data() as OwnerPreRegistration;
      const hasPin = Boolean(preData.linkedGoogleUid);
      const currentUser = auth.currentUser;
      const trustedMobile = localStorage.getItem('dera_apna_trusted_owner_mobile');
      const localDeviceHash = await getDeviceIdHash();
      const deviceHashMatches =
        !preData.activeDeviceIdHash || preData.activeDeviceIdHash === localDeviceHash;
      const trustedDeviceActive = Boolean(
        hasPin &&
          trustedMobile === mobile.trim() &&
          deviceHashMatches &&
          currentUser &&
          currentUser.emailVerified &&
          (currentUser.email || '').toLowerCase() === preData.approvedGoogleEmail.toLowerCase()
      );
      return { hasPin, trustedDeviceActive };
    } catch {
      return { hasPin: false, trustedDeviceActive: false };
    }
  };

  const handleSimulateNewDevice = async () => {
    rotateLocalDeviceId();
    localStorage.removeItem('dera_apna_trusted_owner_mobile');
    setPendingOwnerDeviceRequest(null);
    setAuthError(null);
  };

  const handleCancelPendingDeviceRequest = async () => {
    if (!pendingOwnerDeviceRequest) return;
    const reqId = pendingOwnerDeviceRequest.requestId;
    setPendingOwnerDeviceRequest(null);
    try {
      await updateDoc(doc(db, 'deviceLoginRequests', reqId), {
        status: 'CANCELLED',
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Ignore if already processed
    }
  };

  const handleAuthenticateOwnerGoogleAndPin = async (payload: {
    mobile: string;
    pin: string;
    confirmPin?: string;
    isNewPinSetup: boolean;
    isForgotPinReset: boolean;
    skipGooglePopupIfTrusted: boolean;
    forceNewDeviceRequest?: boolean;
  }) => {
    setAuthError(null);
    if (!isValidPinFormat(payload.pin)) {
      setAuthError('PIN must be 4 to 6 numeric digits.');
      return;
    }
    if (
      (payload.isNewPinSetup || payload.isForgotPinReset) &&
      payload.pin !== payload.confirmPin
    ) {
      setAuthError('PIN and Confirm PIN do not match.');
      return;
    }

    setAuthLoading(true);
    setRoleResolving(true);
    try {
      // Immediately clear any Customer or Admin session before Owner sign-in
      setCustomerSession(null);
      setAdminSessionActive(false);
      setAdminDocVerified(false);

      const preRef = doc(db, 'ownerPreRegistrations', payload.mobile);
      const preSnap = await getDoc(preRef);
      if (!preSnap.exists()) {
        setAuthError(t('auth.notPreRegistered'));
        return;
      }

      const preData = preSnap.data() as OwnerPreRegistration;
      if (preData.status !== 'Approved') {
        setAuthError(t('auth.notPreRegistered'));
        return;
      }

      let gUser: FirebaseUser;
      const currentAuthUser = auth.currentUser;
      if (
        currentAuthUser &&
        currentAuthUser.emailVerified &&
        (currentAuthUser.email || '').toLowerCase() === preData.approvedGoogleEmail.toLowerCase()
      ) {
        gUser = currentAuthUser;
      } else {
        const cred = await signInWithPopup(auth, googleProvider);
        gUser = cred.user;
      }

      const gEmail = (gUser.email || '').toLowerCase();

      if (gEmail !== preData.approvedGoogleEmail.toLowerCase()) {
        await signOut(auth);
        setAuthResolution('unauthorized');
        setAuthError(
          `${t('auth.accessDenied')}: Google account (${gEmail}) does not match the Admin-approved Google account (${preData.approvedGoogleEmail}) for mobile ${payload.mobile}.`
        );
        return;
      }

      const ownerRef = doc(db, 'owners', gUser.uid);
      const ownerSnap = await getDoc(ownerRef);
      if (ownerSnap.exists()) {
        const existingOwner = ownerSnap.data() as OwnerProfile;
        if (existingOwner.mobile !== payload.mobile) {
          setAuthError(
            'This Google account is already bound to another pre-registered PG Owner mobile number.'
          );
          return;
        }
      }

      const secretRef = doc(db, 'ownerSecrets', gUser.uid);
      const secretSnap = await getDoc(secretRef);
      const currentDeviceHash = await getDeviceIdHash();

      if (!secretSnap.exists()) {
        const { pinHash, pinSalt } = await hashPin(payload.pin);
        const newOwnerProfile: OwnerProfile = {
          ownerId: gUser.uid,
          name: preData.name,
          mobile: preData.mobile,
          email: gEmail,
          linkedGoogleUid: gUser.uid,
          activeDeviceIdHash: currentDeviceHash,
          preRegistrationStatus: 'Approved',
          accountStatus: 'Approved',
        };

        await setDoc(ownerRef, {
          ...newOwnerProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(secretRef, {
          ownerId: gUser.uid,
          mobile: preData.mobile,
          pinHash,
          pinSalt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await updateDoc(preRef, {
          linkedGoogleUid: gUser.uid,
          activeDeviceIdHash: currentDeviceHash,
          updatedAt: serverTimestamp(),
        });

        await recordTrustedDeviceSession(gUser.uid, 'PG_OWNER', preData.mobile, gEmail);

        setOwnerListingsLoading(true);
        setOwnerSession(newOwnerProfile);
        setAuthResolution('authorized');
        setOwnerActiveTab('initial_setup');
        setScreenHistory(['public_entry', 'owner_dashboard']);
      } else if (payload.isForgotPinReset) {
        const { pinHash, pinSalt } = await hashPin(payload.pin);
        await updateDoc(secretRef, {
          pinHash,
          pinSalt,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(ownerRef, {
          activeDeviceIdHash: currentDeviceHash,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(preRef, {
          activeDeviceIdHash: currentDeviceHash,
          updatedAt: serverTimestamp(),
        });
        const currentOwner = ownerSnap.data() as OwnerProfile;
        await recordTrustedDeviceSession(gUser.uid, 'PG_OWNER', preData.mobile, gEmail);
        setOwnerListingsLoading(true);
        setOwnerSession({ ...currentOwner, activeDeviceIdHash: currentDeviceHash });
        setAuthResolution('authorized');
        setScreenHistory(['public_entry', 'owner_dashboard']);
      } else {
        const secretData = secretSnap.data() as { pinHash: string; pinSalt: string };
        const validPin = await verifyPin(payload.pin, secretData.pinHash, secretData.pinSalt);
        if (!validPin) {
          setAuthError('Incorrect Owner PIN.');
          return;
        }
        const currentOwner = ownerSnap.data() as OwnerProfile;
        if (currentOwner.accountStatus !== 'Approved') {
          setAuthResolution('unauthorized');
          setAuthError(`Owner account is ${currentOwner.accountStatus}.`);
          return;
        }

        const storedDeviceHash = currentOwner.activeDeviceIdHash || preData.activeDeviceIdHash;
        const isUnrecognizedNewDevice =
          Boolean(payload.forceNewDeviceRequest) ||
          (Boolean(storedDeviceHash) && storedDeviceHash !== currentDeviceHash);

        if (isUnrecognizedNewDevice) {
          // Create a real New-Device Login Approval Request in Firestore (Parts 10–13)
          const { deviceName, platform } = getDeviceMetadata();
          const requestId = `devreq_${gUser.uid}_${Date.now()}`
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 120);
          const reqDoc: DeviceLoginRequest = {
            requestId,
            userId: gUser.uid,
            ownerId: gUser.uid,
            ownerName: currentOwner.name,
            mobile: preData.mobile,
            email: gEmail,
            deviceIdHash: currentDeviceHash,
            deviceName,
            platform,
            status: 'PENDING',
          };

          await setDoc(doc(db, 'deviceLoginRequests', requestId), {
            ...reqDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setPendingOwnerDeviceRequest(reqDoc);
          return;
        }

        // Same Trusted Device: log in directly and ensure activeDeviceIdHash is recorded
        if (!storedDeviceHash) {
          await updateDoc(ownerRef, {
            activeDeviceIdHash: currentDeviceHash,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
          await updateDoc(preRef, {
            activeDeviceIdHash: currentDeviceHash,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }

        await recordTrustedDeviceSession(gUser.uid, 'PG_OWNER', preData.mobile, gEmail);
        setOwnerListingsLoading(true);
        setOwnerSession({ ...currentOwner, activeDeviceIdHash: currentDeviceHash });
        setAuthResolution('authorized');
        setScreenHistory(['public_entry', 'owner_dashboard']);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Owner authentication failed.');
    } finally {
      setRoleResolving(false);
      setAuthLoading(false);
    }
  };

  const handleSaveInitialPg = async (
    listingData: Omit<PgListing, 'pgId' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!ownerSession || !auth.currentUser || ownerSession.ownerId !== auth.currentUser.uid) {
      throw new Error('Unauthorized owner session.');
    }
    const existingPg = ownerListings.find((p) => p.status !== 'deleted');
    const pgId = existingPg ? existingPg.pgId : `pg_${ownerSession.ownerId}_${Date.now()}`;
    const pgRef = doc(db, 'pgListings', pgId);

    try {
      if (existingPg) {
        // Preserve immutable identity fields when updating an existing PG
        await updateDoc(pgRef, {
          ...listingData,
          propertyName: existingPg.identityLocked
            ? existingPg.propertyName
            : listingData.propertyName,
          propertyType: existingPg.identityLocked
            ? existingPg.propertyType
            : listingData.propertyType,
          gender: existingPg.identityLocked ? existingPg.gender : listingData.gender,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(pgRef, {
          ...listingData,
          pgId,
          ownerId: ownerSession.ownerId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setOwnerActiveTab('overview');
    } catch (err) {
      handleFirestoreError(
        err,
        existingPg ? OperationType.UPDATE : OperationType.CREATE,
        `pgListings/${pgId}`
      );
    }
  };

  const handleUpdatePgLocationOnly = async (
    pgId: string,
    locationUpdate: Partial<PgListing>
  ) => {
    if (!ownerSession || !auth.currentUser || ownerSession.ownerId !== auth.currentUser.uid) {
      throw new Error('Unauthorized owner session.');
    }
    try {
      await updateDoc(doc(db, 'pgListings', pgId), {
        ...locationUpdate,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pgListings/${pgId}`);
    }
  };

  const handleSaveRoom = async (
    roomData: Omit<RoomRecord, 'roomId' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingRoomId?: string
  ) => {
    if (!ownerSession || !auth.currentUser || ownerSession.ownerId !== auth.currentUser.uid) {
      throw new Error('Unauthorized owner session.');
    }
    const roomId = existingRoomId || `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const roomRef = doc(db, 'rooms', roomId);
    try {
      if (existingRoomId) {
        await updateDoc(roomRef, {
          ...roomData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(roomRef, {
          ...roomData,
          roomId,
          ownerId: ownerSession.ownerId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        existingRoomId ? OperationType.UPDATE : OperationType.CREATE,
        `rooms/${roomId}`
      );
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await deleteDoc(doc(db, 'rooms', roomId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rooms/${roomId}`);
    }
  };

  const storageBucketAvailableRef = useRef<boolean | null>(null);

  const handleUploadOwnerPhoto = async (
    pgId: string,
    category: 'main' | 'gallery' | 'rooms' | 'facilities' | 'bathrooms',
    file: File,
    roomId?: string
  ): Promise<UploadedPhotoMetadata> => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) {
      throw new Error('Authentication required to upload PG photos.');
    }

    const isAuthorizedAdmin =
      Boolean(adminSessionActive) &&
      adminDocVerified === true &&
      isAuthorizedAdminEmail(currentUser.email);

    const isAuthorizedOwner =
      Boolean(ownerSession) &&
      ownerSession?.ownerId === currentUser.uid &&
      ownerSession?.accountStatus === 'Approved';

    if (!isAuthorizedOwner && !isAuthorizedAdmin) {
      throw new Error('You do not have permission to upload photos for this PG.');
    }

    const existingPg = [...publicListings, ...ownerListings].find((p) => p.pgId === pgId);
    if (existingPg && !isAuthorizedAdmin && existingPg.ownerId !== currentUser.uid) {
      throw new Error('You do not have permission to upload photos to another Owner’s PG.');
    }

    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMime.includes(file.type.toLowerCase())) {
      throw new Error('Unsupported file type. Only JPEG, PNG, and WebP images are allowed.');
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      throw new Error('File exceeds the 5MB maximum size limit.');
    }

    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath =
      category === 'rooms' && roomId
        ? `pg/${pgId}/rooms/${roomId}/${safeFileName}`
        : `pg/${pgId}/${category}/${safeFileName}`;
    const uploadedAt = new Date().toISOString();

    // Check whether Firebase Cloud Storage bucket is provisioned on this project
    const bucketName = storage.app.options.storageBucket || '';
    if (storageBucketAvailableRef.current === null && bucketName) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const probe = await fetch(
          `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o?maxResults=1`,
          { method: 'GET', signal: controller.signal }
        );
        clearTimeout(timer);
        storageBucketAvailableRef.current = probe.status !== 404;
      } catch {
        storageBucketAvailableRef.current = false;
      }
    }

    if (storageBucketAvailableRef.current) {
      try {
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, file, { contentType: file.type });
        const downloadUrl = await getDownloadURL(fileRef);
        return {
          url: downloadUrl,
          path: storagePath,
          size: file.size,
          contentType: file.type,
          uploadedAt,
        };
      } catch {
        storageBucketAvailableRef.current = false;
      }
    }

    // Persist the real validated & compressed photo in Firebase pgPhotos/{photoId}
    try {
      const dataUrl = await fileToDataUrl(file);
      const photoId = `photo_${currentUser.uid}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 6)}`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 120);

      await setDoc(doc(db, 'pgPhotos', photoId), {
        photoId,
        pgId,
        ownerId: currentUser.uid,
        category,
        storagePath,
        contentType: file.type,
        sizeBytes: file.size,
        dataUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        url: dataUrl,
        path: storagePath,
        size: file.size,
        contentType: file.type,
        uploadedAt,
      };
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (rawMsg.includes('permission-denied') || rawMsg.includes('Missing or insufficient')) {
        throw new Error('You do not have permission to upload photos for this PG.');
      }
      throw new Error('Photo upload is currently unavailable. Please contact the administrator.');
    }
  };

  const handleUpdateInquiryStatus = async (
    inquiryId: string,
    status: 'new' | 'contacted' | 'closed'
  ): Promise<{ ok: boolean; error?: string }> => {
    // 1. Prevent execution during AUTH_LOADING or ROLE_RESOLVING (Part 5)
    if (
      authLoading ||
      roleResolving ||
      authResolution === 'initializing' ||
      authResolution === 'resolving'
    ) {
      return {
        ok: false,
        error: 'Authentication and role resolution in progress. Please wait and try again.',
      };
    }

    if (!isOnline) {
      return {
        ok: false,
        error: 'Network error while updating inquiry. Please check your connection and try again.',
      };
    }

    // 2. Prevent duplicate concurrent updateDoc calls for the same inquiry (Issue 3)
    if (inFlightInquiryUpdatesRef.current.has(inquiryId)) {
      return {
        ok: false,
        error: 'An update is already in progress for this inquiry.',
      };
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) {
      return {
        ok: false,
        error: 'You do not have permission to update this inquiry.',
      };
    }

    const isAuthorizedAdmin =
      Boolean(adminSessionActive) &&
      adminDocVerified === true &&
      isAuthorizedAdminEmail(currentUser.email);

    const isAuthorizedOwner =
      Boolean(ownerSession) &&
      ownerSession?.ownerId === currentUser.uid &&
      ownerSession?.accountStatus === 'Approved';

    // 3. Enforce strict role & ownership verification before Firestore write (Issue 2 & Part 4)
    if (!isAuthorizedAdmin && !isAuthorizedOwner) {
      return {
        ok: false,
        error:
          'The update was denied because the authenticated account is not authorized to manage this inquiry.',
      };
    }

    if (isAuthorizedOwner && !isAuthorizedAdmin) {
      const targetInq = ownerInquiries.find((i) => i.inquiryId === inquiryId);
      const ownsTargetInq =
        targetInq &&
        (targetInq.ownerId === currentUser.uid ||
          ownerListings.some(
            (pg) => pg.pgId === targetInq.pgId && pg.ownerId === currentUser.uid
          ));
      if (!ownsTargetInq) {
        return {
          ok: false,
          error:
            'The update was denied because the authenticated account is not authorized to manage this inquiry.',
        };
      }
    }

    inFlightInquiryUpdatesRef.current.add(inquiryId);
    try {
      await updateDoc(doc(db, 'inquiries', inquiryId), {
        status,
        updatedAt: serverTimestamp(),
      });
      return { ok: true };
    } catch (err) {
      // Preserve structured technical error for developer diagnostics without throwing Unhandled Rejection
      handleFirestoreListenerError(err, OperationType.UPDATE, `inquiries/${inquiryId}`);
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (
        rawMsg.includes('Missing or insufficient permissions') ||
        rawMsg.includes('permission-denied')
      ) {
        return {
          ok: false,
          error: 'You do not have permission to update this inquiry.',
        };
      }
      if (rawMsg.includes('offline') || rawMsg.includes('network') || !navigator.onLine) {
        return {
          ok: false,
          error: 'Network error while updating inquiry. Please check your connection and try again.',
        };
      }
      return {
        ok: false,
        error: 'Failed to update inquiry status. Please try again.',
      };
    } finally {
      inFlightInquiryUpdatesRef.current.delete(inquiryId);
    }
  };

  // ============================================================
  // ADMIN AUTHENTICATION & CONTROL PANEL HANDLERS (Sections 1, 2, 3, 41–43)
  // ============================================================
  const handleVerifyAdminGoogleOnly = async (): Promise<{
    authorized: boolean;
    hasPin: boolean;
  }> => {
    setAuthError(null);
    setAuthLoading(true);
    setRoleResolving(true);
    try {
      // Clear any Customer/Owner session before verifying Admin identity
      setCustomerSession(null);
      setOwnerSession(null);

      const cred = await signInWithPopup(auth, googleProvider);
      const gUser = cred.user;

      // Strictly enforce that ONLY the single authorized Admin Google account is permitted
      if (!gUser.emailVerified || !isAuthorizedAdminEmail(gUser.email)) {
        await signOut(auth);
        setAdminSessionActive(false);
        setAdminDocVerified(false);
        setAuthResolution('unauthorized');
        return { authorized: false, hasPin: false };
      }

      const adminDoc = await getDoc(doc(db, 'admins', gUser.uid));
      const exists = adminDoc.exists();
      setTrustedAdminHasPin(exists);
      setAdminDocVerified(exists);

      return {
        authorized: true,
        hasPin: exists,
      };
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed.');
      return { authorized: false, hasPin: false };
    } finally {
      setRoleResolving(false);
      setAuthLoading(false);
    }
  };

  const handleAuthenticateAdminGoogleAndPin = async (
    pin: string,
    confirmPin: string,
    isFirstTimeSetup: boolean
  ) => {
    setAuthError(null);
    if (!isValidPinFormat(pin)) {
      setAuthError('Admin PIN must be 4 to 6 numeric digits.');
      return;
    }
    if (isFirstTimeSetup && pin !== confirmPin) {
      setAuthError('Admin PIN and Confirm PIN do not match.');
      return;
    }

    setAuthLoading(true);
    setRoleResolving(true);
    try {
      setCustomerSession(null);
      setOwnerSession(null);

      const gUser = auth.currentUser;
      if (!gUser || !gUser.emailVerified || !isAuthorizedAdminEmail(gUser.email)) {
        setAuthResolution('unauthorized');
        setAuthError(t('auth.accessDenied'));
        return;
      }

      const adminRef = doc(db, 'admins', gUser.uid);
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {
        const { pinHash, pinSalt } = await hashPin(pin);
        await setDoc(adminRef, {
          adminId: gUser.uid,
          email: gUser.email!.toLowerCase(),
          pinHash,
          pinSalt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const adminData = adminSnap.data() as { pinHash: string; pinSalt: string };
        const pinOk = await verifyPin(pin, adminData.pinHash, adminData.pinSalt);
        if (!pinOk) {
          setAuthError('Incorrect Admin PIN. Access denied.');
          return;
        }
      }

      await recordTrustedDeviceSession(gUser.uid, 'ADMIN', '', '');
      setTrustedAdminHasPin(true);
      setAdminDocVerified(true);
      setAdminSessionActive(true);
      setAuthResolution('authorized');
      setScreenHistory(['public_entry', 'admin_dashboard']);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Admin verification failed.');
    } finally {
      setRoleResolving(false);
      setAuthLoading(false);
    }
  };

  const handleApproveDeviceRequest = async (req: DeviceLoginRequest) => {
    if (!adminSessionActive || !auth.currentUser || !adminDocVerified) {
      throw new Error('Unauthorized Admin action.');
    }
    try {
      await updateDoc(doc(db, 'deviceLoginRequests', req.requestId), {
        status: 'APPROVED',
        approvedBy: auth.currentUser.uid,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'owners', req.ownerId), {
        activeDeviceIdHash: req.deviceIdHash,
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'ownerPreRegistrations', req.mobile), {
        activeDeviceIdHash: req.deviceIdHash,
        updatedAt: serverTimestamp(),
      });

      await recordAdminAuditLog(
        'APPROVE_NEW_DEVICE_LOGIN',
        'deviceLoginRequest',
        req.requestId,
        `owner=${req.ownerName}, mobile=${req.mobile}, device=${req.deviceName}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `deviceLoginRequests/${req.requestId}`);
    }
  };

  const handleRejectDeviceRequest = async (req: DeviceLoginRequest) => {
    if (!adminSessionActive || !auth.currentUser || !adminDocVerified) {
      throw new Error('Unauthorized Admin action.');
    }
    try {
      await updateDoc(doc(db, 'deviceLoginRequests', req.requestId), {
        status: 'REJECTED',
        rejectedBy: auth.currentUser.uid,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await recordAdminAuditLog(
        'REJECT_NEW_DEVICE_LOGIN',
        'deviceLoginRequest',
        req.requestId,
        `owner=${req.ownerName}, mobile=${req.mobile}, device=${req.deviceName}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `deviceLoginRequests/${req.requestId}`);
    }
  };

  const handleSaveOwnerPreReg = async (payload: {
    mobile: string;
    name: string;
    email: string;
    approvedGoogleEmail: string;
    status: 'Pending' | 'Approved' | 'Blocked' | 'Deleted';
  }) => {
    if (!adminSessionActive || !auth.currentUser || !adminDocVerified) {
      throw new Error('Unauthorized Admin action.');
    }
    if (!isValidIndianMobile(payload.mobile)) {
      throw new Error('Valid 10-digit Indian mobile number is required.');
    }

    const qDupGoogle = query(
      collection(db, 'ownerPreRegistrations'),
      where('approvedGoogleEmail', '==', payload.approvedGoogleEmail.toLowerCase())
    );
    const dupSnap = await getDocs(qDupGoogle);
    const conflictingDoc = dupSnap.docs.find((d) => d.id !== payload.mobile);
    if (conflictingDoc) {
      throw new Error(
        `Google account ${payload.approvedGoogleEmail} is already assigned to mobile ${conflictingDoc.id}. One Google account maps to one owner mobile.`
      );
    }

    const preRef = doc(db, 'ownerPreRegistrations', payload.mobile);
    const existing = await getDoc(preRef);
    try {
      if (existing.exists()) {
        const existingData = existing.data() as OwnerPreRegistration;
        if (existingData.status === 'Approved' && payload.status === 'Pending') {
          throw new Error(
            'Once an Owner is Approved, their status is locked and cannot be reverted to Pending.'
          );
        }

        await updateDoc(preRef, {
          name: sanitizeInput(payload.name, 100),
          email: sanitizeInput(payload.email, 150),
          approvedGoogleEmail: payload.approvedGoogleEmail.toLowerCase(),
          status: payload.status,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(preRef, {
          mobile: payload.mobile,
          name: sanitizeInput(payload.name, 100),
          email: sanitizeInput(payload.email, 150),
          approvedGoogleEmail: payload.approvedGoogleEmail.toLowerCase(),
          status: payload.status,
          createdByAdmin: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await recordAdminAuditLog(
        existing.exists() ? 'UPDATE_OWNER_PREREG' : 'CREATE_OWNER_PREREG',
        'ownerPreRegistration',
        payload.mobile,
        `status=${payload.status}, google=${payload.approvedGoogleEmail}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `ownerPreRegistrations/${payload.mobile}`);
    }
  };

  const handleBlockOwner = async (reg: OwnerPreRegistration) => {
    if (!adminSessionActive || !auth.currentUser || !adminDocVerified) return;
    const nextStatus = reg.status === 'Blocked' ? 'Approved' : 'Blocked';
    try {
      await updateDoc(doc(db, 'ownerPreRegistrations', reg.mobile), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      if (reg.linkedGoogleUid) {
        await updateDoc(doc(db, 'owners', reg.linkedGoogleUid), {
          accountStatus: nextStatus,
          preRegistrationStatus: nextStatus,
          updatedAt: serverTimestamp(),
        });
      }
      await recordAdminAuditLog(
        nextStatus === 'Blocked' ? 'BLOCK_OWNER' : 'UNBLOCK_OWNER',
        'ownerPreRegistration',
        reg.mobile,
        `status=${nextStatus}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ownerPreRegistrations/${reg.mobile}`);
    }
  };

  const handleDeleteOwner = async (reg: OwnerPreRegistration) => {
    if (!adminSessionActive || !auth.currentUser || !adminDocVerified) return;
    try {
      await updateDoc(doc(db, 'ownerPreRegistrations', reg.mobile), {
        status: 'Deleted',
        updatedAt: serverTimestamp(),
      });
      if (reg.linkedGoogleUid) {
        await updateDoc(doc(db, 'owners', reg.linkedGoogleUid), {
          accountStatus: 'Deleted',
          preRegistrationStatus: 'Deleted',
          updatedAt: serverTimestamp(),
        });
        const ownerPgsSnap = await getDocs(
          query(collection(db, 'pgListings'), where('ownerId', '==', reg.linkedGoogleUid))
        );
        for (const pgDoc of ownerPgsSnap.docs) {
          await updateDoc(doc(db, 'pgListings', pgDoc.id), {
            status: 'deleted',
            updatedAt: serverTimestamp(),
          });
        }
      }
      await recordAdminAuditLog(
        'SOFT_DELETE_OWNER',
        'ownerPreRegistration',
        reg.mobile,
        'Marked owner pre-registration as Deleted and soft-deleted associated PG listings'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ownerPreRegistrations/${reg.mobile}`);
    }
  };

  const handleSoftDeletePg = async (pgId: string) => {
    if (!adminSessionActive || !auth.currentUser || !adminDocVerified) return;
    try {
      await updateDoc(doc(db, 'pgListings', pgId), {
        status: 'deleted',
        updatedAt: serverTimestamp(),
      });
      await recordAdminAuditLog('SOFT_DELETE_PG', 'pgListing', pgId, 'status set to deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pgListings/${pgId}`);
    }
  };

  const handleCreateAdvertisement = async (payload: {
    pgId: string;
    cityId: string;
    areaId: string;
    sectorId: string;
    startDate: string;
    endDate: string;
    status: 'draft' | 'active' | 'expired' | 'cancelled';
  }) => {
    if (!adminSessionActive || !auth.currentUser || !adminDocVerified) return;
    const advertisementId = `ad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      await setDoc(doc(db, 'advertisements', advertisementId), {
        advertisementId,
        pgId: payload.pgId,
        cityId: payload.cityId,
        areaId: payload.areaId,
        sectorId: payload.sectorId,
        status: payload.status,
        startDate: payload.startDate,
        endDate: payload.endDate,
        createdByAdmin: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await recordAdminAuditLog(
        'CREATE_ADVERTISEMENT',
        'advertisement',
        advertisementId,
        `pgId=${payload.pgId}, cityId=${payload.cityId}, status=${payload.status}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `advertisements/${advertisementId}`);
    }
  };

  const handleUpdateAdvertisementStatus = async (
    advertisementId: string,
    status: 'draft' | 'active' | 'expired' | 'cancelled'
  ) => {
    if (!adminSessionActive || !auth.currentUser || !adminDocVerified) return;
    try {
      await updateDoc(doc(db, 'advertisements', advertisementId), {
        status,
        updatedAt: serverTimestamp(),
      });
      await recordAdminAuditLog(
        'UPDATE_ADVERTISEMENT_STATUS',
        'advertisement',
        advertisementId,
        `status=${status}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `advertisements/${advertisementId}`);
    }
  };

  const handleAddLocationNode = async (payload: {
    locationId: string;
    level: 'state' | 'district' | 'city' | 'area';
    parentId: string;
    name: string;
    hasSectors: boolean;
  }) => {
    if (!adminSessionActive || !auth.currentUser || !adminDocVerified) return;
    try {
      const locRef = doc(db, 'locations', payload.locationId);
      const existingSnap = await getDoc(locRef);
      if (existingSnap.exists()) {
        await updateDoc(locRef, {
          level: payload.level,
          parentId: payload.parentId,
          name: payload.name,
          hasSectors: payload.hasSectors,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(locRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await recordAdminAuditLog(
        'ADD_LOCATION_NODE',
        'location',
        payload.locationId,
        `${payload.level}: ${payload.name}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `locations/${payload.locationId}`);
    }
  };

  /**
   * Persistent Custom Area / Locality / Sector Handler (DERA APNA — AREA / LOCALITY MASTER v1.0)
   * - Validates and trims the custom area name
   * - Rejects empty or invalid values
   * - Prevents duplicates within the same City/Area hierarchy (seed + Firebase custom areas)
   * - Saves the custom area as real data in Firebase `locations/{areaId}`
   * - Associates countryId, stateId, districtId, cityId, areaId, createdBy, createdAt, custom=true
   * - Immediately merges into selectable areas for that city
   */
  const handlePersistCustomArea = async (payload: {
    stateId: string;
    districtId: string;
    cityId: string;
    customAreaName: string;
  }): Promise<LocationNode> => {
    const currentUser = auth.currentUser;
    const isAuthorizedOwner = Boolean(
      ownerSession && currentUser && ownerSession.ownerId === currentUser.uid
    );
    const isAuthorizedAdmin = Boolean(
      adminSessionActive && adminDocVerified && currentUser
    );
    const isAuthorizedCustomer = Boolean(
      customerSession && customerSession.status === 'active'
    );

    if (!isAuthorizedOwner && !isAuthorizedAdmin && !isAuthorizedCustomer) {
      throw new Error('Only an authenticated user can create a custom area.');
    }

    const creatorId =
      isAuthorizedOwner || isAuthorizedAdmin
        ? currentUser!.uid
        : customerSession!.customerId;

    if (!payload.stateId || !payload.districtId || !payload.cityId) {
      throw new Error('Please select State, District, and City before saving a custom area.');
    }

    const validation = validateCustomAreaName(payload.customAreaName);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid Custom Area / Locality / Sector name.');
    }

    const existingDuplicate = findDuplicateAreaInCity(
      allLocations,
      payload.cityId,
      validation.cleanedName
    );
    if (existingDuplicate) {
      return existingDuplicate;
    }

    const areaId = buildCustomAreaId(payload.cityId, validation.cleanedName);
    const locationRef = doc(db, 'locations', areaId);
    const existingSnap = await getDoc(locationRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as LocationNode;
      setCustomLocations((prev) =>
        prev.some((n) => n.locationId === existingData.locationId)
          ? prev
          : [...prev, existingData]
      );
      return existingData;
    }

    const newNode: LocationNode = {
      locationId: areaId,
      areaId,
      level: 'area',
      parentId: payload.cityId,
      countryId: 'IN',
      stateId: payload.stateId,
      districtId: payload.districtId,
      cityId: payload.cityId,
      name: validation.cleanedName,
      normalizedName: validation.normalizedName,
      type: 'CUSTOM',
      hasSectors: false,
      custom: true,
      createdBy: creatorId,
      status: 'active',
    };

    try {
      await setDoc(locationRef, {
        ...newNode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setCustomLocations((prev) =>
        prev.some((n) => n.locationId === newNode.locationId) ? prev : [...prev, newNode]
      );

      if (isAuthorizedAdmin) {
        await recordAdminAuditLog(
          'CREATE_CUSTOM_AREA',
          'location',
          areaId,
          `cityId=${payload.cityId}, name=${validation.cleanedName}`
        );
      }

      return newNode;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `locations/${areaId}`);
      throw err;
    }
  };

  // ============================================================
  // CUSTOMER VISIT, INQUIRY & REVIEW HANDLERS
  // ============================================================
  const handleOpenPgDetail = async (pg: PgListing) => {
    setSelectedPg(pg);
    setSelectedRoom(null);
    setInquirySuccessTargetIds([]);
    navigateTo('pg_detail');

    let sessionId = sessionStorage.getItem('dera_apna_visit_session');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('dera_apna_visit_session', sessionId);
    }
    const dedupKey = `visited_${pg.pgId}_${sessionId}`;
    if (!sessionStorage.getItem(dedupKey)) {
      sessionStorage.setItem(dedupKey, '1');
      const visitId = `vis_${pg.pgId}_${sessionId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
      try {
        await setDoc(doc(db, 'visits', visitId), {
          visitId,
          pgId: pg.pgId,
          ownerId: pg.ownerId,
          sessionId,
          source: 'pg_detail_view',
          timestamp: serverTimestamp(),
        });
      } catch {
        // Ignore duplicate visit write errors silently
      }
    }
  };

  const handleOpenRoomDetail = (room: RoomRecord) => {
    setSelectedRoom(room);
    navigateTo('room_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitInquiry = async (pg: PgListing, room?: RoomRecord) => {
    if (!customerSession || !customerSession.customerId || customerSession.status !== 'active') {
      navigateTo('customer_login');
      return;
    }
    if (!isOnline) {
      setAuthError(t('common.offline'));
      return;
    }

    const targetId = room ? room.roomId : pg.pgId;
    if (
      inFlightInquirySubmitRef.current ||
      submittingInquiryTargetId !== null ||
      inquirySuccessTargetIds.includes(targetId)
    ) {
      return;
    }

    inFlightInquirySubmitRef.current = true;
    setSubmittingInquiryTargetId(targetId);
    const rawInquiryId = room
      ? `inq_${customerSession.customerId}_${pg.pgId}_${room.roomId}_${Date.now()}`
      : `inq_${customerSession.customerId}_${pg.pgId}_${Date.now()}`;
    const inquiryId = rawInquiryId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);

    try {
      await setDoc(doc(db, 'inquiries', inquiryId), {
        inquiryId,
        customerId: customerSession.customerId,
        customerName: customerSession.name,
        customerMobile: customerSession.mobile,
        customerEmail: customerSession.email,
        pgId: pg.pgId,
        pgName: pg.propertyName,
        ownerId: pg.ownerId,
        roomId: room ? room.roomId : null,
        roomOccupancy: room ? room.occupancy : null,
        status: 'new',
        timestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setInquirySuccessTargetIds((prev) =>
        prev.includes(targetId) ? prev : [...prev, targetId]
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `inquiries/${inquiryId}`);
    } finally {
      inFlightInquirySubmitRef.current = false;
      setSubmittingInquiryTargetId(null);
    }
  };

  const handleSubmitReview = async (pgId: string, rating: number, comment: string) => {
    if (!customerSession || !customerSession.customerId || customerSession.status !== 'active') {
      throw new Error('Please sign in as a registered customer to submit a review.');
    }
    if (inFlightReviewSubmitRef.current || reviewSubmitting) {
      return;
    }
    inFlightReviewSubmitRef.current = true;
    setReviewSubmitting(true);
    const reviewId = `rev_${customerSession.customerId}_${pgId}_${Date.now()}`
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 120);

    try {
      await setDoc(doc(db, 'reviews', reviewId), {
        reviewId,
        pgId,
        customerId: customerSession.customerId,
        customerName: customerSession.name,
        rating,
        comment: sanitizeInput(comment, 1000),
        status: 'published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewId}`);
    } finally {
      inFlightReviewSubmitRef.current = false;
      setReviewSubmitting(false);
    }
  };

  const handleRequestCustomerLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomerCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setCustomerCoords(null);
      }
    );
  };

  // ============================================================
  // ROLE-AWARE THREE-DOT -> HOME & LOGOUT BEHAVIOR
  // ============================================================
  const handleHomeAction = async () => {
    if (customerSession) {
      const cid = customerSession.customerId;
      setCustomerSession(null);
      setAuthResolution('public');
      await revokeCustomerDeviceSession(cid);
      setScreenHistory(['public_entry']);
      return;
    }

    if (ownerSession) {
      setScreenHistory(['public_entry', 'explore']);
      return;
    }

    if (adminSessionActive) {
      setScreenHistory(['public_entry', 'explore']);
      return;
    }

    setScreenHistory(['public_entry']);
  };

  const handleNormalLogout = async () => {
    const cid = customerSession?.customerId;
    setCustomerSession(null);
    setOwnerSession(null);
    setAdminSessionActive(false);
    setAuthResolution('public');
    await revokeCustomerDeviceSession(cid);
    setScreenHistory(['public_entry']);
  };

  const handleCompleteSignOut = async () => {
    const cid = customerSession?.customerId;
    setCustomerSession(null);
    setOwnerSession(null);
    setAdminSessionActive(false);
    setAdminDocVerified(false);
    setTrustedAdminHasPin(false);
    setAuthResolution('public');
    await revokeCustomerDeviceSession(cid);
    clearLocalTrustedDeviceState();
    await signOut(auth).catch(() => {});
    setScreenHistory(['public_entry']);
  };

  const handleNavigateOwnerLogin = () => {
    if (ownerSession && auth.currentUser && ownerSession.ownerId === auth.currentUser.uid) {
      navigateTo('owner_dashboard');
    } else {
      navigateTo('owner_login');
    }
  };

  const handleNavigateAdminLogin = () => {
    if (
      adminSessionActive &&
      adminDocVerified &&
      auth.currentUser &&
      isAuthorizedAdminEmail(auth.currentUser.email)
    ) {
      navigateTo('admin_dashboard');
    } else {
      navigateTo('admin_login');
    }
  };

  const activeRole: AppRole =
    adminSessionActive && adminDocVerified
      ? 'ADMIN'
      : ownerSession
      ? 'PG_OWNER'
      : customerSession
      ? 'CUSTOMER'
      : 'PUBLIC';

  const trustedAdminVerified = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      isAuthorizedAdminEmail(firebaseUser.email) &&
      localStorage.getItem('dera_apna_trusted_admin_uid') === firebaseUser.uid
  );

  return (
    <div
      data-auth-state={authResolution}
      className="min-h-screen bg-[#FAF8F5] dark:bg-[#230B0E] text-slate-900 dark:text-[#FAF5F0] transition-colors"
    >
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-xs">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {!isOnline && (
        <div
          role="alert"
          className="bg-rose-600 text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2"
        >
          <WifiOff className="w-4 h-4" />
          <span>{t('common.offline')}</span>
        </div>
      )}

      <TopBar
        t={t}
        showBackButton={screenHistory.length > 1 && currentScreen !== 'public_entry'}
        onBack={navigateBack}
        onHomeAction={handleHomeAction}
        theme={theme}
        onSetTheme={setTheme}
        language={language}
        onChangeLanguage={setLanguage}
        activeRole={activeRole}
        onOwnerManageMyPg={() => {
          setOwnerActiveTab('manage_my_pg');
          navigateTo('owner_dashboard');
        }}
        onNormalLogout={handleNormalLogout}
        onCompleteSignOut={handleCompleteSignOut}
      />

      {currentScreen === 'public_entry' && (
        <PublicEntryView
          t={t}
          onNavigateLogin={() => navigateTo('customer_login')}
          onNavigateRegister={() => navigateTo('customer_register')}
          onNavigateExplore={() => navigateTo('explore')}
          onNavigateOwnerLogin={handleNavigateOwnerLogin}
          onNavigateAdminLogin={handleNavigateAdminLogin}
        />
      )}

      {currentScreen === 'customer_register' && (
        <CustomerRegisterView
          t={t}
          onRegisterCustomer={handleRegisterCustomer}
          onSwitchToLogin={() => navigateTo('customer_login')}
          loading={authLoading}
          error={authError}
        />
      )}

      {currentScreen === 'customer_login' && (
        <CustomerLoginView
          t={t}
          onLoginCustomer={handleLoginCustomer}
          onLookupForgotPinQuestion={handleLookupForgotPinQuestion}
          onResetCustomerPin={handleResetCustomerPin}
          onSwitchToRegister={() => navigateTo('customer_register')}
          loading={authLoading}
          error={authError}
        />
      )}

      {currentScreen === 'explore' && (
        <CustomerHomeView
          t={t}
          customer={customerSession}
          allLocations={allLocations}
          listings={publicListings}
          rooms={publicRooms}
          advertisements={activeAds}
          filters={searchFilters}
          onChangeFilters={setSearchFilters}
          onSelectPg={handleOpenPgDetail}
          onNavigateLogin={() => navigateTo('customer_login')}
          onNavigateRegister={() => navigateTo('customer_register')}
          onLogoutCustomer={handleNormalLogout}
        />
      )}

      {currentScreen === 'pg_detail' && selectedPg && (
        <PgDetailView
          t={t}
          pg={publicListings.find((p) => p.pgId === selectedPg.pgId) || selectedPg}
          rooms={publicRooms.filter((r) => r.pgId === selectedPg.pgId)}
          reviews={publicReviews}
          customer={customerSession}
          customerCoords={customerCoords}
          onRequestCustomerGeolocation={handleRequestCustomerLocation}
          onSelectRoom={handleOpenRoomDetail}
          onSubmitInquiry={handleSubmitInquiry}
          onSubmitReview={handleSubmitReview}
          submittingInquiryTargetId={submittingInquiryTargetId}
          inquirySuccessTargetIds={inquirySuccessTargetIds}
          reviewSubmitting={reviewSubmitting}
          gmpQuotaExceeded={gmpQuotaExceeded}
        />
      )}

      {currentScreen === 'room_detail' && selectedPg && selectedRoom && (
        <RoomDetailView
          t={t}
          pg={publicListings.find((p) => p.pgId === selectedPg.pgId) || selectedPg}
          room={
            publicRooms.find((r) => r.roomId === selectedRoom.roomId) || selectedRoom
          }
          customerCoords={customerCoords}
          onRequestCustomerGeolocation={handleRequestCustomerLocation}
          onBackToPg={navigateBack}
          onSubmitInquiry={handleSubmitInquiry}
          submittingInquiryTargetId={submittingInquiryTargetId}
          inquirySuccessTargetIds={inquirySuccessTargetIds}
          gmpQuotaExceeded={gmpQuotaExceeded}
        />
      )}

      {currentScreen === 'owner_login' && (
        <OwnerLoginView
          t={t}
          onCheckOwnerPreReg={handleCheckOwnerPreReg}
          onCheckOwnerAuthState={handleCheckOwnerAuthState}
          onAuthenticateOwnerGoogleAndPin={handleAuthenticateOwnerGoogleAndPin}
          pendingDeviceRequest={pendingOwnerDeviceRequest}
          onCancelPendingDeviceRequest={handleCancelPendingDeviceRequest}
          onSimulateNewDevice={handleSimulateNewDevice}
          onNavigateAdminLogin={handleNavigateAdminLogin}
          loading={authLoading}
          error={authError}
        />
      )}

      {currentScreen === 'owner_dashboard' && ownerSession && (
        <OwnerDashboardView
          t={t}
          owner={ownerSession}
          allLocations={allLocations}
          ownerListings={ownerListings}
          ownerListingsLoading={ownerListingsLoading}
          ownerRooms={ownerRooms}
          ownerInquiries={ownerInquiries}
          ownerVisits={ownerVisits}
          activeTab={ownerActiveTab}
          onChangeTab={setOwnerActiveTab}
          onSaveInitialPg={handleSaveInitialPg}
          onUpdatePgLocationOnly={handleUpdatePgLocationOnly}
          onSaveRoom={handleSaveRoom}
          onDeleteRoom={handleDeleteRoom}
          onUploadPhoto={handleUploadOwnerPhoto}
          onUpdateInquiryStatus={handleUpdateInquiryStatus}
          onPersistCustomArea={handlePersistCustomArea}
          gmpQuotaExceeded={gmpQuotaExceeded}
        />
      )}

      {currentScreen === 'admin_login' && (
        <AdminLoginView
          t={t}
          trustedAdminVerified={trustedAdminVerified}
          trustedAdminHasPin={trustedAdminHasPin}
          onVerifyAdminGoogleOnly={handleVerifyAdminGoogleOnly}
          onAuthenticateAdminGoogleAndPin={handleAuthenticateAdminGoogleAndPin}
          loading={authLoading}
          error={authError}
        />
      )}

      {currentScreen === 'admin_dashboard' && adminSessionActive && adminDocVerified && (
        <AdminDashboardView
          t={t}
          customers={adminCustomers}
          ownerPreRegs={adminOwnerPreRegs}
          pgListings={adminAllListings}
          advertisements={adminAllAds}
          inquiries={adminAllInquiries}
          allLocations={allLocations}
          auditLogs={adminAuditLogs}
          deviceRequests={adminDeviceRequests}
          onApproveDeviceRequest={handleApproveDeviceRequest}
          onRejectDeviceRequest={handleRejectDeviceRequest}
          onSaveOwnerPreReg={handleSaveOwnerPreReg}
          onBlockOwner={handleBlockOwner}
          onDeleteOwner={handleDeleteOwner}
          onSoftDeletePg={handleSoftDeletePg}
          onCreateAdvertisement={handleCreateAdvertisement}
          onUpdateAdvertisementStatus={handleUpdateAdvertisementStatus}
          onUpdateInquiryStatus={handleUpdateInquiryStatus}
          onAddLocationNode={handleAddLocationNode}
          onPersistCustomArea={handlePersistCustomArea}
        />
      )}
    </div>
  );
}
