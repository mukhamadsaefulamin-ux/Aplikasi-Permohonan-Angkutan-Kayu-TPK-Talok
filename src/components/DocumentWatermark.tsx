import React, { useState, useEffect } from 'react';
import { OFFICIAL_PERHUTANI_EMBLEM_BASE64 } from '../assets/defaultLogo';
import { STORAGE_KEY_CUSTOM_LOGO } from './PerhutaniLogo';

export const STORAGE_KEY_WATERMARK_ENABLE = 'tpk_watermark_enabled';
export const STORAGE_KEY_WATERMARK_OPACITY = 'tpk_watermark_opacity';
export const STORAGE_KEY_WATERMARK_STYLE = 'tpk_watermark_style'; // 'clean' | 'ribbon' | 'stamp'

export interface DocumentWatermarkProps {
  variant?: 'portrait' | 'landscape';
  customText?: string;
  forceShow?: boolean;
}

export const DocumentWatermark: React.FC<DocumentWatermarkProps> = ({
  variant = 'portrait',
  customText = 'PERUM PERHUTANI • KPH PEKALONGAN BARAT • TPK TALOK',
  forceShow = false,
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATERMARK_ENABLE);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [opacityPercent, setOpacityPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATERMARK_OPACITY);
      return saved ? parseInt(saved, 10) : 6; // Default 6% for ultra-subtle, clean look
    } catch {
      return 6;
    }
  });

  const [wmStyle, setWmStyle] = useState<'clean' | 'ribbon' | 'stamp'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATERMARK_STYLE);
      return (saved as any) || 'clean'; // Default clean single emblem
    } catch {
      return 'clean';
    }
  });

  const [logoSrc, setLogoSrc] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CUSTOM_LOGO) || OFFICIAL_PERHUTANI_EMBLEM_BASE64;
    } catch {
      return OFFICIAL_PERHUTANI_EMBLEM_BASE64;
    }
  });

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const en = localStorage.getItem(STORAGE_KEY_WATERMARK_ENABLE);
        if (en !== null) setIsEnabled(en === 'true');
        const op = localStorage.getItem(STORAGE_KEY_WATERMARK_OPACITY);
        if (op) setOpacityPercent(parseInt(op, 10));
        const st = localStorage.getItem(STORAGE_KEY_WATERMARK_STYLE);
        if (st) setWmStyle(st as any);
        const lg = localStorage.getItem(STORAGE_KEY_CUSTOM_LOGO);
        if (lg) setLogoSrc(lg);
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tpk_watermark_update', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tpk_watermark_update', handleStorageChange);
    };
  }, []);

  if (!isEnabled && !forceShow) {
    return null;
  }

  const opacityDecimal = (opacityPercent / 100).toFixed(2);
  const isLandscape = variant === 'landscape';

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 flex flex-col items-center justify-center"
      aria-hidden="true"
      style={{
        opacity: opacityDecimal,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Optional Subtle Repeating Ribbons (Only if 'ribbon' style active) */}
      {wmStyle === 'ribbon' && (
        <div className="absolute inset-0 flex flex-col justify-around rotate-[-20deg] scale-110 opacity-50">
          {[...Array(isLandscape ? 5 : 7)].map((_, idx) => (
            <div
              key={`wm-ribbon-${idx}`}
              className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-950 py-1 flex items-center justify-center gap-8"
            >
              <span>{customText}</span>
              <span>•</span>
              <span>DOKUMEN TERVERIFIKASI TPK TALOK</span>
              <span>•</span>
              <span>{customText}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Center Emblem Watermark - Clean & Elegant */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
        <img
          src={logoSrc}
          alt="Watermark Perhutani"
          className={`object-contain ${
            isLandscape ? 'w-[260px] h-[260px]' : 'w-[230px] h-[230px]'
          }`}
          loading="eager"
        />
        <div className="mt-2 font-bold text-slate-900 uppercase tracking-[0.25em] text-xs">
          PERUM PERHUTANI
        </div>
        <div className="text-[10px] font-semibold text-emerald-950 uppercase tracking-[0.15em]">
          TPK TALOK — KPH PEKALONGAN BARAT
        </div>
        {wmStyle === 'stamp' && (
          <div className="text-[9px] font-medium text-slate-800 uppercase tracking-[0.1em] mt-0.5 border-t border-slate-600/20 pt-1 px-3">
            DOKUMEN RESMI TPK TALOK
          </div>
        )}
      </div>
    </div>
  );
};
