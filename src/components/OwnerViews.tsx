import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building2,
  BedDouble,
  Image as ImageIcon,
  MessageSquare,
  User,
  Plus,
  Trash2,
  Lock,
  CheckCircle2,
  Edit3,
  Eye,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { CascadingLocationSelector, OTHER_AREA_OPTION_VALUE } from './CascadingLocationSelector';
import { OwnerLocationPickerMap } from './MapComponents';
import { PhotoUploadControl } from './PhotoUploadControl';
import {
  DeviceLoginRequest,
  InquiryRecord,
  LocationNode,
  OwnerPreRegistration,
  OwnerProfile,
  PgListing,
  RoomRecord,
  UploadedPhotoMetadata,
  VisitRecord,
} from '../types/models';

interface OwnerLoginViewProps {
  t: (key: string) => string;
  onCheckOwnerPreReg: (mobile: string) => Promise<OwnerPreRegistration | null>;
  onCheckOwnerAuthState: (mobile: string) => Promise<{
    hasPin: boolean;
    trustedDeviceActive: boolean;
  }>;
  onAuthenticateOwnerGoogleAndPin: (payload: {
    mobile: string;
    pin: string;
    confirmPin?: string;
    isNewPinSetup: boolean;
    isForgotPinReset: boolean;
    skipGooglePopupIfTrusted: boolean;
    forceNewDeviceRequest?: boolean;
  }) => Promise<void>;
  pendingDeviceRequest: DeviceLoginRequest | null;
  onCancelPendingDeviceRequest: () => Promise<void>;
  onSimulateNewDevice: () => Promise<void>;
  onNavigateAdminLogin: () => void;
  loading: boolean;
  error: string | null;
}

/**
 * PG Owner Login View (Sections 27, 51, 52, 53, 54, 55 & New Device Approval Flow)
 * - Exact First Login Flow:
 *   Step 1: Mobile -> Step 2: Continue -> Step 3: Verify Admin pre-registration
 *   Step 4: Google Auth (must match approved Google account) -> Step 5: Create PIN & Confirm PIN -> Step 6: Open Initial PG Setup
 * - Trusted Device Flow:
 *   On the same active trusted device after initial setup (or after normal Logout), Mobile -> Continue -> PIN -> Direct Login (NO repeated Google popup)
 * - New / Unrecognized Device Flow:
 *   When logging in from a new device (or after simulating a new device), verifies PIN and submits a `deviceLoginRequests` approval request to Admin.
 */
