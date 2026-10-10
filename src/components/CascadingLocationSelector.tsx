import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  getAreasForCity,
  getCitiesForDistrict,
  getDistrictsForState,
  getStates,
  normalizeAreaName,
  validateCustomAreaName,
} from '../data/indiaLocations';
import { LocationNode } from '../types/models';

export const OTHER_AREA_OPTION_VALUE = 'OTHER';

interface CascadingLocationSelectorProps {
  allLocations: LocationNode[];
  stateId: string;
  districtId: string;
  cityId: string;
  areaId: string;
  customAreaName?: string;
  onChange: (next: {
    stateId: string;
    districtId: string;
    cityId: string;
    areaId: string;
    stateName: string;
    districtName: string;
    cityName: string;
    areaName: string;
    customAreaName?: string;
  }) => void;
  onPersistCustomArea?: (payload: {
    stateId: string;
    districtId: string;
    cityId: string;
    customAreaName: string;
  }) => Promise<LocationNode>;
  labels: {
    state: string;
    district: string;
    city: string;
    area: string;
    sectorNotAvailable?: string;
    noLocationData: string;
  };
  allowOtherOption?: boolean;
  compact?: boolean;
}

export const CascadingLocationSelector: React.FC<CascadingLocationSelectorProps> = ({
  allLocations,
  stateId,
  districtId,
  cityId,
  areaId,
  customAreaName: externalCustomAreaName = '',
  onChange,
  onPersistCustomArea,
  labels,
  allowOtherOption = true,
  compact = false,
}) => {
  const [customInput, setCustomInput] = useState(externalCustomAreaName);
  const [savingCustom, setSavingCustom] = useState(false);
  const [customFeedback, setCustomFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setCustomInput(externalCustomAreaName);
  }, [externalCustomAreaName]);

  const states = getStates(allLocations);
  const districts = stateId ? getDistrictsForState(allLocations, stateId) : [];
  const cities = stateId && districtId ? getCitiesForDistrict(allLocations, districtId) : [];
  const areas = stateId && districtId && cityId ? getAreasForCity(allLocations, cityId) : [];

  const selectedState = states.find((s) => s.locationId === stateId);
  const selectedDistrict = districts.find((d) => d.locationId === districtId);
  const selectedCity = cities.find((c) => c.locationId === cityId);

  const handleStateChange = (newStateId: string) => {
    const st = states.find((s) => s.locationId === newStateId);
    setCustomInput('');
    setCustomFeedback(null);
    onChange({
      stateId: newStateId,
      districtId: '',
      cityId: '',
      areaId: '',
      stateName: st?.name || '',
      districtName: '',
      cityName: '',
      areaName: '',
      customAreaName: '',
    });
  };

  const handleDistrictChange = (newDistrictId: string) => {
    if (!stateId) return;
    const dt = districts.find((d) => d.locationId === newDistrictId);
    setCustomInput('');
    setCustomFeedback(null);
    onChange({
      stateId,
      districtId: newDistrictId,
      cityId: '',
      areaId: '',
      stateName: selectedState?.name || '',
      districtName: dt?.name || '',
      cityName: '',
      areaName: '',
      customAreaName: '',
    });
  };

  const handleCityChange = (newCityId: string) => {
    if (!stateId || !districtId) return;
    const ct = cities.find((c) => c.locationId === newCityId);
    setCustomInput('');
    setCustomFeedback(null);
    onChange({
      stateId,
      districtId,
      cityId: newCityId,
      areaId: '',
      stateName: selectedState?.name || '',
      districtName: selectedDistrict?.name || '',
      cityName: ct?.name || '',
      areaName: '',
      customAreaName: '',
    });
  };

  const handleAreaChange = (newAreaId: string) => {
    if (!stateId || !districtId || !cityId) return;
    setCustomFeedback(null);
    if (newAreaId === OTHER_AREA_OPTION_VALUE) {
      onChange({
        stateId,
        districtId,
        cityId,
        areaId: OTHER_AREA_OPTION_VALUE,
        stateName: selectedState?.name || '',
        districtName: selectedDistrict?.name || '',
        cityName: selectedCity?.name || '',
        areaName: customInput.trim(),
        customAreaName: customInput,
      });
      return;
    }

    const ar = areas.find((a) => a.locationId === newAreaId);
    setCustomInput('');
    onChange({
      stateId,
      districtId,
      cityId,
      areaId: newAreaId,
      stateName: selectedState?.name || '',
      districtName: selectedDistrict?.name || '',
      cityName: selectedCity?.name || '',
      areaName: ar?.name || '',
      customAreaName: '',
    });
  };

  const handleCustomAreaInputChange = (val: string) => {
    setCustomInput(val);
    setCustomFeedback(null);
    onChange({
      stateId,
      districtId,
      cityId,
      areaId: OTHER_AREA_OPTION_VALUE,
      stateName: selectedState?.name || '',
      districtName: selectedDistrict?.name || '',
      cityName: selectedCity?.name || '',
      areaName: val.trim(),
      customAreaName: val,
    });
  };

  const handleSaveCustomAreaClick = async () => {
    if (!onPersistCustomArea || !stateId || !districtId || !cityId) return;
    setCustomFeedback(null);

    const validation = validateCustomAreaName(customInput);
    if (!validation.valid) {
      setCustomFeedback({
        type: 'error',
        text: validation.error || 'Invalid Custom Area name.',
      });
      return;
    }

    // Check case-insensitive duplicate in current city areas
    const existingDuplicate = areas.find(
      (a) => (a.normalizedName || normalizeAreaName(a.name)) === validation.normalizedName
    );
    if (existingDuplicate) {
      setCustomInput('');
      onChange({
        stateId,
        districtId,
        cityId,
        areaId: existingDuplicate.locationId,
        stateName: selectedState?.name || '',
        districtName: selectedDistrict?.name || '',
        cityName: selectedCity?.name || '',
        areaName: existingDuplicate.name,
        customAreaName: '',
      });
      setCustomFeedback({
        type: 'success',
        text: `"${existingDuplicate.name}" already exists in ${selectedCity?.name || 'this city'} and has been selected.`,
      });
      return;
    }

    setSavingCustom(true);
    try {
      const savedNode = await onPersistCustomArea({
        stateId,
        districtId,
        cityId,
        customAreaName: validation.cleanedName,
      });
      setCustomInput('');
      onChange({
        stateId,
        districtId,
        cityId,
        areaId: savedNode.locationId,
        stateName: selectedState?.name || '',
        districtName: selectedDistrict?.name || '',
        cityName: selectedCity?.name || '',
        areaName: savedNode.name,
        customAreaName: '',
      });
      setCustomFeedback({
        type: 'success',
        text: `Added "${savedNode.name}" to ${selectedCity?.name || 'city'} areas and selected it.`,
      });
    } catch (err) {
      setCustomFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save custom area.',
      });
    } finally {
      setSavingCustom(false);
    }
  };

  const missingDistrictData = Boolean(stateId && districts.length === 0);
  const missingCityData = Boolean(stateId && districtId && cities.length === 0);

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-3 ${
          compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        {/* 1. State / UT */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            1. {labels.state} *
          </label>
          <select
            aria-label={labels.state}
            value={stateId}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">-- Select {labels.state} --</option>
            {states.map((st) => (
              <option key={st.locationId} value={st.locationId}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. District (Enabled ONLY after State is selected) */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            2. {labels.district} *
          </label>
          <select
            aria-label={labels.district}
            value={districtId}
            disabled={!stateId || districts.length === 0}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">
              {!stateId
                ? `Select ${labels.state} first`
                : districts.length === 0
                ? labels.noLocationData
                : `-- Select ${labels.district} --`}
            </option>
            {districts.map((dt) => (
              <option key={dt.locationId} value={dt.locationId}>
                {dt.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. City / Town (Enabled ONLY after District is selected) */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            3. {labels.city} *
          </label>
          <select
            aria-label={labels.city}
            value={cityId}
            disabled={!stateId || !districtId || cities.length === 0}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">
              {!districtId
                ? `Select ${labels.district} first`
                : cities.length === 0
                ? labels.noLocationData
                : `-- Select ${labels.city} --`}
            </option>
            {cities.map((ct) => (
              <option key={ct.locationId} value={ct.locationId}>
                {ct.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Area / Locality / Sector (Enabled ONLY after City is selected; ALWAYS shows "Other" at bottom) */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            4. {labels.area} *
          </label>
          <select
            aria-label={labels.area}
            value={areaId}
            disabled={!stateId || !districtId || !cityId}
            onChange={(e) => handleAreaChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">
              {!cityId ? `Select ${labels.city} first` : `-- Select ${labels.area} --`}
            </option>
            {areas.map((ar) => (
              <option key={ar.locationId} value={ar.locationId}>
                {ar.name}
              </option>
            ))}
            {cityId && allowOtherOption && (
              <option value={OTHER_AREA_OPTION_VALUE}>Other</option>
            )}
          </select>
        </div>
      </div>

      {/* Custom Area / Locality / Sector input when "Other" is selected */}
      {cityId && areaId === OTHER_AREA_OPTION_VALUE && (
        <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-slate-800/80 border border-sky-200 dark:border-slate-700 space-y-2.5">
          <label className="block text-xs font-semibold text-slate-900 dark:text-white">
            Custom Area / Locality / Sector *
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => handleCustomAreaInputChange(e.target.value)}
              placeholder={`Enter area, locality, or sector in ${selectedCity?.name || 'this city'} (e.g., Delta 1)`}
              maxLength={80}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {onPersistCustomArea && (
              <button
                type="button"
                disabled={savingCustom || !customInput.trim()}
                onClick={handleSaveCustomAreaClick}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{savingCustom ? 'Saving...' : 'Save Custom Area'}</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Saving adds this area to <strong>{selectedCity?.name || 'the selected city'}</strong> in Firebase so customers and owners can select it directly.
          </p>
        </div>
      )}

      {customFeedback && (
        <div
          role="status"
          className={`p-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
            customFeedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
              : 'border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
          }`}
        >
          {customFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{customFeedback.text}</span>
        </div>
      )}

      {(missingDistrictData || missingCityData) && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-300 font-medium">
          {labels.noLocationData}
        </p>
      )}
    </div>
  );
};
