import { AdvertisementRecord, PgListing, RoomRecord, SearchFilterState } from '../types/models';

export const DEFAULT_SEARCH_FILTERS: SearchFilterState = {
  stateId: '',
  districtId: '',
  cityId: '',
  areaId: '',
  searchQuery: '',
  propertyType: '',
  gender: '',
  minPrice: '',
  maxPrice: '',
  acType: '',
  occupancy: '',
  foodIncluded: '',
  mealFrequency: '',
  washroomType: '',
  furnishing: '',
  facilities: {
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
  },
  sortBy: 'relevant',
};

/**
 * Checks whether any non-location secondary filter is currently active.
 */
export function hasActiveSecondaryFilters(filters: SearchFilterState): boolean {
  if (
    filters.propertyType ||
    filters.gender ||
    filters.minPrice.trim() ||
    filters.maxPrice.trim() ||
    filters.acType ||
    filters.occupancy ||
    filters.foodIncluded ||
    filters.mealFrequency ||
    filters.washroomType ||
    filters.furnishing
  ) {
    return true;
  }
  return Object.values(filters.facilities).some(Boolean);
}

/**
 * Calculates the effective lowest and highest valid room rent for a PG from its real Room Posts.
 * - Ignores null, undefined, NaN, <= 0, and deleted rooms.
 * - Prefers currently available rooms; if none are available, falls back to any active room of that PG or genuine PG-level rent > 0.
 * - NEVER treats missing or 0 rent as ₹0.
 */
export function getEffectivePgRoomPricing(
  pg: PgListing,
  rooms: RoomRecord[] = [],
  preFilteredForPg: boolean = false
): {
  effectiveLowestRoomRent: number | null;
  effectiveHighestRoomRent: number | null;
  validRoomRents: number[];
} {
  if (!pg || typeof pg !== 'object') {
    return {
      effectiveLowestRoomRent: null,
      effectiveHighestRoomRent: null,
      validRoomRents: [],
    };
  }

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const pgRooms = preFilteredForPg
    ? safeRooms
    : safeRooms.filter((r) => r && r.pgId === pg.pgId && r.status !== 'deleted');

  const availableValidRents = pgRooms
    .filter(
      (r) =>
        r &&
        r.availability !== false &&
        typeof r.rent === 'number' &&
        Number.isFinite(r.rent) &&
        r.rent > 0
    )
    .map((r) => r.rent);

  const allValidRoomRents = pgRooms
    .filter((r) => r && typeof r.rent === 'number' && Number.isFinite(r.rent) && r.rent > 0)
    .map((r) => r.rent);

  const candidateRents =
    availableValidRents.length > 0
      ? availableValidRents
      : allValidRoomRents.length > 0
      ? allValidRoomRents
      : typeof pg.rent === 'number' && Number.isFinite(pg.rent) && pg.rent > 0
      ? [pg.rent]
      : [];

  if (candidateRents.length === 0) {
    return {
      effectiveLowestRoomRent: null,
      effectiveHighestRoomRent: null,
      validRoomRents: [],
    };
  }

  return {
    effectiveLowestRoomRent: Math.min(...candidateRents),
    effectiveHighestRoomRent: Math.max(...candidateRents),
    validRoomRents: candidateRents,
  };
}

/**
 * Calculates real Haversine distance in kilometers between two geographic coordinates.
 * Never fabricates or guesses distance.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determines whether an advertisement is currently active and matches the searched geographic scope.
 */
