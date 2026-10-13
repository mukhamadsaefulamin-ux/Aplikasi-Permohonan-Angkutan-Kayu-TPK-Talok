import React, { useState, useMemo } from 'react';
import { PihakKetigaItem, PermohonanData } from '../types';
import { getUsedKaplingsMap, UsedKaplingInfo } from '../utils/autoFillHelpers';
import { PerhutaniLogo } from './PerhutaniLogo';
import {
  X,
  Search,
  Download,
  Printer,
  TreePine,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Truck,
  Filter,
  PieChart,
  Building2,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  Maximize2,
  Minimize2
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface SisaPersediaanModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItems: PihakKetigaItem[];
  savedHistory: PermohonanData[];
  currentPermohonan?: PermohonanData;
  onUseForPermohonan?: (item: PihakKetigaItem) => void;
}

export const SisaPersediaanModal: React.FC<SisaPersediaanModalProps> = ({
  isOpen,
  onClose,
  inventoryItems,
  savedHistory,
  currentPermohonan,
  onUseForPermohonan,
}) => {
  const [activeTab, setActiveTab] = useState<'daftar' | 'rekap_pembeli' | 'rekap_sortimen'>('daftar');
  const [statusFilter, setStatusFilter] = useState<'sisa' | 'diangkut' | 'semua'>('sisa');
  const [pembeliFilter, setPembeliFilter] = useState<string>('semua');
  const [sortimenFilter, setSortimenFilter] = useState<string>('semua');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Nama & NIP/REG Pejabat TPK Talok (Dapat Diubah Langsung)
  const [petugasNama, setPetugasNama] = useState<string>('SLAMET RIYADI');
  const [petugasReg, setPetugasReg] = useState<string>('23230001482');
  const [kepalaNama, setKepalaNama] = useState<string>('NURDIN HAMDANI');
  const [kepalaReg, setKepalaReg] = useState<string>('23230001226');

  // Mapping kapling terpakai
  const usedKaplingsMap = useMemo(() => {
    return getUsedKaplingsMap(savedHistory, undefined, currentPermohonan);
  }, [savedHistory, currentPermohonan]);

  // Evaluasi status setiap item persediaan
  const itemsWithStatus = useMemo(() => {
    return inventoryItems.map((item) => {
      const kKey = item.noKapling ? item.noKapling.trim().toLowerCase() : '';
      let usage = kKey ? usedKaplingsMap.get(kKey) : null;

      // Pencarian tambahan berdasarkan nomor digit atau kode bersih
      if (!usage && item.noKapling) {
        const clean = item.noKapling.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (clean) usage = usedKaplingsMap.get(clean) || null;
        if (!usage) {
          const numMatch = item.noKapling.match(/\b\d{3,6}\b/);
          if (numMatch) {
            usage = usedKaplingsMap.get(numMatch[0]) || null;
          }
        }
      }

      return {
        ...item,
        isUsed: Boolean(usage),
        usageInfo: usage || null,
      };
    });
  }, [inventoryItems, usedKaplingsMap]);

  // Data terfilter berdasarkan status, pembeli, sortimen, dan query pencarian
  const filteredItems = useMemo(() => {
    return itemsWithStatus.filter((item) => {
      // Filter Status
      if (statusFilter === 'sisa' && item.isUsed) return false;
      if (statusFilter === 'diangkut' && !item.isUsed) return false;

      // Filter Pembeli
      if (pembeliFilter !== 'semua') {
        const itemPembeli = (item.pembeli || '').trim().toLowerCase();
        if (itemPembeli !== pembeliFilter.toLowerCase()) return false;
      }

      // Filter Sortimen
      if (sortimenFilter !== 'semua') {
        const itemSort = (item.sortimen || '').trim().toUpperCase();
        if (itemSort !== sortimenFilter.toUpperCase()) return false;
      }

      // Filter Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchKapling = item.noKapling.toLowerCase().includes(term);
        const matchInvoice = (item.noInvoice || '').toLowerCase().includes(term);
        const matchPembeli = (item.pembeli || '').toLowerCase().includes(term);
        const matchKayu = (item.jenisKayu || '').toLowerCase().includes(term);
        const matchBlok = (item.noBlok || '').toLowerCase().includes(term);
        if (!matchKapling && !matchInvoice && !matchPembeli && !matchKayu && !matchBlok) {
          return false;
        }
      }

      return true;
    });
  }, [itemsWithStatus, statusFilter, pembeliFilter, sortimenFilter, searchTerm]);

  // Metrik Statistik Global
  const stats = useMemo(() => {
    const totalSemuaKapling = itemsWithStatus.length;

    const sisaItems = itemsWithStatus.filter((i) => !i.isUsed);
    const diangkutItems = itemsWithStatus.filter((i) => i.isUsed);

    const sisaBtg = sisaItems.reduce((acc, i) => acc + (parseInt(String(i.batang)) || 0), 0);
    const sisaM3 = sisaItems.reduce((acc, i) => acc + (parseFloat(String(i.volume)) || 0), 0);

    const diangkutBtg = diangkutItems.reduce((acc, i) => acc + (parseInt(String(i.batang)) || 0), 0);
    const diangkutM3 = diangkutItems.reduce((acc, i) => acc + (parseFloat(String(i.volume)) || 0), 0);

    const totalBtg = sisaBtg + diangkutBtg;
    const totalM3 = sisaM3 + diangkutM3;

    const percentDiangkutM3 = totalM3 > 0 ? (diangkutM3 / totalM3) * 100 : 0;
    const percentSisaM3 = totalM3 > 0 ? (sisaM3 / totalM3) * 100 : 0;

    return {
      totalSemuaKapling,
      sisaKaplingCount: sisaItems.length,
      sisaBtg,
      sisaM3,
      diangkutKaplingCount: diangkutItems.length,
      diangkutBtg,
      diangkutM3,
      totalBtg,
      totalM3,
      percentDiangkutM3,
      percentSisaM3,
    };
  }, [itemsWithStatus]);

  // Daftar unik pembeli untuk dropdown filter
  const uniquePembeliList = useMemo(() => {
    const setPembeli = new Set<string>();
    inventoryItems.forEach((i) => {
      if (i.pembeli && i.pembeli.trim()) {
        setPembeli.add(i.pembeli.trim());
      }
    });
    return Array.from(setPembeli).sort();
  }, [inventoryItems]);

  // Rekap Sisa Persediaan per Pembeli
  const rekapPerPembeli = useMemo(() => {
    const map = new Map<
      string,
      {
        pembeli: string;
        sisaKapling: number;
        sisaBtg: number;
        sisaM3: number;
        diangkutKapling: number;
        diangkutBtg: number;
        diangkutM3: number;
      }
    >();

    itemsWithStatus.forEach((i) => {
      const name = i.pembeli && i.pembeli.trim() ? i.pembeli.trim() : 'Tanpa Pembeli (Belum Terikat)';
      if (!map.has(name)) {
        map.set(name, {
          pembeli: name,
          sisaKapling: 0,
          sisaBtg: 0,
          sisaM3: 0,
          diangkutKapling: 0,
          diangkutBtg: 0,
          diangkutM3: 0,
        });
      }

      const rec = map.get(name)!;
      const btg = parseInt(String(i.batang)) || 0;
      const m3 = parseFloat(String(i.volume)) || 0;

      if (i.isUsed) {
        rec.diangkutKapling += 1;
        rec.diangkutBtg += btg;
        rec.diangkutM3 += m3;
      } else {
        rec.sisaKapling += 1;
        rec.sisaBtg += btg;
        rec.sisaM3 += m3;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.sisaM3 - a.sisaM3);
  }, [itemsWithStatus]);

  // Rekap Sisa Persediaan per Sortimen & Jenis Kayu
  const rekapPerSortimen = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        sortimen: string;
        jenisKayu: string;
        sisaKapling: number;
        sisaBtg: number;
        sisaM3: number;
      }
    >();

    itemsWithStatus.forEach((i) => {
      if (i.isUsed) return; // hanya sisa persediaan
      const sort = i.sortimen ? i.sortimen.trim().toUpperCase() : 'AII';
      const kayu = i.jenisKayu ? i.jenisKayu.trim().toUpperCase() : 'PINUS';
      const key = `${kayu} - ${sort}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          sortimen: sort,
          jenisKayu: kayu,
          sisaKapling: 0,
          sisaBtg: 0,
          sisaM3: 0,
        });
      }

      const rec = map.get(key)!;
      rec.sisaKapling += 1;
      rec.sisaBtg += parseInt(String(i.batang)) || 0;
      rec.sisaM3 += parseFloat(String(i.volume)) || 0;
    });

    return Array.from(map.values()).sort((a, b) => b.sisaM3 - a.sisaM3);
  }, [itemsWithStatus]);

  // Export Excel Laporan Sisa Persediaan
  const handleExportExcel = () => {
    const exportData = filteredItems.map((item, index) => {
      const btg = parseInt(String(item.batang)) || 0;
      const m3 = parseFloat(String(item.volume)) || 0;
      return {
        'No.': index + 1,
        'Status Sisa': item.isUsed ? 'SUDAH DIANGKUT' : 'SISA PERSEDIAAN (BELUM DIANGKUT)',
        'No. Kapling': item.noKapling,
        'No. Blok': item.noBlok || '-',
        'Kelompok Kayu': item.jenisKayu || 'PINUS',
        'Sortimen': item.sortimen || 'AII',
        'Panjang (cm)': item.panjang || '-',
        'Mutu': item.mutu || 'P',
        'Batang': btg,
        'Volume (M3)': m3,
        'No. Invoice': item.noInvoice || '-',
        'Pembeli / Industri': item.pembeli || '-',
        'Keterangan / Dokumen SKSHHK': item.isUsed
          ? `Terpakai di Kwitansi ${item.usageInfo?.noKwitansi} (${item.usageInfo?.tanggal})`
          : 'Belum dibuatkan permohonan SKSHHK',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sisa Persediaan Kayu');
    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(
      workbook,
      `Laporan_Sisa_Persediaan_Kayu_Belum_Diangkut_TPK_Talok_${todayStr}.xlsx`
    );
  };

  // Cetak Langsung Laporan
  const handlePrint = () => {
    window.print();
  };

  const [isFullscreen, setIsFullscreen] = useState<boolean>(true); // Default Layar Penuh (100% Fullscreen)

  // Toggle Layar Penuh
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

  if (!isOpen) return null;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col p-0 overflow-hidden animate-in fade-in duration-200'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200'
      }
    >
      <div
        className={
          isFullscreen
            ? 'bg-white w-full h-full rounded-none shadow-none flex flex-col overflow-hidden'
            : 'bg-white w-full max-w-7xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] h-[92vh] overflow-hidden'
        }
      >
        {/* Header Modal */}
        <div className="no-print bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <TreePine className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Laporan Sisa Persediaan Kayu (Belum Diangkut)</span>
                <span className="px-2.5 py-0.5 text-[11px] font-black bg-slate-800 text-emerald-300 rounded-full border border-slate-700">
                  {isFullscreen ? 'Mode Layar Penuh (100%)' : 'Mode Windowed'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                TPK Talok - BKPH Talok | Pemantauan Kayu Pihak Ketiga yang Belum Dibuatkan SKSHHK
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition shadow-xs cursor-pointer"
              title="Unduh Laporan Format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition shadow-xs cursor-pointer"
              title="Cetak Laporan Sisa Persediaan"
            >
              <Printer className="w-4 h-4 text-emerald-800" />
              <span>Cetak / PDF</span>
            </button>

            {/* Tombol Layar Penuh (Full Screen) */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-200 hover:text-white bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg transition cursor-pointer flex items-center gap-1 font-black text-xs"
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
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-5">
          {/* Top Summary Mini Cards */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Card 1: Total Sisa Persediaan (Belum Diangkut) */}
            <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-2.5 px-3 rounded-xl shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-wider text-emerald-100">
                <span>Sisa Persediaan</span>
                <span className="px-2 py-0.2 bg-emerald-950/60 rounded-full text-[10px] text-emerald-200 font-bold">
                  {stats.sisaKaplingCount} Kapling
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-white tracking-tight">{stats.sisaM3.toFixed(2)} <span className="text-xs font-bold text-emerald-200">M³</span></span>
                <span className="text-[11px] text-emerald-100 font-bold">{stats.sisaBtg.toLocaleString('id-ID')} btg</span>
              </div>
            </div>

            {/* Card 2: Sudah Terbit SKSHHK / Diangkut */}
            <div className="bg-white border border-slate-300 p-2.5 px-3 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-wider text-slate-600">
                <span>Sudah Diangkut</span>
                <span className="px-2 py-0.2 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                  {stats.diangkutKaplingCount} Kapling
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-slate-900 tracking-tight">{stats.diangkutM3.toFixed(2)} <span className="text-xs font-bold text-slate-500">M³</span></span>
                <span className="text-[11px] text-slate-600 font-bold">{stats.diangkutBtg.toLocaleString('id-ID')} btg</span>
              </div>
            </div>

            {/* Card 3: Total Seluruh Persediaan Terdaftar */}
            <div className="bg-white border border-slate-300 p-2.5 px-3 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-wider text-slate-600">
                <span>Total Persediaan</span>
                <span className="px-2 py-0.2 bg-slate-100 text-slate-800 rounded-full text-[10px] font-bold">
                  {stats.totalSemuaKapling} Kapling
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-slate-900 tracking-tight">{stats.totalM3.toFixed(2)} <span className="text-xs font-bold text-slate-500">M³</span></span>
                <span className="text-[11px] text-slate-600 font-bold">{stats.totalBtg.toLocaleString('id-ID')} btg</span>
              </div>
            </div>

            {/* Card 4: Persentase Realisasi Transportasi */}
            <div className="bg-white border border-slate-300 p-2.5 px-3 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-wider text-slate-600">
                <span>Sisa Persediaan %</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                  {stats.percentSisaM3.toFixed(1)}% Sisa
                </span>
              </div>
              <div className="mt-1">
                <div className="flex justify-between items-center text-[11px] mb-0.5">
                  <span className="text-slate-600 font-bold">Progres Angkutan</span>
                  <span className="font-extrabold text-slate-900">{stats.percentDiangkutM3.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(stats.percentDiangkutM3, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs & Filters */}
          <div className="no-print bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('daftar')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeTab === 'daftar'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar Kapling Sisa ({filteredItems.length})
              </button>
              <button
                onClick={() => setActiveTab('rekap_pembeli')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeTab === 'rekap_pembeli'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rekap Per Pembeli ({rekapPerPembeli.length})
              </button>
              <button
                onClick={() => setActiveTab('rekap_sortimen')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeTab === 'rekap_sortimen'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rekap Sortimen ({rekapPerSortimen.length})
              </button>
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
              {/* Filter Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs py-1.5 px-2.5 bg-white text-slate-900 font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="sisa">🟢 Belum Diangkut (Sisa Persediaan)</option>
                <option value="diangkut">🔴 Sudah Diangkut (Terbit SKSHHK)</option>
                <option value="semua">⚪ Semua Kapling (Sisa & Diangkut)</option>
              </select>

              {/* Filter Pembeli */}
              <select
                value={pembeliFilter}
                onChange={(e) => setPembeliFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-white text-slate-900 font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[200px] shadow-2xs"
              >
                <option value="semua">🏢 Semua Pembeli / Industri</option>
                {uniquePembeliList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {/* Filter Sortimen */}
              <select
                value={sortimenFilter}
                onChange={(e) => setSortimenFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-white text-slate-900 font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="semua">🪵 Semua Sortimen</option>
                <option value="AI">AI (Ø 10-19 cm)</option>
                <option value="AII">AII (Ø 20-29 cm)</option>
                <option value="AIII">AIII (Ø ≥ 30 cm)</option>
              </select>

              {/* Search Bar */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 font-bold" />
                <input
                  type="text"
                  placeholder="Cari Kapling/Invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white text-slate-900 font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Printable Container Document */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
            {/* Header Cetak Perhutani */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <PerhutaniLogo size={52} />
              <div className="text-center">
                <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-black">
                  LAPORAN SISA PERSEDIAAN KAYU PIHAK KETIGA
                </h1>
                <p className="text-xs font-bold text-slate-800 print:text-black">
                  (KAPLING PERSEDIAAN YANG BELUM DIBUATKAN DOKUMEN ANGKUTAN / SKSHHK)
                </p>
                <p className="text-[11px] text-slate-600 print:text-black font-semibold">
                  TPK TALOK - BKPH TALOK - KPH PEKALONGAN BARAT
                </p>
              </div>
              <div className="text-right text-[11px] text-black">
                <p className="font-bold">Tanggal Cetak:</p>
                <p className="font-semibold">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-[10px] text-slate-500 print:text-black">Brebes, Jawa Tengah</p>
              </div>
            </div>

            {/* TAB CONTENT 1: DAFTAR KAPLING SISA */}
            {activeTab === 'daftar' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-xs text-black">
                    <thead>
                      <tr className="bg-slate-200 text-black text-center font-extrabold">
                        <th className="border border-black p-2 w-8 text-black font-black bg-slate-200">No.</th>
                        <th className="border border-black p-2 w-32 text-black font-black bg-slate-200">Status Persediaan</th>
                        <th className="border border-black p-2 w-32 text-black font-black bg-slate-200">No. Kapling</th>
                        <th className="border border-black p-2 w-16 text-black font-black bg-slate-200">No. Blok</th>
                        <th className="border border-black p-2 w-24 text-black font-black bg-slate-200">Kelompok Kayu</th>
                        <th className="border border-black p-2 w-16 text-black font-black bg-slate-200">Sortimen</th>
                        <th className="border border-black p-2 w-16 text-black font-black bg-slate-200">Pjg (cm)</th>
                        <th className="border border-black p-2 w-12 text-black font-black bg-slate-200">Mutu</th>
                        <th className="border border-black p-2 w-16 text-black font-black bg-slate-200">Batang</th>
                        <th className="border border-black p-2 w-20 text-black font-black bg-slate-200">Volume (M3)</th>
                        <th className="border border-black p-2 w-28 text-black font-black bg-slate-200">No. Invoice</th>
                        <th className="border border-black p-2 text-black font-black bg-slate-200">Pembeli / Industri</th>
                        <th className="border border-black p-2 w-14 text-black font-black bg-slate-200 no-print">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="border border-black p-4 text-center text-slate-700 font-bold italic">
                            Tidak ada data sisa persediaan yang sesuai dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item, idx) => {
                          const btg = parseInt(String(item.batang)) || 0;
                          const m3 = parseFloat(String(item.volume)) || 0;
                          return (
                            <tr
                              key={item.id}
                              className={`text-xs ${
                                item.isUsed
                                  ? 'bg-rose-50/80 print:bg-transparent'
                                  : 'hover:bg-emerald-50/80 print:bg-transparent'
                              }`}
                            >
                              <td className="border border-black p-2 text-center font-extrabold text-black">
                                {idx + 1}
                              </td>
                              <td className="border border-black p-2 text-center text-black">
                                {item.isUsed ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-rose-900 bg-rose-100 rounded border border-rose-300">
                                    <Lock className="w-2.5 h-2.5" />
                                    TERPAKAI
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-900 bg-emerald-100 rounded border border-emerald-300">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    SISA (SIAP)
                                  </span>
                                )}
                              </td>
                              <td className="border border-black p-2 font-black text-black">
                                {item.noKapling}
                              </td>
                              <td className="border border-black p-2 text-center font-extrabold text-black">{item.noBlok || '-'}</td>
                              <td className="border border-black p-2 text-center font-extrabold text-black">
                                {item.jenisKayu || 'PINUS'}
                              </td>
                              <td className="border border-black p-2 text-center font-black text-black">
                                {item.sortimen || 'AII'}
                              </td>
                              <td className="border border-black p-2 text-center font-bold text-black">{item.panjang || '-'}</td>
                              <td className="border border-black p-2 text-center font-extrabold text-black uppercase">{item.mutu || 'P'}</td>
                              <td className="border border-black p-2 text-center font-black text-black">{btg}</td>
                              <td className="border border-black p-2 text-center font-black text-black text-xs">
                                {m3.toFixed(2)}
                              </td>
                              <td className="border border-black p-2 font-extrabold text-black">{item.noInvoice || '-'}</td>
                              <td className="border border-black p-2 font-black text-black">
                                {item.pembeli || '-'}
                              </td>
                              <td className="border border-black p-2 text-center no-print">
                                {!item.isUsed && onUseForPermohonan && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUseForPermohonan(item);
                                      onClose();
                                    }}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition shadow-2xs cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold"
                                    title="Gunakan kapling ini langsung di formulir permohonan angkutan"
                                  >
                                    <Truck className="w-3 h-3" />
                                    <span>Angkut</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}

                      {/* Total Baris Sisa Persediaan */}
                      <tr className="font-black text-xs bg-slate-200 text-black print:bg-transparent">
                        <td colSpan={8} className="border border-black p-2 text-center uppercase tracking-wider text-black font-black">
                          TOTAL HASIL REKAPITULASI LAPORAN
                        </td>
                        <td className="border border-black p-2 text-center text-black font-black">
                          {filteredItems.reduce((acc, i) => acc + (parseInt(String(i.batang)) || 0), 0)}
                        </td>
                        <td className="border border-black p-2 text-center text-black font-black text-xs">
                          {filteredItems.reduce((acc, i) => acc + (parseFloat(String(i.volume)) || 0), 0).toFixed(2)}
                        </td>
                        <td colSpan={3} className="border border-black p-2 text-black font-bold italic">
                          Jumlah Total: {filteredItems.length} Kapling
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: REKAP PER PEMBELI */}
            {activeTab === 'rekap_pembeli' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-xs text-black">
                    <thead>
                      <tr className="bg-slate-200 text-black text-center font-extrabold">
                        <th className="border border-black p-2 w-10 text-black font-black bg-slate-200">No.</th>
                        <th className="border border-black p-2 text-left text-black font-black bg-slate-200">Nama Pembeli / Perusahaan Industri</th>
                        <th className="border border-black p-2 w-28 bg-emerald-100 text-black font-black">Kapling Sisa</th>
                        <th className="border border-black p-2 w-28 bg-emerald-100 text-black font-black">Batang Sisa</th>
                        <th className="border border-black p-2 w-32 bg-emerald-100 text-black font-black">Volume Sisa (M3)</th>
                        <th className="border border-black p-2 w-28 bg-rose-100 text-black font-black">Kapling Diangkut</th>
                        <th className="border border-black p-2 w-32 bg-rose-100 text-black font-black">Volume Diangkut (M3)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rekapPerPembeli.map((item, idx) => (
                        <tr key={item.pembeli} className="hover:bg-slate-50 text-black">
                          <td className="border border-black p-2 text-center font-bold text-black">{idx + 1}</td>
                          <td className="border border-black p-2 font-black text-black">{item.pembeli}</td>
                          <td className="border border-black p-2 text-center font-black text-black bg-emerald-50/50">
                            {item.sisaKapling} Kapling
                          </td>
                          <td className="border border-black p-2 text-center font-extrabold text-black bg-emerald-50/50">
                            {item.sisaBtg.toLocaleString('id-ID')} btg
                          </td>
                          <td className="border border-black p-2 text-center font-black text-black bg-emerald-50/50">
                            {item.sisaM3.toFixed(2)} M³
                          </td>
                          <td className="border border-black p-2 text-center font-bold text-black bg-rose-50/30">
                            {item.diangkutKapling} Kapling
                          </td>
                          <td className="border border-black p-2 text-center font-black text-black bg-rose-50/30">
                            {item.diangkutM3.toFixed(2)} M³
                          </td>
                        </tr>
                      ))}

                      {/* Total Rekap Pembeli */}
                      <tr className="font-black text-xs bg-slate-200 text-black">
                        <td colSpan={2} className="border border-black p-2 text-center uppercase tracking-wider text-black font-black">
                          TOTAL SELURUH PEMBELI
                        </td>
                        <td className="border border-black p-2 text-center font-black text-black">
                          {rekapPerPembeli.reduce((acc, i) => acc + i.sisaKapling, 0)} Kapling
                        </td>
                        <td className="border border-black p-2 text-center font-black text-black">
                          {rekapPerPembeli.reduce((acc, i) => acc + i.sisaBtg, 0).toLocaleString('id-ID')} btg
                        </td>
                        <td className="border border-black p-2 text-center text-black font-black">
                          {rekapPerPembeli.reduce((acc, i) => acc + i.sisaM3, 0).toFixed(2)} M³
                        </td>
                        <td className="border border-black p-2 text-center font-black text-black">
                          {rekapPerPembeli.reduce((acc, i) => acc + i.diangkutKapling, 0)} Kapling
                        </td>
                        <td className="border border-black p-2 text-center font-black text-black">
                          {rekapPerPembeli.reduce((acc, i) => acc + i.diangkutM3, 0).toFixed(2)} M³
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: REKAP SORTIMEN */}
            {activeTab === 'rekap_sortimen' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-xs text-black">
                    <thead>
                      <tr className="bg-slate-200 text-black text-center font-extrabold">
                        <th className="border border-black p-2 w-10 text-black font-black bg-slate-200">No.</th>
                        <th className="border border-black p-2 text-left text-black font-black bg-slate-200">Kelompok Kayu & Sortimen</th>
                        <th className="border border-black p-2 w-28 text-black font-black bg-slate-200">Kategori Diameter</th>
                        <th className="border border-black p-2 w-28 bg-emerald-100 text-black font-black">Jumlah Kapling Sisa</th>
                        <th className="border border-black p-2 w-32 bg-emerald-100 text-black font-black">Total Batang Sisa</th>
                        <th className="border border-black p-2 w-36 bg-emerald-100 text-black font-black">Total Volume Sisa (M3)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rekapPerSortimen.map((item, idx) => {
                        const diameterDesc =
                          item.sortimen === 'AI'
                            ? 'Diameter 10 - 19 cm'
                            : item.sortimen === 'AII'
                            ? 'Diameter 20 - 29 cm'
                            : 'Diameter ≥ 30 cm';
                        return (
                          <tr key={item.key} className="hover:bg-slate-50 text-black">
                            <td className="border border-black p-2 text-center font-extrabold text-black">{idx + 1}</td>
                            <td className="border border-black p-2 font-black text-black">{item.key}</td>
                            <td className="border border-black p-2 text-center font-extrabold text-black">
                              {diameterDesc}
                            </td>
                            <td className="border border-black p-2 text-center font-black text-black bg-emerald-50/50">
                              {item.sisaKapling} Kapling
                            </td>
                            <td className="border border-black p-2 text-center font-extrabold text-black bg-emerald-50/50">
                              {item.sisaBtg.toLocaleString('id-ID')} btg
                            </td>
                            <td className="border border-black p-2 text-center font-black text-black bg-emerald-50/50">
                              {item.sisaM3.toFixed(2)} M³
                            </td>
                          </tr>
                        );
                      })}

                      {/* Total Rekap Sortimen */}
                      <tr className="font-black text-xs bg-slate-200 text-black">
                        <td colSpan={3} className="border border-black p-2 text-center uppercase tracking-wider text-black font-black">
                          TOTAL REKAPITULASI SORTIMEN SISA
                        </td>
                        <td className="border border-black p-2 text-center font-black text-black">
                          {rekapPerSortimen.reduce((acc, i) => acc + i.sisaKapling, 0)} Kapling
                        </td>
                        <td className="border border-black p-2 text-center font-black text-black">
                          {rekapPerSortimen.reduce((acc, i) => acc + i.sisaBtg, 0).toLocaleString('id-ID')} btg
                        </td>
                        <td className="border border-black p-2 text-center text-black font-black">
                          {rekapPerSortimen.reduce((acc, i) => acc + i.sisaM3, 0).toFixed(2)} M³
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tanda Tangan Cetak (Dapat Diketik / Diubah Langsung) */}
            <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-start text-xs text-black">
              <div className="text-center w-56">
                <p className="font-semibold text-black">Mengetahui,</p>
                <p className="font-bold uppercase text-black">Petugas Persediaan TPK Talok</p>
                <div className="h-12" />
                <input
                  type="text"
                  value={petugasNama}
                  onChange={(e) => setPetugasNama(e.target.value.toUpperCase())}
                  className="table-paper-input text-center font-black text-black underline uppercase w-full text-xs cursor-pointer focus:bg-emerald-50 rounded"
                  title="Klik untuk mengedit Nama Petugas Persediaan TPK Talok"
                  placeholder="NAMA PETUGAS..."
                />
                <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold text-black mt-0.5">
                  <span>NIP / REG:</span>
                  <input
                    type="text"
                    value={petugasReg}
                    onChange={(e) => setPetugasReg(e.target.value)}
                    className="table-paper-input text-center font-bold text-black w-28 cursor-pointer focus:bg-emerald-50 rounded"
                    placeholder="NOMOR REG..."
                  />
                </div>
              </div>

              <div className="text-center w-56">
                <p className="font-semibold text-black">Talok, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-bold uppercase text-black">Kepala TPK Talok</p>
                <div className="h-12" />
                <input
                  type="text"
                  value={kepalaNama}
                  onChange={(e) => setKepalaNama(e.target.value.toUpperCase())}
                  className="table-paper-input text-center font-black text-black underline uppercase w-full text-xs cursor-pointer focus:bg-emerald-50 rounded"
                  title="Klik untuk mengedit Nama Kepala TPK Talok"
                  placeholder="NAMA KEPALA TPK..."
                />
                <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold text-black mt-0.5">
                  <span>REG:</span>
                  <input
                    type="text"
                    value={kepalaReg}
                    onChange={(e) => setKepalaReg(e.target.value)}
                    className="table-paper-input text-center font-bold text-black w-28 cursor-pointer focus:bg-emerald-50 rounded"
                    placeholder="NOMOR REG..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print bg-slate-100 border-t border-slate-200 p-3.5 px-6 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Laporan disusun berdasarkan integrasi data Persediaan Kayu Pihak Ketiga & Kwitansi Permohonan Angkutan TPK Talok.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
