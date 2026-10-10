import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Home,
  Sun,
  Moon,
  Globe,
  FileText,
  Shield,
  HelpCircle,
  Mail,
  Building2,
  LogOut,
  Power,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { LANGUAGE_LABELS } from '../i18n/translations';
import { AppRole, SupportedLanguage, ThemeMode } from '../types/models';

interface TopBarProps {
  t: (key: string) => string;
  showBackButton: boolean;
  onBack: () => void;
  onHomeAction: () => void;
  theme: ThemeMode;
  onSetTheme: (mode: ThemeMode) => void;
  language: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  activeRole: AppRole;
  onOwnerManageMyPg?: () => void;
  onNormalLogout?: () => void;
  onCompleteSignOut?: () => void;
}

/**
 * Clean TopBar & Central Three-Dot Menu (Sections 9, 10, 11, 33, 48, 49, 50)
 * - NO large Language or Theme button on the top bar outside the three-dot menu
 * - Every relevant inner page has BACK at the top
 * - Three-dot menu contains:
 *   Home, Manage My PG (OWNER ONLY), Rules & Regulations, Policies, Language (15 languages), Theme (Light/Dark),
 *   Logout, Complete Sign Out (Owner/Admin)
 */
export const TopBar: React.FC<TopBarProps> = ({
  t,
  showBackButton,
  onBack,
  onHomeAction,
  theme,
  onSetTheme,
  language,
  onChangeLanguage,
  activeRole,
  onOwnerManageMyPg,
  onNormalLogout,
  onCompleteSignOut,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'help' | 'rules' | 'policies' | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Back Button + Brand */}
          <div className="flex items-center gap-2.5">
            {showBackButton && (
              <button
                type="button"
                onClick={onBack}
                aria-label={t('nav.back')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('nav.back')}</span>
              </button>
            )}
            <BrandLogo size="sm" showTagline={false} />
          </div>

          {/* Right: Compact Three-Dot Menu ONLY (Sections 9 & 10) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Settings and navigation menu"
              aria-expanded={menuOpen}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50 text-xs divide-y divide-slate-100 dark:divide-slate-800"
              >
                {/* Primary Navigation Items */}
                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onHomeAction();
                    }}
                    className="w-full px-4 py-2 text-left font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-sky-600" />
                    <span>{t('nav.home')}</span>
                  </button>

                  {/* Section 33 & 48: Manage My PG is strictly OWNER ONLY */}
                  {activeRole === 'PG_OWNER' && onOwnerManageMyPg && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onOwnerManageMyPg();
                      }}
                      className="w-full px-4 py-2 text-left font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-sky-600" />
                      <span>{t('nav.manageMyPg')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setInfoModal('help');
                    }}
                    className="w-full px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-sky-600" />
                    <span>{t('nav.help')}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setInfoModal('rules');
                    }}
                    className="w-full px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>{t('nav.rules')}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setInfoModal('policies');
                    }}
                    className="w-full px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span>{t('nav.policies')}</span>
                  </button>
                </div>

                {/* Language Selector (16 Languages) inside Three-Dot Menu */}
                <div className="px-4 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{t('nav.language')} (16)</span>
                  </div>
                  <select
                    aria-label={t('nav.language')}
                    value={language}
                    onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
                    className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    {(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map((langKey) => (
                      <option key={langKey} value={langKey}>
                        {LANGUAGE_LABELS[langKey]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Theme Selector (Light / Dark) inside Three-Dot Menu */}
                <div className="px-4 py-2.5 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {t('nav.theme')}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSetTheme('light')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border cursor-pointer ${
                        theme === 'light'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetTheme('dark')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Role Session Actions: Logout & Complete Sign Out */}
                {activeRole !== 'PUBLIC' && (
                  <div className="py-1">
                    {onNormalLogout && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onNormalLogout();
                        }}
                        className="w-full px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-slate-500" />
                        <span>{t('nav.logout')}</span>
                      </button>
                    )}

                    {(activeRole === 'PG_OWNER' || activeRole === 'ADMIN') && onCompleteSignOut && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onCompleteSignOut();
                        }}
                        className="w-full px-4 py-2 text-left font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Power className="w-4 h-4" />
                        <span>{t('nav.completeSignOut')}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Help & Guide / Rules & Regulations / Policies Modal (Fully localized across all 16 languages) */}
      {infoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {infoModal === 'help'
                  ? t('legal.help.title')
                  : infoModal === 'rules'
                  ? t('legal.rules.title')
                  : t('legal.policies.title')}
              </h2>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {infoModal === 'help' ? (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {t('legal.help.intro')}
                </p>

                {/* PG Owner Registration Notice Card */}
                <div className="p-3.5 rounded-xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>PG Owner Registration</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                    Are you a PG or hostel owner who wants to list your property on Dera Apna? For PG/hostel registration and owner onboarding assistance, please contact us using the email address below.
                  </p>
                  <div className="pt-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Contact Email:{' '}
                    </span>
                    <a
                      href="mailto:utkarsh.srivastav1403@gmail.com"
                      className="font-bold text-sky-700 dark:text-sky-300 underline break-all"
                    >
                      utkarsh.srivastav1403@gmail.com
                    </a>
                  </div>
                  <div className="pt-1">
                    <a
                      href="mailto:utkarsh.srivastav1403@gmail.com?subject=PG%20Owner%20Registration%20-%20Dera%20Apna&body=Hello%20Dera%20Apna%20Support%2C%0A%0AI%20would%20like%20to%20register%20my%20PG%2FHostel%20on%20Dera%20Apna.%0A%0AOwner%20Name%3A%20%0AMobile%20Number%3A%20%0APG%2FHostel%20Name%3A%20%0ACity%20%26%20Locality%3A%20%0A%0AThank%20you."
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email for PG Registration</span>
                    </a>
                  </div>
                </div>

                {/* Support Contact Email Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {t('legal.help.support.title')}
                  </div>
                  <p>{t('legal.help.support.body')}</p>
                  <p className="font-bold text-sky-700 dark:text-sky-300 break-all">
                    <a
                      href="mailto:utkarsh.srivastav1403@gmail.com?subject=Dera%20Apna%20Support%20Query"
                      className="underline"
                    >
                      utkarsh.srivastav1403@gmail.com
                    </a>
                  </p>
                </div>

                {/* Existing Help Guide Sections */}
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.help.section1.title')}
                    </div>
                    <p>{t('legal.help.section1.body')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.help.section2.title')}
                    </div>
                    <p>{t('legal.help.section2.body')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.help.section3.title')}
                    </div>
                    <p>{t('legal.help.section3.body')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.help.section4.title')}
                    </div>
                    <p>{t('legal.help.section4.body')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.help.section5.title')}
                    </div>
                    <p>{t('legal.help.section5.body')}</p>
                  </div>
                </div>

                {/* Preserved Terms & Conditions Section inside Help */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    {t('legal.help.terms.title')} ({t('legal.rules.title')})
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    {t('legal.rules.intro')}
                  </p>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {t('legal.rules.section1.title')}:{' '}
                      </span>
                      <span>{t('legal.rules.section1.body')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {t('legal.rules.section2.title')}:{' '}
                      </span>
                      <span>{t('legal.rules.section2.body')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {t('legal.rules.section3.title')}:{' '}
                      </span>
                      <span>{t('legal.rules.section3.body')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {t('legal.rules.section4.title')}:{' '}
                      </span>
                      <span>{t('legal.rules.section4.body')}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('legal.rules.consent')}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 font-medium">
                  {t('legal.help.notice')}
                </div>
              </div>
            ) : infoModal === 'rules' ? (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {t('legal.rules.intro')}
                </p>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.rules.section1.title')}
                    </div>
                    <p>{t('legal.rules.section1.body')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.rules.section2.title')}
                    </div>
                    <p>{t('legal.rules.section2.body')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.rules.section3.title')}
                    </div>
                    <p>{t('legal.rules.section3.body')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.rules.section4.title')}
                    </div>
                    <p>{t('legal.rules.section4.body')}</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-medium">
                  {t('legal.rules.warning')}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('legal.rules.consent')}
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {t('legal.policies.intro')}
                </p>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.policies.section1.title')}
                    </div>
                    <p>{t('legal.policies.section1.body')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.policies.section2.title')}
                    </div>
                    <p>{t('legal.policies.section2.body')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.policies.section3.title')}
                    </div>
                    <p>{t('legal.policies.section3.body')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      {t('legal.policies.section4.title')}
                    </div>
                    <p>{t('legal.policies.section4.body')}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('legal.policies.notice')}
                </p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
