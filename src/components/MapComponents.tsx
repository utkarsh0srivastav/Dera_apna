import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, MapMouseEvent } from '@vis.gl/react-google-maps';
import { Navigation, Compass, AlertTriangle, MapPin } from 'lucide-react';
import { calculateHaversineDistanceKm } from '../utils/searchAndSort';

const GMP_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];

export function getConfiguredMapsApiKey(): string {
  const envKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && envKey !== 'YOUR_GOOGLE_MAPS_API_KEY' && envKey.trim().length > 10) {
    return envKey.trim();
  }
  return '';
}

interface OwnerLocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onSelectCoordinates: (lat: number, lng: number) => void;
  useCurrentLocationLabel: string;
  selectOnMapLabel: string;
  quotaExceeded?: boolean;
}

export const OwnerLocationPickerMap: React.FC<OwnerLocationPickerMapProps> = ({
  latitude,
  longitude,
  onSelectCoordinates,
  useCurrentLocationLabel,
  selectOnMapLabel,
}) => {
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const apiKey = getConfiguredMapsApiKey();

  const handleUseCurrentLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported or permitted by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onSelectCoordinates(lat, lng);
      },
      () => {
        setLocating(false);
        setGeoError('Location permission denied. Please select location on the map or enter coordinates.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapClick = (e: MapMouseEvent) => {
    if (e.detail.latLng) {
      const lat = Number(e.detail.latLng.lat.toFixed(6));
      const lng = Number(e.detail.latLng.lng.toFixed(6));
      onSelectCoordinates(lat, lng);
    }
  };

  const hasValidCoords =
    typeof latitude === 'number' &&
    !Number.isNaN(latitude) &&
    typeof longitude === 'number' &&
    !Number.isNaN(longitude) &&
    (latitude !== 0 || longitude !== 0);

  const defaultCenter = hasValidCoords
    ? { lat: latitude!, lng: longitude! }
    : { lat: 28.6139, lng: 77.209 }; // India center view for manual selection

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Compass className="w-4 h-4" />
          {locating ? 'Locating...' : useCurrentLocationLabel}
        </button>
        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {selectOnMapLabel} (Click anywhere on the map to place property marker)
        </span>
      </div>

      {geoError && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{geoError}</span>
        </div>
      )}

      {!apiKey ? (
        <div className="p-4 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs space-y-2">
          <div className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Google Maps API Key Configuration Required</span>
          </div>
          <p>
            VITE_GOOGLE_MAPS_API_KEY is not configured. Please configure a restricted Google Maps
            JavaScript API key in environment variables. You may still use &ldquo;Use My Current
            Location&rdquo; or enter verified latitude/longitude coordinates below.
          </p>
        </div>
      ) : (
        <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <APIProvider apiKey={apiKey}>
            <Map
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={GMP_ATTRIBUTION_IDS}
              defaultCenter={defaultCenter}
              defaultZoom={hasValidCoords ? 15 : 5}
              gestureHandling="greedy"
              onClick={handleMapClick}
              className="w-full h-full"
            >
              {hasValidCoords && (
                <AdvancedMarker position={{ lat: latitude!, lng: longitude! }}>
                  <Pin background="#0284c7" borderColor="#0369a1" glyphColor="#ffffff" />
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Latitude (-90 to 90) *
          </label>
          <input
            type="number"
            step="any"
            value={latitude ?? ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onSelectCoordinates(Number.isNaN(val) ? 0 : val, longitude ?? 0);
            }}
            placeholder="e.g. 28.474388"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Longitude (-180 to 180) *
          </label>
          <input
            type="number"
            step="any"
            value={longitude ?? ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onSelectCoordinates(latitude ?? 0, Number.isNaN(val) ? 0 : val);
            }}
            placeholder="e.g. 77.503990"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
          />
        </div>
      </div>
    </div>
  );
};

interface PgDetailMapProps {
  propertyName: string;
  latitude: number;
  longitude: number;
  customerCoords: { lat: number; lng: number } | null;
  onRequestCustomerGeolocation: () => void;
  getDirectionLabel: string;
  distanceLabel: string;
  quotaExceeded?: boolean;
}

export const PgDetailMap: React.FC<PgDetailMapProps> = ({
  propertyName,
  latitude,
  longitude,
  customerCoords,
  onRequestCustomerGeolocation,
  getDirectionLabel,
  distanceLabel,
}) => {
  const apiKey = getConfiguredMapsApiKey();
  const hasValidCoords =
    typeof latitude === 'number' &&
    !Number.isNaN(latitude) &&
    typeof longitude === 'number' &&
    !Number.isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const realDistanceKm =
    hasValidCoords && customerCoords
      ? calculateHaversineDistanceKm(
          customerCoords.lat,
          customerCoords.lng,
          latitude,
          longitude
        )
      : null;

  /**
   * "Get Direction" opens Google Maps navigation directly.
   * It MUST NOT create an inquiry, expose customer identity, or count as an inquiry.
   */
  const directionsUrl = hasValidCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${latitude},${longitude}`
      )}`
    : '';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="font-mono tabular-nums">
            {hasValidCoords
              ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
              : 'Invalid coordinates'}
          </span>
          <span aria-hidden="true">·</span>
          {realDistanceKm !== null ? (
            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
              {realDistanceKm.toFixed(2)} {distanceLabel}
            </span>
          ) : (
            <button
              type="button"
              onClick={onRequestCustomerGeolocation}
              className="underline hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
            >
              Check real distance ({distanceLabel})
            </button>
          )}
        </div>

        {hasValidCoords && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Navigation className="w-3.5 h-3.5" />
            {getDirectionLabel}
          </a>
        )}
      </div>

      {!apiKey ? (
        <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
          Google Maps JavaScript API key is not configured (`VITE_GOOGLE_MAPS_API_KEY`). Use the
          &ldquo;{getDirectionLabel}&rdquo; button above to open Google Maps navigation.
        </div>
      ) : hasValidCoords ? (
        <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <APIProvider apiKey={apiKey}>
            <Map
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={GMP_ATTRIBUTION_IDS}
              defaultCenter={{ lat: latitude, lng: longitude }}
              defaultZoom={15}
              gestureHandling="cooperative"
              className="w-full h-full"
            >
              <AdvancedMarker
                position={{ lat: latitude, lng: longitude }}
                title={propertyName}
              >
                <Pin background="#0284c7" borderColor="#0369a1" glyphColor="#ffffff" />
              </AdvancedMarker>
            </Map>
          </APIProvider>
        </div>
      ) : (
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          Coordinates are not valid for map display.
        </div>
      )}
    </div>
  );
};
