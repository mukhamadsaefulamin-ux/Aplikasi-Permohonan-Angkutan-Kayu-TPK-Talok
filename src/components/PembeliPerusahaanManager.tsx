import React, { useState, useMemo } from 'react';
import { PembeliInfo } from '../types';
import { DATA_PEMBELI } from '../data/masterData';
import * as XLSX from 'xlsx';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  Printer,
  RotateCcw,
  CheckCircle2,
  MapPin,
  FileText,
  X,
  ShieldAlert,
  ArrowRight,
  Phone
} from 'lucide-react';

export interface PerusahaanInfo extends PembeliInfo {
  telp?: string;
  penanggungJawab?: string;
  catatan?: string;
}

interface PembeliPerusahaanManagerProps {
  perusahaanList: PerusahaanInfo[];
  onUpdateList: (newList: PerusahaanInfo[]) => void;
  onSelectForForm: (perusahaan: PerusahaanInfo) => void;
  activePenerimaName?: string;
  activeTujuanName?: string;
}

export const PembeliPerusahaanManager: React.FC<PembeliPerusahaanManagerProps> = ({
  perusahaanList,
  onUpdateList,
  onSelectForForm,
  activePenerimaName,
  activeTujuanName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<PerusahaanInfo>({
    nama: '',
    alamat: '',
    kota: '',
    telp: '',
    penanggungJawab: '',
    catatan: '',
  });

  // Delete Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; index: number | null; name: string }>({
    isOpen: false,
    index: null,
    name: '',
  });

  // Notice State
  const [notice, setNotice] = useState<string | null>(null);
  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Get unique city list for filters
  const cityList = useMemo(() => {
    const cities = new Set<string>();
    perusahaanList.forEach((p) => {
      if (p.kota) cities.add(p.kota.trim().toUpperCase());
    });
    return Array.from(cities).sort();
  }, [perusahaanList]);

  // Filter List
  const filteredList = useMemo(() => {
    return perusahaanList.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        p.alamat.toLowerCase().includes(q) ||
        p.kota.toLowerCase().includes(q) ||
        (p.telp && p.telp.includes(q)) ||
        (p.penanggungJawab && p.penanggungJawab.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (selectedCity === 'ALL') return true;
      return p.kota.trim().toUpperCase() === selectedCity;
    });
  }, [perusahaanList, searchQuery, selectedCity]);

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFormData({
      nama: '',
      alamat: '',
      kota: 'TEGAL',
      telp: '',
      penanggungJawab: '',
      catatan: '',
    });
    setIsModalOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (index: number) => {
    const p = perusahaanList[index];
    if (!p) return;
    setEditingIndex(index);
    setFormData({
      nama: p.nama,
      alamat: p.alamat,
      kota: p.kota || '',
      telp: p.telp || '',
      penanggungJawab: p.penanggungJawab || '',
      catatan: p.catatan || '',
    });
    setIsModalOpen(true);
  };

  // Save Add/Edit
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.alamat.trim() || !formData.kota.trim()) {
      alert('Nama Perusahaan, Alamat, dan Kota/Kabupaten wajib diisi!');
      return;
    }

    const cleanItem: PerusahaanInfo = {
      nama: formData.nama.trim().toUpperCase(),
      alamat: formData.alamat.trim().toUpperCase(),
      kota: formData.kota.trim().toUpperCase(),
      telp: formData.telp?.trim() || '',
      penanggungJawab: formData.penanggungJawab?.trim().toUpperCase() || '',
      catatan: formData.catatan?.trim() || '',
    };

    if (editingIndex !== null) {
      const updated = [...perusahaanList];
      updated[editingIndex] = cleanItem;
      onUpdateList(updated);
      showNotice(`Data perusahaan "${cleanItem.nama}" berhasil diperbarui!`);
    } else {
      onUpdateList([cleanItem, ...perusahaanList]);
      showNotice(`Perusahaan baru "${cleanItem.nama}" berhasil ditambahkan!`);
    }

    setIsModalOpen(false);
  };

  // Confirm Delete
  const handleDelete = (index: number) => {
    const item = perusahaanList[index];
    if (!item) return;
    setDeleteConfirm({
      isOpen: true,
      index,
      name: item.nama,
    });
  };

  const executeDelete = () => {
    if (deleteConfirm.index === null) return;
    const item = perusahaanList[deleteConfirm.index];
    const updated = perusahaanList.filter((_, idx) => idx !== deleteConfirm.index);
    onUpdateList(updated);
    setDeleteConfirm({ isOpen: false, index: null, name: '' });
    showNotice(`Perusahaan "${item.nama}" berhasil dihapus dari daftar.`);
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan daftar perusahaan/pembeli ke data standar bawaan TPK Talok (22 Perusahaan Industri/Pembeli Kayu)?')) {
      onUpdateList(DATA_PEMBELI);
      showNotice('Daftar perusahaan berhasil direset ke data standar TPK Talok.');
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const dataToExport = perusahaanList.map((p, idx) => ({
      No: idx + 1,
      'Nama Perusahaan / Pembeli': p.nama,
      'Alamat Pabrik / Lokasi Bongkar': p.alamat,
      'Kota / Kabupaten': p.kota,
      'No. Telepon / HP': p.telp || '-',
      'Penanggung Jawab': p.penanggungJawab || '-',
      Catatan: p.catatan || 'Pelanggan Resmi TPK Talok',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Perusahaan');
    XLSX.writeFile(workbook, `Daftar_Perusahaan_Pembeli_TPK_Talok_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotice('Berhasil mengunduh file Excel daftar perusahaan!');
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-[215.9mm] lg:max-w-6xl flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed top-20 right-6 z-50 py-2.5 px-4 bg-emerald-700 text-white font-bold rounded-xl shadow-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{notice}</span>
        </div>
      )}

      {/* HEADER UTAMA */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-5 shadow-md border border-emerald-700/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10 text-emerald-300">
            <Building2 className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">
                Daftar Perusahaan Pembeli & Lokasi Tujuan Bongkar
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-400 text-emerald-950 rounded-full shadow-2xs">
                {perusahaanList.length} Industri / Pembeli
              </span>
            </div>
            <p className="text-xs text-emerald-200 mt-0.5">
              Master data pabrik industri kayu, CV/PT pembeli, alamat penerima, dan lokasi tujuan bongkar TPK Talok
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Perusahaan Baru</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-bold text-white bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600 rounded-xl transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
            title="Download file Excel daftar perusahaan"
          >
            <Download className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 text-xs font-bold text-white bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600 rounded-xl transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
            title="Cetak daftar perusahaan"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Reset ke daftar bawaan TPK Talok"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STATS RINGKASAN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Pembeli / Industri</span>
          <span className="text-xl font-black text-emerald-800 mt-0.5 block">{perusahaanList.length}</span>
          <span className="text-[10px] text-slate-400">Pabrik & Perusahaan Terdaftar</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Sebaran Wilayah / Kota</span>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">{cityList.length}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">Kabupaten & Kota Tujuan</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2">
          <span className="text-[11px] font-semibold text-slate-500 block">Penerima & Tujuan di Form</span>
          <span className="text-xs font-black text-emerald-900 mt-0.5 truncate block">
            {activePenerimaName || activeTujuanName || 'Belum dipilih di formulir'}
          </span>
          <span className="text-[10px] text-slate-500">
            Klik tombol "Muat ke Form Permohonan" untuk mengisi otomatis data penerima & lokasi bongkar
          </span>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama perusahaan, alamat, atau kota (misal: Berkah, Tegal, Sidoarjo)..."
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium bg-slate-50 focus:bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* City Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-semibold text-[11px]">Kota Tujuan:</span>
          <button
            type="button"
            onClick={() => setSelectedCity('ALL')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
              selectedCity === 'ALL'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Semua ({perusahaanList.length})
          </button>
          {cityList.slice(0, 5).map((cityName) => (
            <button
              key={cityName}
              type="button"
              onClick={() => setSelectedCity(cityName)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                selectedCity === cityName
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cityName}
            </button>
          ))}
        </div>
      </div>

      {/* TABEL DAFTAR PERUSAHAAN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3 px-4">Nama Perusahaan / Pembeli</th>
                <th className="py-3 px-4">Alamat Pabrik / Lokasi Bongkar</th>
                <th className="py-3 px-4 w-36">Kota / Kab.</th>
                <th className="py-3 px-4 w-36">Kontak / No. HP</th>
                <th className="py-3 px-4 w-44 text-center">Aksi / Pilihan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">Perusahaan / Pembeli Tidak Ditemukan</p>
                    <p className="text-[11px]">Coba ubah kata kunci pencarian atau filter kota.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const originalIndex = perusahaanList.findIndex((p) => p.nama === item.nama);
                  const isActive =
                    (activePenerimaName && activePenerimaName.toUpperCase().includes(item.nama.toUpperCase())) ||
                    (activeTujuanName && activeTujuanName.toUpperCase().includes(item.nama.toUpperCase()));

                  return (
                    <tr
                      key={`perusahaan-${idx}`}
                      className={`hover:bg-emerald-50/50 transition ${
                        isActive ? 'bg-emerald-50/80 font-bold' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}.
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>{item.nama}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.alamat || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          {item.kota || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.telp ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{item.telp}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectForForm(item)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                            title="Muat data perusahaan ke Formulir Permohonan & SKSHHK"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span>Pilih</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(originalIndex >= 0 ? originalIndex : idx)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit data perusahaan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(originalIndex >= 0 ? originalIndex : idx)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Hapus perusahaan dari master data"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan {filteredList.length} dari {perusahaanList.length} total perusahaan terdaftar
          </span>
          <span className="text-[11px] text-slate-400">
            Klik "Pilih" pada baris perusahaan untuk mengisi otomatis Penerima & Tujuan Bongkar di formulir
          </span>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT PERUSAHAAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingIndex !== null ? 'Edit Data Perusahaan' : 'Tambah Perusahaan / Pembeli Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Master penerima & lokasi bongkar TPK Talok</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs text-slate-800 bg-white">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Perusahaan / Industri / Pembeli <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: CV. BERKAH SANDHI ABADI"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold uppercase text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alamat Pabrik / Lokasi Bongkar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: DESA LEBAKSIU, KEC. LEBAKSIU"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium uppercase text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kota / Kabupaten Tujuan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TEGAL / BREBES / SEMARANG"
                  value={formData.kota}
                  onChange={(e) => setFormData({ ...formData, kota: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold uppercase text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No. Telepon / HP</label>
                <input
                  type="text"
                  placeholder="Contoh: 0812-3456-7890 (Opsional)"
                  value={formData.telp || ''}
                  onChange={(e) => setFormData({ ...formData, telp: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan / Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan perusahaan atau jenis usaha (opsional)"
                  value={formData.catatan || ''}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none shadow-2xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {editingIndex !== null ? 'Perbarui Perusahaan' : 'Simpan Perusahaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Hapus Perusahaan?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Apakah Anda yakin ingin menghapus <strong>"{deleteConfirm.name}"</strong> dari master data TPK Talok?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, index: null, name: '' })}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
