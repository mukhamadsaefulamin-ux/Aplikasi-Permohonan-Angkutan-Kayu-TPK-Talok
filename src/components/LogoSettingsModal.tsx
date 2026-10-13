import React, { useState } from 'react';
import {
  PERHUTANI_DRIVE_FILE_ID,
  PERHUTANI_DRIVE_URL,
  STORAGE_KEY_CUSTOM_LOGO,
  PerhutaniLogo
} from './PerhutaniLogo';
import {
  STORAGE_KEY_WATERMARK_ENABLE,
  STORAGE_KEY_WATERMARK_OPACITY,
  STORAGE_KEY_WATERMARK_STYLE
} from './DocumentWatermark';
import { getAccessToken } from '../services/googleAuth';
import { fetchDriveFileAsDataUrl } from '../services/googleWorkspace';
import {
  OFFICIAL_PERHUTANI_EMBLEM_BASE64,
  OFFICIAL_PERHUTANI_LOGO_BASE64
} from '../assets/defaultLogo';
import {
  X,
  Image,
  Upload,
  RefreshCw,
  ExternalLink,
  Check,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  EyeOff
} from 'lucide-react';

interface LogoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoSettingsModal: React.FC<LogoSettingsModalProps> = ({ isOpen, onClose }) => {
  const [driveUrl, setDriveUrl] = useState(PERHUTANI_DRIVE_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Watermark Settings State
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATERMARK_ENABLE);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATERMARK_OPACITY);
      return saved ? parseInt(saved, 10) : 6;
    } catch {
      return 6;
    }
  });

  const [watermarkStyle, setWatermarkStyle] = useState<'clean' | 'ribbon' | 'stamp'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATERMARK_STYLE);
      return (saved as any) || 'clean';
    } catch {
      return 'clean';
    }
  });

  if (!isOpen) return null;

  const dispatchWatermarkUpdate = () => {
    window.dispatchEvent(new Event('tpk_watermark_update'));
  };

  const handleToggleWatermark = (enabled: boolean) => {
    setWatermarkEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_WATERMARK_ENABLE, enabled ? 'true' : 'false');
      dispatchWatermarkUpdate();
      setMessage({
        text: enabled
          ? 'Watermark Logo Perhutani diaktifkan pada semua dokumen!'
          : 'Watermark Logo Perhutani dinonaktifkan.',
        type: 'info'
      });
    } catch {}
  };

  const handleChangeOpacity = (opacity: number) => {
    setWatermarkOpacity(opacity);
    try {
      localStorage.setItem(STORAGE_KEY_WATERMARK_OPACITY, opacity.toString());
      dispatchWatermarkUpdate();
    } catch {}
  };

  const handleChangeStyle = (style: 'clean' | 'ribbon' | 'stamp') => {
    setWatermarkStyle(style);
    try {
      localStorage.setItem(STORAGE_KEY_WATERMARK_STYLE, style);
      dispatchWatermarkUpdate();
      setMessage({
        text: style === 'clean'
          ? 'Gaya Watermark diubah ke "Clean & Halus" (Rekomendasi - Tidak acak-acakan).'
          : style === 'ribbon'
          ? 'Gaya Watermark diubah ke "Pita Keamanan Diagonal".'
          : 'Gaya Watermark diubah ke "Stempel Resmi".',
        type: 'success'
      });
    } catch {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ text: 'File harus berupa gambar (PNG, JPG, SVG, WebP)', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64 = reader.result as string;
        localStorage.setItem(STORAGE_KEY_CUSTOM_LOGO, base64);
        window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_CUSTOM_LOGO, newValue: base64 }));
        dispatchWatermarkUpdate();
        setMessage({ text: 'Logo berhasil diperbarui dari file lokal!', type: 'success' });
      } catch (err: any) {
        setMessage({ text: `Gagal menyimpan logo: ${err.message}`, type: 'error' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefault = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_LOGO);
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_CUSTOM_LOGO, newValue: null }));
      dispatchWatermarkUpdate();
      setMessage({ text: 'Logo dikembalikan ke Logo Resmi Perum Perhutani standar.', type: 'info' });
    } catch {}
  };

  const handleUseOfficialHorizontalLogo = () => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_LOGO, OFFICIAL_PERHUTANI_LOGO_BASE64);
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_CUSTOM_LOGO, newValue: OFFICIAL_PERHUTANI_LOGO_BASE64 }));
      dispatchWatermarkUpdate();
      setMessage({ text: 'Logo resmi Perhutani (versi banner) berhasil diterapkan.', type: 'success' });
    } catch {}
  };

  const handleApplyDriveUrl = async () => {
    if (!driveUrl.trim()) return;

    const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    const fileId = match ? match[1] : driveUrl.trim();

    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (token) {
        const base64 = await fetchDriveFileAsDataUrl(fileId, token);
        if (base64) {
          localStorage.setItem(STORAGE_KEY_CUSTOM_LOGO, base64);
          window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_CUSTOM_LOGO, newValue: base64 }));
          dispatchWatermarkUpdate();
          setMessage({ text: 'Berhasil mengunduh dan menerapkan logo dari Google Drive!', type: 'success' });
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('OAuth fetch failed:', e);
    }

    const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    localStorage.setItem(STORAGE_KEY_CUSTOM_LOGO, directUrl);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_CUSTOM_LOGO, newValue: directUrl }));
    dispatchWatermarkUpdate();
    setMessage({
      text: 'Tautan Google Drive diterapkan. Jika belum terlihat, pastikan hak akses file diatur ke "Siapa saja yang memiliki link" atau gunakan tombol "Unggah File Gambar".',
      type: 'info'
    });
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <h3 className="font-bold text-base">Pengaturan Logo & Watermark</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-emerald-800 transition text-emerald-200 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 text-xs">
          {message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : message.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* SECTION 1: WATERMARK ANTI-PEMALSUAN DOKUMEN */}
          <div className="bg-emerald-950/5 border border-emerald-800/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                  Watermark Logo Perhutani
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={watermarkEnabled}
                  onChange={(e) => handleToggleWatermark(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Tampilkan cetakan watermark latar belakang logo Perhutani pada setiap halaman dokumen. Anda dapat memilih gaya rapi & halus agar isi dokumen tetap bersih dan sangat mudah dibaca.
            </p>

            {watermarkEnabled && (
              <div className="pt-3 border-t border-emerald-800/10 space-y-3">
                {/* Style Options */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Pilih Gaya Tampilan Watermark:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangeStyle('clean')}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center text-center gap-1 cursor-pointer ${
                        watermarkStyle === 'clean'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Clean & Halus (Rekomendasi)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChangeStyle('ribbon')}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center text-center gap-1 cursor-pointer ${
                        watermarkStyle === 'ribbon'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Pita Keamanan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleWatermark(false)}
                      className="p-2 rounded-xl text-[11px] font-bold border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex flex-col items-center text-center gap-1 cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4 text-slate-400" />
                      <span>Tanpa Watermark</span>
                    </button>
                  </div>
                </div>

                {/* Opacity Control */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between font-semibold text-[11px] text-slate-700">
                    <span className="flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                      Kepekatan Watermark:
                    </span>
                    <span className="font-bold text-emerald-800">{watermarkOpacity}%</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 font-bold">3% (Halus)</span>
                    <input
                      type="range"
                      min="3"
                      max="25"
                      step="1"
                      value={watermarkOpacity}
                      onChange={(e) => handleChangeOpacity(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">25% (Pekat)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Logo Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
              Pratinjau Logo Utama Kop Surat
            </p>
            <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 flex items-center justify-center">
              <PerhutaniLogo size={60} showText={true} />
            </div>
          </div>

          {/* Google Drive Link Info */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tautan Google Drive Logo Perhutani
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="flex-1 text-xs px-3 py-2 text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleApplyDriveUrl}
                disabled={isLoading}
                className="px-3 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                {isLoading ? 'Memuat...' : 'Terapkan'}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
              <span>File ID: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">{PERHUTANI_DRIVE_FILE_ID}</code></span>
              <a
                href={PERHUTANI_DRIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-medium"
              >
                Buka di Google Drive <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center">
            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                id="modal-logo-file-input"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <label
                htmlFor="modal-logo-file-input"
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Unggah File Gambar
              </label>

              <button
                type="button"
                onClick={handleUseOfficialHorizontalLogo}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Logo Banner
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Reset ke Logo Resmi Perhutani Standar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset ke Standar
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition cursor-pointer"
          >
            Selesai & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
