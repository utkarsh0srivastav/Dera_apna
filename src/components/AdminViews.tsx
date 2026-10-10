import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  UserPlus,
  Building2,
  Megaphone,
  MapPin,
  FileText,
  MoreVertical,
  BarChart3,
  Lock,
  CheckCircle2,
  Eye,
  Ban,
  Trash2,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { CascadingLocationSelector } from './CascadingLocationSelector';
import {
  AdvertisementRecord,
  AuditLogRecord,
  CustomerProfile,
  DeviceLoginRequest,
  InquiryRecord,
  LocationNode,
  OwnerPreRegistration,
  PgListing,
} from '../types/models';

interface AdminLoginViewProps {
  t: (key: string) => string;
  trustedAdminVerified: boolean;
  trustedAdminHasPin: boolean;
  onAuthenticateAdminGoogleAndPin: (
    pin: string,
    confirmPin: string,
    isFirstTimeSetup: boolean
  ) => Promise<void>;
  onVerifyAdminGoogleOnly: () => Promise<{ authorized: boolean; hasPin: boolean }>;
  loading: boolean;
  error: string | null;
}

/**
 * Admin Login View (Sections 56, 58, 59)
 * - Trusted Device: Enters PIN directly without repeated Google authentication
 * - New/Untrusted Device or after Complete Sign Out: Google Authentication -> Admin verification -> PIN
 * - Admin email is kept strictly private and never displayed in the UI or error messages.
 */
