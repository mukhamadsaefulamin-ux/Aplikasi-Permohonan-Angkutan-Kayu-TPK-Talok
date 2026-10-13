import React, { useState, useMemo } from 'react';
import { PihakKetigaItem, PermohonanData } from '../types';
import { JENIS_KAYU_LIST, SORTIMEN_LIST, DATA_PEMBELI } from '../data/masterData';
import { getUsedKaplingsMap } from '../utils/autoFillHelpers';
import { SmartAutocomplete, AutocompleteOption } from './SmartAutocomplete';
import { PerhutaniLogo } from './PerhutaniLogo';
import { DocumentWatermark } from './DocumentWatermark';
import { Plus, Trash2, Search, Download, Upload, CloudUpload, RefreshCw, Truck, ShieldCheck, Lock, TreePine } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PihakKetigaTableProps {
  items: PihakKetigaItem[];
  onChange: (items: PihakKetigaItem[]) => void;
  onSyncToSheets?: () => void;
  onFetchFromSheets?: () => void;
  onUseForPermohonan?: (item: PihakKetigaItem) => void;
  onOpenSisaReport?: () => void;
  isSyncing?: boolean;
  sheetsUrl?: string;
  savedHistory?: PermohonanData[];
}

export const PihakKetigaTable: React.FC<PihakKetigaTableProps> = ({
  items,
  onChange,
  onSyncToSheets,
  onFetchFromSheets,
  onUseForPermohonan,
  onOpenSisaReport,
  isSyncing = false,
  sheetsUrl,
  savedHistory = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const usedKaplingsMap = useMemo(() => {
    return getUsedKaplingsMap(savedHistory);
  }, [savedHistory]);

  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tpk_watermark_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [watermarkStyle, setWatermarkStyle] = useState<'clean' | 'ribbon' | 'stamp'>(() => {
    try {
      const saved = localStorage.getItem('tpk_watermark_style');
      return (saved as any) || 'clean';
    } catch {
      return 'clean';
    }
  });

  React.useEffect(() => {
    const syncWm = () => {
      try {
        const en = localStorage.getItem('tpk_watermark_enabled');
        setWatermarkEnabled(en !== null ? en === 'true' : true);
        const st = localStorage.getItem('tpk_watermark_style');
        setWatermarkStyle((st as any) || 'clean');
      } catch {}
    };
    window.addEventListener('tpk_watermark_update', syncWm);
    return () => window.removeEventListener('tpk_watermark_update', syncWm);
  }, []);

  const toggleWatermarkStyle = () => {
    if (!watermarkEnabled) {
      setWatermarkEnabled(true);
      setWatermarkStyle('clean');
      localStorage.setItem('tpk_watermark_enabled', 'true');
      localStorage.setItem('tpk_watermark_style', 'clean');
    } else if (watermarkStyle === 'clean') {
      setWatermarkStyle('ribbon');
      localStorage.setItem('tpk_watermark_style', 'ribbon');
    } else {
      setWatermarkEnabled(false);
      localStorage.setItem('tpk_watermark_enabled', 'false');
    }
    window.dispatchEvent(new Event('tpk_watermark_update'));
  };

  const jenisKayuOptions = useMemo<AutocompleteOption<string>[]>(() => {
    return JENIS_KAYU_LIST.map((jk) => ({
      id: jk,
      label: jk,
      subLabel: 'Kelompok jenis kayu',
      badge: 'Kayu',
      badgeColor: 'emerald',
      data: jk,
    }));
  }, []);

  const sortimenOptions = useMemo<AutocompleteOption<string>[]>(() => {
    return SORTIMEN_LIST.map((s) => ({
      id: s,
      label: s,
      subLabel: s === 'AI' ? 'Diameter 10-19 cm' : s === 'AII' ? 'Diameter 20-29 cm' : 'Diameter ≥ 30 cm',
      badge: 'Sortimen',
      badgeColor: 'amber',
      data: s,
    }));
  }, []);

  const pembeliOptions = useMemo<AutocompleteOption<string>[]>(() => {
    return DATA_PEMBELI.map((p) => ({
      id: p.nama,
      label: p.nama,
      subLabel: `${p.alamat}, ${p.kota}`,
      badge: 'Pembeli',
      badgeColor: 'emerald',
      data: p.nama,
    }));
  }, []);

  const handleItemChange = (id: number | string, field: keyof PihakKetigaItem, value: any) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const nextItem = { ...item, [field]: value };
        // Auto-suggest invoice jika pembeli dipilih dan invoice masih kosong
        if (field === 'pembeli' && value && !nextItem.noInvoice) {
          const matchBuyer = DATA_PEMBELI.find(p => p.nama.toLowerCase() === String(value).toLowerCase());
          if (matchBuyer) {
            const seq = String(items.findIndex(i => i.id === id) + 1).padStart(3, '0');
            nextItem.noInvoice = `INV/2026/03/${seq}`;
          }
        }
        return nextItem;
      }
      return item;
    });
    onChange(updated);
  };

  const addItem = () => {
    // Cari nomor urut kapling tertinggi
    let maxNum = items.length;
    items.forEach((it) => {
      const match = it.noKapling.match(/KPL-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const nextSeq = String(maxNum + 1).padStart(3, '0');

    const newItem: PihakKetigaItem = {
      id: Date.now(),
      noKapling: `KPL-${nextSeq}/TLK/2026`,
      noBlok: '04A',
      jenisKayu: 'PINUS',
      sortimen: 'AII',
      panjang: '200',
      mutu: 'P',
      batang: '',
      volume: '',
      noInvoice: '',
      pembeli: '',
    };
    onChange([...items, newItem]);
  };

  const removeItem = (id: number | string) => {
    if (items.length > 1) {
      onChange(items.filter((item) => item.id !== id));
    }
  };

  const handleExportExcel = () => {
    const exportData = items.map((item, index) => ({
      'No': index + 1,
      'No. Kapling': item.noKapling,
      'No. Blok': item.noBlok,
      'Kelompok Kayu': item.jenisKayu,
      'Sortimen': item.sortimen,
      'Panjang (cm)': item.panjang,
      'Mutu': item.mutu,
      'Batang': item.batang,
      'Volume (M3)': item.volume,
      'No. Invoice': item.noInvoice,
      'Pembeli': item.pembeli,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Persediaan Kayu');
    XLSX.writeFile(workbook, `Persediaan_Pihak_Ketiga_TPK_Talok_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length > 1) {
          const importedItems: PihakKetigaItem[] = [];
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (row && row.length > 0 && row.some((cell) => cell !== undefined && cell !== '')) {
              importedItems.push({
                id: Date.now() + i + Math.random(),
                noKapling: String(row[1] || row[0] || '').trim(),
                noBlok: String(row[2] || '').trim(),
                jenisKayu: String(row[3] || 'PINUS').toUpperCase().trim(),
                sortimen: String(row[4] || 'AII').toUpperCase().trim(),
                panjang: String(row[5] || '').trim(),
                mutu: String(row[6] || 'P').trim(),
                batang: row[7] !== undefined && row[7] !== null ? String(row[7]).trim() : '',
                volume: row[8] !== undefined && row[8] !== null ? String(row[8]).trim() : '',
                noInvoice: String(row[9] || '').trim(),
                pembeli: String(row[10] || '').trim(),
              });
            }
          }

          if (importedItems.length > 0) {
            // MERGE & APPEND LOGIC: DO NOT OVERWRITE EXISTING DATA
            const updatedItems = [...items];
            let addedCount = 0;
            let mergedCount = 0;

            importedItems.forEach((newItm) => {
              const cleanKapling = newItm.noKapling.toLowerCase();
              if (!cleanKapling) {
                // If no kapling number, append as a new item
                updatedItems.push(newItm);
                addedCount++;
                return;
              }

              // Check if item with same noKapling already exists in current inventory
              const existingIndex = updatedItems.findIndex(
                (ex) => ex.noKapling && ex.noKapling.trim().toLowerCase() === cleanKapling
              );

              if (existingIndex >= 0) {
                // Update existing item fields with non-empty values from Excel
                const existing = updatedItems[existingIndex];
                updatedItems[existingIndex] = {
                  ...existing,
                  noBlok: newItm.noBlok || existing.noBlok,
                  jenisKayu: newItm.jenisKayu || existing.jenisKayu,
                  sortimen: newItm.sortimen || existing.sortimen,
                  panjang: newItm.panjang || existing.panjang,
                  mutu: newItm.mutu || existing.mutu,
                  batang: newItm.batang !== '' ? newItm.batang : existing.batang,
                  volume: newItm.volume !== '' ? newItm.volume : existing.volume,
                  noInvoice: newItm.noInvoice !== '' ? newItm.noInvoice : existing.noInvoice,
                  pembeli: newItm.pembeli !== '' ? newItm.pembeli : existing.pembeli,
                };
                mergedCount++;
              } else {
                // Append as new item
                updatedItems.push(newItm);
                addedCount++;
              }
            });

            onChange(updatedItems);
            alert(`Berhasil Mengimpor File Excel!\n\n• Data Baru Ditambahkan: ${addedCount} kapling\n• Data Lama Diperbarui: ${mergedCount} kapling\n• Total Persediaan Saat Ini: ${updatedItems.length} kapling`);
          }
        }
      } catch (err) {
        console.error('Gagal membaca file Excel:', err);
        alert('Terjadi kesalahan saat membaca file Excel. Pastikan format file Excel sudah sesuai.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const filteredItems = items.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.noKapling.toLowerCase().includes(term) ||
      item.jenisKayu.toLowerCase().includes(term) ||
      item.pembeli.toLowerCase().includes(term) ||
      item.noInvoice.toLowerCase().includes(term) ||
      item.noBlok.toLowerCase().includes(term)
    );
  });

  const totalBatang = items.reduce((sum, item) => sum + (parseInt(String(item.batang)) || 0), 0);
  const totalVolume = items.reduce((sum, item) => sum + (parseFloat(String(item.volume)) || 0), 0);

  return (
    <div id="cetak-pihak-ketiga" className="flex flex-col items-center w-full py-4 print:py-0">
      {/* Control Bar */}
      <div className="no-print w-full max-w-[355.6mm] mb-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor kapling, pembeli, kayu, invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenSisaReport && (
            <button
              type="button"
              onClick={onOpenSisaReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition shadow-2xs cursor-pointer"
              title="Buka Laporan Sisa Persediaan Kayu Belum Diangkut"
            >
              <TreePine className="w-3.5 h-3.5 text-emerald-950" />
              <span>Laporan Sisa Persediaan</span>
            </button>
          )}

          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            id="excel-file-input"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="excel-file-input"
            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            Import Excel
          </label>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Export Excel
          </button>

          {onSyncToSheets && (
            <button
              type="button"
              onClick={onSyncToSheets}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs disabled:opacity-50"
            >
              <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              {isSyncing ? 'Menyinkronkan...' : 'Sinkron Google Sheets'}
            </button>
          )}

          {onFetchFromSheets && (
            <button
              type="button"
              onClick={onFetchFromSheets}
              disabled={isSyncing}
              title="Ambil data terbaru dari spreadsheet di Google Drive"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Muat dari Cloud
            </button>
          )}
        </div>
      </div>

      {/* Dokumen Kertas Legal Landscape */}
      <div
        className="document-container-landscape text-black relative"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}
      >
        <DocumentWatermark variant="landscape" />

        <div className="relative z-10">
          {/* Header Kertas */}
          <div className="flex items-center justify-between border-b border-black pb-3 mb-4">
          <PerhutaniLogo size={46} />
          <div className="text-center">
            <h2 className="text-base font-extrabold uppercase tracking-wide">
              DATA PERSEDIAAN KAYU PIHAK KETIGA
            </h2>
            <p className="text-[11px] text-slate-600 font-semibold print:text-black">
              TPK TALOK - BAGIAN KESATUAN PEMANGKUAN HUTAN (BKPH) TALOK
            </p>
          </div>
          <div className="text-right text-[11px] font-semibold text-slate-700 print:text-black">
            <span>Tahun Berjalan 2026</span>
            <br />
            <span className="text-[10px] font-normal">Kertas Legal Landscape (356x216 mm)</span>
          </div>
        </div>

        {/* Tabel Data Persediaan */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs text-black">
            <thead>
              <tr className="bg-slate-200 text-black text-center font-extrabold">
                <th className="border border-black p-1.5 w-8 text-black font-black bg-slate-200">No.</th>
                <th className="border border-black p-1.5 w-32 text-black font-black bg-slate-200">No. Kapling</th>
                <th className="border border-black p-1.5 w-20 text-black font-black bg-slate-200">No. Blok</th>
                <th className="border border-black p-1.5 w-28 text-black font-black bg-slate-200" title="Kelompok Jenis Kayu">Kelompok Kayu</th>
                <th className="border border-black p-1.5 w-20 text-black font-black bg-slate-200">Sortimen</th>
                <th className="border border-black p-1.5 w-16 text-black font-black bg-slate-200">Pjg (cm)</th>
                <th className="border border-black p-1.5 w-16 text-black font-black bg-slate-200">Mutu</th>
                <th className="border border-black p-1.5 w-16 text-black font-black bg-slate-200">Batang</th>
                <th className="border border-black p-1.5 w-24 text-black font-black bg-slate-200">Volume (M3)</th>
                <th className="border border-black p-1.5 w-32 text-black font-black bg-slate-200">No. Invoice</th>
                <th className="border border-black p-1.5 text-black font-black bg-slate-200">Pembeli / Industri</th>
                <th className="border border-black p-1.5 w-12 text-black font-black bg-slate-200 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => {
                const kKey = item.noKapling ? item.noKapling.trim().toLowerCase() : '';
                const usage = kKey ? usedKaplingsMap.get(kKey) : null;
                const isUsed = Boolean(usage);

                return (
                  <tr
                    key={item.id}
                    className={`text-xs ${
                      isUsed ? 'bg-rose-50/60 print:bg-transparent' : 'hover:bg-slate-50 print:bg-transparent'
                    }`}
                  >
                    <td className="border border-black p-1 text-center font-medium">{index + 1}</td>
                    <td className="border border-black p-1">
                      <input
                        type="text"
                        value={item.noKapling}
                        onChange={(e) => handleItemChange(item.id, 'noKapling', e.target.value)}
                        className={`table-paper-input text-left px-1 font-bold ${
                          isUsed ? 'text-rose-900 line-through' : ''
                        }`}
                      />
                      {isUsed && (
                        <div className="no-print text-[9px] font-extrabold text-rose-800 bg-rose-100 px-1 py-0.2 rounded mt-0.5 border border-rose-300 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-rose-700 shrink-0" />
                          <span>Terpakai (Doc: {usage?.noKwitansi})</span>
                        </div>
                      )}
                    </td>
                    <td className="border border-black p-1">
                      <input
                        type="text"
                        value={item.noBlok}
                        onChange={(e) => handleItemChange(item.id, 'noBlok', e.target.value)}
                        className="table-paper-input"
                      />
                    </td>
                    <td className="border border-black p-1 relative">
                      <SmartAutocomplete
                        value={item.jenisKayu}
                        onChange={(val) => handleItemChange(item.id, 'jenisKayu', val.toUpperCase())}
                        onSelect={(jk: string) => handleItemChange(item.id, 'jenisKayu', jk)}
                        options={jenisKayuOptions}
                        placeholder="Kayu"
                        inputClassName="table-paper-input uppercase font-semibold w-full"
                        className="w-full"
                        uppercase
                        minDropdownWidth="min-w-[180px]"
                      />
                    </td>
                    <td className="border border-black p-1 relative">
                      <select
                        value={['AI', 'AII', 'AIII'].includes(item.sortimen?.toUpperCase()) ? item.sortimen.toUpperCase() : (item.sortimen || 'AII')}
                        onChange={(e) => handleItemChange(item.id, 'sortimen', e.target.value)}
                        className="table-paper-input uppercase text-center font-semibold w-full cursor-pointer bg-transparent focus:bg-emerald-50 rounded-xs"
                        title="Pilih sortimen AI, AII, atau AIII"
                      >
                        {!['AI', 'AII', 'AIII'].includes(item.sortimen?.toUpperCase()) && item.sortimen && (
                          <option value={item.sortimen}>{item.sortimen}</option>
                        )}
                        <option value="AI">AI</option>
                        <option value="AII">AII</option>
                        <option value="AIII">AIII</option>
                      </select>
                    </td>
                    <td className="border border-black p-1">
                      <input
                        type="text"
                        value={item.panjang}
                        onChange={(e) => handleItemChange(item.id, 'panjang', e.target.value)}
                        className="table-paper-input"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <input
                        type="text"
                        list="datalist-pk-mutu"
                        value={item.mutu}
                        onChange={(e) => handleItemChange(item.id, 'mutu', e.target.value.toUpperCase())}
                        className="table-paper-input uppercase"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <input
                        type="number"
                        value={item.batang}
                        onChange={(e) => handleItemChange(item.id, 'batang', e.target.value)}
                        className="table-paper-input"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <input
                        type="number"
                        step="0.01"
                        value={item.volume}
                        onChange={(e) => handleItemChange(item.id, 'volume', e.target.value)}
                        className="table-paper-input"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <input
                        type="text"
                        value={item.noInvoice}
                        onChange={(e) => handleItemChange(item.id, 'noInvoice', e.target.value)}
                        className="table-paper-input text-left px-1"
                      />
                    </td>
                    <td className="border border-black p-1 relative">
                      <SmartAutocomplete
                        value={item.pembeli}
                        onChange={(val) => handleItemChange(item.id, 'pembeli', val)}
                        onSelect={(p: string) => handleItemChange(item.id, 'pembeli', p)}
                        options={pembeliOptions}
                        placeholder="Pilih/Ketik Pembeli..."
                        inputClassName="table-paper-input text-left px-1 font-semibold w-full"
                        className="w-full"
                        minDropdownWidth="min-w-[280px]"
                      />
                    </td>
                    <td className="border border-black p-1 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        {onUseForPermohonan && (
                          isUsed ? (
                            <button
                              type="button"
                              disabled
                              className="text-slate-400 opacity-50 p-1 rounded cursor-not-allowed"
                              title={`Kapling ini sudah terpakai di Kwitansi ${usage?.noKwitansi}`}
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onUseForPermohonan(item)}
                              className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 p-1 rounded transition cursor-pointer"
                              title="Gunakan kapling ini untuk Rencana Angkutan (isi seluruh kolom formulir otomatis)"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1 inline-flex items-center justify-center rounded cursor-pointer"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Total Baris */}
              <tr className="font-bold text-xs bg-slate-50 print:bg-transparent">
                <td colSpan={7} className="border border-black p-2 text-center uppercase tracking-wide">
                  Total Jumlah Persediaan
                </td>
                <td className="border border-black p-2 text-center text-slate-900">
                  {totalBatang || 0}
                </td>
                <td className="border border-black p-2 text-center text-slate-900">
                  {totalVolume > 0 ? totalVolume.toFixed(2) : '0.00'}
                </td>
                <td colSpan={2} className="border border-black p-2 text-slate-500 text-[11px] italic">
                  {items.length} Kapling Terdaftar
                </td>
                <td className="border border-black p-1 text-center no-print">
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1 w-full flex items-center justify-center transition"
                    title="Tambah data kapling baru"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>

        {/* Datalists */}
        <datalist id="datalist-pk-kayu">
          {JENIS_KAYU_LIST.map((jk, idx) => (
            <option key={`pk-jk-${idx}`} value={jk} />
          ))}
        </datalist>
        <datalist id="datalist-pk-sort">
          {SORTIMEN_LIST.map((sort, idx) => (
            <option key={`pk-st-${idx}`} value={sort} />
          ))}
        </datalist>
        <datalist id="datalist-pk-pembeli">
          {DATA_PEMBELI.map((p, idx) => (
            <option key={`pk-pb-${idx}`} value={p.nama}>
              {p.kota}
            </option>
          ))}
        </datalist>
        <datalist id="datalist-pk-mutu">
          <option value="P">P - Mutu Pertama</option>
          <option value="T">T - Tanpa Cacat</option>
          <option value="D">D - Mutu Rendah / Cacat</option>
        </datalist>
      </div>
    </div>
  );
};
