import { AreaLocalityType, LocationNode } from '../types/models';

export interface ResolvedCitySuggestion {
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
  stateId: string;
  stateName: string;
  label: string;
}

/**
 * Normalizes an area/locality/sector name for case-insensitive duplicate detection
 * while preserving the user's display spelling.
 * Examples:
 *  "Delta 1" / " delta 1 " / "DELTA 1" / "Delta-1" -> "delta 1"
 */
export function normalizeAreaName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Infers the semantic type of an area/locality/sector.
 */
export function inferAreaType(name: string, isCustom = false): AreaLocalityType {
  const n = name.trim();
  if (/^(sector|alpha|beta|gamma|delta|ecotech|knowledge park|techzone)\b/i.test(n)) {
    return 'SECTOR';
  }
  if (/\b(colony|vihar|nagar|puram|enclave|extension|park|garden)\b/i.test(n)) {
    return 'COLONY';
  }
  return isCustom ? 'CUSTOM' : 'LOCALITY';
}

/**
 * Validates a Custom Area / Locality / Sector submitted via the "Other" option.
 * - Trims extra spaces
 * - Rejects empty or whitespace-only values
 * - Rejects overly long strings (> 80 chars) or strings < 2 chars
 * - Rejects HTML/script payloads and control characters
 * - Allows letters, numbers, spaces, hyphens, periods, slashes, apostrophes, and ampersands
 */