export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  t,
  trustedAdminVerified,
  trustedAdminHasPin,
  onAuthenticateAdminGoogleAndPin,
  onVerifyAdminGoogleOnly,
  loading,
  error,
}) => {
  const [googleVerified, setGoogleVerified] = useState(Boolean(trustedAdminVerified));
  const [hasExistingPin, setHasExistingPin] = useState(trustedAdminHasPin);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (trustedAdminVerified) {
      setGoogleVerified(true);
      setHasExistingPin(trustedAdminHasPin);
    }
  }, [trustedAdminVerified, trustedAdminHasPin]);

  const handleGoogleStep = async () => {
    setLocalError(null);
    const res = await onVerifyAdminGoogleOnly();
    if (!res.authorized) {
      setLocalError(
        `${t('auth.accessDenied')}: This account is not authorized for Administrator access.`
      );
      return;
    }
    setHasExistingPin(res.hasPin);
    setGoogleVerified(true);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    await onAuthenticateAdminGoogleAndPin(pin, confirmPin, !hasExistingPin);
  };

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo size="md" showTagline={true} stacked={true} />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white pt-1">
            {t('auth.adminLogin')}
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

        {!googleVerified ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-sky-600" />
                <span>Single Authorized Admin Google Identity</span>
              </div>
              <p>Sign in with the authorized Admin Google account to verify this device.</p>
            </div>

            <button
              type="button"
              onClick={handleGoogleStep}
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('auth.verifyGoogle')}
            </button>
          </div>
        ) : (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                <strong>Authorized Administrator Identity Verified</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {hasExistingPin ? `Admin ${t('auth.pin')} *` : `Create Admin ${t('auth.pin')} *`}
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

            {!hasExistingPin && (
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
              {loading ? t('common.loading') : t('auth.login')}
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

interface AdminDashboardViewProps {
  t: (key: string) => string;
  customers: CustomerProfile[];
  ownerPreRegs: OwnerPreRegistration[];
  pgListings: PgListing[];
  advertisements: AdvertisementRecord[];
  inquiries: InquiryRecord[];
  allLocations: LocationNode[];
  auditLogs: AuditLogRecord[];
  deviceRequests: DeviceLoginRequest[];
  onApproveDeviceRequest: (req: DeviceLoginRequest) => Promise<void>;
  onRejectDeviceRequest: (req: DeviceLoginRequest) => Promise<void>;
  onSaveOwnerPreReg: (payload: {
    mobile: string;
    name: string;
    email: string;
    approvedGoogleEmail: string;
    status: 'Pending' | 'Approved' | 'Blocked' | 'Deleted';
  }) => Promise<void>;
  onBlockOwner: (reg: OwnerPreRegistration) => Promise<void>;
  onDeleteOwner: (reg: OwnerPreRegistration) => Promise<void>;
  onSoftDeletePg: (pgId: string) => Promise<void>;
  onCreateAdvertisement: (payload: {
    pgId: string;
    cityId: string;
    areaId: string;
    sectorId: string;
    startDate: string;
    endDate: string;
    status: 'draft' | 'active' | 'expired' | 'cancelled';
  }) => Promise<void>;
  onUpdateAdvertisementStatus: (
    advertisementId: string,
    status: 'draft' | 'active' | 'expired' | 'cancelled'
  ) => Promise<void>;
  onUpdateInquiryStatus: (
    inquiryId: string,
    status: 'new' | 'contacted' | 'closed'
  ) => Promise<{ ok: boolean; error?: string }>;
  onAddLocationNode: (payload: {
    locationId: string;
    level: 'state' | 'district' | 'city' | 'area';
    parentId: string;
    name: string;
    hasSectors: boolean;
  }) => Promise<void>;
  onPersistCustomArea: (payload: {
    stateId: string;
    districtId: string;
    cityId: string;
    customAreaName: string;
  }) => Promise<LocationNode>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  t,
  customers,
  ownerPreRegs,
  pgListings,
  advertisements,
  inquiries,
  allLocations,
  auditLogs,
  deviceRequests,
  onApproveDeviceRequest,
  onRejectDeviceRequest,
  onSaveOwnerPreReg,
  onBlockOwner,
  onDeleteOwner,
  onSoftDeletePg,
  onCreateAdvertisement,
  onUpdateAdvertisementStatus,
  onUpdateInquiryStatus,
  onAddLocationNode,
  onPersistCustomArea,
}) => {
  const [activeSection, setActiveSection] = useState<
    'owners' | 'devices' | 'customers' | 'pgs' | 'ads' | 'inquiries' | 'locations' | 'audit'
  >('owners');
  const [tableRowLimit, setTableRowLimit] = useState(50);
  const [updatingAdminInquiryIds, setUpdatingAdminInquiryIds] = useState<Record<string, boolean>>(
    {}
  );

  const pendingDeviceCount = deviceRequests.filter((r) => r.status === 'PENDING').length;

  // Owner Pre-Registration Form
  const [ownerName, setOwnerName] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [approvedGoogleEmail, setApprovedGoogleEmail] = useState('');
  const [ownerStatus, setOwnerStatus] = useState<'Pending' | 'Approved'>('Approved');

  // Owner Action Modals (Sections 62–65)
  const [viewOwnerTarget, setViewOwnerTarget] = useState<OwnerPreRegistration | null>(null);
  const [confirmDeleteOwner, setConfirmDeleteOwner] = useState<OwnerPreRegistration | null>(null);

  // Admin PG Cascading State
  const [pgStateId, setPgStateId] = useState('');
  const [pgDistrictId, setPgDistrictId] = useState('');
  const [pgCityId, setPgCityId] = useState('');
  const [pgAreaId, setPgAreaId] = useState('');

  // PG Action Modals (Sections 66–68)
  const [viewPgTarget, setViewPgTarget] = useState<PgListing | null>(null);
  const [confirmDeletePg, setConfirmDeletePg] = useState<PgListing | null>(null);
  const [advertiseTargetPg, setAdvertiseTargetPg] = useState<PgListing | null>(null);
  const [inquiryCountTargetPg, setInquiryCountTargetPg] = useState<PgListing | null>(null);

  // Advertisement Modal Form
  const [adStartDate, setAdStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [adEndDate, setAdEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [adStatus, setAdStatus] = useState<'draft' | 'active' | 'expired' | 'cancelled'>('active');

  // Location Management Form
  const [locLevel, setLocLevel] = useState<'state' | 'district' | 'city' | 'area'>('area');
  const [locParentId, setLocParentId] = useState('CITY_UP_GRNOIDA');
  const [locId, setLocId] = useState('');
  const [locName, setLocName] = useState('');
  const [locHasSectors, setLocHasSectors] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handlePreRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await onSaveOwnerPreReg({
        mobile: ownerMobile.trim(),
        name: ownerName.trim(),
        email: ownerEmail.trim(),
        approvedGoogleEmail: approvedGoogleEmail.trim().toLowerCase(),
        status: ownerStatus,
      });
      setOwnerName('');
      setOwnerMobile('');
      setOwnerEmail('');
      setApprovedGoogleEmail('');
      setFeedback({ type: 'success', text: t('common.savedSuccess') });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : t('common.saveFailed'),
      });
    }
  };

  const cascadeComplete = Boolean(pgStateId && pgDistrictId && pgCityId && pgAreaId);
  const cascadedPgs = cascadeComplete
    ? pgListings.filter(
        (pg) =>
          pg.status !== 'deleted' &&
          pg.stateId === pgStateId &&
          pg.districtId === pgDistrictId &&
          pg.cityId === pgCityId &&
          (pg.areaId === pgAreaId || pg.sectorId === pgAreaId)
      )
    : pgListings.filter((pg) => pg.status !== 'deleted');

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Simple Admin Summary Header (Section 60) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-sky-600 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Authorized Administrator</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('admin.dashboard')}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 block">{t('admin.totalCustomers')}</span>
            <strong className="text-lg font-mono tabular-nums text-slate-900 dark:text-white">
              {customers.length}
            </strong>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 block">Active PGs</span>
            <strong className="text-lg font-mono tabular-nums text-slate-900 dark:text-white">
              {pgListings.filter((p) => p.status === 'active').length}
            </strong>
          </div>
        </div>
      </section>

      {/* Admin Navigation Tabs (Section 60) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'owners', label: t('admin.ownerPreReg'), icon: UserPlus },
          {
            id: 'devices',
            label: `Device Approvals (${pendingDeviceCount})`,
            icon: Lock,
          },
          { id: 'customers', label: `${t('admin.customerPanel')} (${customers.length})`, icon: Users },
          { id: 'pgs', label: t('admin.managePgs'), icon: Building2 },
          { id: 'ads', label: `${t('admin.advertisements')} (${advertisements.length})`, icon: Megaphone },
          { id: 'inquiries', label: t('admin.inquiryStats'), icon: BarChart3 },
          { id: 'locations', label: t('admin.locationMgmt'), icon: MapPin },
          { id: 'audit', label: `${t('admin.auditLogs')} (${auditLogs.length})`, icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveSection(item.id as typeof activeSection);
                setTableRowLimit(50);
                setFeedback(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                activeSection === item.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
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

      {/* NEW DEVICE RE-LOGIN APPROVAL REQUESTS SECTION (Parts 10–13) */}
      {activeSection === 'devices' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                New Device Login Approval Requests ({deviceRequests.length})
              </h2>
              <p className="text-slate-500 mt-0.5">
                Approving a new device activates that device as the Owner&apos;s single active trusted
                device and revokes any previous device session.
              </p>
            </div>
          </div>

          {deviceRequests.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              No new-device login requests submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-3">Owner</th>
                    <th className="py-2 pr-3">Mobile / Email</th>
                    <th className="py-2 pr-3">Device / Platform</th>
                    <th className="py-2 pr-3">Device Hash</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {deviceRequests.map((req) => (
                    <tr key={req.requestId}>
                      <td className="py-3 pr-3 font-semibold text-slate-900 dark:text-white">
                        {req.ownerName}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-mono">{req.mobile}</div>
                        <div className="text-[11px] text-slate-500">{req.email}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {req.deviceName}
                        </div>
                        <div className="text-[11px] text-slate-500">{req.platform}</div>
                      </td>
                      <td className="py-3 pr-3 font-mono text-[11px] text-slate-500">
                        {req.deviceIdHash.slice(0, 18)}…
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                              : req.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                              : 'bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                setFeedback(null);
                                try {
                                  await onApproveDeviceRequest(req);
                                  setFeedback({
                                    type: 'success',
                                    text: `Approved new device (${req.deviceName}) for ${req.ownerName}. Previous device session revoked.`,
                                  });
                                } catch (err) {
                                  setFeedback({
                                    type: 'error',
                                    text:
                                      err instanceof Error
                                        ? err.message
                                        : 'Failed to approve device request.',
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer"
                            >
                              APPROVE
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                setFeedback(null);
                                try {
                                  await onRejectDeviceRequest(req);
                                  setFeedback({
                                    type: 'success',
                                    text: `Rejected device login request for ${req.ownerName}.`,
                                  });
                                } catch (err) {
                                  setFeedback({
                                    type: 'error',
                                    text:
                                      err instanceof Error
                                        ? err.message
                                        : 'Failed to reject device request.',
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer"
                            >
                              REJECT
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* SECTION 1: OWNER PRE-REGISTRATION & MANAGEMENT (Sections 61–65) */}
      {activeSection === 'owners' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handlePreRegSubmit}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs"
          >
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Pre-Register PG Owner
            </h2>

            <div>
              <label className="block font-medium mb-1">Owner Name *</label>
              <input
                type="text"
                required
                maxLength={100}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Mobile Number (10 digits) *</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={ownerMobile}
                onChange={(e) => setOwnerMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Email *</label>
              <input
                type="email"
                required
                maxLength={150}
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Approved Google Account *</label>
              <input
                type="email"
                required
                maxLength={150}
                value={approvedGoogleEmail}
                onChange={(e) => setApprovedGoogleEmail(e.target.value)}
                placeholder="owner@gmail.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Initial Status *</label>
              <select
                value={ownerStatus}
                onChange={(e) => setOwnerStatus(e.target.value as 'Pending' | 'Approved')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-semibold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
            >
              Save Owner Pre-Registration
            </button>
          </form>

          {/* Owner Pre-Registration List (Sections 62, 63, 64, 65: Approved state is stable -> VIEW, BLOCK, DELETE only) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Owner Pre-Registrations ({ownerPreRegs.filter((r) => r.status !== 'Deleted').length})
            </h2>

            {ownerPreRegs.length === 0 ? (
              <p className="text-slate-500">No owner pre-registrations created yet.</p>
            ) : (
              <div className="space-y-3">
                {ownerPreRegs.map((reg) => (
                  <div
                    key={reg.mobile}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">
                        {reg.name}{' '}
                        <span className="font-mono text-xs text-slate-500">({reg.mobile})</span>
                      </div>
                      <div className="text-slate-500">Google: {reg.approvedGoogleEmail}</div>
                      <div className="font-semibold">Status: {reg.status}</div>
                    </div>

                    {/* Section 62 & 63: Once Approved, NO repeated Approve/Reject toggle; only VIEW, BLOCK, DELETE */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewOwnerTarget(reg)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>VIEW</span>
                      </button>

                      {reg.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() =>
                            onSaveOwnerPreReg({
                              mobile: reg.mobile,
                              name: reg.name,
                              email: reg.email,
                              approvedGoogleEmail: reg.approvedGoogleEmail,
                              status: 'Approved',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                        >
                          APPROVE
                        </button>
                      )}

                      {reg.status === 'Approved' && (
                        <button
                          type="button"
                          onClick={() => onBlockOwner(reg)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-400 text-amber-700 dark:text-amber-300 font-semibold cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>BLOCK</span>
                        </button>
                      )}

                      {reg.status === 'Blocked' && (
                        <button
                          type="button"
                          onClick={() =>
                            onSaveOwnerPreReg({
                              mobile: reg.mobile,
                              name: reg.name,
                              email: reg.email,
                              approvedGoogleEmail: reg.approvedGoogleEmail,
                              status: 'Approved',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg border border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer"
                        >
                          RESTORE
                        </button>
                      )}

                      {reg.status !== 'Deleted' && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteOwner(reg)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>DELETE</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* View Owner Modal */}
          {viewOwnerTarget && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-3 text-xs">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Owner Pre-Registration Details
                </h3>
                <div>
                  <strong>Name:</strong> {viewOwnerTarget.name}
                </div>
                <div>
                  <strong>Mobile:</strong> <span className="font-mono">{viewOwnerTarget.mobile}</span>
                </div>
                <div>
                  <strong>Email:</strong> {viewOwnerTarget.email}
                </div>
                <div>
                  <strong>Approved Google Account:</strong> {viewOwnerTarget.approvedGoogleEmail}
                </div>
                <div>
                  <strong>Status:</strong> {viewOwnerTarget.status}
                </div>
                <button
                  type="button"
                  onClick={() => setViewOwnerTarget(null)}
                  className="w-full py-2 rounded-xl bg-sky-600 text-white font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Delete Owner Confirmation Modal (Section 65) */}
          {confirmDeleteOwner && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-xs">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t('admin.deleteOwnerConfirm')}
                </h3>
                <p className="text-slate-500">
                  Owner: <strong>{confirmDeleteOwner.name}</strong> ({confirmDeleteOwner.mobile}).
                  This performs a safe soft-deletion and deactivates their listings while preserving
                  audit history.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOwner(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteOwner(confirmDeleteOwner);
                      setConfirmDeleteOwner(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: CUSTOMER PANEL */}
      {activeSection === 'customers' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Registered Customers ({customers.length})
          </h2>
          {customers.length === 0 ? (
            <p className="text-slate-500">No customers registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Gender</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {customers.slice(0, tableRowLimit).map((c) => (
                    <tr key={c.customerId}>
                      <td className="py-2.5 px-3 font-semibold">{c.name}</td>
                      <td className="py-2.5 px-3 font-mono">{c.mobile}</td>
                      <td className="py-2.5 px-3">{c.email}</td>
                      <td className="py-2.5 px-3">{c.gender}</td>
                      <td className="py-2.5 px-3 font-semibold">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length > tableRowLimit && (
                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setTableRowLimit((prev) => prev + 50)}
                    className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    Show More ({customers.length - tableRowLimit} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* SECTION 3: ADMIN PG MANAGEMENT (Sections 66–68) */}
      {activeSection === 'pgs' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 text-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('admin.managePgs')}
          </h2>

          <CascadingLocationSelector
            allLocations={allLocations}
            stateId={pgStateId}
            districtId={pgDistrictId}
            cityId={pgCityId}
            areaId={pgAreaId}
            onPersistCustomArea={onPersistCustomArea}
            compact={true}
            onChange={(loc) => {
              setPgStateId(loc.stateId);
              setPgDistrictId(loc.districtId);
              setPgCityId(loc.cityId);
              setPgAreaId(loc.areaId);
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

          {cascadedPgs.length === 0 ? (
            <p className="text-slate-500 py-4">No PGs found.</p>
          ) : (
            <div className="space-y-3">
              {cascadedPgs.map((pg) => (
                <div
                  key={pg.pgId}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <strong className="text-sm text-slate-900 dark:text-white">
                      {pg.propertyName} ({pg.propertyType} · {pg.gender})
                    </strong>
                    <div className="text-slate-500">
                      {pg.areaName}, {pg.cityName}
                      {pg.rent > 0 ? ` · Rent: ₹${pg.rent.toLocaleString('en-IN')}/mo` : ''} ·
                      Status: {pg.status}
                    </div>
                  </div>

                  {/* Section 66: Actions -> View, Delete, Advertise, View Inquiry Count */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewPgTarget(pg)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdvertiseTargetPg(pg)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                    >
                      Advertise
                    </button>
                    <button
                      type="button"
                      onClick={() => setInquiryCountTargetPg(pg)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                    >
                      View Inquiry Count
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePg(pg)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View PG Modal */}
          {viewPgTarget && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-3 text-xs">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {viewPgTarget.propertyName}
                </h3>
                <div>
                  <strong>Type / Gender:</strong> {viewPgTarget.propertyType} ·{' '}
                  {viewPgTarget.gender}
                </div>
                <div>
                  <strong>Location:</strong> {viewPgTarget.houseNumber}, {viewPgTarget.street},{' '}
                  {viewPgTarget.areaName}, {viewPgTarget.cityName}, {viewPgTarget.stateName}
                </div>
                {viewPgTarget.rent > 0 && (
                  <div>
                    <strong>Rent:</strong> ₹{viewPgTarget.rent.toLocaleString('en-IN')}/mo
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setViewPgTarget(null)}
                  className="w-full py-2 rounded-xl bg-sky-600 text-white font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Delete PG Confirmation Modal (Section 68) */}
          {confirmDeletePg && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t('admin.deletePgConfirm')}
                </h3>
                <p className="text-slate-500">
                  Property: <strong>{confirmDeletePg.propertyName}</strong>
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeletePg(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onSoftDeletePg(confirmDeletePg.pgId);
                      setConfirmDeletePg(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Advertise PG Modal (Section 67) */}
          {advertiseTargetPg && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Advertise PG: {advertiseTargetPg.propertyName}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={adStartDate}
                      onChange={(e) => setAdStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">End Date *</label>
                    <input
                      type="date"
                      value={adEndDate}
                      onChange={(e) => setAdEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdvertiseTargetPg(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onCreateAdvertisement({
                        pgId: advertiseTargetPg.pgId,
                        cityId: advertiseTargetPg.cityId,
                        areaId: advertiseTargetPg.areaId,
                        sectorId: advertiseTargetPg.sectorId || advertiseTargetPg.areaId,
                        startDate: adStartDate,
                        endDate: adEndDate,
                        status: adStatus,
                      });
                      setAdvertiseTargetPg(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                  >
                    Save Advertisement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Inquiry Count Modal */}
          {inquiryCountTargetPg && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-3 text-center">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Total Inquiry Count
                </h3>
                <p className="text-slate-500">{inquiryCountTargetPg.propertyName}</p>
                <div className="text-4xl font-mono font-bold text-sky-600 py-2">
                  {inquiries.filter((i) => i.pgId === inquiryCountTargetPg.pgId).length}
                </div>
                <button
                  type="button"
                  onClick={() => setInquiryCountTargetPg(null)}
                  className="w-full py-2 rounded-xl bg-sky-600 text-white font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* SECTION 4: ADVERTISEMENTS */}
      {activeSection === 'ads' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Advertisements ({advertisements.length})
          </h2>
          {advertisements.length === 0 ? (
            <p className="text-slate-500">No advertisements yet.</p>
          ) : (
            <div className="space-y-2.5">
              {advertisements.map((ad) => (
                <div
                  key={ad.advertisementId}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <strong className="font-mono">{ad.pgId}</strong> · {ad.cityId} / {ad.areaId} (
                    {ad.startDate} → {ad.endDate})
                  </div>
                  <select
                    value={ad.status}
                    onChange={(e) =>
                      onUpdateAdvertisementStatus(
                        ad.advertisementId,
                        e.target.value as AdvertisementRecord['status']
                      )
                    }
                    className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="expired">expired</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION 5: INQUIRY STATISTICS & ADMIN INQUIRY MANAGEMENT */}
      {activeSection === 'inquiries' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('admin.inquiryStats')}
            </h2>
            {pgListings.length === 0 ? (
              <p className="text-slate-500">No PGs found.</p>
            ) : (
              <div className="space-y-2">
                {pgListings.map((pg) => (
                  <div
                    key={pg.pgId}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <span>
                      <strong>{pg.propertyName}</strong> ({pg.areaName}, {pg.cityName})
                    </span>
                    <strong className="font-mono text-sm">
                      {inquiries.filter((i) => i.pgId === pg.pgId).length} Inquiries
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              All Customer Inquiries ({inquiries.length})
            </h3>
            {inquiries.length === 0 ? (
              <p className="text-slate-500">No inquiries submitted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {inquiries.slice(0, tableRowLimit).map((inq) => {
                  const busy = Boolean(updatingAdminInquiryIds[inq.inquiryId]);
                  const inquiryDate = inq.timestamp?.toDate
                    ? inq.timestamp.toDate().toLocaleString('en-IN')
                    : '';
                  return (
                    <div
                      key={inq.inquiryId}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {inq.customerName} → {inq.pgName}
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
                        <div className="font-mono text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
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
                      </div>
                      <div className="flex items-center gap-2">
                        {busy && (
                          <span className="text-[11px] font-semibold text-sky-600">
                            Updating...
                          </span>
                        )}
                        <select
                          value={inq.status}
                          disabled={busy}
                          onChange={async (e) => {
                            const nextStatus = e.target.value as 'new' | 'contacted' | 'closed';
                            if (busy || nextStatus === inq.status) return;
                            setUpdatingAdminInquiryIds((prev) => ({
                              ...prev,
                              [inq.inquiryId]: true,
                            }));
                            setFeedback(null);
                            try {
                              const res = await onUpdateInquiryStatus(inq.inquiryId, nextStatus);
                              if (res.ok) {
                                setFeedback({
                                  type: 'success',
                                  text: `Inquiry ${inq.inquiryId} updated to ${nextStatus}.`,
                                });
                              } else {
                                setFeedback({
                                  type: 'error',
                                  text:
                                    res.error ||
                                    'You do not have permission to update this inquiry.',
                                });
                              }
                            } catch (err) {
                              setFeedback({
                                type: 'error',
                                text:
                                  err instanceof Error
                                    ? err.message
                                    : 'You do not have permission to update this inquiry.',
                              });
                            } finally {
                              setUpdatingAdminInquiryIds((prev) => ({
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
                {inquiries.length > tableRowLimit && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setTableRowLimit((prev) => prev + 50)}
                      className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                    >
                      Show More ({inquiries.length - tableRowLimit} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* SECTION 6: LOCATION MANAGEMENT */}
      {activeSection === 'locations' && (
        <div className="space-y-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Add Area / Locality / Sector via Hierarchy (&quot;Other&quot;)
              </h2>
              <p className="text-slate-500">
                Select State, District, and City, then choose <strong>Other</strong> in Area / Locality / Sector to add a persistent Custom Area in Firebase.
              </p>
            </div>
            <CascadingLocationSelector
              allLocations={allLocations}
              stateId={pgStateId}
              districtId={pgDistrictId}
              cityId={pgCityId}
              areaId={pgAreaId}
              onPersistCustomArea={onPersistCustomArea}
              compact={true}
              onChange={(loc) => {
                setPgStateId(loc.stateId);
                setPgDistrictId(loc.districtId);
                setPgCityId(loc.cityId);
                setPgAreaId(loc.areaId);
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
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 max-w-xl text-xs">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('admin.locationMgmt')} (Advanced Node Entry)
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onAddLocationNode({
                  locationId: locId.trim().replace(/[^a-zA-Z0-9_-]/g, '_'),
                  level: locLevel,
                  parentId: locParentId.trim(),
                  name: locName.trim(),
                  hasSectors: locHasSectors,
                });
                setLocId('');
                setLocName('');
                setFeedback({ type: 'success', text: 'Location node saved to Firestore.' });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-medium mb-1">Hierarchy Level *</label>
                <select
                  value={locLevel}
                  onChange={(e) => setLocLevel(e.target.value as typeof locLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="state">state</option>
                  <option value="district">district</option>
                  <option value="city">city</option>
                  <option value="area">area</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Parent Node ID *</label>
                <input
                  type="text"
                  required
                  value={locParentId}
                  onChange={(e) => setLocParentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Location ID *</label>
                <input
                  type="text"
                  required
                  value={locId}
                  onChange={(e) => setLocId(e.target.value)}
                  placeholder="AREA_GKP_CIVIL_LINES"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Official Name *</label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="Civil Lines"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-sky-600 text-white font-semibold cursor-pointer"
              >
                Add Location Node
              </button>
            </form>
          </section>
        </div>
      )}

      {/* SECTION 7: AUDIT LOGS */}
      {activeSection === 'audit' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('admin.auditLogs')} ({auditLogs.length})
          </h2>
          {auditLogs.length === 0 ? (
            <p className="text-slate-500">No administrative actions logged yet.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.slice(0, tableRowLimit).map((log) => (
                <div
                  key={log.logId}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <span>
                    <strong>{log.action}</strong> → {log.targetType}/{log.targetId}
                  </span>
                  <span className="text-slate-500">{log.metadata}</span>
                </div>
              ))}
              {auditLogs.length > tableRowLimit && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setTableRowLimit((prev) => prev + 50)}
                    className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    Show More ({auditLogs.length - tableRowLimit} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
};
