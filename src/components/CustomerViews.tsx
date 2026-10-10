import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  ArrowUpDown,
  ShieldCheck,
  ExternalLink,
  Phone,
  Check,
  X,
  Star,
  Building,
  BedDouble,
  Send,
  Image as ImageIcon,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { PgDetailMap } from './MapComponents';
import { CONTROLLED_SECURITY_QUESTIONS } from '../config/branding';
import {
  getAreasForCity,
  ResolvedCitySuggestion,
  searchCitySuggestions,
} from '../data/indiaLocations';
import {
  AdvertisementRecord,
  CustomerProfile,
  LocationNode,
  PgListing,
  ReviewRecord,
  RoomRecord,
  SearchFilterState,
} from '../types/models';
import {
  DEFAULT_SEARCH_FILTERS,
  filterAndSortPgListings,
  hasActiveSecondaryFilters,
} from '../utils/searchAndSort';

interface PublicEntryViewProps {
  t: (key: string) => string;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateExplore: () => void;
  onNavigateOwnerLogin: () => void;
  onNavigateAdminLogin: () => void;
}

/**
 * Public Landing Screen (Sections 8, 59, 108)
 * [ Dera Apna Logo ]
 * Dera Apna
 * ----- Find Your Perfect Stay -----
 * LOGIN       REGISTER
 * PG OWNER LOGIN   ·   ADMIN LOGIN
 */