export function isAdvertisementActiveForScope(
  ad: AdvertisementRecord,
  pg: PgListing,
  targetCityId: string,
  targetAreaId: string,
  referenceDateIso: string = new Date().toISOString().slice(0, 10)
): boolean {
  if (!ad || !pg) return false;
  if (ad.status !== 'active') return false;
  if (ad.pgId !== pg.pgId) return false;

  const start = typeof ad.startDate === 'string' ? ad.startDate.slice(0, 10) : '';
  const end = typeof ad.endDate === 'string' ? ad.endDate.slice(0, 10) : '';
  if ((start && referenceDateIso < start) || (end && referenceDateIso > end)) {
    return false;
  }

  // Must match the PG's city and the searched city
  if (targetCityId && ad.cityId !== targetCityId) {
    return false;
  }
  if (ad.cityId !== pg.cityId) {
    return false;
  }

  // If searching a specific area/sector, advertisement must either target that area or the whole city
  if (targetAreaId && ad.areaId && ad.areaId !== targetAreaId && ad.sectorId !== targetAreaId) {
    return false;
  }

  return true;
}

/**
 * Filters and sorts real PG listings while respecting Admin-configured sponsorship priority.
 * Sponsored PGs matching the geographic scope appear first (sorted by the selected sort option),
 * followed by normal matching PGs (sorted by the selected sort option).
 * Price sorting uses real room-level prices (effectiveLowestRoomRent) and places unpriced PGs after priced PGs.
 */