export function validateCustomAreaName(rawInput: string): {
  valid: boolean;
  cleanedName: string;
  normalizedName: string;
  error?: string;
} {
  const cleanedName = rawInput.replace(/\s+/g, ' ').trim();
  if (!cleanedName) {
    return {
      valid: false,
      cleanedName: '',
      normalizedName: '',
      error: 'Custom Area / Locality / Sector cannot be empty.',
    };
  }
  if (cleanedName.length < 2) {
    return {
      valid: false,
      cleanedName,
      normalizedName: '',
      error: 'Custom Area name must be at least 2 characters.',
    };
  }
  if (cleanedName.length > 80) {
    return {
      valid: false,
      cleanedName,
      normalizedName: '',
      error: 'Custom Area name cannot exceed 80 characters.',
    };
  }
  if (
    /[<>[\]{}\\]/.test(cleanedName) ||
    /[\u0000-\u001F\u007F]/.test(cleanedName) ||
    /javascript:|onerror=|onload=|<script/i.test(cleanedName)
  ) {
    return {
      valid: false,
      cleanedName,
      normalizedName: '',
      error: 'Invalid characters detected in Custom Area name.',
    };
  }
  if (!/^[a-zA-Z0-9\s.\-,'/&()]+$/.test(cleanedName)) {
    return {
      valid: false,
      cleanedName,
      normalizedName: '',
      error: 'Please enter a valid area, locality, or sector name using standard characters.',
    };
  }
  if (/^other$/i.test(cleanedName) || /^sector not available/i.test(cleanedName)) {
    return {
      valid: false,
      cleanedName,
      normalizedName: '',
      error: 'Please enter the actual name of your Area, Locality, or Sector.',
    };
  }

  return {
    valid: true,
    cleanedName,
    normalizedName: normalizeAreaName(cleanedName),
  };
}

/**
 * Builds a deterministic, Firestore-safe areaId for a custom area under a city.
 * Example: buildCustomAreaId('CITY_UP_GRNOIDA', 'Delta 1') -> 'AREA_CUSTOM_CITY_UP_GRNOIDA_DELTA_1'
 */
export function buildCustomAreaId(cityId: string, areaName: string): string {
  const safeCity = cityId.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
  const safeName = normalizeAreaName(areaName)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return `AREA_CUSTOM_${safeCity}_${safeName}`.slice(0, 120);
}

/**
 * Checks whether an area with the same normalized name already exists in the given city
 * (across both curated seed areas and custom areas persisted in Firebase).
 */
export function findDuplicateAreaInCity(
  allNodes: LocationNode[],
  cityId: string,
  candidateName: string
): LocationNode | undefined {
  const targetNormalized = normalizeAreaName(candidateName);
  if (!targetNormalized) return undefined;
  const cityAreas = getAreasForCity(allNodes, cityId);
  return cityAreas.find(
    (area) => (area.normalizedName || normalizeAreaName(area.name)) === targetNormalized
  );
}

/**
 * Official India Administrative Hierarchy (36 States & Union Territories)
 */
const BASE_STATES: LocationNode[] = [
  { locationId: 'ST_UP', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Uttar Pradesh', hasSectors: false },
  { locationId: 'ST_DL', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Delhi (NCT)', hasSectors: false },
  { locationId: 'ST_MH', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Maharashtra', hasSectors: false },
  { locationId: 'ST_KA', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Karnataka', hasSectors: false },
  { locationId: 'ST_HR', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Haryana', hasSectors: false },
  { locationId: 'ST_RJ', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Rajasthan', hasSectors: false },
  { locationId: 'ST_MP', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Madhya Pradesh', hasSectors: false },
  { locationId: 'ST_TN', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Tamil Nadu', hasSectors: false },
  { locationId: 'ST_TG', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Telangana', hasSectors: false },
  { locationId: 'ST_WB', level: 'state', parentId: 'IN', countryId: 'IN', name: 'West Bengal', hasSectors: false },
  { locationId: 'ST_BR', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Bihar', hasSectors: false },
  { locationId: 'ST_GJ', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Gujarat', hasSectors: false },
  { locationId: 'ST_PB', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Punjab', hasSectors: false },
  { locationId: 'ST_CH', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Chandigarh', hasSectors: false },
  { locationId: 'ST_UK', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Uttarakhand', hasSectors: false },
  { locationId: 'ST_KL', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Kerala', hasSectors: false },
  { locationId: 'ST_JH', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Jharkhand', hasSectors: false },
  { locationId: 'ST_OR', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Odisha', hasSectors: false },
  { locationId: 'ST_AP', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Andhra Pradesh', hasSectors: false },
  { locationId: 'ST_AS', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Assam', hasSectors: false },
  { locationId: 'ST_CG', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Chhattisgarh', hasSectors: false },
  { locationId: 'ST_HP', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Himachal Pradesh', hasSectors: false },
  { locationId: 'ST_JK', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Jammu and Kashmir', hasSectors: false },
  { locationId: 'ST_GA', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Goa', hasSectors: false },
  { locationId: 'ST_PY', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Puducherry', hasSectors: false },
  { locationId: 'ST_LA', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Ladakh', hasSectors: false },
  { locationId: 'ST_TR', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Tripura', hasSectors: false },
  { locationId: 'ST_ML', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Meghalaya', hasSectors: false },
  { locationId: 'ST_MN', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Manipur', hasSectors: false },
  { locationId: 'ST_NL', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Nagaland', hasSectors: false },
  { locationId: 'ST_AR', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Arunachal Pradesh', hasSectors: false },
  { locationId: 'ST_MZ', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Mizoram', hasSectors: false },
  { locationId: 'ST_SK', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Sikkim', hasSectors: false },
  { locationId: 'ST_AN', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Andaman and Nicobar Islands', hasSectors: false },
  { locationId: 'ST_DN', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Dadra and Nagar Haveli and Daman and Diu', hasSectors: false },
  { locationId: 'ST_LD', level: 'state', parentId: 'IN', countryId: 'IN', name: 'Lakshadweep', hasSectors: false },
];

/**
 * Curated Districts & 29 Cities from DERA APNA — AREA / LOCALITY MASTER v1.0
 */
interface CityDefinition {
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
  stateId: string;
  hasSectors: boolean;
}

const CURATED_CITIES: CityDefinition[] = [
  { cityId: 'CT_AGRA', cityName: 'Agra', districtId: 'DT_UP_AGRA', districtName: 'Agra', stateId: 'ST_UP', hasSectors: false },
  { cityId: 'CT_AHMEDABAD', cityName: 'Ahmedabad', districtId: 'DT_GJ_AMD', districtName: 'Ahmedabad', stateId: 'ST_GJ', hasSectors: false },
  { cityId: 'CT_BLR', cityName: 'Bengaluru', districtId: 'DT_KA_BLR', districtName: 'Bengaluru Urban', stateId: 'ST_KA', hasSectors: false },
  { cityId: 'CT_BHOPAL', cityName: 'Bhopal', districtId: 'DT_MP_BPL', districtName: 'Bhopal', stateId: 'ST_MP', hasSectors: false },
  { cityId: 'CT_CHD', cityName: 'Chandigarh', districtId: 'DT_CH_CHD', districtName: 'Chandigarh', stateId: 'ST_CH', hasSectors: true },
  { cityId: 'CT_CHENNAI', cityName: 'Chennai', districtId: 'DT_TN_CHE', districtName: 'Chennai', stateId: 'ST_TN', hasSectors: false },
  { cityId: 'CT_DEHRADUN', cityName: 'Dehradun', districtId: 'DT_UK_DDN', districtName: 'Dehradun', stateId: 'ST_UK', hasSectors: false },
  { cityId: 'CT_DELHI', cityName: 'Delhi', districtId: 'DT_DL_DELHI', districtName: 'Delhi', stateId: 'ST_DL', hasSectors: false },
  { cityId: 'CT_GZB', cityName: 'Ghaziabad', districtId: 'DT_UP_GZB', districtName: 'Ghaziabad', stateId: 'ST_UP', hasSectors: false },
  { cityId: 'CT_GKP', cityName: 'Gorakhpur', districtId: 'DT_UP_GKP', districtName: 'Gorakhpur', stateId: 'ST_UP', hasSectors: false },
  { cityId: 'CT_GN', cityName: 'Greater Noida', districtId: 'DT_UP_GBN', districtName: 'Gautam Buddha Nagar', stateId: 'ST_UP', hasSectors: true },
  { cityId: 'CT_GGN', cityName: 'Gurugram', districtId: 'DT_HR_GGN', districtName: 'Gurugram', stateId: 'ST_HR', hasSectors: true },
  { cityId: 'CT_HYD', cityName: 'Hyderabad', districtId: 'DT_TG_HYD', districtName: 'Hyderabad', stateId: 'ST_TG', hasSectors: false },
  { cityId: 'CT_INDORE', cityName: 'Indore', districtId: 'DT_MP_IND', districtName: 'Indore', stateId: 'ST_MP', hasSectors: false },
  { cityId: 'CT_JAIPUR', cityName: 'Jaipur', districtId: 'DT_RJ_JPR', districtName: 'Jaipur', stateId: 'ST_RJ', hasSectors: false },
  { cityId: 'CT_KANPUR', cityName: 'Kanpur', districtId: 'DT_UP_KNP', districtName: 'Kanpur Nagar', stateId: 'ST_UP', hasSectors: false },
  { cityId: 'CT_KOCHI', cityName: 'Kochi', districtId: 'DT_KL_EKM', districtName: 'Ernakulam', stateId: 'ST_KL', hasSectors: false },
  { cityId: 'CT_KOLKATA', cityName: 'Kolkata', districtId: 'DT_WB_KOL', districtName: 'Kolkata', stateId: 'ST_WB', hasSectors: false },
  { cityId: 'CT_LKO', cityName: 'Lucknow', districtId: 'DT_UP_LKO', districtName: 'Lucknow', stateId: 'ST_UP', hasSectors: false },
  { cityId: 'CT_MEERUT', cityName: 'Meerut', districtId: 'DT_UP_MRT', districtName: 'Meerut', stateId: 'ST_UP', hasSectors: false },
  { cityId: 'CT_MUMBAI', cityName: 'Mumbai', districtId: 'DT_MH_MUM', districtName: 'Mumbai', stateId: 'ST_MH', hasSectors: false },
  { cityId: 'CT_NOIDA', cityName: 'Noida', districtId: 'DT_UP_GBN', districtName: 'Gautam Buddha Nagar', stateId: 'ST_UP', hasSectors: true },
  { cityId: 'CT_PATNA', cityName: 'Patna', districtId: 'DT_BR_PAT', districtName: 'Patna', stateId: 'ST_BR', hasSectors: false },
  { cityId: 'CT_PRAYAGRAJ', cityName: 'Prayagraj', districtId: 'DT_UP_PRJ', districtName: 'Prayagraj', stateId: 'ST_UP', hasSectors: false },
  { cityId: 'CT_PUNE', cityName: 'Pune', districtId: 'DT_MH_PUN', districtName: 'Pune', stateId: 'ST_MH', hasSectors: false },
  { cityId: 'CT_RANCHI', cityName: 'Ranchi', districtId: 'DT_JH_RAN', districtName: 'Ranchi', stateId: 'ST_JH', hasSectors: false },
  { cityId: 'CT_SURAT', cityName: 'Surat', districtId: 'DT_GJ_SUR', districtName: 'Surat', stateId: 'ST_GJ', hasSectors: false },
  { cityId: 'CT_TVM', cityName: 'Thiruvananthapuram', districtId: 'DT_KL_TVM', districtName: 'Thiruvananthapuram', stateId: 'ST_KL', hasSectors: false },
  { cityId: 'CT_VNS', cityName: 'Varanasi', districtId: 'DT_UP_VNS', districtName: 'Varanasi', stateId: 'ST_UP', hasSectors: false },
];

/**
 * Authoritative 856 Curated Seed Records from DERA APNA — AREA / LOCALITY MASTER v1.0
 */
const CURATED_SEED_PAIRS: readonly string[] = [
  'Indore|AB Road',
  'Surat|Adajan',
  'Chennai|Adambakkam',
  'Delhi|Adarsh Nagar',
  'Jaipur|Adarsh Nagar',
  'Bengaluru|Adugodi',
  'Chennai|Adyar',
  'Agra|Agra Cantt',
  'Ghaziabad|Ahinsa Khand',
  'Jaipur|Ajmer Road',
  'Delhi|Alaknanda',
  'Lucknow|Alambagh',
  'Chennai|Alandur',
  'Lucknow|Aliganj',
  'Kolkata|Alipore',
  'Prayagraj|Allahabad University',
  'Greater Noida|Alpha 1',
  'Greater Noida|Alpha 2',
  'Kochi|Aluva',
  'Lucknow|Amausi',
  'Ahmedabad|Ambawadi',
  'Hyderabad|Ameerpet',
  'Jaipur|Amer',
  'Delhi|Anand Vihar',
  'Mumbai|Andheri East',
  'Mumbai|Andheri West',
  'Patna|Anisabad',
  'Chennai|Anna Nagar',
  'Indore|Annapurna Road',
  'Mumbai|Antop Hill',
  'Bhopal|Arera Colony',
  'Ranchi|Argora',
  'Gurugram|Arjun Nagar',
  'Kanpur|Arya Nagar',
  'Lucknow|Ashiyana',
  'Chennai|Ashok Nagar',
  'Ranchi|Ashok Nagar',
  'Delhi|Ashok Vihar',
  'Surat|Athwa',
  'Pune|Aundh',
  'Bhopal|Awadhpuri',
  'Gorakhpur|Awas Vikas Colony',
  'Bhopal|Ayodhya Bypass',
  'Delhi|Azadpur',
  'Gurugram|Badshahpur',
  'Kolkata|Baghajatin',
  'Kolkata|Baguiati',
  'Patna|Bailey Road',
  'Bhopal|Bairagarh',
  'Dehradun|Ballupur',
  'Kolkata|Ballygunge',
  'Bengaluru|Banashankari',
  'Mumbai|Bandra East',
  'Mumbai|Bandra West',
  'Pune|Baner',
  'Hyderabad|Banjara Hills',
  'Dehradun|Banjarawala',
  'Bengaluru|Bannerghatta Road',
  'Kolkata|Baranagar',
  'Ranchi|Bariatu',
  'Ranchi|Bariatu Road',
  'Kanpur|Barra',
  'Bengaluru|Basavanagudi',
  'Pune|Bavdhan',
  'Bhopal|Bawadia Kalan',
  'Bhopal|Bawadia Kalan Extension',
  'Delhi|Bawana',
  'Meerut|Begum Bagh',
  'Hyderabad|Begumpet',
  'Kolkata|Behala',
  'Kolkata|Belgachia',
  'Kolkata|Beliaghata',
  'Bengaluru|Bellandur',
  'Bengaluru|Benson Town',
  'Bhopal|Berasia Road',
  'Chennai|Besant Nagar',
  'Greater Noida|Beta 1',
  'Greater Noida|Beta 2',
  'Gorakhpur|Betiahata',
  'Mumbai|Bhandup East',
  'Mumbai|Bhandup West',
  'Surat|Bhatar',
  'Indore|Bhawarkua',
  'Varanasi|Bhelupur',
  'Varanasi|Bhojubeer',
  'Kolkata|Bhowanipore',
  'Pune|Bibwewadi',
  'Gorakhpur|Bichhia',
  'Indore|Bicholi Hapsi',
  'Indore|Bicholi Mardana',
  'Kolkata|Bidhannagar',
  'Ahmedabad|Bodakdev',
  'Agra|Bodla',
  'Ranchi|Booty More',
  'Ahmedabad|Bopal',
  'Patna|Boring Canal Road',
  'Patna|Boring Road',
  'Mumbai|Borivali East',
  'Mumbai|Borivali West',
  'Kolkata|Bowbazar',
  'Meerut|Brahmpuri',
  'Bengaluru|Brookefield',
  'Bengaluru|BTM Layout',
  'Mumbai|Byculla',
  'Jaipur|C-Scheme',
  'Pune|Camp',
  'Varanasi|Cantt',
  'Hyderabad|Chandanagar',
  'Ahmedabad|Chandkheda',
  'Varanasi|Chandmari',
  'Mumbai|Chembur',
  'Delhi|Chhatarpur',
  'Lucknow|Chinhat',
  'Delhi|Chittaranjan Park',
  'Varanasi|Chowk',
  'Chennai|Chromepet',
  'Ranchi|Circular Road',
  'Surat|City Light',
  'Delhi|Civil Lines',
  'Gorakhpur|Civil Lines',
  'Jaipur|Civil Lines',
  'Kanpur|Civil Lines',
  'Prayagraj|Civil Lines',
  'Dehradun|Clement Town',
  'Mumbai|Colaba',
  'Delhi|Connaught Place',
  'Ghaziabad|Crossings Republik',
  'Bengaluru|CV Raman Nagar',
  'Mumbai|Dadar East',
  'Mumbai|Dadar West',
  'Mumbai|Dahisar East',
  'Mumbai|Dahisar West',
  'Dehradun|Dalanwala',
  'Patna|Danapur',
  'Prayagraj|Daraganj',
  'Kanpur|Darshan Purwa',
  'Agra|Dayal Bagh',
  'Pune|Deccan Gymkhana',
  'Meerut|Delhi Road',
  'Greater Noida|Delta 1',
  'Greater Noida|Delta 2',
  'Greater Noida|Delta 3',
  'Mumbai|Deonar',
  'Indore|Dewas Naka',
  'Pune|Dhankawadi',
  'Patna|Digha',
  'Hyderabad|Dilsukhnagar',
  'Surat|Dindoli',
  'Gurugram|DLF Phase 1',
  'Gurugram|DLF Phase 2',
  'Gurugram|DLF Phase 3',
  'Gurugram|DLF Phase 4',
  'Gurugram|DLF Phase 5',
  'Ranchi|Doranda',
  'Kolkata|Dum Dum',
  'Surat|Dumas Road',
  'Varanasi|Durgakund',
  'Jaipur|Durgapura',
  'Delhi|Dwarka',
  'Delhi|East of Kailash',
  'Greater Noida|Ecotech I',
  'Greater Noida|Ecotech II',
  'Greater Noida|Ecotech III',
  'Greater Noida|Ecotech VI',
  'Greater Noida|Ecotech XII',
  'Kochi|Edappally',
  'Chennai|Egmore',
  'Bengaluru|Electronic City',
  'Kolkata|Entally',
  'Pune|Erandwane',
  'Lucknow|Faizabad Road',
  'Mumbai|Fort',
  'Kochi|Fort Kochi',
  'Patna|Fraser Road',
  'Bengaluru|Frazer Town',
  'Hyderabad|Gachibowli',
  'Greater Noida|Gamma 1',
  'Greater Noida|Gamma 2',
  'Delhi|Gandhi Nagar',
  'Meerut|Ganga Nagar',
  'Patna|Gardiner Road',
  'Meerut|Garh Road',
  'Kolkata|Garia',
  'Kolkata|Gariahat',
  'Indore|Geeta Bhawan',
  'Prayagraj|George Town',
  'Mumbai|Ghatkopar East',
  'Mumbai|Ghatkopar West',
  'Ahmedabad|Ghatlodia',
  'Varanasi|Godowlia',
  'Gurugram|Golf Course Extension Road',
  'Gurugram|Golf Course Road',
  'Gorakhpur|Golghar',
  'Lucknow|Gomti Nagar',
  'Lucknow|Gomti Nagar Extension',
  'Gorakhpur|Gorakhnath',
  'Mumbai|Goregaon East',
  'Mumbai|Goregaon West',
  'Ahmedabad|Gota',
  'Kanpur|Govind Nagar',
  'Prayagraj|Govindpur',
  'Delhi|Greater Kailash I',
  'Delhi|Greater Kailash II',
  'Delhi|Green Park',
  'Chennai|Guindy',
  'Bhopal|Gulmohar Colony',
  'Pune|Hadapsar',
  'Hyderabad|Hafeezpet',
  'Ranchi|Harmu',
  'Kanpur|Harsh Nagar',
  'Ranchi|Hatia',
  'Delhi|Hauz Khas',
  'Lucknow|Hazratganj',
  'Bengaluru|Hebbal',
  'Hyderabad|Himayat Nagar',
  'Pune|Hinjawadi',
  'Ranchi|Hinoo',
  'Hyderabad|Hitech City',
  'Bengaluru|Hoodi',
  'Bhopal|Hoshangabad Road',
  'Bengaluru|HSR Layout',
  'Lucknow|Indira Nagar',
  'Bengaluru|Indiranagar',
  'Ghaziabad|Indirapuram',
  'Kolkata|Jadavpur',
  'Jaipur|Jagatpura',
  'Patna|Jagdeo Path',
  'Meerut|Jagriti Vihar',
  'Bhopal|Jahangirabad',
  'Dehradun|Jakhan',
  'Delhi|Janakpuri',
  'Delhi|Jangpura',
  'Lucknow|Jankipuram',
  'Delhi|Jasola',
  'Bengaluru|Jayanagar',
  'Jaipur|Jhotwara',
  'Ahmedabad|Jodhpur',
  'Mumbai|Jogeshwari East',
  'Mumbai|Jogeshwari West',
  'Kolkata|Joka',
  'Bengaluru|JP Nagar',
  'Hyderabad|Jubilee Hills',
  'Mumbai|Juhu',
  'Chennai|K.K. Nagar',
  'Hyderabad|Kachiguda',
  'Kochi|Kadavanthra',
  'Kanpur|Kakadeo',
  'Kochi|Kakkanad',
  'Kochi|Kalamassery',
  'Delhi|Kalkaji',
  'Kochi|Kaloor',
  'Bengaluru|Kalyan Nagar',
  'Pune|Kalyani Nagar',
  'Kanpur|Kalyanpur',
  'Lucknow|Kalyanpur',
  'Agra|Kamla Nagar',
  'Mumbai|Kandivali East',
  'Mumbai|Kandivali West',
  'Mumbai|Kanjurmarg',
  'Patna|Kankarbagh',
  'Ranchi|Kanke Road',
  'Meerut|Kanker Khera',
  'Thiruvananthapuram|Karamana',
  'Dehradun|Karanpur',
  'Delhi|Karawal Nagar',
  'Prayagraj|Kareli',
  'Delhi|Karol Bagh',
  'Pune|Karve Nagar',
  'Kolkata|Kasba',
  'Surat|Katargam',
  'Prayagraj|Katra',
  'Pune|Katraj',
  'Ghaziabad|Kaushambi',
  'Ghaziabad|Kavi Nagar',
  'Thiruvananthapuram|Kazhakkoottam',
  'Thiruvananthapuram|Kesavadasapuram',
  'Kolkata|Kestopur',
  'Gorakhpur|Khalilabad Road',
  'Agra|Khandari',
  'Pune|Kharadi',
  'Kanpur|Kidwai Nagar',
  'Chennai|Kilpauk',
  'Delhi|Kirti Nagar',
  'Greater Noida|Knowledge Park I',
  'Greater Noida|Knowledge Park II',
  'Greater Noida|Knowledge Park III',
  'Greater Noida|Knowledge Park IV',
  'Greater Noida|Knowledge Park V',
  'Chennai|Kodambakkam',
  'Bhopal|Kolar Road',
  'Hyderabad|Kondapur',
  'Pune|Kondhwa',
  'Bengaluru|Koramangala',
  'Pune|Koregaon Park',
  'Pune|Kothrud',
  'Thiruvananthapuram|Kowdiar',
  'Bengaluru|KR Puram',
  'Kanpur|Krishna Nagar',
  'Lucknow|Krishna Nagar',
  'Hyderabad|Kukatpally',
  'Patna|Kurji',
  'Mumbai|Kurla East',
  'Mumbai|Kurla West',
  'Gorakhpur|Kushmhi',
  'Delhi|Lajpat Nagar',
  'Kolkata|Lake Town',
  'Meerut|Lalkurti',
  'Ranchi|Lalpur',
  'Varanasi|Lanka',
  'Delhi|Laxmi Nagar',
  'Hyderabad|LB Nagar',
  'Indore|LIG Colony',
  'Surat|Limbayat',
  'Agra|Lohamandi',
  'Ghaziabad|Lohia Nagar',
  'Mumbai|Lower Parel',
  'Prayagraj|Lukerganj',
  'Agra|M.G. Road',
  'Hyderabad|Madhapur',
  'Chennai|Madhavaram',
  'Chennai|Madipakkam',
  'Pune|Magarpatta',
  'Lucknow|Mahanagar',
  'Varanasi|Mahmoorganj',
  'Surat|Majura Gate',
  'Mumbai|Malad East',
  'Mumbai|Malad West',
  'Kanpur|Mall Road',
  'Bengaluru|Malleshwaram',
  'Jaipur|Malviya Nagar',
  'Thiruvananthapuram|Manacaud',
  'Varanasi|Manduadih',
  'Hyderabad|Manikonda',
  'Ahmedabad|Maninagar',
  'Jaipur|Mansarovar',
  'Bengaluru|Marathahalli',
  'Kochi|Mattancherry',
  'Mumbai|Matunga',
  'Meerut|Mawana Road',
  'Delhi|Mayur Vihar',
  'Chennai|Medavakkam',
  'Hyderabad|Mehdipatnam',
  'Bengaluru|MG Road',
  'Gurugram|MG Road',
  'Indore|MG Road',
  'Jaipur|MI Road',
  'Bhopal|Misrod',
  'Patna|Mithapur',
  'Hyderabad|Miyapur',
  'Delhi|Model Town',
  'Gorakhpur|Mohaddipur',
  'Ghaziabad|Mohan Nagar',
  'Ranchi|Morabadi',
  'Bhopal|MP Nagar',
  'Indore|MR 10',
  'Mumbai|Mulund East',
  'Mumbai|Mulund West',
  'Prayagraj|Mumfordganj',
  'Delhi|Munirka',
  'Lucknow|Munshipulia',
  'Chennai|Mylapore',
  'Bengaluru|Nagarbhavi',
  'Prayagraj|Naini',
  'Hyderabad|Nallagandla',
  'Ranchi|Namkum',
  'Hyderabad|Nanakramguda',
  'Chennai|Nanganallur',
  'Delhi|Nangloi',
  'Surat|Nanpura',
  'Delhi|Naraina',
  'Ahmedabad|Naranpura',
  'Delhi|Narela',
  'Ahmedabad|Naroda',
  'Kanpur|Naubasta',
  'Ahmedabad|Navrangpura',
  'Kanpur|Nawabganj',
  'Dehradun|Nehru Colony',
  'Ghaziabad|Nehru Nagar',
  'Delhi|Nehru Place',
  'Kolkata|New Alipore',
  'Delhi|New Friends Colony',
  'Bhopal|New Minal Residency',
  'Kolkata|New Town',
  'Lucknow|Nirala Nagar',
  'Hyderabad|Nizampet',
  'Delhi|Okhla',
  'Varanasi|Orderly Bazar',
  'Surat|Pal',
  'Gurugram|Palam Vihar',
  'Surat|Palanpur',
  'Kochi|Palarivattom',
  'Indore|Palasia',
  'Ahmedabad|Paldi',
  'Meerut|Pallavpuram',
  'Kochi|Panampilly Nagar',
  'Varanasi|Pandeypur',
  'Ranchi|Pandra',
  'Kanpur|Panki',
  'Greater Noida|Pari Chowk',
  'Kolkata|Park Circus',
  'Kolkata|Park Street',
  'Meerut|Partapur',
  'Pune|Pashan',
  'Dehradun|Patel Nagar',
  'Delhi|Patel Nagar',
  'Patna|Patliputra Colony',
  'Thiruvananthapuram|Pattom',
  'Chennai|Perambur',
  'Thiruvananthapuram|Peroorkada',
  'Prayagraj|Phaphamau',
  'Patna|Phulwari Sharif',
  'Pune|Pimple Saudagar',
  'Pune|Pimple-Saudagar',
  'Pune|Pimpri',
  'Surat|Piplod',
  'Delhi|Pitampura',
  'Chennai|Porur',
  'Mumbai|Powai',
  'Ahmedabad|Prahlad Nagar',
  'Jaipur|Pratap Nagar',
  'Ghaziabad|Pratap Vihar',
  'Prayagraj|Prayag',
  'Delhi|Preet Vihar',
  'Dehradun|Prem Nagar',
  'Delhi|Punjabi Bagh',
  'Hyderabad|Punjagutta',
  'Gorakhpur|Railway Colony',
  'Dehradun|Raipur Road',
  'Bhopal|Raisen Road',
  'Ghaziabad|Raj Nagar',
  'Ghaziabad|Raj Nagar Extension',
  'Jaipur|Raja Park',
  'Bengaluru|Rajajinagar',
  'Lucknow|Rajajipuram',
  'Prayagraj|Rajapur',
  'Patna|Rajendra Nagar',
  'Delhi|Rajouri Garden',
  'Dehradun|Rajpur Road',
  'Bengaluru|Ramamurthy Nagar',
  'Varanasi|Ramnagar',
  'Surat|Rander',
  'Gorakhpur|Rapti Nagar',
  'Kanpur|Ratan Lal Nagar',
  'Indore|Rau',
  'Indore|Rau Road',
  'Varanasi|Ravindrapuri',
  'Kanpur|Rawatpur',
  'Bengaluru|Richmond Town',
  'Delhi|Rohini',
  'Chennai|Royapettah',
  'Bengaluru|RT Nagar',
  'Gorakhpur|Rustampur',
  'Patna|S.K. Puri',
  'Surat|Sachin',
  'Meerut|Sadar Bazaar',
  'Patna|Saguna More',
  'Dehradun|Sahastradhara Road',
  'Ghaziabad|Sahibabad',
  'Chennai|Saidapet',
  'Delhi|Saket',
  'Mumbai|Saki Naka',
  'Kolkata|Salt Lake',
  'Jaipur|Sanganer',
  'Agra|Sanjay Place',
  'Mumbai|Santacruz East',
  'Mumbai|Santacruz West',
  'Delhi|Saraswati Vihar',
  'Bengaluru|Sarjapur Road',
  'Varanasi|Sarnath',
  'Surat|Sarthana',
  'Ahmedabad|Satellite',
  'Indore|Scheme 54',
  'Indore|Scheme 74',
  'Indore|Scheme 78',
  'Ahmedabad|Science City',
  'Chandigarh|Sector 1',
  'Greater Noida|Sector 1',
  'Noida|Sector 1',
  'Chandigarh|Sector 10',
  'Greater Noida|Sector 10',
  'Noida|Sector 10',
  'Noida|Sector 100',
  'Noida|Sector 101',
  'Noida|Sector 102',
  'Noida|Sector 104',
  'Noida|Sector 105',
  'Noida|Sector 106',
  'Noida|Sector 107',
  'Noida|Sector 108',
  'Noida|Sector 109',
  'Chandigarh|Sector 11',
  'Noida|Sector 11',
  'Noida|Sector 110',
  'Noida|Sector 112',
  'Noida|Sector 115',
  'Noida|Sector 117',
  'Noida|Sector 118',
  'Noida|Sector 119',
  'Chandigarh|Sector 12',
  'Greater Noida|Sector 12',
  'Noida|Sector 12',
  'Noida|Sector 120',
  'Noida|Sector 121',
  'Noida|Sector 122',
  'Noida|Sector 125',
  'Noida|Sector 126',
  'Noida|Sector 127',
  'Noida|Sector 128',
  'Noida|Sector 129',
  'Noida|Sector 130',
  'Noida|Sector 131',
  'Noida|Sector 132',
  'Noida|Sector 133',
  'Noida|Sector 134',
  'Noida|Sector 135',
  'Noida|Sector 136',
  'Greater Noida|Sector 137',
  'Noida|Sector 137',
  'Chandigarh|Sector 14',
  'Gurugram|Sector 14',
  'Noida|Sector 140',
  'Noida|Sector 141',
  'Greater Noida|Sector 142',
  'Noida|Sector 142',
  'Greater Noida|Sector 143',
  'Noida|Sector 143',
  'Noida|Sector 144',
  'Noida|Sector 145',
  'Noida|Sector 146',
  'Noida|Sector 147',
  'Noida|Sector 148',
  'Noida|Sector 149',
  'Chandigarh|Sector 15',
  'Greater Noida|Sector 15',
  'Gurugram|Sector 15',
  'Noida|Sector 15',
  'Greater Noida|Sector 150',
  'Noida|Sector 150',
  'Noida|Sector 151',
  'Greater Noida|Sector 152',
  'Noida|Sector 152',
  'Noida|Sector 153',
  'Noida|Sector 154',
  'Noida|Sector 155',
  'Noida|Sector 156',
  'Noida|Sector 157',
  'Noida|Sector 158',
  'Noida|Sector 159',
  'Noida|Sector 15A',
  'Chandigarh|Sector 16',
  'Greater Noida|Sector 16',
  'Noida|Sector 16',
  'Noida|Sector 160',
  'Noida|Sector 162',
  'Noida|Sector 163',
  'Noida|Sector 164',
  'Noida|Sector 165',
  'Noida|Sector 166',
  'Noida|Sector 167',
  'Noida|Sector 168',
  'Noida|Sector 169',
  'Noida|Sector 16A',
  'Greater Noida|Sector 16B',
  'Chandigarh|Sector 17',
  'Greater Noida|Sector 17',
  'Gurugram|Sector 17',
  'Noida|Sector 170',
  'Chandigarh|Sector 18',
  'Greater Noida|Sector 18',
  'Gurugram|Sector 18',
  'Noida|Sector 18',
  'Chandigarh|Sector 19',
  'Noida|Sector 19',
  'Chandigarh|Sector 2',
  'Greater Noida|Sector 2',
  'Noida|Sector 2',
  'Chandigarh|Sector 20',
  'Greater Noida|Sector 20',
  'Noida|Sector 20',
  'Chandigarh|Sector 21',
  'Gurugram|Sector 21',
  'Noida|Sector 21',
  'Chandigarh|Sector 22',
  'Greater Noida|Sector 22',
  'Gurugram|Sector 22',
  'Noida|Sector 22',
  'Chandigarh|Sector 23',
  'Gurugram|Sector 23',
  'Noida|Sector 23',
  'Chandigarh|Sector 24',
  'Noida|Sector 24',
  'Chandigarh|Sector 25',
  'Noida|Sector 25',
  'Chandigarh|Sector 26',
  'Noida|Sector 26',
  'Chandigarh|Sector 27',
  'Greater Noida|Sector 27',
  'Gurugram|Sector 27',
  'Noida|Sector 27',
  'Chandigarh|Sector 28',
  'Gurugram|Sector 28',
  'Noida|Sector 28',
  'Chandigarh|Sector 29',
  'Gurugram|Sector 29',
  'Noida|Sector 29',
  'Chandigarh|Sector 3',
  'Greater Noida|Sector 3',
  'Noida|Sector 3',
  'Chandigarh|Sector 30',
  'Gurugram|Sector 30',
  'Noida|Sector 30',
  'Chandigarh|Sector 31',
  'Gurugram|Sector 31',
  'Noida|Sector 31',
  'Chandigarh|Sector 32',
  'Gurugram|Sector 32',
  'Noida|Sector 32',
  'Chandigarh|Sector 33',
  'Noida|Sector 33',
  'Chandigarh|Sector 34',
  'Noida|Sector 34',
  'Chandigarh|Sector 35',
  'Noida|Sector 35',
  'Chandigarh|Sector 36',
  'Greater Noida|Sector 36',
  'Noida|Sector 36',
  'Chandigarh|Sector 37',
  'Greater Noida|Sector 37',
  'Noida|Sector 37',
  'Chandigarh|Sector 38',
  'Gurugram|Sector 38',
  'Noida|Sector 38',
  'Chandigarh|Sector 39',
  'Noida|Sector 39',
  'Chandigarh|Sector 4',
  'Greater Noida|Sector 4',
  'Noida|Sector 4',
  'Chandigarh|Sector 40',
  'Gurugram|Sector 40',
  'Noida|Sector 40',
  'Chandigarh|Sector 41',
  'Greater Noida|Sector 41',
  'Noida|Sector 41',
  'Chandigarh|Sector 42',
  'Noida|Sector 42',
  'Chandigarh|Sector 43',
  'Gurugram|Sector 43',
  'Noida|Sector 43',
  'Chandigarh|Sector 44',
  'Greater Noida|Sector 44',
  'Gurugram|Sector 44',
  'Noida|Sector 44',
  'Chandigarh|Sector 45',
  'Gurugram|Sector 45',
  'Noida|Sector 45',
  'Chandigarh|Sector 46',
  'Gurugram|Sector 46',
  'Noida|Sector 46',
  'Chandigarh|Sector 47',
  'Gurugram|Sector 47',
  'Noida|Sector 47',
  'Chandigarh|Sector 48',
  'Noida|Sector 48',
  'Chandigarh|Sector 49',
  'Gurugram|Sector 49',
  'Noida|Sector 49',
  'Chandigarh|Sector 5',
  'Noida|Sector 5',
  'Chandigarh|Sector 50',
  'Gurugram|Sector 50',
  'Noida|Sector 50',
  'Chandigarh|Sector 51',
  'Gurugram|Sector 51',
  'Noida|Sector 51',
  'Gurugram|Sector 52',
  'Noida|Sector 52',
  'Gurugram|Sector 53',
  'Noida|Sector 53',
  'Gurugram|Sector 54',
  'Noida|Sector 54',
  'Gurugram|Sector 55',
  'Noida|Sector 55',
  'Gurugram|Sector 56',
  'Noida|Sector 56',
  'Gurugram|Sector 57',
  'Noida|Sector 57',
  'Gurugram|Sector 58',
  'Noida|Sector 58',
  'Gurugram|Sector 59',
  'Noida|Sector 59',
  'Chandigarh|Sector 6',
  'Noida|Sector 6',
  'Gurugram|Sector 60',
  'Noida|Sector 60',
  'Gurugram|Sector 61',
  'Noida|Sector 61',
  'Greater Noida|Sector 62',
  'Gurugram|Sector 62',
  'Noida|Sector 62',
  'Greater Noida|Sector 63',
  'Noida|Sector 63',
  'Noida|Sector 64',
  'Gurugram|Sector 65',
  'Noida|Sector 65',
  'Greater Noida|Sector 66',
  'Gurugram|Sector 66',
  'Noida|Sector 66',
  'Greater Noida|Sector 67',
  'Gurugram|Sector 67',
  'Noida|Sector 67',
  'Gurugram|Sector 68',
  'Noida|Sector 68',
  'Noida|Sector 69',
  'Chandigarh|Sector 7',
  'Noida|Sector 7',
  'Gurugram|Sector 70',
  'Noida|Sector 70',
  'Noida|Sector 71',
  'Noida|Sector 72',
  'Noida|Sector 73',
  'Greater Noida|Sector 74',
  'Noida|Sector 74',
  'Greater Noida|Sector 75',
  'Noida|Sector 75',
  'Greater Noida|Sector 76',
  'Noida|Sector 76',
  'Noida|Sector 77',
  'Greater Noida|Sector 78',
  'Noida|Sector 78',
  'Greater Noida|Sector 79',
  'Noida|Sector 79',
  'Chandigarh|Sector 8',
  'Noida|Sector 8',
  'Noida|Sector 80',
  'Greater Noida|Sector 81',
  'Noida|Sector 81',
  'Greater Noida|Sector 82',
  'Noida|Sector 82',
  'Noida|Sector 83',
  'Noida|Sector 84',
  'Noida|Sector 85',
  'Noida|Sector 86',
  'Noida|Sector 87',
  'Noida|Sector 88',
  'Noida|Sector 89',
  'Chandigarh|Sector 9',
  'Noida|Sector 9',
  'Noida|Sector 90',
  'Noida|Sector 91',
  'Noida|Sector 92',
  'Greater Noida|Sector 93',
  'Noida|Sector 93',
  'Greater Noida|Sector 93A',
  'Noida|Sector 93A',
  'Greater Noida|Sector 93B',
  'Noida|Sector 93B',
  'Noida|Sector 94',
  'Noida|Sector 95',
  'Noida|Sector 96',
  'Noida|Sector 97',
  'Noida|Sector 98',
  'Noida|Sector 99',
  'Hyderabad|Secunderabad',
  'Ahmedabad|SG Highway',
  'Delhi|Shahdara',
  'Gorakhpur|Shahpur',
  'Bhopal|Shahpura',
  'Delhi|Shalimar Bagh',
  'Ghaziabad|Shalimar Garden',
  'Bengaluru|Shanti Nagar',
  'Kanpur|Sharda Nagar',
  'Delhi|Shastri Nagar',
  'Ghaziabad|Shastri Nagar',
  'Jaipur|Shastri Nagar',
  'Meerut|Shastri Nagar',
  'Meerut|Shastri Nagar Extension',
  'Chennai|Shenoy Nagar',
  'Pune|Shivajinagar',
  'Varanasi|Shivpur',
  'Kanpur|Shyam Nagar',
  'Kolkata|Shyambazar',
  'Varanasi|Sigra',
  'Agra|Sikandra',
  'Pune|Sinhagad Road',
  'Mumbai|Sion',
  'Jaipur|Sodala',
  'Gurugram|Sohna Road',
  'Hyderabad|Somajiguda',
  'Delhi|South Extension',
  'Thiruvananthapuram|Sreekaryam',
  'Patna|Sri Krishna Puri',
  'Indore|Sudama Nagar',
  'Greater Noida|Surajpur',
  'Lucknow|Sushant Golf City',
  'Pune|Swargate',
  'Kanpur|Swaroop Nagar',
  'Chennai|T. Nagar',
  'Prayagraj|Tagore Town',
  'Agra|Taj Nagri',
  'Chennai|Tambaram',
  'Gorakhpur|Taramandal',
  'Hyderabad|Tarnaka',
  'Greater Noida|Techzone',
  'Lucknow|Techzone',
  'Lucknow|Telibagh',
  'Ahmedabad|Thaltej',
  'Thiruvananthapuram|Thampanoor',
  'Kochi|Thevara',
  'Chennai|Thiruvanmiyur',
  'Hyderabad|Tolichowki',
  'Kolkata|Tollygunge',
  'Jaipur|Tonk Road',
  'Agra|Trans Yamuna',
  'Kochi|Tripunithura',
  'Bhopal|TT Nagar',
  'Surat|Udhna',
  'Gurugram|Udyog Vihar',
  'Meerut|University Road',
  'Hyderabad|Uppal',
  'Ghaziabad|Vaishali',
  'Jaipur|Vaishali Nagar',
  'Surat|Varachha',
  'Delhi|Vasant Kunj',
  'Dehradun|Vasant Vihar',
  'Delhi|Vasant Vihar',
  'Ahmedabad|Vastral',
  'Ahmedabad|Vastrapur',
  'Ghaziabad|Vasundhara',
  'Thiruvananthapuram|Vazhuthacaud',
  'Chennai|Velachery',
  'Surat|Vesu',
  'Jaipur|Vidyadhar Nagar',
  'Ghaziabad|Vijay Nagar',
  'Indore|Vijay Nagar',
  'Dehradun|Vijay Park',
  'Lucknow|Vikas Nagar',
  'Delhi|Vikaspuri',
  'Mumbai|Vikhroli East',
  'Mumbai|Vikhroli West',
  'Mumbai|Vile Parle East',
  'Mumbai|Vile Parle West',
  'Chennai|Villivakkam',
  'Pune|Viman Nagar',
  'Pune|Vishrantwadi',
  'Lucknow|Vrindavan Yojana',
  'Kochi|Vyttila',
  'Mumbai|Wadala',
  'Pune|Wakad',
  'Pune|Wanowrie',
  'Pune|Warje',
  'Delhi|Wazirabad',
  'Bengaluru|Whitefield',
  'Mumbai|Worli',
  'Agra|Yamuna Kinara',
  'Kanpur|Yashoda Nagar',
  'Bengaluru|Yelahanka',
  'Bengaluru|Yeshwanthpur',
];

function buildSeedLocationNodes(): LocationNode[] {
  const nodes: LocationNode[] = [...BASE_STATES];
  const districtAdded = new Set<string>();
  const cityByName = new Map<string, CityDefinition>();

  for (const c of CURATED_CITIES) {
    cityByName.set(c.cityName.toLowerCase(), c);
    if (!districtAdded.has(c.districtId)) {
      districtAdded.add(c.districtId);
      nodes.push({
        locationId: c.districtId,
        level: 'district',
        parentId: c.stateId,
        countryId: 'IN',
        stateId: c.stateId,
        districtId: c.districtId,
        name: c.districtName,
        hasSectors: false,
      });
    }
    nodes.push({
      locationId: c.cityId,
      level: 'city',
      parentId: c.districtId,
      countryId: 'IN',
      stateId: c.stateId,
      districtId: c.districtId,
      cityId: c.cityId,
      name: c.cityName,
      hasSectors: c.hasSectors,
    });
  }

  for (const pair of CURATED_SEED_PAIRS) {
    const [rawCity, rawArea] = pair.split('|');
    if (!rawCity || !rawArea) continue;
    const cityDef = cityByName.get(rawCity.trim().toLowerCase());
    if (!cityDef) continue;

    const areaName = rawArea.trim();
    const norm = normalizeAreaName(areaName);
    const safeSlug = norm.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
    const locationId = `AR_${cityDef.cityId.replace(/^CT_/, '')}_${safeSlug}`.slice(0, 120);

    nodes.push({
      locationId,
      areaId: locationId,
      level: 'area',
      parentId: cityDef.cityId,
      countryId: 'IN',
      stateId: cityDef.stateId,
      districtId: cityDef.districtId,
      cityId: cityDef.cityId,
      name: areaName,
      normalizedName: norm,
      type: inferAreaType(areaName, false),
      custom: false,
      status: 'active',
      hasSectors: false,
    });
  }

  return nodes;
}

export const INITIAL_INDIA_LOCATIONS: LocationNode[] = buildSeedLocationNodes();

/**
 * Merges curated seed location hierarchy with custom Firestore location nodes.
 * - Filters out deleted/merged nodes
 * - Deduplicates case-insensitively within the same parent (using `normalizeAreaName`)
 * - Preserves display spelling
 */
export function mergeLocationNodes(customNodes: LocationNode[]): LocationNode[] {
  const byId = new Map<string, LocationNode>();
  const byParentAndNorm = new Map<string, string>();

  for (const node of INITIAL_INDIA_LOCATIONS) {
    const normKey = `${node.level}:${node.parentId}:${normalizeAreaName(node.name)}`;
    byId.set(node.locationId, node);
    byParentAndNorm.set(normKey, node.locationId);
  }

  for (const node of customNodes) {
    if (!node || !node.locationId || !node.name) continue;
    if (node.status === 'deleted' || node.status === 'merged') {
      byId.delete(node.locationId);
      continue;
    }

    const parentId = node.parentId || node.cityId || '';
    const normKey = `${node.level}:${parentId}:${normalizeAreaName(node.name)}`;
    const existingId = byParentAndNorm.get(normKey);

    if (existingId && existingId !== node.locationId) {
      // Already exists under the same parent with equivalent normalized name -> keep existing ID
      continue;
    }

    byId.set(node.locationId, {
      ...node,
      areaId: node.areaId || node.locationId,
      parentId,
      normalizedName: node.normalizedName || normalizeAreaName(node.name),
    });
    byParentAndNorm.set(normKey, node.locationId);
  }

  return Array.from(byId.values());
}

export function getStates(allNodes: LocationNode[]): LocationNode[] {
  return allNodes
    .filter((n) => n.level === 'state')
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

export function getDistrictsForState(allNodes: LocationNode[], stateId: string): LocationNode[] {
  if (!stateId) return [];
  return allNodes
    .filter((n) => n.level === 'district' && n.parentId === stateId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

export function getCitiesForDistrict(allNodes: LocationNode[], districtId: string): LocationNode[] {
  if (!districtId) return [];
  return allNodes
    .filter((n) => n.level === 'city' && n.parentId === districtId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

/**
 * Returns all valid real areas/localities/sectors for a selected city:
 * - Merges seed areas + approved custom areas
 * - Deduplicates case-insensitively
 * - Sorts naturally (so Sector 1, Sector 2, Sector 10 sort in natural numerical order)
 */
export function getAreasForCity(allNodes: LocationNode[], cityId: string): LocationNode[] {
  if (!cityId) return [];
  const seenNormalized = new Set<string>();
  const result: LocationNode[] = [];

  const matching = allNodes.filter(
    (n) =>
      n.level === 'area' &&
      (n.parentId === cityId || n.cityId === cityId) &&
      n.status !== 'deleted' &&
      n.status !== 'merged'
  );

  for (const area of matching) {
    const norm = area.normalizedName || normalizeAreaName(area.name);
    if (seenNormalized.has(norm)) continue;
    seenNormalized.add(norm);
    result.push(area);
  }

  return result.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
}

/**
 * Resolves city autocomplete suggestions for Customer City Search.
 */
export function searchCitySuggestions(
  allNodes: LocationNode[],
  queryText: string
): ResolvedCitySuggestion[] {
  const cities = allNodes.filter((n) => n.level === 'city');
  const districts = new Map(
    allNodes.filter((n) => n.level === 'district').map((d) => [d.locationId, d])
  );
  const states = new Map(
    allNodes.filter((n) => n.level === 'state').map((s) => [s.locationId, s])
  );

  const q = queryText.trim().toLowerCase();
  const resolved: ResolvedCitySuggestion[] = cities.map((city) => {
    const dist = districts.get(city.parentId);
    const st = dist ? states.get(dist.parentId) : undefined;
    const districtName = dist?.name || '';
    const stateName = st?.name || '';
    return {
      cityId: city.locationId,
      cityName: city.name,
      districtId: dist?.locationId || '',
      districtName,
      stateId: st?.locationId || '',
      stateName,
      label: stateName ? `${city.name}, ${stateName}` : city.name,
    };
  });

  if (!q) {
    return resolved.sort((a, b) => a.cityName.localeCompare(b.cityName));
  }

  return resolved
    .filter(
      (item) =>
        item.cityName.toLowerCase().includes(q) ||
        item.districtName.toLowerCase().includes(q) ||
        item.stateName.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q)
    )
    .sort((a, b) => {
      const aStarts = a.cityName.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.cityName.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.cityName.localeCompare(b.cityName);
    });
}