export const PublicEntryView: React.FC<PublicEntryViewProps> = ({
  t,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateExplore,
  onNavigateOwnerLogin,
  onNavigateAdminLogin,
}) => {
  return (
    <main className="min-h-[calc(100vh-58px)] flex flex-col items-center justify-between px-4 py-12 max-w-xl mx-auto text-center">
      <div className="my-auto w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xs space-y-8">
        {/* Official Logo + Dera (Navy) Apna (Sky Blue) + Flanked Tagline */}
        <div className="flex justify-center">
          <BrandLogo size="xl" showTagline={true} stacked={true} />
        </div>

        {/* Primary Action Buttons: LOGIN & REGISTER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          <button
            type="button"
            onClick={onNavigateLogin}
            className="w-full py-3.5 px-6 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer"
          >
            {t('auth.login')}
          </button>
          <button
            type="button"
            onClick={onNavigateRegister}
            className="w-full py-3.5 px-6 rounded-xl text-sm font-semibold bg-[#0F2942] dark:bg-[#FAF5F0] text-white dark:text-[#230B0E] hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t('auth.register')}
          </button>
        </div>

        {/* Clean Explore PGs Option */}
        <div>
          <button
            type="button"
            onClick={onNavigateExplore}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('nav.explore')}
          </button>
        </div>

        {/* Small Secondary Options: PG OWNER LOGIN & ADMIN LOGIN (Sections 8, 59, 108) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4 text-xs">
          <button
            type="button"
            onClick={onNavigateOwnerLogin}
            className="px-3 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('auth.ownerLogin')}
          </button>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            •
          </span>
          <button
            type="button"
            onClick={onNavigateAdminLogin}
            className="px-3 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('auth.adminLogin')}
          </button>
        </div>
      </div>

      <footer className="pt-6 text-[11px] text-slate-500 dark:text-slate-400">
        © {new Date().getFullYear()} Dera Apna — Find Your Perfect Stay
      </footer>
    </main>
  );
};

interface CustomerRegisterViewProps {
  t: (key: string) => string;
  onRegisterCustomer: (payload: {
    name: string;
    mobile: string;
    email: string;
    gender: 'Male' | 'Female';
    pin: string;
    confirmPin: string;
    securityQuestion: string;
    securityAnswer: string;
  }) => Promise<void>;
  onSwitchToLogin: () => void;
  loading: boolean;
  error: string | null;
}

export const CustomerRegisterView: React.FC<CustomerRegisterViewProps> = ({
  t,
  onRegisterCustomer,
  onSwitchToLogin,
  loading,
  error,
}) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(CONTROLLED_SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!name.trim()) {
      setLocalError(t('auth.error.missingName'));
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      setLocalError(t('auth.error.invalidMobile'));
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalError(t('auth.error.invalidEmail'));
      return;
    }
    if (!gender) {
      setLocalError(t('auth.error.selectGender'));
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setLocalError(t('auth.error.invalidPin'));
      return;
    }
    if (pin !== confirmPin) {
      setLocalError(t('auth.error.pinMismatch'));
      return;
    }
    if (!securityQuestion) {
      setLocalError(t('auth.error.invalidSecurityQuestion'));
      return;
    }
    if (securityAnswer.trim().length < 2) {
      setLocalError(t('auth.error.invalidSecurityAnswer'));
      return;
    }
    await onRegisterCustomer({
      name,
      mobile,
      email,
      gender,
      pin,
      confirmPin,
      securityQuestion,
      securityAnswer,
    });
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-2">
          <BrandLogo size="md" showTagline={true} stacked={true} />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white pt-1">
            {t('auth.register')}
          </h1>
        </div>

        {(localError || error) && (
          <div
            role="alert"
            className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-medium"
          >
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.name')} *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.mobile')} *
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter mobile number"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.email')} *
            </label>
            <input
              type="email"
              required
              maxLength={150}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.gender')} *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['Male', 'Female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    gender === g
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {g === 'Male' ? t('auth.male') : t('auth.female')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.pin')} *
              </label>
              <input
                type="password"
                inputMode="numeric"
                required
                minLength={4}
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter PIN"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
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
                placeholder="Confirm PIN"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.securityQuestion')} *
            </label>
            <select
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {CONTROLLED_SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.securityAnswer')} *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Enter answer"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('auth.createAccount')}
          </button>
        </form>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-xs font-medium text-sky-600 hover:underline cursor-pointer"
          >
            Already registered? {t('auth.login')}
          </button>
        </div>
      </div>
    </main>
  );
};

interface CustomerLoginViewProps {
  t: (key: string) => string;
  onLoginCustomer: (mobile: string, pin: string) => Promise<void>;
  onLookupForgotPinQuestion: (mobile: string) => Promise<string | null>;
  onResetCustomerPin: (
    mobile: string,
    securityAnswer: string,
    newPin: string,
    confirmNewPin: string
  ) => Promise<boolean>;
  onSwitchToRegister: () => void;
  loading: boolean;
  error: string | null;
}

export const CustomerLoginView: React.FC<CustomerLoginViewProps> = ({
  t,
  onLoginCustomer,
  onLookupForgotPinQuestion,
  onResetCustomerPin,
  onSwitchToRegister,
  loading,
  error,
}) => {
  const [mode, setMode] = useState<'login' | 'forgot_lookup' | 'forgot_reset'>('login');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [question, setQuestion] = useState<string | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccessMsg(null);
    await onLoginCustomer(mobile, pin);
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccessMsg(null);
    const foundQuestion = await onLookupForgotPinQuestion(mobile);
    if (foundQuestion) {
      setQuestion(foundQuestion);
      setMode('forgot_reset');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccessMsg(null);
    const ok = await onResetCustomerPin(mobile, securityAnswer, newPin, confirmNewPin);
    if (ok) {
      setPin('');
      setSecurityAnswer('');
      setNewPin('');
      setConfirmNewPin('');
      setQuestion(null);
      setMode('login');
      setResetSuccessMsg(t('auth.pinResetSuccess'));
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-2">
          <BrandLogo size="md" showTagline={true} stacked={true} />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white pt-1">
            {mode === 'login' ? t('auth.login') : t('auth.resetPin')}
          </h1>
        </div>

        {resetSuccessMsg && (
          <div
            role="status"
            className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-medium"
          >
            {resetSuccessMsg}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-medium"
          >
            {error}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.pin')} *
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('auth.login')}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => setMode('forgot_lookup')}
                className="font-medium text-sky-600 hover:underline cursor-pointer"
              >
                {t('auth.forgotPin')}
              </button>
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-medium text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
              >
                {t('auth.register')}
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot_lookup' && (
          <form onSubmit={handleLookupSubmit} className="space-y-4">
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
                placeholder="9876543210"
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

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-xs font-medium text-slate-500 hover:underline cursor-pointer"
            >
              {t('nav.back')}
            </button>
          </form>
        )}

        {mode === 'forgot_reset' && question && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200">
              {question}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.securityAnswer')} *
              </label>
              <input
                type="text"
                required
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Enter your registered answer"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New {t('auth.pin')} *
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  minLength={4}
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

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
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('auth.resetPin')}
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

interface CustomerHomeViewProps {
  t: (key: string) => string;
  customer: CustomerProfile | null;
  allLocations: LocationNode[];
  listings: PgListing[];
  rooms: RoomRecord[];
  advertisements: AdvertisementRecord[];
  filters: SearchFilterState;
  onChangeFilters: React.Dispatch<React.SetStateAction<SearchFilterState>>;
  onSelectPg: (pg: PgListing) => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onLogoutCustomer: () => void;
}

/**
 * Customer Home / Explore View (Sections 16, 17, 18, 19, 20, 21, 22, 23)
 * - ONE LARGE SEARCH BOX at the top ("Search City")
 * - City autocomplete with disambiguation (e.g., Gorakhpur, Uttar Pradesh)
 * - Automatically resolves State/District/City internally without forcing customer through dropdown cascades
 * - Optional Area chips for the selected city
 * - Simple collapsible Filter drawer & Sort dropdown
 * - Clean PG cards prioritizing MAIN PG PHOTO
 */
export const CustomerHomeView: React.FC<CustomerHomeViewProps> = ({
  t,
  customer,
  allLocations,
  listings,
  rooms,
  advertisements,
  filters,
  onChangeFilters,
  onSelectPg,
}) => {
  const [cityInput, setCityInput] = useState(() => {
    if (filters.cityId) {
      const matched = allLocations.find((n) => n.locationId === filters.cityId);
      if (matched) return matched.name;
    }
    return filters.searchQuery || '';
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCityLabel, setSelectedCityLabel] = useState<string>(() => {
    if (filters.cityId) {
      const matched = allLocations.find((n) => n.locationId === filters.cityId);
      if (matched) return matched.name;
    }
    return filters.searchQuery || '';
  });
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  useEffect(() => {
    if (filters.cityId) {
      const matched = allLocations.find((n) => n.locationId === filters.cityId);
      if (matched) {
        setCityInput(matched.name);
        setSelectedCityLabel(matched.name);
      }
    } else if (!filters.searchQuery) {
      setSelectedCityLabel('');
    }
  }, [filters.cityId, filters.searchQuery, allLocations]);

  const citySuggestions = useMemo(
    () => searchCitySuggestions(allLocations, cityInput),
    [allLocations, cityInput]
  );

  const handleSelectCitySuggestion = (suggestion: ResolvedCitySuggestion) => {
    setCityInput(suggestion.cityName);
    setSelectedCityLabel(suggestion.cityName);
    setShowSuggestions(false);
    onChangeFilters((prev) => ({
      ...prev,
      stateId: suggestion.stateId,
      districtId: suggestion.districtId,
      cityId: suggestion.cityId,
      areaId: '',
      searchQuery: '',
    }));
  };

  const handleCitySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = cityInput.trim();
    if (!q) {
      setSelectedCityLabel('');
      onChangeFilters((prev) => ({
        ...prev,
        stateId: '',
        districtId: '',
        cityId: '',
        areaId: '',
        searchQuery: '',
      }));
      setShowSuggestions(false);
      return;
    }

    // Check if there is an exact or top city match
    const exactMatch =
      citySuggestions.find((c) => c.cityName.toLowerCase() === q.toLowerCase()) ||
      citySuggestions[0];

    if (exactMatch) {
      handleSelectCitySuggestion(exactMatch);
    } else {
      setSelectedCityLabel(q);
      setShowSuggestions(false);
      onChangeFilters((prev) => ({
        ...prev,
        stateId: '',
        districtId: '',
        cityId: '',
        areaId: '',
        searchQuery: q,
      }));
    }
  };

  // Areas in the currently selected city (merges curated seed areas + custom areas persisted in Firebase)
  const areasInSelectedCity = useMemo(() => {
    if (!filters.cityId) return [];
    return getAreasForCity(allLocations, filters.cityId);
  }, [allLocations, filters.cityId]);

  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    setVisibleCount(24);
  }, [filters]);

  const results = useMemo(
    () => filterAndSortPgListings(listings, advertisements, filters, rooms),
    [listings, advertisements, filters, rooms]
  );

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  );

  const hasListingsInSelectedCity = useMemo(() => {
    if (!filters.cityId) {
      return listings.some((p) => p.status === 'active');
    }
    return listings.some((p) => p.status === 'active' && p.cityId === filters.cityId);
  }, [listings, filters.cityId]);

  const showFilterEmptyState =
    results.length === 0 && hasListingsInSelectedCity && hasActiveSecondaryFilters(filters);

  const FACILITY_KEYS: { key: keyof SearchFilterState['facilities']; label: string }[] = [
    { key: 'bed', label: 'Bed' },
    { key: 'wardrobe', label: 'Wardrobe' },
    { key: 'table', label: 'Table' },
    { key: 'chair', label: 'Chair' },
    { key: 'wifi', label: 'Wi-Fi' },
    { key: 'ro', label: 'RO Water' },
    { key: 'waterCooler', label: 'Water Cooler' },
    { key: 'cooler', label: 'Cooler' },
    { key: 'laundry', label: 'Laundry' },
    { key: 'washingMachine', label: 'Washing Machine' },
    { key: 'parking', label: 'Parking' },
    { key: 'ventilation', label: 'Ventilation' },
    { key: 'lunchService', label: 'Lunch Service' },
    { key: 'transportation', label: 'Transportation' },
    { key: 'gym', label: 'Gym' },
    { key: 'lift', label: 'Lift' },
    { key: 'gamingRoom', label: 'Gaming Room' },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Simple City Search Box (Sections 16, 17, 18) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <form onSubmit={handleCitySearchSubmit} className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={cityInput}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setCityInput(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder={t('search.searchCity')}
                aria-label={t('search.searchCity')}
                className="w-full pl-12 pr-9 py-3.5 text-sm sm:text-base rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {cityInput && (
                <button
                  type="button"
                  onClick={() => {
                    setCityInput('');
                    setSelectedCityLabel('');
                    onChangeFilters(DEFAULT_SEARCH_FILTERS);
                  }}
                  aria-label="Clear city search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 rounded-2xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer shrink-0"
            >
              {t('search.searchCity')}
            </button>
          </div>

          {/* City Autocomplete Dropdown (Section 18) */}
          {showSuggestions && cityInput.trim().length > 0 && citySuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-30 divide-y divide-slate-100 dark:divide-slate-800">
              {citySuggestions.slice(0, 8).map((sug) => (
                <button
                  key={sug.cityId}
                  type="button"
                  onClick={() => handleSelectCitySuggestion(sug)}
                  className="w-full px-4 py-3 text-left text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                    {sug.cityName}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {sug.districtName ? `${sug.districtName}, ` : ''}
                    {sug.stateName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Selectable Area / Locality / Sector Selector & Chips after City Selection (Section 20) */}
        {filters.cityId && areasInSelectedCity.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label
                htmlFor="customer-city-area-select"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0"
              >
                {t('location.area')}:
              </label>
              <select
                id="customer-city-area-select"
                aria-label={t('location.area')}
                value={filters.areaId}
                onChange={(e) =>
                  onChangeFilters((prev) => ({
                    ...prev,
                    areaId: e.target.value,
                  }))
                }
                className="w-full sm:w-72 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Areas in {selectedCityLabel || 'Selected City'} ({areasInSelectedCity.length})</option>
                {areasInSelectedCity.map((area) => (
                  <option key={area.locationId} value={area.locationId}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => onChangeFilters((prev) => ({ ...prev, areaId: '' }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border cursor-pointer ${
                  !filters.areaId
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                All Areas
              </button>
              {areasInSelectedCity.map((area) => (
                <button
                  key={area.locationId}
                  type="button"
                  onClick={() =>
                    onChangeFilters((prev) => ({
                      ...prev,
                      areaId: prev.areaId === area.locationId ? '' : area.locationId,
                    }))
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border cursor-pointer ${
                    filters.areaId === area.locationId
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {area.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Compact Filter & Sort Controls Bar (Sections 21 & 22) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFiltersModal((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
              <span>{t('search.filter')}</span>
            </button>

            {selectedCityLabel && (
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                PGs in {selectedCityLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label={t('search.sort')}
              value={filters.sortBy}
              onChange={(e) =>
                onChangeFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as SearchFilterState['sortBy'],
                }))
              }
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="relevant">{t('search.sortRelevant')}</option>
              <option value="price_asc">{t('search.sortPriceLow')}</option>
              <option value="price_desc">{t('search.sortPriceHigh')}</option>
              <option value="newest">{t('search.sortNewest')}</option>
            </select>
          </div>
        </div>

        {/* Progressive Disclosure Filter Panel (Section 21) */}
        {showFiltersModal && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-medium mb-1">{t('pg.propertyType')}</label>
                <select
                  value={filters.propertyType}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({
                      ...prev,
                      propertyType: e.target.value as SearchFilterState['propertyType'],
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">All</option>
                  <option value="PG">PG</option>
                  <option value="Hostel">Hostel</option>
                  <option value="Both">Both</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">{t('auth.gender')}</label>
                <select
                  value={filters.gender}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({
                      ...prev,
                      gender: e.target.value as SearchFilterState['gender'],
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Both">Both</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Min Price (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={filters.minPrice}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({ ...prev, minPrice: e.target.value }))
                  }
                  placeholder="Min ₹"
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Max Price (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={filters.maxPrice}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({ ...prev, maxPrice: e.target.value }))
                  }
                  placeholder="Max ₹"
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">AC / Non-AC</label>
                <select
                  value={filters.acType}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({
                      ...prev,
                      acType: e.target.value as SearchFilterState['acType'],
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">All</option>
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">{t('pg.occupancy')}</label>
                <select
                  value={filters.occupancy}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({
                      ...prev,
                      occupancy: e.target.value as SearchFilterState['occupancy'],
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">All</option>
                  <option value="2 Seater">2 Seater</option>
                  <option value="3 Seater">3 Seater</option>
                  <option value="4 Seater">4 Seater</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">{t('pg.food')}</label>
                <select
                  value={filters.foodIncluded}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({
                      ...prev,
                      foodIncluded: e.target.value as SearchFilterState['foodIncluded'],
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">All</option>
                  <option value="included">Included</option>
                  <option value="not_included">Not Included</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">{t('pg.meals')}</label>
                <select
                  value={filters.mealFrequency}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({
                      ...prev,
                      mealFrequency: e.target.value as SearchFilterState['mealFrequency'],
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">Any</option>
                  <option value="1 time">1</option>
                  <option value="2 times">2</option>
                  <option value="3 times">3</option>
                  <option value="4 times">4</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">{t('pg.washroom')}</label>
                <select
                  value={filters.washroomType}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({
                      ...prev,
                      washroomType: e.target.value as SearchFilterState['washroomType'],
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">All</option>
                  <option value="Separate">Separate</option>
                  <option value="Common">Common</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">{t('pg.furnishing')}</label>
                <select
                  value={filters.furnishing}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({
                      ...prev,
                      furnishing: e.target.value as SearchFilterState['furnishing'],
                    }))
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">All</option>
                  <option value="Fully Furnished">Fully Furnished</option>
                  <option value="Semi Furnished">Semi Furnished</option>
                  <option value="Unfurnished">Unfurnished</option>
                </select>
              </div>
            </div>

            {/* 17 Facility Checkboxes */}
            <div>
              <div className="font-semibold mb-2">{t('pg.facilities')}</div>
              <div className="flex flex-wrap gap-2">
                {FACILITY_KEYS.map(({ key, label }) => {
                  const active = filters.facilities[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        onChangeFilters((prev) => ({
                          ...prev,
                          facilities: {
                            ...prev.facilities,
                            [key]: !prev.facilities[key],
                          },
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                        active
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onChangeFilters(DEFAULT_SEARCH_FILTERS)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </section>

      {/* PG Listing Cards Grid (Section 23: Prioritizes MAIN PG PHOTO — NO Monthly Rent ₹0/mo) */}
      {results.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2">
          <Building className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {showFilterEmptyState ? t('search.noFilterResults') : t('search.noResults')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleResults.map(({ listing: pg, isSponsored }) => {
              const photoList = pg.photos ? pg.photos.split('|').filter(Boolean) : [];
              const mainPhoto = pg.mainPhotoUrl || photoList[0] || '';
              const pgRooms = rooms.filter((r) => r.pgId === pg.pgId && r.status !== 'deleted');
              const occupancies = Array.from(
                new Set([
                  ...pgRooms.map((r) => r.occupancy),
                  ...(pg.occupancy2Seater ? ['2 Seater'] : []),
                  ...(pg.occupancy3Seater ? ['3 Seater'] : []),
                  ...(pg.occupancy4Seater ? ['4 Seater'] : []),
                ])
              );
              const availabilityLabel =
                pg.roomAvailability || (pg.bookingAvailable ? t('pg.available') : t('pg.full'));
              const isAvailable = pg.bookingAvailable !== false && pg.roomAvailability !== 'Full';

              return (
                <article
                  key={pg.pgId}
                  onClick={() => onSelectPg(pg)}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-sky-500 transition-colors cursor-pointer flex flex-col"
                >
                  {/* 1. MAIN PG PHOTO FIRST */}
                  <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {mainPhoto ? (
                      <img
                        src={mainPhoto}
                        alt={pg.propertyName}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                        <ImageIcon className="w-6 h-6" />
                        <span>Main PG Photo</span>
                      </div>
                    )}

                    {isSponsored && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500 text-slate-950 shadow-xs">
                        {t('pg.sponsored')}
                      </span>
                    )}
                  </div>

                  {/* 2. PG Name, Property Type, Gender, Area, City, Occupancy, Availability & View Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
                          {pg.propertyName}
                        </h2>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          {pg.propertyType} · {pg.gender}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate">
                          {pg.areaName}, {pg.cityName}
                        </span>
                      </p>
                    </div>

                    {occupancies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {occupancies.map((occ) => (
                          <span
                            key={occ}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-slate-200"
                          >
                            {occ}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}
                      >
                        {availabilityLabel}
                      </span>
                      <span className="text-xs font-semibold text-sky-600 group-hover:translate-x-0.5 transition-transform">
                        {t('pg.viewDetails')} →
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {results.length > visibleCount && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 24)}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Show More ({results.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
};

interface PgDetailViewProps {
  t: (key: string) => string;
  pg: PgListing;
  rooms: RoomRecord[];
  reviews: ReviewRecord[];
  customer: CustomerProfile | null;
  customerCoords: { lat: number; lng: number } | null;
  onRequestCustomerGeolocation: () => void;
  onSelectRoom: (room: RoomRecord) => void;
  onSubmitInquiry: (pg: PgListing, room?: RoomRecord) => Promise<void>;
  onSubmitReview: (pgId: string, rating: number, comment: string) => Promise<void>;
  submittingInquiryTargetId: string | null;
  inquirySuccessTargetIds: string[];
  reviewSubmitting: boolean;
  gmpQuotaExceeded: boolean;
}

/**
 * PG Detail Page (Section 24)
 * Ordered strictly:
 * 1. Main PG Photo
 * 2. PG Name, Property Type, Gender, Availability badge, Full Address, Top PG-level Inquiry Now button
 * 3. Room Posts (clickable room cards with View Room Details, real Room Rent, Security Deposit, Security Duration, Room Facilities, Room Photos, and Room-level Inquiry Now button)
 * 4. Facilities, Rules, Availability
 * 5. PG Gallery, Room Photos, Bathroom Photos, Facility Photos
 * 6. Google Maps, Get Direction, Public Contact, Google Reviews link, Dera Apna reviews
 */
export const PgDetailView: React.FC<PgDetailViewProps> = ({
  t,
  pg,
  rooms,
  reviews,
  customer,
  customerCoords,
  onRequestCustomerGeolocation,
  onSelectRoom,
  onSubmitInquiry,
  onSubmitReview,
  submittingInquiryTargetId,
  inquirySuccessTargetIds,
  reviewSubmitting,
  gmpQuotaExceeded,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const pgInquirySent = inquirySuccessTargetIds.includes(pg.pgId);
  const pgInquirySubmitting = submittingInquiryTargetId === pg.pgId;

  const legacyPhotos = pg.photos ? pg.photos.split('|').filter(Boolean) : [];
  const mainPhoto = pg.mainPhotoUrl || legacyPhotos[0] || '';
  const galleryPhotos = pg.galleryPhotos
    ? pg.galleryPhotos.split('|').filter(Boolean)
    : legacyPhotos.slice(1);
  const bathroomPhotos = pg.bathroomPhotos ? pg.bathroomPhotos.split('|').filter(Boolean) : [];
  const facilityPhotos = pg.facilityPhotos ? pg.facilityPhotos.split('|').filter(Boolean) : [];
  const roomPhotos = rooms.flatMap((r) => (r.photos ? r.photos.split('|').filter(Boolean) : []));
  const googleReviewLink = pg.googleReviewUrl || pg.googleReviewsUrl || '';

  const activeFacilityLabels = [
    pg.acType === 'AC' || pg.acType === 'Both' ? 'AC' : null,
    pg.wifi ? 'Wi-Fi' : null,
    pg.ro ? 'RO Water' : null,
    pg.foodIncluded ? `Food (${pg.mealFrequency})` : null,
    pg.bed ? 'Bed' : null,
    pg.wardrobe ? 'Wardrobe' : null,
    pg.table ? 'Table' : null,
    pg.chair ? 'Chair' : null,
    pg.laundry ? 'Laundry' : null,
    pg.washingMachine ? 'Washing Machine' : null,
    pg.waterCooler ? 'Water Cooler' : null,
    pg.cooler ? 'Cooler' : null,
    pg.parking ? 'Parking' : null,
    pg.ventilation ? 'Ventilation' : null,
    pg.lunchService ? 'Lunch Service' : null,
    pg.transportation ? 'Transportation' : null,
    pg.gym ? 'Gym' : null,
    pg.lift ? 'Lift' : null,
    pg.gamingRoom ? 'Gaming Room' : null,
  ].filter(Boolean) as string[];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 1. FIRST: MAIN PG PHOTO (Section 24 & 25) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative">
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt={`${pg.propertyName} — Main PG Photo`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              Main PG Photo Not Uploaded
            </div>
          )}
        </div>

        {/* 2. Core Summary: PG / Hostel badge, Gender badge, Availability badge, PG Name, Full Address, Top PG-level Inquiry Now button */}
        <div className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-100 dark:bg-slate-800 text-sky-800 dark:text-slate-200">
                  {pg.propertyType}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {pg.gender}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    pg.bookingAvailable
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {pg.roomAvailability || (pg.bookingAvailable ? t('pg.available') : t('pg.full'))}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
                {pg.propertyName}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  {[pg.houseNumber, pg.street, pg.areaName, pg.cityName, pg.districtName, pg.stateName]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </p>
            </div>

            {/* Primary PG-Level INQUIRY NOW Button */}
            <div className="sm:text-right space-y-2 shrink-0">
              {pgInquirySent ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                  <Check className="w-4 h-4" />
                  <span>{t('pg.inquirySent')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submittingInquiryTargetId !== null}
                  onClick={() => onSubmitInquiry(pg)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {pgInquirySubmitting ? t('common.loading') : t('pg.inquiryNow')}
                </button>
              )}
            </div>
          </div>

          {/* 3. Room Posts Information (2 Seater / 3 Seater / 4 Seater) with Real Room Pricing & Room-Level Inquiry Now Button */}
          <div className="space-y-3 pt-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-sky-600" />
              <span>{t('pg.rooms')}</span>
            </h2>
            {rooms.length === 0 ? (
              <p className="text-xs text-slate-500">No individual room posts published yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((rm) => {
                  const rmPhotos = rm.photos ? rm.photos.split('|').filter(Boolean) : [];
                  const rmFacilities = rm.facilities
                    ? rm.facilities.split('|').filter(Boolean)
                    : [];
                  const rmInquirySent = inquirySuccessTargetIds.includes(rm.roomId);
                  const rmInquirySubmitting = submittingInquiryTargetId === rm.roomId;

                  return (
                    <div
                      key={rm.roomId}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectRoom(rm)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectRoom(rm);
                        }
                      }}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {rm.occupancy} ({rm.roomType})
                          </strong>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              rm.availability
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {rm.availability ? t('pg.available') : t('pg.occupied')}
                          </span>
                        </div>
                        <div className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {typeof rm.rent === 'number' && rm.rent > 0
                            ? `Rent: ₹${rm.rent.toLocaleString('en-IN')}/mo`
                            : 'Rent: Contact Owner'}{' '}
                          · Security Deposit: ₹{(rm.securityDeposit || 0).toLocaleString('en-IN')} ·
                          Security Duration: {rm.securityDuration || 1} Months
                        </div>
                        {rm.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {rm.description}
                          </p>
                        )}
                        {rmFacilities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {rmFacilities.map((f) => (
                              <span
                                key={f}
                                className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                        {rmPhotos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            {rmPhotos.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`${rm.occupancy} photo ${idx + 1}`}
                                loading="lazy"
                                className="w-full h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Room Card Footer: View Room Details affordance + Room-Level INQUIRY NOW Button */}
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                          <span>View Room Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                        {rmInquirySent ? (
                          <span
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t('pg.inquirySent')}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={submittingInquiryTargetId !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSubmitInquiry(pg, rm);
                            }}
                            className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {rmInquirySubmitting ? t('common.loading') : t('pg.inquiryNow')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Facilities, Rules, Availability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('pg.facilities')} ({pg.furnishing} · {pg.washroomType} Washroom)
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {activeFacilityLabels.map((fac) => (
                  <span
                    key={fac}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {fac}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('nav.rules')} &amp; Availability
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                {pg.rules || 'Standard resident verification and house rules apply.'}
              </p>
              {pg.description && (
                <p className="text-slate-600 dark:text-slate-300 pt-1">{pg.description}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. PG Gallery, Room Photos, Bathroom Photos, Facility Photos (Section 24) */}
      {(galleryPhotos.length > 0 ||
        roomPhotos.length > 0 ||
        bathroomPhotos.length > 0 ||
        facilityPhotos.length > 0) && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Property &amp; Room Galleries
          </h2>

          {galleryPhotos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500">PG Gallery</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {galleryPhotos.map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt={`PG Gallery ${i + 1}`}
                    loading="lazy"
                    className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                ))}
              </div>
            </div>
          )}

          {roomPhotos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500">Room Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {roomPhotos.map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt={`Room Photo ${i + 1}`}
                    loading="lazy"
                    className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                ))}
              </div>
            </div>
          )}

          {bathroomPhotos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500">Bathroom Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {bathroomPhotos.map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt={`Bathroom Photo ${i + 1}`}
                    loading="lazy"
                    className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                ))}
              </div>
            </div>
          )}

          {facilityPhotos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500">Facility Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {facilityPhotos.map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt={`Facility Photo ${i + 1}`}
                    loading="lazy"
                    className="w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. Google Maps, Get Direction, Public Contact, Google Reviews link, Dera Apna reviews */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <PgDetailMap
          propertyName={pg.propertyName}
          latitude={pg.latitude}
          longitude={pg.longitude}
          customerCoords={customerCoords}
          onRequestCustomerGeolocation={onRequestCustomerGeolocation}
          getDirectionLabel={t('pg.getDirection')}
          distanceLabel={t('pg.distanceKm')}
          quotaExceeded={gmpQuotaExceeded}
        />

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {pg.contactNumber && (
            <a
              href={`tel:${pg.contactNumber}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Phone className="w-4 h-4 text-sky-600" />
              <span>
                {t('pg.callOwner')}: {pg.contactNumber}
              </span>
            </a>
          )}

          {googleReviewLink && (
            <a
              href={googleReviewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ExternalLink className="w-4 h-4 text-sky-600" />
              <span>{t('pg.viewGoogleReviews')}</span>
            </a>
          )}
        </div>
      </section>

      {/* 5. General PG-Level Inquiry Section (Section 69) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('pg.inquiryNow')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Send a direct inquiry to the verified PG Owner. Your contact details are shared only when you submit an inquiry.
          </p>
        </div>
        <div className="shrink-0">
          {pgInquirySent ? (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
              <Check className="w-4 h-4" />
              <span>{t('pg.inquirySent')}</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={submittingInquiryTargetId !== null}
              onClick={() => onSubmitInquiry(pg)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {pgInquirySubmitting ? t('common.loading') : t('pg.inquiryNow')}
            </button>
          )}
        </div>
      </section>

      {/* 6. Dera Apna Reviews */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <span>
            {t('pg.deraApnaReviews')} ({reviews.length})
          </span>
        </h2>

        {reviews.length === 0 ? (
          <p className="text-xs text-slate-500">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev.reviewId}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 dark:text-white">{rev.customerName}</strong>
                  <span className="font-mono text-amber-500">{'★'.repeat(rev.rating)}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}

        {customer && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setReviewError(null);
              try {
                await onSubmitReview(pg.pgId, rating, comment);
                setComment('');
              } catch (err) {
                setReviewError(err instanceof Error ? err.message : 'Unable to post review.');
              }
            }}
            className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs"
          >
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('pg.writeReview')}</h3>
            {reviewError && <div className="text-rose-600 font-medium">{reviewError}</div>}
            <div className="flex items-center gap-3">
              <label className="font-medium">Rating:</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} Stars
                  </option>
                ))}
              </select>
            </div>
            <textarea
              required
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your genuine experience..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button
              type="submit"
              disabled={reviewSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{reviewSubmitting ? t('common.loading') : 'Post Review'}</span>
            </button>
          </form>
        )}
      </section>
    </main>
  );
};

interface RoomDetailViewProps {
  t: (key: string) => string;
  pg: PgListing;
  room: RoomRecord;
  customerCoords: { lat: number; lng: number } | null;
  onRequestCustomerGeolocation: () => void;
  onBackToPg: () => void;
  onSubmitInquiry: (pg: PgListing, room: RoomRecord) => Promise<void>;
  submittingInquiryTargetId: string | null;
  inquirySuccessTargetIds: string[];
  gmpQuotaExceeded: boolean;
}

/**
 * Dedicated Room Detail Page
 * Opens when a customer clicks any Room Card inside the PG Detail Page.
 * Displays real room-specific information from the selected room record:
 * 1. Back to PG Details button
 * 2. Room Photo Gallery (interactive primary photo + thumbnail selector, or fallback to PG photo)
 * 3. PG Context Header (PG Name, Property Type, Gender, Full Address)
 * 4. Room Title / Occupancy, Room Type, Availability Badge
 * 5. Real Room Rent, Security Deposit, Security Duration
 * 6. Room Description & Room Facilities + PG-level Facilities & Rules
 * 7. Dedicated Room-level INQUIRY NOW button + Call Owner / Google Reviews / Map context
 */
export const RoomDetailView: React.FC<RoomDetailViewProps> = ({
  t,
  pg,
  room,
  customerCoords,
  onRequestCustomerGeolocation,
  onBackToPg,
  onSubmitInquiry,
  submittingInquiryTargetId,
  inquirySuccessTargetIds,
  gmpQuotaExceeded,
}) => {
  const roomPhotos = useMemo(
    () => (room.photos ? room.photos.split('|').filter(Boolean) : []),
    [room.photos]
  );
  const pgLegacyPhotos = pg.photos ? pg.photos.split('|').filter(Boolean) : [];
  const fallbackMainPhoto = pg.mainPhotoUrl || pgLegacyPhotos[0] || '';
  const allDisplayPhotos = roomPhotos.length > 0 ? roomPhotos : fallbackMainPhoto ? [fallbackMainPhoto] : [];

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    setActivePhotoIndex(0);
  }, [room.roomId]);

  const roomFacilities = room.facilities ? room.facilities.split('|').filter(Boolean) : [];
  const rmInquirySent = inquirySuccessTargetIds.includes(room.roomId);
  const rmInquirySubmitting = submittingInquiryTargetId === room.roomId;

  const googleReviewLink = pg.googleReviewUrl || pg.googleReviewsUrl || '';

  const pgFacilityLabels = [
    pg.acType === 'AC' || pg.acType === 'Both' ? 'AC' : null,
    pg.wifi ? 'Wi-Fi' : null,
    pg.ro ? 'RO Water' : null,
    pg.foodIncluded ? `Food (${pg.mealFrequency})` : null,
    pg.bed ? 'Bed' : null,
    pg.wardrobe ? 'Wardrobe' : null,
    pg.table ? 'Table' : null,
    pg.chair ? 'Chair' : null,
    pg.laundry ? 'Laundry' : null,
    pg.washingMachine ? 'Washing Machine' : null,
    pg.waterCooler ? 'Water Cooler' : null,
    pg.cooler ? 'Cooler' : null,
    pg.parking ? 'Parking' : null,
    pg.ventilation ? 'Ventilation' : null,
    pg.lunchService ? 'Lunch Service' : null,
    pg.transportation ? 'Transportation' : null,
    pg.gym ? 'Gym' : null,
    pg.lift ? 'Lift' : null,
    pg.gamingRoom ? 'Gaming Room' : null,
  ].filter(Boolean) as string[];

  const primaryPhoto = allDisplayPhotos[activePhotoIndex] || allDisplayPhotos[0] || '';

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Back to PG Details Navigation Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToPg}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-sky-600" />
          <span>Back to {pg.propertyName} Details</span>
        </button>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          {pg.propertyName} · {room.occupancy}
        </span>
      </div>

      {/* Main Room Card: Photo Gallery + Room Summary + Room Pricing + Inquiry */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {/* Room Photo Viewer */}
        <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 relative">
          {primaryPhoto ? (
            <img
              src={primaryPhoto}
              alt={`${pg.propertyName} — ${room.occupancy} Photo ${activePhotoIndex + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
              <ImageIcon className="w-7 h-7 stroke-1.5" />
              <span>No Room Photos Uploaded Yet</span>
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900/80 text-white backdrop-blur-xs">
              {room.occupancy} ({room.roomType})
            </span>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                room.availability
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {room.availability ? t('pg.available') : t('pg.occupied')}
            </span>
          </div>
        </div>

        {/* Room Photo Thumbnails if multiple photos exist */}
        {roomPhotos.length > 1 && (
          <div className="px-6 pt-4 flex items-center gap-2.5 overflow-x-auto">
            {roomPhotos.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePhotoIndex(idx)}
                className={`relative shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  activePhotoIndex === idx
                    ? 'border-sky-600 ring-2 ring-sky-500/30'
                    : 'border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100'
                }`}
              >
                <img
                  src={url}
                  alt={`${room.occupancy} thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Room Header & Primary Inquiry CTA */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-100 dark:bg-slate-800 text-sky-800 dark:text-slate-200">
                  {pg.propertyType}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {pg.gender}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {room.roomType}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
                {room.occupancy} — {pg.propertyName}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  {[pg.houseNumber, pg.street, pg.areaName, pg.cityName, pg.districtName, pg.stateName]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </p>
            </div>

            {/* Room-Level INQUIRY NOW Button */}
            <div className="sm:text-right space-y-2 shrink-0">
              {rmInquirySent ? (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                  <Check className="w-4 h-4" />
                  <span>{t('pg.inquirySent')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submittingInquiryTargetId !== null}
                  onClick={() => onSubmitInquiry(pg, room)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {rmInquirySubmitting ? t('common.loading') : `${t('pg.inquiryNow')} (${room.occupancy})`}
                </button>
              )}
            </div>
          </div>

          {/* Real Room Pricing Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-500 block">{t('pg.rentPerMonth')}</span>
              <strong className="text-lg font-mono tabular-nums text-slate-900 dark:text-white">
                {typeof room.rent === 'number' && room.rent > 0
                  ? `₹${room.rent.toLocaleString('en-IN')}/mo`
                  : 'Contact Owner'}
              </strong>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">{t('pg.securityDeposit')}</span>
              <strong className="text-lg font-mono tabular-nums text-slate-900 dark:text-white">
                ₹{(room.securityDeposit || 0).toLocaleString('en-IN')}
              </strong>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">{t('pg.securityDuration')}</span>
              <strong className="text-lg font-mono tabular-nums text-slate-900 dark:text-white">
                {room.securityDuration || 1} {t('pg.months')}
              </strong>
            </div>
          </div>

          {/* Room Description */}
          {room.description && (
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Room Description
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {room.description}
              </p>
            </div>
          )}

          {/* Room Facilities & Property Facilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Room Facilities ({room.occupancy})
              </h2>
              {roomFacilities.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {roomFacilities.map((fac) => (
                    <span
                      key={fac}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 dark:bg-slate-800 text-sky-900 dark:text-slate-200 border border-sky-200/60 dark:border-slate-700"
                    >
                      {fac}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Standard room furnishings included as per property facilities.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                PG Facilities ({pg.furnishing} · {pg.washroomType} Washroom)
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {pgFacilityLabels.map((fac) => (
                  <span
                    key={fac}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {fac}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* All Room Photos Grid */}
          {roomPhotos.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {room.occupancy} Photos ({roomPhotos.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {roomPhotos.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <img
                      src={url}
                      alt={`${room.occupancy} photo ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-44 object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* House Rules */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('nav.rules')} &amp; Availability
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              {pg.rules || 'Standard resident verification and house rules apply.'}
            </p>
          </div>
        </div>
      </section>

      {/* Location, Directions & Direct Owner Contact */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <PgDetailMap
          propertyName={`${pg.propertyName} (${room.occupancy})`}
          latitude={pg.latitude}
          longitude={pg.longitude}
          customerCoords={customerCoords}
          onRequestCustomerGeolocation={onRequestCustomerGeolocation}
          getDirectionLabel={t('pg.getDirection')}
          distanceLabel={t('pg.distanceKm')}
          quotaExceeded={gmpQuotaExceeded}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            {pg.contactNumber && (
              <a
                href={`tel:${pg.contactNumber}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Phone className="w-4 h-4 text-sky-600" />
                <span>
                  {t('pg.callOwner')}: {pg.contactNumber}
                </span>
              </a>
            )}

            {googleReviewLink && (
              <a
                href={googleReviewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ExternalLink className="w-4 h-4 text-sky-600" />
                <span>{t('pg.viewGoogleReviews')}</span>
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={onBackToPg}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600" />
            <span>Back to PG Details</span>
          </button>
        </div>
      </section>

      {/* Bottom Room Inquiry CTA Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Inquire About {room.occupancy} ({room.roomType})
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Send a direct room inquiry for {room.occupancy} at {pg.propertyName} to the verified PG Owner.
          </p>
        </div>
        <div className="shrink-0">
          {rmInquirySent ? (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
              <Check className="w-4 h-4" />
              <span>{t('pg.inquirySent')}</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={submittingInquiryTargetId !== null}
              onClick={() => onSubmitInquiry(pg, room)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {rmInquirySubmitting ? t('common.loading') : `${t('pg.inquiryNow')} (${room.occupancy})`}
            </button>
          )}
        </div>
      </section>
    </main>
  );
};
