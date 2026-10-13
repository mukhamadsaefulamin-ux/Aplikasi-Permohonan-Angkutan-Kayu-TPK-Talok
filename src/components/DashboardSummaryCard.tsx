import React from 'react';
import { PermohonanData, PihakKetigaItem } from '../types';
import { getKapasitasKendaraan } from '../data/masterData';
import {
  Layers,
  Truck,
  AlertTriangle,
  CheckCircle2,
  TreePine,
  Maximize2,
  FileText
} from 'lucide-react';

interface DashboardSummaryCardProps {
  activeTab: 'angkutan' | 'pihak_ketiga' | 'supir' | 'perusahaan';
  permohonan: PermohonanData;
  inventoryItems: PihakKetigaItem[];
  onOpenSisaReport?: () => void;
}

export const DashboardSummaryCard: React.FC<DashboardSummaryCardProps> = ({
  activeTab,
  permohonan,
  inventoryItems,
  onOpenSisaReport,
}) => {
  if (activeTab === 'supir' || activeTab === 'perusahaan') return null;
  // Calculations for Permohonan
  const totalM3 = permohonan.items.reduce(
    (sum, item) => sum + (parseFloat(String(item.m3)) || 0),
    0
  );
  const totalBtg = permohonan.items.reduce(
    (sum, item) => sum + (parseInt(String(item.btg)) || 0),
    0
  );
  const totalKapling = permohonan.items.filter((item) => item.noKapling.trim() !== '').length;

  const kapasitasInfo = getKapasitasKendaraan(permohonan.jenisKendaraan);
  const isOverload = Boolean(kapasitasInfo && totalM3 > kapasitasInfo.maxM3);
  const excessM3 = isOverload && kapasitasInfo ? totalM3 - kapasitasInfo.maxM3 : 0;
  const sisaM3 = kapasitasInfo && !isOverload ? kapasitasInfo.maxM3 - totalM3 : 0;
  const usagePercent = kapasitasInfo ? Math.min(Math.round((totalM3 / kapasitasInfo.maxM3) * 100), 999) : 0;

  // Calculations for Persediaan Pihak Ketiga
  const totalInventoryBtg = inventoryItems.reduce(
    (sum, item) => sum + (parseInt(String(item.batang)) || 0),
    0
  );
  const totalInventoryM3 = inventoryItems.reduce(
    (sum, item) => sum + (parseFloat(String(item.volume)) || 0),
    0
  );

  return (
    <div className="no-print w-full max-w-[215.9mm] lg:max-w-6xl mb-4 animate-in fade-in duration-200">
      {activeTab === 'angkutan' ? (
        /* ==================== DASHBOARD RINGKASAN PERMOHONAN ==================== */
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
          {/* Top Label */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                  Ringkasan Volume Akumulatif Dokumen Aktif
                </h2>
                <p className="text-[11px] text-slate-500">
                  Pemantauan kubikasi real-time untuk SKSHHK:{' '}
                  <span className="font-semibold text-emerald-800">
                    {permohonan.noSeri || 'Draft Baru'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg text-[11px]">
                Kayu: <strong className="text-slate-900">{permohonan.jenisKayu || 'PINUS'}</strong>
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-semibold rounded-lg border border-emerald-200 text-[11px]">
                Status:{' '}
                <strong className="text-emerald-900">{permohonan.status || 'Draft'}</strong>
              </span>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Card 1: Total Kubikasi Akumulatif */}
            <div
              className={`p-4 rounded-xl border transition relative overflow-hidden ${
                isOverload
                  ? 'bg-gradient-to-br from-amber-50 to-red-50/60 border-red-300'
                  : 'bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-700" />
                  Total Volume Akumulatif
                </span>
                {isOverload ? (
                  <span className="px-2 py-0.5 text-[10px] font-black bg-red-600 text-white rounded-full">
                    OVERLOAD
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                    REAL-TIME
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    isOverload ? 'text-red-700' : 'text-emerald-900'
                  }`}
                >
                  {totalM3.toFixed(2)}
                </span>
                <span className="text-sm font-extrabold text-slate-500">M³</span>
              </div>

              <p className="text-[11px] text-slate-600 mt-1 font-medium">
                {totalM3 > 0
                  ? `Akumulasi dari ${permohonan.items.length} baris kapling yang diinput`
                  : 'Belum ada volume yang dimasukkan'}
              </p>

              {/* Decorative accent */}
              <div
                className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full opacity-10 pointer-events-none ${
                  isOverload ? 'bg-red-500' : 'bg-emerald-600'
                }`}
              />
            </div>

            {/* Card 2: Total Batang & Kapling */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-700" />
                  Total Jumlah Batang
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-800 rounded-full">
                  {totalKapling || permohonan.items.length} Kapling
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {totalBtg.toLocaleString('id-ID')}
                </span>
                <span className="text-sm font-extrabold text-slate-500">Batang</span>
              </div>

              <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-2">
                <span>Rata-rata:</span>
                <strong className="text-slate-800">
                  {totalBtg > 0 ? (totalM3 / totalBtg).toFixed(2) : '0.00'} m³/btg
                </strong>
              </div>
            </div>

            {/* Card 3: Monitor Kapasitas Armada */}
            <div
              className={`p-4 rounded-xl border relative sm:col-span-2 lg:col-span-1 ${
                isOverload
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-700" />
                  Kapasitas Armada: {permohonan.jenisKendaraan || '-'}
                </span>
                {kapasitasInfo && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      isOverload
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {isOverload ? (
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        Overload +{excessM3.toFixed(2)} m³
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        Sisa {sisaM3.toFixed(2)} m³
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {kapasitasInfo ? (
                <div className="mt-2.5">
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-600 font-medium">
                      Penggunaan:{' '}
                      <strong className={isOverload ? 'text-red-700' : 'text-slate-900'}>
                        {totalM3.toFixed(2)} / {kapasitasInfo.maxM3.toFixed(2)} m³
                      </strong>
                    </span>
                    <span
                      className={`font-black ${
                        isOverload ? 'text-red-700' : 'text-emerald-800'
                      }`}
                    >
                      {usagePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isOverload ? 'bg-red-600' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    Supir: <strong>{permohonan.namaSupir || '-'}</strong> ({permohonan.nopol || '-'})
                  </p>
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-500">
                  <p>Pilih jenis kendaraan pada formulir untuk memantau batas kapasitas aman.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ==================== DASHBOARD RINGKASAN PERSEDIAAN ==================== */
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <TreePine className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                  Ringkasan Data Persediaan Kayu Pihak Ketiga
                </h2>
                <p className="text-[11px] text-slate-500">
                  Total seluruh kapling persediaan kayu terdaftar di TPK Talok
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onOpenSisaReport && (
                <button
                  type="button"
                  onClick={onOpenSisaReport}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <TreePine className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Buka Laporan Sisa Persediaan</span>
                </button>
              )}
              <span className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 font-bold rounded-xl border border-emerald-200 text-xs">
                {inventoryItems.length} Kapling
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Volume Persediaan
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-900">
                  {totalInventoryM3.toFixed(2)}
                </span>
                <span className="text-sm font-extrabold text-slate-500">M³</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">Akumulasi seluruh kapling pihak ketiga</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Jumlah Batang
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {totalInventoryBtg.toLocaleString('id-ID')}
                </span>
                <span className="text-sm font-extrabold text-slate-500">Batang</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">Jumlah kayu bulat siap angkut</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Jumlah Kapling Aktif
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {inventoryItems.length}
                </span>
                <span className="text-sm font-extrabold text-slate-500">Kapling</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">Dapat dipilih pada formulir angkutan</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
