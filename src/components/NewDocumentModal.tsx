import React from 'react';
import { FilePlus, Sparkles, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBlank: () => void;
  onCreateSample: () => void;
}

export const NewDocumentModal: React.FC<NewDocumentModalProps> = ({
  isOpen,
  onClose,
  onCreateBlank,
  onCreateSample,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <FilePlus className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Buat Dokumen Permohonan Baru</h2>
              <p className="text-xs text-emerald-200">
                Pilih jenis formulir permohonan SKSHHK yang ingin dibuat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info notice */}
        <div className="bg-emerald-50/80 border-b border-emerald-100 px-5 py-3 flex items-center gap-2.5 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            Dokumen aktif Anda saat ini akan otomatis disimpan ke <strong>Riwayat Dokumen</strong> agar data tidak hilang.
          </span>
        </div>

        {/* Options */}
        <div className="p-5 space-y-3.5">
          {/* Option 1: Formulir Kosong (Direkomendasikan) */}
          <div
            onClick={onCreateBlank}
            className="group relative p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50 transition cursor-pointer shadow-xs"
          >
            <div className="absolute top-3.5 right-3.5">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white rounded-full">
                Direkomendasikan
              </span>
            </div>
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 pr-24">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                  Formulir Bersih (Kosong)
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Lembar formulir baru kosong siap diinput. Tanggal hari ini dan data pejabat TPK Talok otomatis terisi, kolom pemohon, kwitansi, dan tabel kapling bersih.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                  <span>Mulai Formulir Bersih →</span>
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Gunakan Data Contoh (Demo) */}
          <div
            onClick={onCreateSample}
            className="group p-4 rounded-xl border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-slate-200 transition">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-slate-900">
                  Gunakan Data Contoh (Demo)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Isi otomatis dengan data contoh pengangkutan kayu (contoh pemohon ABDUL, CV. Berkah Sandhi Abadi) untuk demonstrasi atau latihan pengisian.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                  <span>Muat Data Contoh →</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
