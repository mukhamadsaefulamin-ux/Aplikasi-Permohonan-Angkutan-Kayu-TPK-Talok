import React, { useState, useEffect } from 'react';
import { getAccessToken } from '../services/googleAuth';
import { fetchDriveFileAsDataUrl } from '../services/googleWorkspace';
import {
  OFFICIAL_PERHUTANI_EMBLEM_BASE64,
  OFFICIAL_PERHUTANI_LOGO_BASE64,
  OFFICIAL_PERHUTANI_LOGO_WHITE_BASE64,
} from '../assets/defaultLogo';

export interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
  invertText?: boolean;
  variant?: 'emblem' | 'full';
}

export const PERHUTANI_DRIVE_FILE_ID = '1WSNGuPb2DTKe5-S7htIVuNb9QczacZzc';
export const PERHUTANI_DRIVE_URL = 'https://drive.google.com/file/d/1WSNGuPb2DTKe5-S7htIVuNb9QczacZzc/view?usp=sharing';
export const STORAGE_KEY_CUSTOM_LOGO = 'tpk_perhutani_custom_logo';

export const PerhutaniLogo: React.FC<LogoProps> = ({
  className = '',
  size = 56,
  showText = true,
  textClassName = '',
  invertText = false,
  variant = 'emblem',
}) => {
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CUSTOM_LOGO);
    } catch {
      return null;
    }
  });

  const [imgError, setImgError] = useState(false);

  // Background fetch via Google Drive API if OAuth token is available and no custom logo is stored
  useEffect(() => {
    if (customLogo) return;

    let isMounted = true;
    getAccessToken()
      .then((token) => {
        if (token && isMounted) {
          return fetchDriveFileAsDataUrl(PERHUTANI_DRIVE_FILE_ID, token);
        }
        return null;
      })
      .then((base64) => {
        if (base64 && isMounted) {
          try {
            localStorage.setItem(STORAGE_KEY_CUSTOM_LOGO, base64);
            setCustomLogo(base64);
            setImgError(false);
          } catch (e) {
            console.warn('Failed to cache logo in localStorage:', e);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [customLogo]);

  // Listen for storage events in case logo is updated via LogoSettingsModal
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_CUSTOM_LOGO) {
        setCustomLogo(e.newValue);
        setImgError(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Determine which image source to display:
  // 1. If custom logo is provided and didn't error, use it
  // 2. Otherwise use the official Perum Perhutani high-res base64 assets
  let activeSrc: string;
  if (customLogo && !imgError) {
    activeSrc = customLogo;
  } else if (variant === 'full') {
    activeSrc = invertText
      ? OFFICIAL_PERHUTANI_LOGO_WHITE_BASE64
      : OFFICIAL_PERHUTANI_LOGO_BASE64;
  } else {
    activeSrc = OFFICIAL_PERHUTANI_EMBLEM_BASE64;
  }

  const handleImageError = () => {
    if (customLogo) {
      // If a custom URL failed (e.g. cross-origin restriction), revert to official asset
      setImgError(true);
      try {
        localStorage.removeItem(STORAGE_KEY_CUSTOM_LOGO);
      } catch {}
      setCustomLogo(null);
    }
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Emblem / Logo container */}
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <img
          src={activeSrc}
          alt="Logo Perum Perhutani"
          onError={handleImageError}
          className="w-full h-full object-contain filter drop-shadow-2xs select-none"
          loading="eager"
          decoding="sync"
        />
      </div>

      {/* Official Typography for Letterhead / Kop Surat */}
      {showText && (
        <div className={`flex flex-col text-left leading-tight ${textClassName}`}>
          <span
            className={`font-extrabold tracking-wider text-[13px] uppercase font-sans ${
              invertText ? 'text-white' : 'text-[#166534]'
            }`}
          >
            PERUM PERHUTANI
          </span>
          <span
            className={`text-[10px] font-bold tracking-wide ${
              invertText ? 'text-emerald-100' : 'text-slate-700'
            }`}
          >
            KPH PEKALONGAN BARAT
          </span>
          <span
            className={`text-[9.5px] font-semibold tracking-wider ${
              invertText ? 'text-emerald-200' : 'text-slate-500'
            }`}
          >
            TPK TALOK
          </span>
        </div>
      )}
    </div>
  );
};
