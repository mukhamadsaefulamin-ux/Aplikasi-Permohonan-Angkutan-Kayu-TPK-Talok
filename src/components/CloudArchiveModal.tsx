import React from 'react';
import { DriveFileInfo } from '../services/googleWorkspace';
import { X, ExternalLink, HardDrive, FileText, Folder, RefreshCw, UploadCloud } from 'lucide-react';

interface CloudArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: DriveFileInfo[];
  isLoading: boolean;
  onRefresh: () => void;
  onUploadCurrentDoc: () => void;
  isUploading: boolean;
  permohonanSheetUrl?: string;
  persediaanSheetUrl?: string;
  userEmail?: string;
}

export const CloudArchiveModal: React.FC<CloudArchiveModalProps> = ({
  isOpen,
  onClose,
  files,
  isLoading,
  onRefresh,
  onUploadCurrentDoc,
  isUploading,
  permohonanSheetUrl,
  persediaanSheetUrl,
  userEmail,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-700/80 rounded-xl">
              <HardDrive className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Penyimpanan Cloud Google Drive & Sheets
              </h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                Akun terhubung: <span className="font-medium">{userEmail || 'Google User'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Links to Google Sheets */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex flex-wrap gap-2 text-xs">
            {permohonanSheetUrl && (
              <a
                href={permohonanSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 font-semibold rounded-lg hover:bg-emerald-50 transition shadow-2xs"
              >
                <span>📊 Buka Register Permohonan (Sheets)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {persediaanSheetUrl && (
              <a
                href={persediaanSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 font-semibold rounded-lg hover:bg-emerald-50 transition shadow-2xs"
              >
                <span>📋 Buka Persediaan Kapling (Sheets)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onUploadCurrentDoc}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs disabled:opacity-50"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
              {isUploading ? 'Mengunggah...' : 'Arsipkan Dokumen Aktif ke Drive'}
            </button>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Segarkan daftar arsip"
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* File List in Google Drive */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            <Folder className="w-4 h-4 text-emerald-600" />
            <span>Folder: TPK Talok - Arsip SKSHHK & Angkutan Kayu ({files.length} file)</span>
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-slate-400 text-sm flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Memuat data dari Google Drive...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <HardDrive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Belum ada file diarsipkan di Drive</p>
              <p className="text-xs text-slate-400 mt-1">
                Klik tombol "Arsipkan Dokumen Aktif ke Drive" untuk menyimpan salinan PDF dokumen ini.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 rounded-xl transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-900">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Disimpan:{' '}
                        {file.createdTime
                          ? new Date(file.createdTime).toLocaleString('id-ID')
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-600 hover:text-white transition shadow-2xs flex-shrink-0 ml-3"
                    >
                      <span>Buka</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
