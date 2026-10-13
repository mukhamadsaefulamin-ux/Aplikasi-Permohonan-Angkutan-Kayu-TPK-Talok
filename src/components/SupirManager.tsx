import React, { useState, useMemo } from 'react';
import { SupirInfo } from '../types';
import { DATA_SUPIR, JENIS_KENDARAAN } from '../data/masterData';
import * as XLSX from 'xlsx';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  Printer,
  RotateCcw,
  CheckCircle2,
  Phone,
  FileText,
  UserCheck,
  X,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface SupirManagerProps {
  supirList: SupirInfo[];
  onUpdateList: (newList: SupirInfo[]) => void;
  onSelectForForm: (supir: SupirInfo) => void;
  activeSupirName?: string;
  activeNopol?: string;
}

export const SupirManager: React.FC<SupirManagerProps> = ({
  supirList,
  onUpdateList,
  onSelectForForm,
  activeSupirName,
  activeNopol,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatArea, setSelectedPlatArea] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<SupirInfo>({
    nama: '',
    nopol: '',
    jenisKendaraan: 'Truk Sedang (Colt Diesel)',
    kontak: '',
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

  // Filter List
  const filteredList = useMemo(() => {
    return supirList.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.nopol.toLowerCase().includes(q) ||
        (s.jenisKendaraan && s.jenisKendaraan.toLowerCase().includes(q)) ||
        (s.kontak && s.kontak.includes(q));

      if (!matchSearch) return false;

      if (selectedPlatArea === 'ALL') return true;
      const cleanPlate = s.nopol.trim().toUpperCase();
      return cleanPlate.startsWith(selectedPlatArea);
    });
  }, [supirList, searchQuery, selectedPlatArea]);

  // Plat region counters
  const platCounts = useMemo(() => {
    let platG = 0;
    let platR = 0;
    let platE = 0;
    let platZ = 0;
    let platOther = 0;

    supirList.forEach((s) => {
      const p = s.nopol.trim().toUpperCase();
      if (p.startsWith('G')) platG++;
      else if (p.startsWith('R')) platR++;
      else if (p.startsWith('E')) platE++;
      else if (p.startsWith('Z')) platZ++;
      else platOther++;
    });

    return { platG, platR, platE, platZ, platOther };
  }, [supirList]);

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFormData({
      nama: '',
      nopol: '',
      jenisKendaraan: 'Truk Sedang (Colt Diesel)',
      kontak: '',
      catatan: '',
    });
    setIsModalOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (index: number) => {
    const supir = supirList[index];
    if (!supir) return;
    setEditingIndex(index);
    setFormData({
      nama: supir.nama,
      nopol: supir.nopol,
      jenisKendaraan: supir.jenisKendaraan || 'Truk Sedang (Colt Diesel)',
      kontak: supir.kontak || '',
      catatan: supir.catatan || '',
    });
    setIsModalOpen(true);
  };

  // Save Add/Edit
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.nopol.trim()) {
      alert('Nama Supir dan Nomor Polisi wajib diisi!');
      return;
    }

    const cleanItem: SupirInfo = {
      nama: formData.nama.trim().toUpperCase(),
      nopol: formData.nopol.trim().toUpperCase(),
      jenisKendaraan: formData.jenisKendaraan || 'Truk Sedang (Colt Diesel)',
      kontak: formData.kontak?.trim() || '',
      catatan: formData.catatan?.trim() || '',
    };

    if (editingIndex !== null) {
      // Edit
      const updated = [...supirList];
      updated[editingIndex] = cleanItem;
      onUpdateList(updated);
      showNotice(`Data supir "${cleanItem.nama}" berhasil diperbarui!`);
    } else {
      // Add new
      onUpdateList([cleanItem, ...supirList]);
      showNotice(`Supir baru "${cleanItem.nama}" (${cleanItem.nopol}) berhasil ditambahkan!`);
    }

    setIsModalOpen(false);
  };

  // Confirm Delete
  const handleDelete = (index: number) => {
    const item = supirList[index];
    if (!item) return;
    setDeleteConfirm({
      isOpen: true,
      index,
      name: item.nama,
    });
  };

  const executeDelete = () => {
    if (deleteConfirm.index === null) return;
    const item = supirList[deleteConfirm.index];
    const updated = supirList.filter((_, idx) => idx !== deleteConfirm.index);
    onUpdateList(updated);
    setDeleteConfirm({ isOpen: false, index: null, name: '' });
    showNotice(`Supir "${item.nama}" berhasil dihapus dari daftar.`);
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan daftar supir ke data standar bawaan TPK Talok (41 armada supir)?')) {
      onUpdateList(DATA_SUPIR);
      showNotice('Daftar supir berhasil direset ke 41 armada standar TPK Talok.');
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const dataToExport = supirList.map((s, idx) => ({
      No: idx + 1,
      'Nama Supir / Pengemudi': s.nama,
      'Nomor Polisi': s.nopol,
      'Jenis Armada': s.jenisKendaraan || 'Truk Angkutan Kayu',
      'Kontak / No. HP': s.kontak || '-',
      Catatan: s.catatan || 'Armada Resmi TPK Talok',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Supir');
    XLSX.writeFile(workbook, `Daftar_Supir_TPK_Talok_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotice('Berhasil mengunduh file Excel daftar supir!');
  };

  // Cetak Daftar Supir
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
            <Truck className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">
                Daftar Nama Supir & Armada TPK Talok
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-400 text-emerald-950 rounded-full shadow-2xs">
                {supirList.length} Armada Terdaftar
              </span>
            </div>
            <p className="text-xs text-emerald-200 mt-0.5">
              Kelola master data pengemudi armada angkutan kayu, nomor polisi (nopol), dan jenis kendaraan
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
            <span>Tambah Supir Baru</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-bold text-white bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600 rounded-xl transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
            title="Download file Excel daftar supir"
          >
            <Download className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 text-xs font-bold text-white bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600 rounded-xl transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
            title="Cetak daftar supir"
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

      {/* STATS KARTU RINGKASAN ARMADA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Supir</span>
          <span className="text-xl font-black text-emerald-800 mt-0.5 block">{supirList.length}</span>
          <span className="text-[10px] text-slate-400">Siap Operasional</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Plat G (Brebes/Tegal)</span>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">{platCounts.platG}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">Wilayah Utama TPK</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Plat R (Banyumas)</span>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">{platCounts.platR}</span>
          <span className="text-[10px] text-slate-400">Jalur Selatan</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Plat E / Z (Jabar)</span>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">{platCounts.platE + platCounts.platZ}</span>
          <span className="text-[10px] text-slate-400">Cirebon & Priangan</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 block">Supir Dokumen Aktif</span>
          <span className="text-sm font-black text-emerald-900 mt-1 truncate block">
            {activeSupirName || '-'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{activeNopol || 'Belum dipilih'}</span>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama supir atau nopol (misal: Abdul, 9664, TG)..."
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

        {/* Region Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-semibold text-[11px]">Filter Plat:</span>
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'G', label: 'Plat G' },
            { id: 'R', label: 'Plat R' },
            { id: 'E', label: 'Plat E' },
            { id: 'Z', label: 'Plat Z' },
            { id: 'AA', label: 'Plat AA' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedPlatArea(tab.id)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                selectedPlatArea === tab.id
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABEL DAFTAR SUPIR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3 w-12 text-center">No.</th>
                <th className="py-3 px-4">Nama Supir / Pengemudi</th>
                <th className="py-3 px-4 w-44">Nomor Polisi (Nopol)</th>
                <th className="py-3 px-4">Armada / Jenis Kendaraan</th>
                <th className="py-3 px-4 w-36">Kontak</th>
                <th className="py-3 px-4 text-center w-48">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">Tidak ditemukan supir yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coba ubah kata kunci pencarian atau reset filter wilayah
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((supir, idx) => {
                  const originalIndex = supirList.findIndex(
                    (s) => s.nama === supir.nama && s.nopol === supir.nopol
                  );
                  const isCurrentActive =
                    activeSupirName &&
                    activeSupirName.toLowerCase() === supir.nama.toLowerCase();

                  return (
                    <tr
                      key={`${supir.nama}-${supir.nopol}-${idx}`}
                      className={`hover:bg-emerald-50/50 transition ${
                        isCurrentActive ? 'bg-emerald-50/80 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 tracking-wide">
                            {supir.nama}
                          </span>
                          {isCurrentActive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white shadow-2xs">
                              Aktif
                            </span>
                          )}
                        </div>
                        {supir.catatan && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                            {supir.catatan}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {/* Authentic Indonesian Plate Badge */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white rounded-md border border-slate-700 shadow-2xs font-mono font-black tracking-wider text-[11.5px]">
                          <span>{supir.nopol}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{supir.jenisKendaraan || 'Truk Sedang (Colt Diesel)'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {supir.kontak ? (
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{supir.kontak}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectForForm(supir)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Gunakan pengemudi ini ke Formulir Angkutan"
                          >
                            <span>Gunakan</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(originalIndex)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit data supir"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(originalIndex)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Hapus supir ini"
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

        {/* Footer Table */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan {filteredList.length} dari {supirList.length} total supir terdaftar
          </span>
          <span className="text-[11px] text-slate-400">
            Ketik nama supir atau nomor polisi di formulir untuk mengisi otomatis
          </span>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT SUPIR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Truck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingIndex !== null ? 'Edit Data Supir' : 'Tambah Supir Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Master armada angkutan kayu TPK Talok</p>
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
                  Nama Supir / Pengemudi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ABDUL"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold uppercase text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nomor Polisi (Nopol) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: G 9664 TG"
                  value={formData.nopol}
                  onChange={(e) => setFormData({ ...formData, nopol: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold uppercase tracking-wider text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Kendaraan</label>
                <select
                  value={formData.jenisKendaraan}
                  onChange={(e) => setFormData({ ...formData, jenisKendaraan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                >
                  {JENIS_KENDARAAN.map((k, idx) => (
                    <option key={`jk-${idx}`} value={k} className="text-slate-900 bg-white font-medium">
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No. Kontak / HP</label>
                <input
                  type="text"
                  placeholder="Contoh: 0812-3456-7890 (Opsional)"
                  value={formData.kontak || ''}
                  onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan sopir atau armada (opsional)"
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
                  {editingIndex !== null ? 'Perbarui Supir' : 'Simpan Supir'}
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
              <h3 className="font-bold text-sm text-slate-900">Hapus Supir?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Apakah Anda yakin ingin menghapus supir <strong>"{deleteConfirm.name}"</strong> dari master data TPK Talok?
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
