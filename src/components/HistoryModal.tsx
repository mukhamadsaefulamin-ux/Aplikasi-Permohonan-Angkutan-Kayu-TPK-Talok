import React, { useState, useMemo } from 'react';
import { PermohonanData } from '../types';
import {
  X,
  FileText,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  BarChart3,
  List,
  Calendar,
  Truck,
  Tractor,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Plus,
  Eye,
  Building2,
  Sparkles,
  ShieldCheck,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedList: PermohonanData[];
  onSelect: (item: PermohonanData) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onClearAll?: () => void;
  onUpdateItem?: (updatedItem: PermohonanData) => void;
}

interface DailySummary {
  dateKey: string;
  items: PermohonanData[];
  tpk: {
    count: number;
    btg: number;
    m3: number;
  };
  tpkh: {
    count: number;
    btg: number;
    m3: number;
  };
  total: {
    count: number;
    btg: number;
    m3: number;
  };
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  savedList,
  onSelect,
  onDelete,
  onNew,
  onClearAll,
  onUpdateItem,
}) => {
  const [activeTab, setActiveTab] = useState<'rekap' | 'daftar'>('rekap');
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<'semua' | 'TPK' | 'TPKH'>('semua');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Helpers
  const getItemBtg = (item: PermohonanData) =>
    item.items.reduce((sum, i) => sum + (parseInt(String(i.btg)) || 0), 0);

  const getItemM3 = (item: PermohonanData) =>
    item.items.reduce((sum, i) => sum + (parseFloat(String(i.m3)) || 0), 0);

  const isTpkh = (item: PermohonanData): boolean => {
    if (item.lokasiTpk === 'TPKH') return true;
    if (item.lokasiTpk === 'TPK') return false;
    if (item.pejabatSatker && item.pejabatSatker.toUpperCase().includes('TPKH')) return true;
    return false;
  };

  const getDateKey = (item: PermohonanData): string => {
    if (item.tanggalAngkutan && item.tanggalAngkutan.trim()) {
      return item.tanggalAngkutan.trim();
    }
    if (item.tanggalBeritaAcara && item.tanggalBeritaAcara.trim()) {
      return item.tanggalBeritaAcara.trim();
    }
    if (item.updatedAt) {
      try {
        const d = new Date(item.updatedAt);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        }
      } catch {}
    }
    return 'Tanpa Tanggal';
  };

  // Exclude Draft status documents completely from History & Recapitulation
  const nonDraftSavedList = useMemo(() => {
    return savedList.filter((item) => {
      if (!item) return false;
      if (item.status && item.status.trim().toLowerCase() === 'draft') return false;
      return true;
    });
  }, [savedList]);

  // Filtered List based on search and unit filter
  const filteredList = useMemo(() => {
    return nonDraftSavedList.filter((item) => {
      // Unit filter
      const itemIsTpkh = isTpkh(item);
      if (unitFilter === 'TPK' && itemIsTpkh) return false;
      if (unitFilter === 'TPKH' && !itemIsTpkh) return false;

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.namaPemohon?.toLowerCase().includes(q) ||
        item.namaSupir?.toLowerCase().includes(q) ||
        item.nopol?.toLowerCase().includes(q) ||
        item.noSeri?.toLowerCase().includes(q) ||
        item.noDkhp?.toLowerCase().includes(q) ||
        item.namaTujuan?.toLowerCase().includes(q) ||
        item.tanggalAngkutan?.toLowerCase().includes(q)
      );
    });
  }, [nonDraftSavedList, searchQuery, unitFilter]);

  // Grand Totals across all saved non-draft history
  const grandTotals = useMemo(() => {
    let tpkCount = 0, tpkBtg = 0, tpkM3 = 0;
    let tpkhCount = 0, tpkhBtg = 0, tpkhM3 = 0;

    nonDraftSavedList.forEach((item) => {
      const btg = getItemBtg(item);
      const m3 = getItemM3(item);
      if (isTpkh(item)) {
        tpkhCount += 1;
        tpkhBtg += btg;
        tpkhM3 += m3;
      } else {
        tpkCount += 1;
        tpkBtg += btg;
        tpkM3 += m3;
      }
    });

    return {
      tpk: { count: tpkCount, btg: tpkBtg, m3: tpkM3 },
      tpkh: { count: tpkhCount, btg: tpkhBtg, m3: tpkhM3 },
      total: { count: nonDraftSavedList.length, btg: tpkBtg + tpkhBtg, m3: tpkM3 + tpkhM3 },
    };
  }, [nonDraftSavedList]);

  // Daily Breakdown Groups
  const dailyGroups = useMemo<DailySummary[]>(() => {
    const map = new Map<string, DailySummary>();

    filteredList.forEach((item) => {
      const dateKey = getDateKey(item);
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateKey,
          items: [],
          tpk: { count: 0, btg: 0, m3: 0 },
          tpkh: { count: 0, btg: 0, m3: 0 },
          total: { count: 0, btg: 0, m3: 0 },
        });
      }

      const group = map.get(dateKey)!;
      group.items.push(item);

      const btg = getItemBtg(item);
      const m3 = getItemM3(item);
      const tpkhFlag = isTpkh(item);

      if (tpkhFlag) {
        group.tpkh.count += 1;
        group.tpkh.btg += btg;
        group.tpkh.m3 += m3;
      } else {
        group.tpk.count += 1;
        group.tpk.btg += btg;
        group.tpk.m3 += m3;
      }

      group.total.count += 1;
      group.total.btg += btg;
      group.total.m3 += m3;
    });

    return Array.from(map.values());
  }, [filteredList]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(true); // Default Layar Penuh (100% Fullscreen)

  // Toggle Layar Penuh (Browser + CSS Fullscreen)
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const toggleExpandDate = (dateKey: string) => {
    setExpandedDates((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const handleToggleUnit = (item: PermohonanData, newUnit: 'TPK' | 'TPKH') => {
    if (onUpdateItem) {
      onUpdateItem({
        ...item,
        lokasiTpk: newUnit,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col p-0 overflow-hidden animate-in fade-in duration-200'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200'
      }
    >
      <div
        className={
          isFullscreen
            ? 'bg-slate-100 w-full h-full rounded-none shadow-none flex flex-col overflow-hidden'
            : 'bg-slate-100 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] h-[92vh] border border-slate-300 overflow-hidden flex flex-col'
        }
      >
        {/* ========================================================
            MODAL HEADER: SPACIOUS & CRISP DARK BANNER
           ======================================================== */}
        <div className="bg-slate-950 text-white px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 bg-emerald-950 rounded-2xl border border-emerald-700/60 text-emerald-400 shrink-0 shadow-inner">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg sm:text-xl text-white tracking-tight leading-tight">
                  Riwayat & Rekapitulasi Permohonan Angkutan Kayu
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-black bg-emerald-500 text-slate-950 rounded-full">
                  {nonDraftSavedList.length} Dokumen Total
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-black bg-slate-800 text-emerald-300 rounded-full border border-slate-700">
                  {isFullscreen ? 'Mode Layar Penuh (100%)' : 'Mode Windowed'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium truncate">
                Monitoring harian jumlah dokumen, batang, dan kubikasi (m³) untuk unit TPK vs TPKH
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tombol Layar Penuh (Full Screen) */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 text-slate-200 hover:text-white bg-slate-900 border-2 border-slate-700 hover:border-emerald-500 rounded-xl transition cursor-pointer flex items-center gap-2 font-black text-xs shadow-xs"
              title={isFullscreen ? 'Keluar dari Layar Penuh (Mode Normal)' : 'Tampilkan Layar Penuh (100% Fullscreen)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Layar Normal</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl transition hover:bg-slate-800 cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ========================================================
            METRIC SUMMARY MINI CARDS: COMPACT, DENSE & SLEEK
           ======================================================== */}
        <div className="p-2.5 sm:px-4 bg-slate-900 border-b border-slate-800 shrink-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
          {/* Card 1: Angkutan TPK */}
          <div className="bg-emerald-950/80 border border-emerald-700/80 rounded-xl px-3 py-2 flex-1 min-w-[200px] flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase text-emerald-300 tracking-wider">
                  Angkutan TPK
                </span>
                <div className="text-[10px] text-emerald-200/80 font-bold">{grandTotals.tpk.count} Dokumen</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-white tracking-tight">
                {grandTotals.tpk.m3.toFixed(2)} <span className="text-xs font-bold text-emerald-300">m³</span>
              </span>
              <span className="text-[11px] font-black text-emerald-200 bg-emerald-900/80 px-2 py-0.5 rounded ml-1 border border-emerald-700/60 inline-block">
                {grandTotals.tpk.btg} btg
              </span>
            </div>
          </div>

          {/* Card 2: Angkutan TPKH */}
          <div className="bg-amber-950/80 border border-amber-700/80 rounded-xl px-3 py-2 flex-1 min-w-[200px] flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-600 text-white rounded-lg">
                <Tractor className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider">
                  Angkutan TPKH
                </span>
                <div className="text-[10px] text-amber-200/80 font-bold">{grandTotals.tpkh.count} Dokumen</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-white tracking-tight">
                {grandTotals.tpkh.m3.toFixed(2)} <span className="text-xs font-bold text-amber-300">m³</span>
              </span>
              <span className="text-[11px] font-black text-amber-200 bg-amber-900/80 px-2 py-0.5 rounded ml-1 border border-amber-700/60 inline-block">
                {grandTotals.tpkh.btg} btg
              </span>
            </div>
          </div>

          {/* Card 3: Total Akumulatif */}
          <div className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 flex-1 min-w-[200px] flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-800 text-emerald-400 rounded-lg border border-slate-700">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase text-slate-300 tracking-wider">
                  Total Akumulatif
                </span>
                <div className="text-[10px] text-slate-400 font-bold">{grandTotals.total.count} Total Dokumen</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                {grandTotals.total.m3.toFixed(2)} <span className="text-xs font-bold text-emerald-300">m³</span>
              </span>
              <span className="text-[11px] font-black text-slate-200 bg-slate-900 px-2 py-0.5 rounded ml-1 border border-slate-800 inline-block">
                {grandTotals.total.btg} btg
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================
            NAVIGATION TABS, SEARCH & FILTER TOOLBAR
           ======================================================== */}
        <div className="p-3.5 bg-white border-b border-slate-300 flex flex-wrap gap-3 justify-between items-center shrink-0">
          {/* Main View Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/90 p-1.5 rounded-2xl border border-slate-300">
            <button
              type="button"
              onClick={() => setActiveTab('rekap')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'rekap'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Rekap Harian (TPK vs TPKH)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('daftar')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'daftar'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Tabel Daftar Dokumen ({nonDraftSavedList.length})</span>
            </button>
          </div>

          {/* Unit Filter Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
            <span className="text-[11px] font-extrabold text-slate-500 px-2 uppercase">Unit:</span>
            <button
              type="button"
              onClick={() => setUnitFilter('semua')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                unitFilter === 'semua'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua ({nonDraftSavedList.length})
            </button>
            <button
              type="button"
              onClick={() => setUnitFilter('TPK')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                unitFilter === 'TPK'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              TPK ({grandTotals.tpk.count})
            </button>
            <button
              type="button"
              onClick={() => setUnitFilter('TPKH')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                unitFilter === 'TPKH'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-100'
              }`}
            >
              TPKH ({grandTotals.tpkh.count})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {nonDraftSavedList.length > 0 && onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-extrabold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 px-3 py-2 rounded-xl border border-rose-300 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Hapus seluruh riwayat dokumen"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Bersihkan Riwayat</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onNew();
                onClose();
              }}
              className="px-4 py-2 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Baru</span>
            </button>
          </div>
        </div>

        {/* Search Bar Input */}
        <div className="px-5 py-3 bg-slate-200/80 border-b border-slate-300 flex items-center gap-3 shrink-0">
          <Search className="w-5 h-5 text-slate-600 shrink-0 font-black" />
          <input
            type="text"
            placeholder="Pencarian cepat: Ketik tanggal, No. Seri SKSHHK, No. DKHP, nama supir / pemohon, nopol, atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm font-extrabold bg-white text-slate-900 px-3 py-2 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:outline-none placeholder-slate-400 shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-black bg-slate-300 hover:bg-slate-400 text-slate-800 px-3 py-2 rounded-xl transition cursor-pointer shrink-0"
            >
              Bersihkan Search
            </button>
          )}
        </div>

        {/* ========================================================
            MAIN WORKSPACE CONTENT AREA (SCROLLABLE & HIGH-ROOM)
           ======================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-200/50">
          {nonDraftSavedList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8">
              <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h4 className="text-base font-black text-slate-800">Belum Ada Riwayat Dokumen Permohonan</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">
                Setiap dokumen permohonan angkutan yang Anda simpan akan tersimpan di sini dan dikelompokkan secara harian berdasarkan TPK dan TPKH.
              </p>
              <button
                type="button"
                onClick={() => {
                  onNew();
                  onClose();
                }}
                className="mt-4 px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Dokumen Permohonan Pertama</span>
              </button>
            </div>
          ) : activeTab === 'rekap' ? (
            /* ========================================================
               TAB 1: REKAPITULASI HARIAN (TPK VS TPKH)
               ======================================================== */
            dailyGroups.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-300 p-6 text-slate-600 font-bold text-xs">
                Tidak ada data rekap harian yang cocok dengan kata kunci pencarian / filter unit "{searchQuery}".
              </div>
            ) : (
              dailyGroups.map((group) => {
                const isExpanded = expandedDates[group.dateKey] !== false; // Default expanded for great visibility

                return (
                  <div
                    key={group.dateKey}
                    className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden transition-all"
                  >
                    {/* Header Tanggal */}
                    <div
                      onClick={() => toggleExpandDate(group.dateKey)}
                      className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-700/60">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-base text-emerald-300">
                              {group.dateKey}
                            </span>
                            <span className="px-2.5 py-0.5 text-xs font-black bg-slate-800 text-slate-200 rounded-full border border-slate-700">
                              {group.total.count} Dokumen
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-medium">Rekapitulasi Pengangkutan Harian</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs text-slate-300 font-bold block">Total Volume Hari Ini</span>
                          <span className="text-base font-black text-emerald-400">
                            {group.total.m3.toFixed(2)} m³ <span className="text-xs font-bold text-slate-300">({group.total.btg} btg)</span>
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Mini Badges Row */}
                    <div className="p-2 sm:px-3 bg-slate-100 border-b border-slate-300 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                      {/* Box TPK Hari Ini */}
                      <div className="p-2 px-3 bg-emerald-50 border border-emerald-300 rounded-xl flex-1 min-w-[150px] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="text-xs font-black text-emerald-950 uppercase">TPK:</span>
                          <span className="text-xs font-bold bg-emerald-200 text-emerald-950 px-1.5 py-0.2 rounded-md">
                            {group.tpk.count} dok
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-950">{group.tpk.m3.toFixed(2)} m³</span>
                          <span className="text-[11px] font-bold text-emerald-800 ml-1">({group.tpk.btg} btg)</span>
                        </div>
                      </div>

                      {/* Box TPKH Hari Ini */}
                      <div className="p-2 px-3 bg-amber-50 border border-amber-300 rounded-xl flex-1 min-w-[150px] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Tractor className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="text-xs font-black text-amber-950 uppercase">TPKH:</span>
                          <span className="text-xs font-bold bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded-md">
                            {group.tpkh.count} dok
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-amber-950">{group.tpkh.m3.toFixed(2)} m³</span>
                          <span className="text-[11px] font-bold text-amber-800 ml-1">({group.tpkh.btg} btg)</span>
                        </div>
                      </div>

                      {/* Box Total Hari Ini */}
                      <div className="p-2 px-3 bg-white border border-slate-300 rounded-xl flex-1 min-w-[150px] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                          <span className="text-xs font-black text-slate-900 uppercase">Total:</span>
                          <span className="text-xs font-bold bg-slate-200 text-slate-900 px-1.5 py-0.2 rounded-md">
                            {group.total.count} dok
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900">{group.total.m3.toFixed(2)} m³</span>
                          <span className="text-[11px] font-bold text-slate-700 ml-1">({group.total.btg} btg)</span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Document Rows List */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <List className="w-4 h-4 text-emerald-700" />
                          Daftar Dokumen Tanggal {group.dateKey} ({group.items.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpandDate(group.dateKey)}
                          className="text-xs font-extrabold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                        >
                          {isExpanded ? 'Sembunyikan Rincian' : 'Tampilkan Rincian Dokumen'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="space-y-2.5">
                          {group.items.map((item) => {
                            const btg = getItemBtg(item);
                            const m3 = getItemM3(item);
                            const isItemTpkh = isTpkh(item);

                            return (
                              <div
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 hover:bg-emerald-50/80 border-2 border-slate-200 hover:border-emerald-400 rounded-xl transition shadow-2xs"
                              >
                                {/* Left Section: Document No & Badges */}
                                <div className="flex-1 min-w-[280px]">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="font-black text-sm text-slate-900">
                                      {item.noSeri ? `SKSHHK: ${item.noSeri}` : 'Draft Tanpa Nomor Seri'}
                                    </span>

                                    {/* Toggle Unit Button */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleUnit(item, isItemTpkh ? 'TPK' : 'TPKH')
                                      }
                                      className={`px-2.5 py-0.5 text-xs font-black rounded-full transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                        isItemTpkh
                                          ? 'bg-amber-200 text-amber-950 border border-amber-400 hover:bg-amber-300'
                                          : 'bg-emerald-200 text-emerald-950 border border-emerald-400 hover:bg-emerald-300'
                                      }`}
                                      title="Klik untuk mengubah kategori antara TPK dan TPKH"
                                    >
                                      {isItemTpkh ? (
                                        <>
                                          <Tractor className="w-3.5 h-3.5 text-amber-900" /> TPKH
                                        </>
                                      ) : (
                                        <>
                                          <Truck className="w-3.5 h-3.5 text-emerald-900" /> TPK
                                        </>
                                      )}
                                    </button>

                                    {item.noDkhp && (
                                      <span className="text-xs font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md border border-slate-300">
                                        DKHP: {item.noDkhp}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs font-bold text-slate-800 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className="text-slate-950 font-black">{item.namaPemohon || item.namaSupir || 'Pemohon Belum Diisi'}</span>
                                    <span>({item.nopol || 'Nopol -'})</span>
                                    {item.namaTujuan && (
                                      <span className="text-slate-600">
                                        • Tujuan: <strong className="text-slate-900">{item.namaTujuan}</strong>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Right Section: Stat Pill & Action Buttons */}
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                                    <p className="font-black text-slate-950 text-sm">
                                      {m3.toFixed(2)} m³
                                    </p>
                                    <p className="text-xs font-bold text-slate-600">{btg} Batang</p>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => onDelete(item.id)}
                                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-300"
                                      title="Hapus dokumen dari riwayat"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        onSelect(item);
                                        onClose();
                                      }}
                                      className="px-3.5 py-1.5 text-xs font-black text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Buka</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* ========================================================
               TAB 2: TABEL DAFTAR LENGKAP SEMUA DOKUMEN
               ======================================================== */
            <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-black text-sm sm:text-base text-white">
                    Tabel Lengkap Riwayat Dokumen ({filteredList.length} Dokumen Tampil)
                  </h4>
                </div>

                <span className="text-xs font-extrabold text-slate-300">
                  Total Volume: <strong className="text-emerald-400 text-sm font-black">{filteredList.reduce((acc, i) => acc + getItemM3(i), 0).toFixed(2)} m³</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-slate-200 border-b-2 border-slate-700 uppercase tracking-wider text-[11px] font-black">
                      <th className="py-3 px-3.5"># / SKSHHK & DKHP</th>
                      <th className="py-3 px-3">Tanggal</th>
                      <th className="py-3 px-3 text-center">Unit Angkutan</th>
                      <th className="py-3 px-3.5">Pemohon / Driver</th>
                      <th className="py-3 px-3.5">Nopol & Tujuan</th>
                      <th className="py-3 px-3 text-right">Volume (m³)</th>
                      <th className="py-3 px-3 text-right">Batang</th>
                      <th className="py-3 px-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold text-slate-900">
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-500 font-bold">
                          Tidak ada dokumen yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((item, idx) => {
                        const totalBtg = getItemBtg(item);
                        const totalM3 = getItemM3(item);
                        const isItemTpkh = isTpkh(item);

                        return (
                          <tr key={item.id} className="hover:bg-emerald-50/60 transition">
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="text-slate-400 mr-2 font-mono text-[11px]">{idx + 1}.</span>
                              <strong className="text-slate-950 font-extrabold text-xs">
                                {item.noSeri || 'Draft Tanpa Seri'}
                              </strong>
                              {item.noDkhp && (
                                <span className="block text-[11px] text-slate-600 font-mono">
                                  DKHP: {item.noDkhp}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                              {item.tanggalAngkutan || '-'}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleToggleUnit(item, isItemTpkh ? 'TPK' : 'TPKH')}
                                className={`px-2.5 py-1 text-[11px] font-black rounded-full transition cursor-pointer inline-flex items-center gap-1 ${
                                  isItemTpkh
                                    ? 'bg-amber-100 text-amber-950 border border-amber-400 hover:bg-amber-200'
                                    : 'bg-emerald-100 text-emerald-950 border border-emerald-400 hover:bg-emerald-200'
                                }`}
                                title="Klik untuk mengubah unit TPK / TPKH"
                              >
                                {isItemTpkh ? (
                                  <>
                                    <Tractor className="w-3 h-3 text-amber-800" /> TPKH
                                  </>
                                ) : (
                                  <>
                                    <Truck className="w-3 h-3 text-emerald-800" /> TPK
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-3.5 text-slate-900">
                              <span className="font-extrabold block">{item.namaPemohon || item.namaSupir || '-'}</span>
                              <span className="text-[11px] text-slate-500 font-medium">{item.pekerjaanPemohon || 'Pengemudi'}</span>
                            </td>
                            <td className="py-3 px-3.5 text-slate-800">
                              <span className="font-extrabold text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block mb-0.5">
                                {item.nopol || 'G -'}
                              </span>
                              <span className="block text-[11px] text-slate-600 truncate max-w-[200px]">
                                {item.namaTujuan || item.namaPenerima || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-black text-slate-950 whitespace-nowrap text-sm">
                              {totalM3.toFixed(2)} m³
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-slate-800 whitespace-nowrap">
                              {totalBtg} btg
                            </td>
                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onDelete(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                                  title="Hapus riwayat dokumen ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelect(item);
                                    onClose();
                                  }}
                                  className="px-3 py-1 text-xs font-black text-emerald-950 bg-emerald-400 hover:bg-emerald-300 border border-emerald-500 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Buka</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            MODAL FOOTER: TIPS & CLOSE
           ======================================================== */}
        <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-bold">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Kategori unit (TPK / TPKH) dapat diubah kapan saja dengan mengeklik tombol badge unit untuk rekapitulasi harian yang presisi.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-black text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition shadow-md cursor-pointer ml-auto"
          >
            Tutup Modal
          </button>
        </div>
      </div>
    </div>
  );
};