export const OwnerLoginView: React.FC<OwnerLoginViewProps> = ({
  t,
  onCheckOwnerPreReg,
  onCheckOwnerAuthState,
  onAuthenticateOwnerGoogleAndPin,
  pendingDeviceRequest,
  onCancelPendingDeviceRequest,
  onSimulateNewDevice,
  loading,
  error,
}) => {
  const [step, setStep] = useState<'mobile' | 'pin_or_google' | 'forgot_pin'>('mobile');
  const [mobile, setMobile] = useState(() => localStorage.getItem('dera_apna_trusted_owner_mobile') || '');
  const [preReg, setPreReg] = useState<OwnerPreRegistration | null>(null);
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [trustedDeviceActive, setTrustedDeviceActive] = useState(false);
  const [forceNewDevice, setForceNewDevice] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleStep1Continue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const cleanMobile = mobile.trim();
    if (!/^[6-9][0-9]{9}$/.test(cleanMobile)) {
      setLocalError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const record = await onCheckOwnerPreReg(cleanMobile);
    if (!record) {
      setLocalError(t('auth.notPreRegistered'));
      return;
    }
    if (record.status === 'Blocked') {
      setLocalError('Your PG Owner account is Blocked by Admin.');
      return;
    }
    if (record.status === 'Deleted') {
      setLocalError('This PG Owner registration has been deleted by Admin.');
      return;
    }
    if (record.status !== 'Approved') {
      setLocalError(t('auth.notPreRegistered'));
      return;
    }

    const state = await onCheckOwnerAuthState(cleanMobile);
    setPreReg(record);
    setHasExistingPin(state.hasPin);
    setTrustedDeviceActive(state.trustedDeviceActive);
    setForceNewDevice(false);
    setStep('pin_or_google');
  };

  const handleCompleteAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    await onAuthenticateOwnerGoogleAndPin({
      mobile: mobile.trim(),
      pin,
      confirmPin,
      isNewPinSetup: !hasExistingPin,
      isForgotPinReset: step === 'forgot_pin',
      skipGooglePopupIfTrusted:
        hasExistingPin && trustedDeviceActive && !forceNewDevice && step !== 'forgot_pin',
      forceNewDeviceRequest:
        hasExistingPin && (!trustedDeviceActive || forceNewDevice) && step !== 'forgot_pin',
    });
  };

  const handleSwitchToNewDeviceTest = async () => {
    await onSimulateNewDevice();
    setTrustedDeviceActive(false);
    setForceNewDevice(true);
    setLocalError(null);
  };

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo size="md" showTagline={true} stacked={true} />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white pt-1">
            {t('auth.ownerLogin')}
          </h1>
        </div>

        {(localError || error) && (
          <div
            role="alert"
            className="p-3.5 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-start gap-2"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{localError || error}</span>
          </div>
        )}

        {/* Real-Time New Device Approval Waiting State */}
        {pendingDeviceRequest && pendingDeviceRequest.status === 'PENDING' && (
          <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 space-y-3 text-xs">
            <div className="font-semibold text-amber-950 dark:text-amber-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t('device.newDeviceDetected')}</span>
            </div>
            <p className="text-amber-900 dark:text-amber-200 leading-relaxed">
              {t('device.requestSentToAdmin')} {t('device.waitingForAdmin')}
            </p>
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
              <div>
                <strong>Owner:</strong> {pendingDeviceRequest.ownerName} ({pendingDeviceRequest.mobile})
              </div>
              <div>
                <strong>Device:</strong> {pendingDeviceRequest.deviceName} ({pendingDeviceRequest.platform})
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">
                  {pendingDeviceRequest.status}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelPendingDeviceRequest}
              className="w-full py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel Request
            </button>
          </div>
        )}

        {!pendingDeviceRequest && step === 'mobile' && (
          <form onSubmit={handleStep1Continue} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.mobile')} *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter Admin pre-registered mobile"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('auth.continue')}
            </button>
          </form>
        )}

        {!pendingDeviceRequest && (step === 'pin_or_google' || step === 'forgot_pin') && preReg && (
          <form onSubmit={handleCompleteAuth} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-white">
                Owner: {preReg.name} ({preReg.mobile})
              </div>
              {hasExistingPin && trustedDeviceActive && !forceNewDevice && step !== 'forgot_pin' ? (
                <div className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('device.trustedVerified')}</span>
                </div>
              ) : hasExistingPin && step !== 'forgot_pin' ? (
                <div className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('device.untrustedNotice')}</span>
                </div>
              ) : (
                <div className="text-slate-500 dark:text-slate-400">
                  Approved Google Account: <strong>{preReg.approvedGoogleEmail}</strong>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {!hasExistingPin || step === 'forgot_pin'
                  ? `Create ${t('auth.pin')} *`
                  : `${t('auth.pin')} *`}
              </label>
              <input
                type="password"
                inputMode="numeric"
                required
                minLength={4}
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {(!hasExistingPin || step === 'forgot_pin') && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.confirmPin')} *
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  minLength={4}
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading
                ? t('common.loading')
                : hasExistingPin && trustedDeviceActive && !forceNewDevice && step !== 'forgot_pin'
                ? t('auth.login')
                : hasExistingPin && step !== 'forgot_pin'
                ? 'Verify PIN & Request New Device Approval'
                : !hasExistingPin
                ? `${t('auth.verifyGoogle')} & Save PIN`
                : `${t('auth.verifyGoogle')} & Reset PIN`}
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              {hasExistingPin && step !== 'forgot_pin' && (
                <button
                  type="button"
                  onClick={() => {
                    setStep('forgot_pin');
                    setPin('');
                    setConfirmPin('');
                  }}
                  className="font-medium text-sky-600 hover:underline cursor-pointer"
                >
                  {t('auth.forgotPin')}
                </button>
              )}
              {hasExistingPin && trustedDeviceActive && !forceNewDevice && step !== 'forgot_pin' && (
                <button
                  type="button"
                  onClick={handleSwitchToNewDeviceTest}
                  className="font-medium text-amber-600 hover:underline cursor-pointer"
                >
                  {t('device.switchTestDevice')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setStep('mobile');
                  setPreReg(null);
                  setPin('');
                  setConfirmPin('');
                }}
                className="font-medium text-slate-500 hover:underline cursor-pointer"
              >
                Change Mobile Number
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
};

export type OwnerDashboardTab =
  | 'overview'
  | 'initial_setup'
  | 'manage_my_pg'
  | 'rooms'
  | 'photos'
  | 'inquiries'
  | 'availability'
  | 'profile';

interface OwnerDashboardViewProps {
  t: (key: string) => string;
  owner: OwnerProfile;
  allLocations: LocationNode[];
  ownerListings: PgListing[];
  ownerListingsLoading: boolean;
  ownerRooms: RoomRecord[];
  ownerInquiries: InquiryRecord[];
  ownerVisits: VisitRecord[];
  activeTab: OwnerDashboardTab;
  onChangeTab: (tab: OwnerDashboardTab) => void;
  onSaveInitialPg: (
    listingData: Omit<PgListing, 'pgId' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onUpdatePgLocationOnly: (
    pgId: string,
    locationUpdate: Partial<PgListing>
  ) => Promise<void>;
  onSaveRoom: (
    roomData: Omit<RoomRecord, 'roomId' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingRoomId?: string
  ) => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
  onUploadPhoto: (
    pgId: string,
    category: 'main' | 'gallery' | 'rooms' | 'facilities' | 'bathrooms',
    file: File,
    roomId?: string
  ) => Promise<UploadedPhotoMetadata>;
  onUpdateInquiryStatus: (
    inquiryId: string,
    status: 'new' | 'contacted' | 'closed'
  ) => Promise<{ ok: boolean; error?: string }>;
  onPersistCustomArea: (payload: {
    stateId: string;
    districtId: string;
    cityId: string;
    customAreaName: string;
  }) => Promise<LocationNode>;
  gmpQuotaExceeded: boolean;
}

const ROOM_FACILITY_OPTIONS = [
  'Bed',
  'Wardrobe',
  'Table',
  'Chair',
  'AC',
  'Cooler',
  'Fan',
  'Wi-Fi',
  'RO',
  'Attached Washroom',
  'Common Washroom',
  'Ventilation',
  'Laundry',
  'Washing Machine',
  'Food',
  'Meal: 1 Time',
  'Meal: 2 Times',
  'Meal: 3 Times',
  'Meal: 4 Times',
  'Parking',
  'Water Cooler',
  'Lunch Service',
  'Transportation',
  'Gym',
  'Lift',
  'Gaming Room',
];

export const OwnerDashboardView: React.FC<OwnerDashboardViewProps> = ({
  t,
  owner,
  allLocations,
  ownerListings,
  ownerListingsLoading,
  ownerRooms,
  ownerInquiries,
  ownerVisits,
  activeTab,
  onChangeTab,
  onSaveInitialPg,
  onUpdatePgLocationOnly,
  onSaveRoom,
  onDeleteRoom,
  onUploadPhoto,
  onUpdateInquiryStatus,
  onPersistCustomArea,
  gmpQuotaExceeded,
}) => {
  const primaryPg = ownerListings.find((p) => p.status !== 'deleted') || null;

  // Section 27 Step 6: Immediately after PIN creation, if no PG exists yet (and snapshot has loaded), force INITIAL PG PROFILE SETUP.
  // Once primaryPg exists and is locked, never trap the owner on initial_setup.
  useEffect(() => {
    if (ownerListingsLoading) return;
    if (!primaryPg && activeTab !== 'initial_setup') {
      onChangeTab('initial_setup');
    } else if (primaryPg && activeTab === 'initial_setup') {
      onChangeTab('overview');
    }
  }, [ownerListingsLoading, primaryPg, activeTab, onChangeTab]);

  // Initial PG Profile Setup State (Sections 28–32)
  const [stateId, setStateId] = useState(primaryPg?.stateId || '');
  const [districtId, setDistrictId] = useState(primaryPg?.districtId || '');
  const [cityId, setCityId] = useState(primaryPg?.cityId || '');
  const [areaId, setAreaId] = useState(primaryPg?.areaId || '');
  const [customAreaName, setCustomAreaName] = useState('');
  const [street, setStreet] = useState(primaryPg?.street || '');
  const [updatingInquiryIds, setUpdatingInquiryIds] = useState<Record<string, boolean>>({});
  const [inquiryBadgeMap, setInquiryBadgeMap] = useState<
    Record<string, { type: 'success' | 'error'; text: string }>
  >({});
  const [houseNumber, setHouseNumber] = useState(primaryPg?.houseNumber || '');
  const [latitude, setLatitude] = useState<number>(primaryPg?.latitude || 28.4744);
  const [longitude, setLongitude] = useState<number>(primaryPg?.longitude || 77.504);

  const [propertyName, setPropertyName] = useState(primaryPg?.propertyName || '');
  const [propertyType, setPropertyType] = useState<'PG' | 'Hostel' | 'Both' | ''>(
    primaryPg?.propertyType || ''
  );
  const [gender, setGender] = useState<'Male' | 'Female' | 'Both' | ''>(primaryPg?.gender || '');
  const [uploadedMainPhoto, setUploadedMainPhoto] = useState<UploadedPhotoMetadata | null>(
    primaryPg?.mainPhotoUrl
      ? {
          url: primaryPg.mainPhotoUrl,
          path: primaryPg.mainPhotoPath || `pg/${primaryPg.pgId}/main/photo.jpg`,
          size: primaryPg.mainPhotoSize || 0,
          contentType: primaryPg.mainPhotoContentType || 'image/jpeg',
          uploadedAt:
            typeof primaryPg.mainPhotoUploadedAt === 'string'
              ? primaryPg.mainPhotoUploadedAt
              : new Date().toISOString(),
        }
      : null
  );
  const [googleReviewUrl, setGoogleReviewUrl] = useState(primaryPg?.googleReviewUrl || '');
  const [contactNumber, setContactNumber] = useState(primaryPg?.contactNumber || owner.mobile);

  // Sync location and identity fields when primaryPg loads for Manage My PG
  useEffect(() => {
    if (primaryPg) {
      setStateId(primaryPg.stateId);
      setDistrictId(primaryPg.districtId);
      setCityId(primaryPg.cityId);
      setAreaId(primaryPg.areaId);
      setCustomAreaName('');
      setStreet(primaryPg.street);
      setHouseNumber(primaryPg.houseNumber);
      setLatitude(primaryPg.latitude);
      setLongitude(primaryPg.longitude);
      setPropertyName(primaryPg.propertyName);
      setPropertyType(primaryPg.propertyType);
      setGender(primaryPg.gender);
      setUploadedMainPhoto(
        primaryPg.mainPhotoUrl
          ? {
              url: primaryPg.mainPhotoUrl,
              path: primaryPg.mainPhotoPath || `pg/${primaryPg.pgId}/main/photo.jpg`,
              size: primaryPg.mainPhotoSize || 0,
              contentType: primaryPg.mainPhotoContentType || 'image/jpeg',
              uploadedAt:
                typeof primaryPg.mainPhotoUploadedAt === 'string'
                  ? primaryPg.mainPhotoUploadedAt
                  : new Date().toISOString(),
            }
          : null
      );
      setGoogleReviewUrl(primaryPg.googleReviewUrl || '');
      setContactNumber(primaryPg.contactNumber || owner.mobile);
    }
  }, [primaryPg, owner.mobile]);

  // Room Post Form State (Sections 35–43: Nothing auto-selected!)
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomOccupancy, setRoomOccupancy] = useState<'2 Seater' | '3 Seater' | '4 Seater' | ''>('');
  const [roomRent, setRoomRent] = useState('');
  const [roomDeposit, setRoomDeposit] = useState('');
  const [roomDurationMonths, setRoomDurationMonths] = useState('');
  const [roomSelectedFacilities, setRoomSelectedFacilities] = useState<string[]>([]);
  const [roomPhotosList, setRoomPhotosList] = useState<string[]>([]);
  const [roomDescription, setRoomDescription] = useState('');
  const [roomAvailable, setRoomAvailable] = useState(true);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const resolveLocationNames = (
    sId: string,
    dId: string,
    cId: string,
    aId: string,
    explicitAreaName?: string
  ) => {
    const stateName = allLocations.find((l) => l.locationId === sId)?.name || sId;
    const districtName = allLocations.find((l) => l.locationId === dId)?.name || dId;
    const cityName = allLocations.find((l) => l.locationId === cId)?.name || cId;
    const areaName =
      explicitAreaName ||
      allLocations.find((l) => l.locationId === aId)?.name ||
      aId;
    return { stateName, districtName, cityName, areaName };
  };

  // Save Initial PG Profile (Sections 28–32)
  const handleInitialPgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!stateId || !districtId || !cityId || !areaId) {
      setFeedback({
        type: 'error',
        text: 'Step 1: Please select State, District, City, and Area/Sector.',
      });
      return;
    }
    if (!propertyName.trim() || !propertyType || !gender) {
      setFeedback({
        type: 'error',
        text: 'Step 2: Please enter PG Name, Property Type (PG/Hostel/Both), and Gender (Boys/Girls/Both).',
      });
      return;
    }
    if (!uploadedMainPhoto || !uploadedMainPhoto.url) {
      setFeedback({
        type: 'error',
        text: 'Main PG Photo is required. Please upload a photo using Camera or Gallery/File.',
      });
      return;
    }

    setSaving(true);
    try {
      let resolvedAreaId = areaId;
      let resolvedAreaNameOverride: string | undefined;

      if (areaId === OTHER_AREA_OPTION_VALUE) {
        if (!customAreaName.trim()) {
          setFeedback({
            type: 'error',
            text: 'Step 1: Please enter your Custom Area / Locality / Sector name.',
          });
          setSaving(false);
          return;
        }
        const savedNode = await onPersistCustomArea({
          stateId,
          districtId,
          cityId,
          customAreaName,
        });
        resolvedAreaId = savedNode.locationId;
        resolvedAreaNameOverride = savedNode.name;
        setAreaId(savedNode.locationId);
        setCustomAreaName('');
      }

      const { stateName, districtName, cityName, areaName } = resolveLocationNames(
        stateId,
        districtId,
        cityId,
        resolvedAreaId,
        resolvedAreaNameOverride
      );

      await onSaveInitialPg({
        propertyName: propertyName.trim(),
        propertyType,
        gender,
        countryId: 'IN',
        stateId,
        districtId,
        cityId,
        areaId: resolvedAreaId,
        sectorId: resolvedAreaId,
        countryName: 'India',
        stateName,
        districtName,
        cityName,
        areaName,
        sectorName: areaName,
        street: street.trim(),
        houseNumber: houseNumber.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        mainPhotoUrl: uploadedMainPhoto.url,
        mainPhotoPath: uploadedMainPhoto.path,
        mainPhotoSize: uploadedMainPhoto.size,
        mainPhotoContentType: uploadedMainPhoto.contentType,
        mainPhotoUploadedAt: uploadedMainPhoto.uploadedAt,
        googleReviewUrl: googleReviewUrl.trim(),
        googleReviewsUrl: googleReviewUrl.trim(),
        galleryPhotos: '',
        bathroomPhotos: '',
        facilityPhotos: '',
        rent: 0,
        securityDeposit: 0,
        securityDuration: '1 Month',
        pricingModel: 'Monthly',
        acType: 'Non-AC',
        roomTypes: 'Standard',
        occupancy2Seater: false,
        occupancy3Seater: false,
        occupancy4Seater: false,
        foodIncluded: false,
        mealFrequency: 'None',
        laundry: false,
        washingMachine: false,
        wifi: false,
        ro: false,
        waterCooler: false,
        cooler: false,
        parking: false,
        ventilation: false,
        bed: false,
        wardrobe: false,
        table: false,
        chair: false,
        lunchService: false,
        transportation: false,
        gym: false,
        lift: false,
        gamingRoom: false,
        washroomType: 'Separate',
        furnishing: 'Fully Furnished',
        rules: 'Valid ID required at check-in.',
        bookingAvailable: true,
        roomAvailability: 'Available',
        paymentTerms: 'Monthly',
        securityTerms: 'Refundable',
        description: `${propertyName.trim()} in ${areaName}, ${cityName}`,
        contactNumber: contactNumber.trim(),
        photos: uploadedMainPhoto.url,
        identityLocked: true,
        status: 'active',
      });

      setFeedback({
        type: 'success',
        text: 'Initial PG Profile permanently saved! Proceeding to ADD ROOMS.',
      });
      // Section 32 & 35: Immediately after saving initial PG profile, go to ADD ROOMS
      onChangeTab('rooms');
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : t('common.saveFailed'),
      });
    } finally {
      setSaving(false);
    }
  };

  // Manage My PG — Limited Location Edit (Section 34: CHANGE LOCATION ONLY)
  const handleManageLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryPg) return;
    setFeedback(null);
    if (!stateId || !districtId || !cityId || !areaId) {
      setFeedback({
        type: 'error',
        text: 'Please select valid State, District, City, and Area/Sector.',
      });
      return;
    }

    setSaving(true);
    try {
      let resolvedAreaId = areaId;
      let resolvedAreaNameOverride: string | undefined;

      if (areaId === OTHER_AREA_OPTION_VALUE) {
        if (!customAreaName.trim()) {
          setFeedback({
            type: 'error',
            text: 'Please enter your Custom Area / Locality / Sector name.',
          });
          setSaving(false);
          return;
        }
        const savedNode = await onPersistCustomArea({
          stateId,
          districtId,
          cityId,
          customAreaName,
        });
        resolvedAreaId = savedNode.locationId;
        resolvedAreaNameOverride = savedNode.name;
        setAreaId(savedNode.locationId);
        setCustomAreaName('');
      }

      const { stateName, districtName, cityName, areaName } = resolveLocationNames(
        stateId,
        districtId,
        cityId,
        resolvedAreaId,
        resolvedAreaNameOverride
      );
      await onUpdatePgLocationOnly(primaryPg.pgId, {
        stateId,
        districtId,
        cityId,
        areaId: resolvedAreaId,
        sectorId: resolvedAreaId,
        stateName,
        districtName,
        cityName,
        areaName,
        sectorName: areaName,
        street: street.trim(),
        houseNumber: houseNumber.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      setFeedback({
        type: 'success',
        text: 'PG Location updated. Permanent PG identity (Name, Type, Gender, Main Photo) remained locked.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : t('common.saveFailed'),
      });
    } finally {
      setSaving(false);
    }
  };

  // Publish / Update Room Post (Sections 35–43)
  const handlePublishRoomPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryPg) return;
    setFeedback(null);

    if (!roomOccupancy) {
      setFeedback({
        type: 'error',
        text: 'Please select Room Type / Occupancy (2 Seater, 3 Seater, or 4 Seater).',
      });
      return;
    }
    const rentNum = Number(roomRent);
    const depositNum = Number(roomDeposit || 0);
    const durationNum = Number(roomDurationMonths || 1);
    if (!roomRent || Number.isNaN(rentNum) || rentNum <= 0) {
      setFeedback({ type: 'error', text: 'Please enter a valid Monthly Rent.' });
      return;
    }
    if (roomSelectedFacilities.length === 0) {
      setFeedback({
        type: 'error',
        text: 'Please explicitly select at least one facility for this Room Post.',
      });
      return;
    }
    if (!roomDescription.trim()) {
      setFeedback({
        type: 'error',
        text: 'Please enter a genuine Room Description.',
      });
      return;
    }

    setSaving(true);
    try {
      await onSaveRoom(
        {
          pgId: primaryPg.pgId,
          roomType: `${roomOccupancy} Room Post`,
          occupancy: roomOccupancy,
          rent: rentNum,
          securityDeposit: depositNum,
          securityDuration: durationNum,
          facilities: roomSelectedFacilities.join('|'),
          photos: roomPhotosList.join('|'),
          description: roomDescription.trim(),
          availability: roomAvailable,
          status: 'active',
        },
        editingRoomId || undefined
      );

      setEditingRoomId(null);
      setRoomOccupancy('');
      setRoomRent('');
      setRoomDeposit('');
      setRoomDurationMonths('');
      setRoomSelectedFacilities([]);
      setRoomPhotosList([]);
      setRoomDescription('');
      setRoomAvailable(true);
      setFeedback({
        type: 'success',
        text: `${roomOccupancy} Room Post published! You can publish additional room posts below.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : t('common.saveFailed'),
      });
    } finally {
      setSaving(false);
    }
  };

  // If no PG exists yet, render ONLY the ordered Initial PG Profile Setup (Section 27 Step 6 & Sections 28–32)
  if (!primaryPg || activeTab === 'initial_setup') {
    const tempPgId = `pg_${owner.ownerId}_init`;
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <BrandLogo size="sm" showTagline={false} />
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white pt-2">
              Initial PG Profile Setup
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete your property location, permanent core identity, and Main PG Photo.
            </p>
          </div>

          {feedback && (
            <div
              role="alert"
              className={`p-3.5 rounded-xl border text-xs font-medium ${
                feedback.type === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-rose-300 bg-rose-50 text-rose-900'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <form onSubmit={handleInitialPgSubmit} className="space-y-8 text-xs">
            {/* STEP 1: LOCATION (Section 28) */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                STEP 1: LOCATION
              </h2>

              <OwnerLocationPickerMap
                latitude={latitude}
                longitude={longitude}
                onSelectCoordinates={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                useCurrentLocationLabel={t('owner.useCurrentLocation')}
                selectOnMapLabel={t('owner.selectOnMap')}
                quotaExceeded={gmpQuotaExceeded}
              />

              <CascadingLocationSelector
                allLocations={allLocations}
                stateId={stateId}
                districtId={districtId}
                cityId={cityId}
                areaId={areaId}
                customAreaName={customAreaName}
                onPersistCustomArea={onPersistCustomArea}
                compact={true}
                onChange={(loc) => {
                  setStateId(loc.stateId);
                  setDistrictId(loc.districtId);
                  setCityId(loc.cityId);
                  setAreaId(loc.areaId);
                  setCustomAreaName(loc.customAreaName || '');
                }}
                labels={{
                  state: t('location.state'),
                  district: t('location.district'),
                  city: t('location.city'),
                  area: t('location.area'),
                  sectorNotAvailable: t('location.sectorNotAvailable'),
                  noLocationData: t('search.noLocationData'),
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">{t('location.street')} *</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Street / Road name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">{t('location.houseNumber')} *</label>
                  <input
                    type="text"
                    required
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="Plot / Building No."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: BASIC DETAILS — CORE PERMANENT IDENTITY (Section 29) */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  STEP 2: CORE PERMANENT IDENTITY
                </h2>
                <p className="text-[11px] text-slate-500">
                  PG Name, Property Type, and Gender become permanent after saving.
                </p>
              </div>

              <div>
                <label className="block font-medium mb-1">1. PG Name *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="Enter official PG / Hostel name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">2. Property Type *</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['PG', 'Hostel', 'Both'] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPropertyType(pt)}
                      className={`py-2.5 rounded-xl font-semibold border cursor-pointer ${
                        propertyType === pt
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">3. Gender *</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { value: 'Male' as const, label: 'Boys' },
                    { value: 'Female' as const, label: 'Girls' },
                    { value: 'Both' as const, label: 'Both' },
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      className={`py-2.5 rounded-xl font-semibold border cursor-pointer ${
                        gender === g.value
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* STEP 3: UPLOAD MAIN PG PHOTO (Section 30) */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                STEP 3: UPLOAD MAIN PG PHOTO (MANDATORY)
              </h2>

              <PhotoUploadControl
                label="Take Photo (Camera) or Select Photo (Gallery/File) — Auto-compressed to 200–250 KB"
                cameraLabel={t('pg.camera')}
                galleryLabel={t('pg.gallery')}
                initialPreviewUrl={uploadedMainPhoto?.url}
                onRemovePhoto={() => setUploadedMainPhoto(null)}
                onUploadOptimizedFile={async (file, meta) => {
                  const uploaded = await onUploadPhoto(tempPgId, 'main', file);
                  meta.setStage('Saving...');
                  setUploadedMainPhoto(uploaded);
                  return uploaded.url;
                }}
              />
            </div>

            {/* STEP 4: GOOGLE REVIEW LINK (Section 31) */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                STEP 4: GOOGLE REVIEW LINK
              </h2>
              <div>
                <label className="block font-medium mb-1">Google Review URL (optional)</label>
                <input
                  type="url"
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  placeholder="https://g.page/r/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            {/* STEP 5: SAVE & CONTINUE (Section 32) */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('owner.saveAndContinue')}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Simple Owner Header Summary (Section 47) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-sky-600">{t('owner.myPg')}</div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
            {primaryPg.propertyName}{' '}
            <span className="text-xs font-normal text-slate-500">
              ({primaryPg.propertyType} · {primaryPg.gender})
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            {primaryPg.areaName}, {primaryPg.cityName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 block">{t('owner.totalVisits')}</span>
            <strong className="text-base font-mono tabular-nums text-slate-900 dark:text-white">
              {ownerVisits.length}
            </strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 block">{t('owner.totalInquiries')}</span>
            <strong className="text-base font-mono tabular-nums text-slate-900 dark:text-white">
              {ownerInquiries.length}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => onChangeTab('rooms')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('owner.addRoom')}</span>
          </button>
        </div>
      </section>

      {/* Simple Owner Navigation Tabs (Section 47) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'rooms' as const, label: `${t('owner.addRoom')} / ${t('pg.rooms')} (${ownerRooms.length})`, icon: BedDouble },
          { id: 'manage_my_pg' as const, label: t('nav.manageMyPg'), icon: Building2 },
          { id: 'photos' as const, label: t('pg.photos'), icon: ImageIcon },
          { id: 'inquiries' as const, label: `${t('owner.inquiries')} (${ownerInquiries.length})`, icon: MessageSquare },
          { id: 'availability' as const, label: t('owner.availability'), icon: Eye },
          { id: 'profile' as const, label: t('owner.profile'), icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onChangeTab(tab.id);
                setFeedback(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
              : 'border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* TAB: ADD ROOM & ROOM POSTS MANAGEMENT (Sections 35–43) */}
      {(activeTab === 'rooms' || activeTab === 'overview') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handlePublishRoomPost}
            className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 text-xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingRoomId ? 'Edit Room Post' : t('owner.addRoom')}
              </h2>
              {editingRoomId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoomId(null);
                    setRoomOccupancy('');
                    setRoomRent('');
                    setRoomDeposit('');
                    setRoomDurationMonths('');
                    setRoomSelectedFacilities([]);
                    setRoomPhotosList([]);
                    setRoomDescription('');
                  }}
                  className="text-xs text-slate-500 hover:underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* Section 36: ROOM TYPE / OCCUPANCY (2 SEATER / 3 SEATER / 4 SEATER — Not auto-selected) */}
            <div>
              <label className="block font-semibold mb-1.5">
                ROOM TYPE / OCCUPANCY (Select Explicitly) *
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['2 Seater', '3 Seater', '4 Seater'] as const).map((occ) => (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setRoomOccupancy(occ)}
                    className={`py-2.5 rounded-xl font-semibold border cursor-pointer ${
                      roomOccupancy === occ
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {occ.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 37: ROOM POST PRICING (Monthly Rent, Security Deposit, Security Duration in Months) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1">{t('pg.rent')} (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={roomRent}
                  onChange={(e) => setRoomRent(e.target.value)}
                  placeholder="e.g. 7500"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{t('pg.securityDeposit')} (₹) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={roomDeposit}
                  onChange={(e) => setRoomDeposit(e.target.value)}
                  placeholder="e.g. 7500"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{t('pg.securityDuration')} *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={60}
                  value={roomDurationMonths}
                  onChange={(e) => setRoomDurationMonths(e.target.value)}
                  placeholder="Months (e.g. 2)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            {/* Section 38: ROOM POST FACILITIES (Explicit selection, nothing auto-selected) */}
            <div>
              <label className="block font-semibold mb-1.5">
                {t('pg.facilities')} (Explicit Selection Required) *
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ROOM_FACILITY_OPTIONS.map((fac) => {
                  const selected = roomSelectedFacilities.includes(fac);
                  return (
                    <button
                      key={fac}
                      type="button"
                      onClick={() =>
                        setRoomSelectedFacilities((prev) =>
                          prev.includes(fac) ? prev.filter((x) => x !== fac) : [...prev, fac]
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                        selected
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {fac}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 39: ROOM POST PHOTOS (CAMERA & GALLERY / FILE) */}
            <div className="space-y-2">
              <PhotoUploadControl
                label="Room Photos — Take Room Photo (Camera) or Select Room Photo (Gallery/File)"
                cameraLabel={t('pg.camera')}
                galleryLabel={t('pg.gallery')}
                onUploadOptimizedFile={async (file, meta) => {
                  const uploaded = await onUploadPhoto(
                    primaryPg.pgId,
                    'rooms',
                    file,
                    editingRoomId || `rm_${Date.now()}`
                  );
                  meta.setStage('Saving...');
                  setRoomPhotosList((prev) => [...prev, uploaded.url]);
                  return uploaded.url;
                }}
              />

              {roomPhotosList.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {roomPhotosList.map((u, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={u}
                        alt={`Room upload ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setRoomPhotosList((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 40: ROOM POST DESCRIPTION */}
            <div>
              <label className="block font-semibold mb-1">Room Description *</label>
              <textarea
                required
                rows={3}
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="Describe room size, furniture, ventilation, rules, and genuine availability..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="roomAvailCheck"
                type="checkbox"
                checked={roomAvailable}
                onChange={(e) => setRoomAvailable(e.target.checked)}
              />
              <label htmlFor="roomAvailCheck" className="font-medium">
                Room is currently Available for booking
              </label>
            </div>

            {/* Section 41: UPLOAD / PUBLISH ROOM */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('owner.publishRoom')}
            </button>
          </form>

          {/* Published Room Posts List (Sections 42 & 43) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Published Room Posts ({ownerRooms.length})
            </h2>
            {ownerRooms.length === 0 ? (
              <p className="text-xs text-slate-500">
                No Room Posts published yet. Create your 2 Seater, 3 Seater, or 4 Seater Room Posts
                using the form.
              </p>
            ) : (
              <div className="space-y-3">
                {ownerRooms.map((rm) => {
                  const rmPhotos = rm.photos ? rm.photos.split('|').filter(Boolean) : [];
                  return (
                    <div
                      key={rm.roomId}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-semibold text-slate-900 dark:text-white">
                          {rm.occupancy} Room Post
                        </strong>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoomId(rm.roomId);
                              setRoomOccupancy(rm.occupancy);
                              setRoomRent(String(rm.rent));
                              setRoomDeposit(String(rm.securityDeposit || 0));
                              setRoomDurationMonths(String(rm.securityDuration || 1));
                              setRoomSelectedFacilities(
                                rm.facilities ? rm.facilities.split('|').filter(Boolean) : []
                              );
                              setRoomPhotosList(rmPhotos);
                              setRoomDescription(rm.description || '');
                              setRoomAvailable(rm.availability);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            aria-label="Edit Room Post"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRoom(rm.roomId)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            aria-label="Delete Room Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        Rent: ₹{rm.rent.toLocaleString('en-IN')}/mo · Deposit: ₹
                        {(rm.securityDeposit || 0).toLocaleString('en-IN')} · Duration:{' '}
                        {rm.securityDuration || 1} Months
                      </div>
                      {rm.description && (
                        <p className="text-slate-600 dark:text-slate-300">{rm.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: MANAGE MY PG — LIMITED EDIT (CHANGE LOCATION ONLY, Sections 33 & 34) */}
      {activeTab === 'manage_my_pg' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('nav.manageMyPg')} — Change Location Only
            </h2>
            <p className="text-slate-500">
              Per platform policy, core PG identity (PG Name, Property Type, Gender, Main PG Photo)
              is permanently locked after initial setup. You may update your property location below.
            </p>
          </div>

          {/* Read-only Locked Core Identity */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> PG Name (Locked)
              </span>
              <strong className="text-sm text-slate-900 dark:text-white">
                {primaryPg.propertyName}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Property Type (Locked)
              </span>
              <strong className="text-sm text-slate-900 dark:text-white">
                {primaryPg.propertyType}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Gender (Locked)
              </span>
              <strong className="text-sm text-slate-900 dark:text-white">{primaryPg.gender}</strong>
            </div>
          </div>

          {/* Editable Location Form */}
          <form onSubmit={handleManageLocationSubmit} className="space-y-4">
            <OwnerLocationPickerMap
              latitude={latitude}
              longitude={longitude}
              onSelectCoordinates={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              useCurrentLocationLabel={t('owner.useCurrentLocation')}
              selectOnMapLabel={t('owner.selectOnMap')}
              quotaExceeded={gmpQuotaExceeded}
            />

            <CascadingLocationSelector
              allLocations={allLocations}
              stateId={stateId}
              districtId={districtId}
              cityId={cityId}
              areaId={areaId}
              customAreaName={customAreaName}
              onPersistCustomArea={onPersistCustomArea}
              compact={true}
              onChange={(loc) => {
                setStateId(loc.stateId);
                setDistrictId(loc.districtId);
                setCityId(loc.cityId);
                setAreaId(loc.areaId);
                setCustomAreaName(loc.customAreaName || '');
              }}
              labels={{
                state: t('location.state'),
                district: t('location.district'),
                city: t('location.city'),
                area: t('location.area'),
                sectorNotAvailable: t('location.sectorNotAvailable'),
                noLocationData: t('search.noLocationData'),
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">{t('location.street')} *</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">{t('location.houseNumber')} *</label>
                <input
                  type="text"
                  required
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-sky-600 text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              {saving ? t('common.loading') : 'Save Updated Location'}
            </button>
          </form>
        </section>
      )}

      {/* TAB: PHOTOS (Gallery, Bathroom, Facility Photos with CAMERA & GALLERY/FILE) */}
      {activeTab === 'photos' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            PG Gallery, Bathroom &amp; Facility Photos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PhotoUploadControl
              label="Upload PG Gallery Photo"
              cameraLabel={t('pg.camera')}
              galleryLabel={t('pg.gallery')}
              onUploadOptimizedFile={async (file, meta) => {
                const uploaded = await onUploadPhoto(primaryPg.pgId, 'gallery', file);
                meta.setStage('Saving...');
                const next = [primaryPg.galleryPhotos, uploaded.url].filter(Boolean).join('|');
                await onUpdatePgLocationOnly(primaryPg.pgId, { galleryPhotos: next });
                return uploaded.url;
              }}
            />

            <PhotoUploadControl
              label="Upload Bathroom Photo"
              cameraLabel={t('pg.camera')}
              galleryLabel={t('pg.gallery')}
              onUploadOptimizedFile={async (file, meta) => {
                const uploaded = await onUploadPhoto(primaryPg.pgId, 'bathrooms', file);
                meta.setStage('Saving...');
                const next = [primaryPg.bathroomPhotos, uploaded.url].filter(Boolean).join('|');
                await onUpdatePgLocationOnly(primaryPg.pgId, { bathroomPhotos: next });
                return uploaded.url;
              }}
            />

            <PhotoUploadControl
              label="Upload Facility Photo"
              cameraLabel={t('pg.camera')}
              galleryLabel={t('pg.gallery')}
              onUploadOptimizedFile={async (file, meta) => {
                const uploaded = await onUploadPhoto(primaryPg.pgId, 'facilities', file);
                meta.setStage('Saving...');
                const next = [primaryPg.facilityPhotos, uploaded.url].filter(Boolean).join('|');
                await onUpdatePgLocationOnly(primaryPg.pgId, { facilityPhotos: next });
                return uploaded.url;
              }}
            />
          </div>
        </section>
      )}

      {/* TAB: INQUIRIES (Section 69) */}
      {activeTab === 'inquiries' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Customer Inquiries ({ownerInquiries.length})
          </h2>
          {ownerInquiries.length === 0 ? (
            <p className="text-slate-500">No inquiries yet.</p>
          ) : (
            <div className="space-y-3">
              {ownerInquiries.map((inq) => {
                const isUpdating = Boolean(updatingInquiryIds[inq.inquiryId]);
                const statusBadge = inquiryBadgeMap[inq.inquiryId];
                const inquiryDate = inq.timestamp?.toDate
                  ? inq.timestamp.toDate().toLocaleString('en-IN')
                  : '';
                return (
                  <div
                    key={inq.inquiryId}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-slate-900 dark:text-white">
                          {inq.customerName}
                        </strong>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {inq.pgName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            inq.roomOccupancy
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {inq.roomOccupancy
                            ? `${t('pg.roomInquiry')}: ${inq.roomOccupancy}`
                            : t('pg.generalInquiry')}
                        </span>
                      </div>
                      <div className="font-mono text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>
                          Mobile:{' '}
                          <a
                            href={`tel:${inq.customerMobile}`}
                            className="text-sky-600 hover:underline font-semibold"
                          >
                            {inq.customerMobile}
                          </a>
                        </span>
                        <span>·</span>
                        <span>Email: {inq.customerEmail}</span>
                        {inquiryDate && (
                          <>
                            <span>·</span>
                            <span className="text-slate-400">{inquiryDate}</span>
                          </>
                        )}
                      </div>
                      {statusBadge && (
                        <div
                          role="status"
                          className={`text-[11px] font-semibold ${
                            statusBadge.type === 'success'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {statusBadge.text}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isUpdating && (
                        <span className="text-[11px] font-semibold text-sky-600">
                          Updating...
                        </span>
                      )}
                      <select
                        value={inq.status}
                        disabled={isUpdating}
                        onChange={async (e) => {
                          const nextStatus = e.target.value as 'new' | 'contacted' | 'closed';
                          if (isUpdating || nextStatus === inq.status) return;
                          setUpdatingInquiryIds((prev) => ({ ...prev, [inq.inquiryId]: true }));
                          setInquiryBadgeMap((prev) => {
                            const copy = { ...prev };
                            delete copy[inq.inquiryId];
                            return copy;
                          });
                          setFeedback(null);
                          try {
                            const res = await onUpdateInquiryStatus(inq.inquiryId, nextStatus);
                            if (res.ok) {
                              setInquiryBadgeMap((prev) => ({
                                ...prev,
                                [inq.inquiryId]: { type: 'success', text: 'Updated' },
                              }));
                            } else {
                              const errMsg =
                                res.error || 'You do not have permission to update this inquiry.';
                              setInquiryBadgeMap((prev) => ({
                                ...prev,
                                [inq.inquiryId]: { type: 'error', text: errMsg },
                              }));
                              setFeedback({ type: 'error', text: errMsg });
                            }
                          } catch (err) {
                            const errMsg =
                              err instanceof Error
                                ? err.message
                                : 'You do not have permission to update this inquiry.';
                            setInquiryBadgeMap((prev) => ({
                              ...prev,
                              [inq.inquiryId]: { type: 'error', text: errMsg },
                            }));
                            setFeedback({ type: 'error', text: errMsg });
                          } finally {
                            setUpdatingInquiryIds((prev) => ({
                              ...prev,
                              [inq.inquiryId]: false,
                            }));
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold disabled:opacity-50"
                      >
                        <option value="new">new</option>
                        <option value="contacted">contacted</option>
                        <option value="closed">closed</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB: AVAILABILITY */}
      {activeTab === 'availability' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Property Booking Availability
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onUpdatePgLocationOnly(primaryPg.pgId, {
                  bookingAvailable: !primaryPg.bookingAvailable,
                  roomAvailability: !primaryPg.bookingAvailable ? 'Available' : 'Full',
                })
              }
              className={`px-4 py-2 rounded-xl font-semibold text-white cursor-pointer ${
                primaryPg.bookingAvailable ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {primaryPg.bookingAvailable ? 'Status: Available (Click to mark Full)' : 'Status: Full (Click to mark Available)'}
            </button>
          </div>
        </section>
      )}

      {/* TAB: OWNER PROFILE */}
      {activeTab === 'profile' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 text-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Verified PG Owner Profile
          </h2>
          <div>
            <strong>Name:</strong> {owner.name}
          </div>
          <div>
            <strong>Mobile:</strong> <span className="font-mono">{owner.mobile}</span>
          </div>
          <div>
            <strong>Approved Google Email:</strong> {owner.email}
          </div>
          <div>
            <strong>Status:</strong> {owner.accountStatus}
          </div>
        </section>
      )}
    </main>
  );
};
