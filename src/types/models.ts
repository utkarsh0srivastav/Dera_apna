import { Timestamp } from 'firebase/firestore';

export type AppRole = 'PUBLIC' | 'CUSTOMER' | 'PG_OWNER' | 'ADMIN';

/**
 * 16 Supported Languages (Part 32 — includes Kannada 'kn')
 */
export type SupportedLanguage =
  | 'en'
  | 'hi'
  | 'hinglish'
  | 'bn'
  | 'mr'
  | 'te'
  | 'ta'
  | 'gu'
  | 'ur'
  | 'kn'
  | 'or'
  | 'ml'
  | 'pa'
  | 'as'
  | 'mai'
  | 'sa';

export type ThemeMode = 'light' | 'dark';

export interface CustomerProfile {
  customerId: string;
  authUid?: string;
  name: string;
  mobile: string;
  email: string;
  gender: 'Male' | 'Female';
  status: 'active' | 'blocked';
  language?: SupportedLanguage;
  theme?: ThemeMode;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OwnerPreRegistration {
  mobile: string;
  name: string;
  email: string;
  approvedGoogleEmail: string;
  linkedGoogleUid?: string;
  pinHash?: string;
  pinSalt?: string;
  activeDeviceIdHash?: string;
  status: 'Pending' | 'Approved' | 'Blocked' | 'Deleted' | 'Rejected';
  createdByAdmin: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OwnerProfile {
  ownerId: string;
  uid?: string;
  name: string;
  mobile: string;
  email: string;
  approvedGoogleEmail?: string;
  linkedGoogleUid: string;
  activeDeviceIdHash?: string;
  status?: 'Pending' | 'Approved' | 'Blocked' | 'Deleted' | 'Rejected';
  preRegistrationStatus: 'Pending' | 'Approved' | 'Blocked' | 'Deleted' | 'Rejected';
  accountStatus: 'Pending' | 'Approved' | 'Blocked' | 'Deleted' | 'Rejected';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TrustedDeviceSession {
  sessionId: string;
  userId: string;
  ownerId?: string;
  role: 'CUSTOMER' | 'PG_OWNER' | 'ADMIN';
  mobile: string;
  email: string;
  deviceId: string;
  deviceIdHash?: string;
  deviceName?: string;
  platform?: string;
  trusted: boolean;
  sessionStatus?: 'ACTIVE' | 'REVOKED';
  approvedRequestId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * New Device Re-Login Approval Request (Part 10)
 * Stored in `deviceLoginRequests/{requestId}`
 */
export type DeviceLoginRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface DeviceLoginRequest {
  requestId: string;
  userId: string;
  ownerId: string;
  ownerName: string;
  mobile: string;
  email: string;
  deviceIdHash: string;
  deviceName: string;
  platform: string;
  status: DeviceLoginRequestStatus;
  createdAt?: Timestamp;
  expiresAt?: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectedBy?: string;
  rejectedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UploadedPhotoMetadata {
  url: string;
  path: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

export interface PgListing {
  pgId: string;
  ownerId: string;
  propertyName: string;
  propertyType: 'PG' | 'Hostel' | 'Both';
  gender: 'Male' | 'Female' | 'Both';
  countryId: string;
  stateId: string;
  districtId: string;
  cityId: string;
  areaId: string;
  sectorId: string;
  countryName: string;
  stateName: string;
  districtName: string;
  cityName: string;
  areaName: string;
  sectorName: string;
  street: string;
  houseNumber: string;
  latitude: number;
  longitude: number;
  mainPhotoUrl?: string;
  mainPhotoPath?: string;
  mainPhotoSize?: number;
  mainPhotoContentType?: string;
  mainPhotoUploadedAt?: Timestamp | string;
  googleReviewUrl?: string;
  galleryPhotos?: string;
  bathroomPhotos?: string;
  facilityPhotos?: string;
  rent: number;
  securityDeposit: number;
  securityDuration: string;
  hostelTotalPrice?: number;
  hostelStayDuration?: string;
  hostelPaymentModel?: string;
  pricingModel: string;
  acType: 'AC' | 'Non-AC' | 'Both';
  roomTypes: string;
  occupancy2Seater: boolean;
  occupancy3Seater: boolean;
  occupancy4Seater: boolean;
  foodIncluded: boolean;
  mealFrequency: 'None' | '1 time' | '2 times' | '3 times' | '4 times';
  laundry: boolean;
  washingMachine: boolean;
  wifi: boolean;
  ro: boolean;
  waterCooler: boolean;
  cooler: boolean;
  parking: boolean;
  ventilation: boolean;
  bed: boolean;
  wardrobe: boolean;
  table: boolean;
  chair: boolean;
  lunchService: boolean;
  transportation: boolean;
  gym: boolean;
  lift: boolean;
  gamingRoom: boolean;
  washroomType: 'Separate' | 'Common' | 'Both';
  furnishing: 'Fully Furnished' | 'Semi Furnished' | 'Unfurnished';
  rules: string;
  bookingAvailable: boolean;
  roomAvailability: string;
  paymentTerms: string;
  securityTerms: string;
  description: string;
  contactNumber?: string;
  googleMapsUrl?: string;
  googleReviewsUrl?: string;
  photos: string;
  identityLocked?: boolean;
  status: 'draft' | 'pending' | 'active' | 'inactive' | 'deleted';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface RoomRecord {
  roomId: string;
  pgId: string;
  ownerId: string;
  roomType: string;
  occupancy: '2 Seater' | '3 Seater' | '4 Seater';
  rent: number;
  securityDeposit?: number;
  securityDuration?: number;
  availability: boolean;
  status?: 'active' | 'inactive' | 'deleted';
  description?: string;
  facilities?: string;
  photos?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InquiryRecord {
  inquiryId: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  pgId: string;
  pgName: string;
  ownerId: string;
  roomId?: string | null;
  roomOccupancy?: string | null;
  status: 'new' | 'contacted' | 'closed';
  timestamp?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ReviewRecord {
  reviewId: string;
  pgId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  status: 'published' | 'hidden' | 'flagged';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface VisitRecord {
  visitId: string;
  pgId: string;
  ownerId: string;
  sessionId: string;
  source: string;
  timestamp?: Timestamp;
}

export interface AdvertisementRecord {
  advertisementId: string;
  pgId: string;
  cityId: string;
  areaId: string;
  sectorId: string;
  status: 'draft' | 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  createdByAdmin: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type AreaLocalityType =
  | 'SECTOR'
  | 'LOCALITY'
  | 'NEIGHBORHOOD'
  | 'AREA'
  | 'COLONY'
  | 'TOWN_AREA'
  | 'CUSTOM';

export interface LocationNode {
  locationId: string;
  areaId?: string;
  level: 'state' | 'district' | 'city' | 'area';
  parentId: string;
  countryId?: string;
  stateId?: string;
  districtId?: string;
  cityId?: string;
  name: string;
  normalizedName?: string;
  type?: AreaLocalityType;
  custom?: boolean;
  createdBy?: string;
  status?: 'active' | 'merged' | 'deleted';
  hasSectors: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AuditLogRecord {
  logId: string;
  adminUid: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: string;
  timestamp?: Timestamp;
}

export interface SearchFilterState {
  stateId: string;
  districtId: string;
  cityId: string;
  areaId: string;
  searchQuery: string;
  propertyType: '' | 'PG' | 'Hostel' | 'Both';
  gender: '' | 'Male' | 'Female' | 'Both';
  minPrice: string;
  maxPrice: string;
  acType: '' | 'AC' | 'Non-AC' | 'Both';
  occupancy: '' | '2 Seater' | '3 Seater' | '4 Seater';
  foodIncluded: '' | 'included' | 'not_included';
  mealFrequency: '' | '1 time' | '2 times' | '3 times' | '4 times';
  washroomType: '' | 'Separate' | 'Common';
  furnishing: '' | 'Fully Furnished' | 'Semi Furnished' | 'Unfurnished';
  facilities: {
    laundry: boolean;
    washingMachine: boolean;
    wifi: boolean;
    ro: boolean;
    waterCooler: boolean;
    cooler: boolean;
    parking: boolean;
    ventilation: boolean;
    bed: boolean;
    wardrobe: boolean;
    table: boolean;
    chair: boolean;
    lunchService: boolean;
    transportation: boolean;
    gym: boolean;
    lift: boolean;
    gamingRoom: boolean;
  };
  sortBy: 'relevant' | 'price_asc' | 'price_desc' | 'newest';
}