export function filterAndSortPgListings(
  listings: PgListing[],
  advertisements: AdvertisementRecord[],
  filters: SearchFilterState,
  rooms: RoomRecord[] = [],
  referenceDateIso: string = new Date().toISOString().slice(0, 10)
): {
  listing: PgListing;
  isSponsored: boolean;
  effectiveLowestRoomRent: number | null;
  effectiveHighestRoomRent: number | null;
}[] {
  const safeListings = Array.isArray(listings) ? listings : [];
  const safeAds = Array.isArray(advertisements) ? advertisements : [];
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const queryNorm = (filters?.searchQuery || '').trim().toLowerCase();

  // Pre-index active rooms by pgId in O(M) time to avoid O(N * M) nested filtering
  const roomsByPgId = new Map<string, RoomRecord[]>();
  for (const r of safeRooms) {
    if (!r || typeof r !== 'object' || !r.pgId || r.status === 'deleted') continue;
    const bucket = roomsByPgId.get(r.pgId);
    if (bucket) {
      bucket.push(r);
    } else {
      roomsByPgId.set(r.pgId, [r]);
    }
  }

  const pricingCache = new Map<
    string,
    {
      effectiveLowestRoomRent: number | null;
      effectiveHighestRoomRent: number | null;
      validRoomRents: number[];
    }
  >();

  const minRent = filters.minPrice ? parseFloat(filters.minPrice) : null;
  const maxRent = filters.maxPrice ? parseFloat(filters.maxPrice) : null;
  const hasMinFilter = minRent !== null && Number.isFinite(minRent) && minRent > 0;
  const hasMaxFilter = maxRent !== null && Number.isFinite(maxRent) && maxRent > 0;

  const filtered = safeListings.filter((pg) => {
    if (!pg || typeof pg !== 'object' || !pg.pgId) return false;
    // Only active listings appear publicly
    if (pg.status !== 'active') return false;

    // Geographic cascade matching
    if (filters.stateId && pg.stateId !== filters.stateId) return false;
    if (filters.districtId && pg.districtId !== filters.districtId) return false;
    if (filters.cityId && pg.cityId !== filters.cityId) return false;
    if (
      filters.areaId &&
      pg.areaId !== filters.areaId &&
      pg.sectorId !== filters.areaId
    ) {
      return false;
    }

    // Text search query (exact city, area, sector, or property name match)
    if (queryNorm) {
      const cityMatch = (pg.cityName || '').toLowerCase().includes(queryNorm);
      const areaMatch = (pg.areaName || '').toLowerCase().includes(queryNorm);
      const sectorMatch = (pg.sectorName || '').toLowerCase().includes(queryNorm);
      const stateMatch = (pg.stateName || '').toLowerCase().includes(queryNorm);
      const districtMatch = (pg.districtName || '').toLowerCase().includes(queryNorm);
      const nameMatch = (pg.propertyName || '').toLowerCase().includes(queryNorm);
      if (!cityMatch && !areaMatch && !sectorMatch && !stateMatch && !districtMatch && !nameMatch) {
        return false;
      }
    }

    // Property Type filter
    if (filters.propertyType) {
      if (filters.propertyType === 'Both') {
        if (pg.propertyType !== 'Both') return false;
      } else if (pg.propertyType !== filters.propertyType && pg.propertyType !== 'Both') {
        return false;
      }
    }

    // Gender filter
    if (filters.gender) {
      if (filters.gender === 'Both') {
        if (pg.gender !== 'Both') return false;
      } else if (pg.gender !== filters.gender && pg.gender !== 'Both') {
        return false;
      }
    }

    const pgRooms = roomsByPgId.get(pg.pgId) || [];
    const pricing = getEffectivePgRoomPricing(pg, pgRooms, true);
    pricingCache.set(pg.pgId, pricing);

    // Price range filter using real room prices (never treats 0 as a valid rent)
    if (hasMinFilter || hasMaxFilter) {
      if (pricing.validRoomRents.length === 0) return false;
      const matchesAnyRoomPrice = pricing.validRoomRents.some((rentVal) => {
        if (hasMinFilter && rentVal < minRent!) return false;
        if (hasMaxFilter && rentVal > maxRent!) return false;
        return true;
      });
      if (!matchesAnyRoomPrice) return false;
    }

    // AC filter (check room facilities or PG acType)
    if (filters.acType) {
      const hasAcRoom = pgRooms.some((r) =>
        (r.facilities || '').split('|').includes('AC')
      );
      if (filters.acType === 'AC') {
        if (pg.acType !== 'AC' && pg.acType !== 'Both' && !hasAcRoom) return false;
      } else if (filters.acType === 'Non-AC') {
        if (pg.acType !== 'Non-AC' && pg.acType !== 'Both') return false;
      }
    }

    // Room occupancy filter (check real room posts or PG occupancy flags)
    if (filters.occupancy === '2 Seater') {
      const has2 = pg.occupancy2Seater || pgRooms.some((r) => r.occupancy === '2 Seater');
      if (!has2) return false;
    }
    if (filters.occupancy === '3 Seater') {
      const has3 = pg.occupancy3Seater || pgRooms.some((r) => r.occupancy === '3 Seater');
      if (!has3) return false;
    }
    if (filters.occupancy === '4 Seater') {
      const has4 = pg.occupancy4Seater || pgRooms.some((r) => r.occupancy === '4 Seater');
      if (!has4) return false;
    }

    // Food filter
    if (filters.foodIncluded === 'included') {
      const hasFoodRoom = pgRooms.some((r) =>
        (r.facilities || '').split('|').some((f) => f === 'Food' || f.startsWith('Meal:'))
      );
      if (!pg.foodIncluded && !hasFoodRoom) return false;
    }
    if (filters.foodIncluded === 'not_included' && pg.foodIncluded) return false;

    // Meal frequency filter
    if (filters.mealFrequency && pg.mealFrequency !== filters.mealFrequency) return false;

    // Washroom filter
    if (
      filters.washroomType &&
      pg.washroomType !== filters.washroomType &&
      pg.washroomType !== 'Both'
    ) {
      return false;
    }

    // Furnishing filter
    if (filters.furnishing && pg.furnishing !== filters.furnishing) return false;

    // 17 Mandatory Facility filters (check PG boolean or room facilities)
    const fac = filters.facilities || DEFAULT_SEARCH_FILTERS.facilities;
    const allRoomFacSet = new Set(
      pgRooms.flatMap((r) => (r.facilities ? r.facilities.split('|').filter(Boolean) : []))
    );
    if (fac.laundry && pg.laundry !== true && !allRoomFacSet.has('Laundry')) return false;
    if (
      fac.washingMachine &&
      pg.washingMachine !== true &&
      !allRoomFacSet.has('Washing Machine')
    )
      return false;
    if (fac.wifi && pg.wifi !== true && !allRoomFacSet.has('Wi-Fi')) return false;
    if (fac.ro && pg.ro !== true && !allRoomFacSet.has('RO')) return false;
    if (fac.waterCooler && pg.waterCooler !== true && !allRoomFacSet.has('Water Cooler'))
      return false;
    if (fac.cooler && pg.cooler !== true && !allRoomFacSet.has('Cooler')) return false;
    if (fac.parking && pg.parking !== true && !allRoomFacSet.has('Parking')) return false;
    if (fac.ventilation && pg.ventilation !== true && !allRoomFacSet.has('Ventilation'))
      return false;
    if (fac.bed && pg.bed !== true && !allRoomFacSet.has('Bed')) return false;
    if (fac.wardrobe && pg.wardrobe !== true && !allRoomFacSet.has('Wardrobe')) return false;
    if (fac.table && pg.table !== true && !allRoomFacSet.has('Table')) return false;
    if (fac.chair && pg.chair !== true && !allRoomFacSet.has('Chair')) return false;
    if (fac.lunchService && pg.lunchService !== true && !allRoomFacSet.has('Lunch Service'))
      return false;
    if (
      fac.transportation &&
      pg.transportation !== true &&
      !allRoomFacSet.has('Transportation')
    )
      return false;
    if (fac.gym && pg.gym !== true && !allRoomFacSet.has('Gym')) return false;
    if (fac.lift && pg.lift !== true && !allRoomFacSet.has('Lift')) return false;
    if (fac.gamingRoom && pg.gamingRoom !== true && !allRoomFacSet.has('Gaming Room'))
      return false;

    return true;
  });

  const decorated = filtered.map((pg) => {
    const isSponsored = safeAds.some((ad) =>
      isAdvertisementActiveForScope(
        ad,
        pg,
        filters.cityId || pg.cityId,
        filters.areaId,
        referenceDateIso
      )
    );
    const pricing =
      pricingCache.get(pg.pgId) ||
      getEffectivePgRoomPricing(pg, roomsByPgId.get(pg.pgId) || [], true);
    return {
      listing: pg,
      isSponsored,
      effectiveLowestRoomRent: pricing.effectiveLowestRoomRent,
      effectiveHighestRoomRent: pricing.effectiveHighestRoomRent,
    };
  });

  const compareItems = (
    a: {
      listing: PgListing;
      isSponsored: boolean;
      effectiveLowestRoomRent: number | null;
      effectiveHighestRoomRent: number | null;
    },
    b: {
      listing: PgListing;
      isSponsored: boolean;
      effectiveLowestRoomRent: number | null;
      effectiveHighestRoomRent: number | null;
    }
  ): number => {
    const aName = a.listing.propertyName || '';
    const bName = b.listing.propertyName || '';
    if (filters.sortBy === 'price_asc') {
      const aRent = a.effectiveLowestRoomRent;
      const bRent = b.effectiveLowestRoomRent;
      if (aRent === null && bRent === null) {
        return aName.localeCompare(bName);
      }
      if (aRent === null) return 1; // Unpriced PGs go AFTER priced PGs
      if (bRent === null) return -1;
      if (aRent !== bRent) return aRent - bRent;
      return aName.localeCompare(bName);
    }
    if (filters.sortBy === 'price_desc') {
      const aRent = a.effectiveLowestRoomRent;
      const bRent = b.effectiveLowestRoomRent;
      if (aRent === null && bRent === null) {
        return aName.localeCompare(bName);
      }
      if (aRent === null) return 1; // Unpriced PGs go AFTER priced PGs
      if (bRent === null) return -1;
      if (bRent !== aRent) return bRent - aRent;
      return aName.localeCompare(bName);
    }
    if (filters.sortBy === 'newest') {
      const aTime = a.listing.createdAt?.toMillis?.() ?? 0;
      const bTime = b.listing.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    }
    // Relevant: alphabetical by property name
    return aName.localeCompare(bName);
  };

  const sponsoredGroup = decorated.filter((d) => d.isSponsored).sort(compareItems);
  const normalGroup = decorated.filter((d) => !d.isSponsored).sort(compareItems);

  return [...sponsoredGroup, ...normalGroup];
}
