import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { BRANDING } from '../config/brand';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  stacked?: boolean;
  className?: string;
}

/**
 * Official Dera Apna Brand Logo & Wordmark (Sections 1, 2, 3, 108)
 * - Uses canonical local asset (/brand/dera-apna-logo.png) via src/config/brand.ts
 * - Falls back to centralized Cloudinary source only if local asset fails
 * - Dera = NAVY BLUE (#0F2942)
 * - Apna = SKY BLUE (#0EA5E9)
 * - Tagline: ----- Find Your Perfect Stay ----- (thin horizontal lines on both sides)
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = false,
  stacked = false,
  className = '',
}) => {
  const [activeSrc, setActiveSrc] = useState<string>(BRANDING.logoUrl);
  const [imageError, setImageError] = useState(false);

  const heightClasses = {
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-20',
    xl: 'h-28 sm:h-36',
  }[size];

  const titleClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl sm:text-5xl',
  }[size];

  return (
    <div
      className={`inline-flex ${
        stacked ? 'flex-col items-center text-center gap-3' : 'items-center gap-3 text-left'
      } ${className}`}
    >
      {!imageError && activeSrc ? (
        <img
          src={activeSrc}
          alt={`${BRANDING.appName} Official Logo`}
          referrerPolicy="no-referrer"
          onError={() => {
            if (activeSrc !== BRANDING.fallbackLogoUrl && BRANDING.fallbackLogoUrl) {
              setActiveSrc(BRANDING.fallbackLogoUrl);
              return;
            }
            console.error(
              `[BrandLogo] Failed to load primary logo asset from configured path: ${activeSrc}`
            );
            setImageError(true);
          }}
          className={`${heightClasses} w-auto object-contain shrink-0 select-none`}
        />
      ) : (
        <div
          role="img"
          aria-label={`${BRANDING.appName} Fallback Brand Emblem`}
          className={`${heightClasses} aspect-square rounded-lg border border-sky-500/30 bg-sky-500/10 flex items-center justify-center text-sky-600 shrink-0 px-2`}
        >
          <Building2 className="w-6 h-6" />
        </div>
      )}
      <div className={`flex flex-col ${stacked ? 'items-center text-center' : 'text-left'}`}>
        {/* Section 2: Dera = NAVY BLUE, Apna = SKY BLUE */}
        <span className={`font-display font-bold tracking-tight leading-none ${titleClasses}`}>
          <span className="text-[#0F2942] dark:text-[#FAF5F0]">Dera</span>{' '}
          <span className="text-[#0EA5E9]">Apna</span>
        </span>

        {/* Section 3: Tagline with thin horizontal decorative lines on both sides */}
        {showTagline && (
          <div className="inline-flex items-center gap-2.5 mt-2">
            <span className="h-[1px] w-6 sm:w-10 bg-slate-300 dark:bg-[#7A3E42]" aria-hidden="true" />
            <span className="text-[11px] sm:text-xs font-normal tracking-wide text-slate-600 dark:text-[#E6CCB2] whitespace-nowrap">
              {BRANDING.tagline}
            </span>
            <span className="h-[1px] w-6 sm:w-10 bg-slate-300 dark:bg-[#7A3E42]" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
};
