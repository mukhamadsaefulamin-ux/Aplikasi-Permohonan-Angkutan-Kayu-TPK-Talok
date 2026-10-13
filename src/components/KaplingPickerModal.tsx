import React, { useState, useMemo } from 'react';
import { PihakKetigaItem, PermohonanData, KayuItem } from '../types';
import { DATA_PEMBELI } from '../data/masterData';
import { getUsedKaplingsMap } from '../utils/autoFillHelpers';
import { Search, CheckCircle, Package, ArrowRight, X, CheckSquare, Square, AlertOctagon, Lock } from 'lucide-react';

interface KaplingPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItems: PihakKetigaItem[];
  onSelectKapling: (selectedItems: PihakKetigaItem[]) => void;
  savedHistory?: PermohonanData[];
  currentItems?: KayuItem[];
  currentDocId?: string;
}

export const KaplingPickerModal: React.FC<KaplingPickerModalProps> = ({
  isOpen,
  onClose,
  inventoryItems,
  onSelectKapling,
  savedHistory = [],
  currentItems = [],
  currentDocId,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  // Calculate used kaplings map from saved history
  const usedKaplingsMap = useMemo(() => {
    return getUsedKaplingsMap(savedHistory, currentDocId);
  }, [savedHistory, currentDocId]);

  // Set of kaplings currently present in current permohonan items table
  const activeDocKaplingSet = useMemo(() => {
    const set = new Set<string>();
    currentItems.forEach((item) => {
      if (item.noKapling && item.noKapling.trim()) {
        set.add(item.noKapling.trim().toLowerCase());
      }
    });
    return set;
  }, [currentItems]);

  if (!isOpen) return null;

  const filtered = inventoryItems.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.noKapling.toLowerCase().includes(q) ||
      item.noInvoice.toLowerCase().includes(q) ||
      item.pembeli.toLowerCase().includes(q) ||
      item.jenisKayu.toLowerCase().includes(q) ||
      item.noBlok.toLowerCase().includes(q)
    );
  });

  // Calculate available vs used kaplings
  const usedCount = filtered.filter((item) => {
    const kKey = item.noKapling.trim().toLowerCase();
    return usedKaplingsMap.has(kKey) || activeDocKaplingSet.has(kKey);
  }).length;
  const availableCount = filtered.length - usedCount;

  const isItemUsed = (item: PihakKetigaItem) => {
    if (!item.noKapling) return false;
    const kKey = item.noKapling.trim().toLowerCase();
    return usedKaplingsMap.has(kKey) || activeDocKaplingSet.has(kKey);
  };

  const getItemUsageDetails = (item: PihakKetigaItem) => {
    if (!item.noKapling) return null;
    const kKey = item.noKapling.trim().toLowerCase();
    if (activeDocKaplingSet.has(kKey)) {
      return { label: 'Sudah dimasukkan di baris lain formulir ini', badge: 'Baris Aktif' };
    }
    const info = usedKaplingsMap.get(kKey);
    if (info) {
      return {
        label: `Sudah terpakai pada Kwitansi/Doc "${info.noKwitansi}" (${info.tanggal})`,
        badge: info.noKwitansi || 'Tersimpan',
      };
    }
    return null;
  };

  const toggleSelect = (item: PihakKetigaItem) => {
    if (isItemUsed(item)) return; // Prevent selecting used kapling

    if (selectedIds.includes(item.id)) {
      setSelectedIds(selectedIds.filter((i) => i !== item.id));
    } else {
      setSelectedIds([...selectedIds, item.id]);
    }
  };

  const handleSelectSingle = (item: PihakKetigaItem) => {
    if (isItemUsed(item)) return;
    onSelectKapling([item]);
    onClose();
  };

  const handleApplySelected = () => {
    const selected = inventoryItems.filter(
      (item) => selectedIds.includes(item.id) && !isItemUsed(item)
    );
    if (selected.length > 0) {
      onSelectKapling(selected);
      onClose();
    }
  };

  const availableFiltered = filtered.filter((item) => !isItemUsed(item));

  const handleSelectAllFiltered = () => {
    const availableIds = availableFiltered.map((item) => item.id);
    const allSelected = availableIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !availableIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...availableIds])));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span>Pilih Kapling dari Persediaan Kayu TPK Talok</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                  Proteksi Duplikasi Otomatis
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kapling yang sudah terpakai di SKSHHK / dokumen lain otomatis dikunci dan tidak bisa digunakan ulang
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor kapling, nomor invoice, nama pembeli, jenis kayu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] font-bold text-slate-600 px-2 py-1 bg-white border border-slate-200 rounded-lg hidden sm:block">
              <span className="text-emerald-700">{availableCount} Tersedia</span> •{' '}
              <span className="text-rose-600">{usedCount} Sudah Dipakai</span>
            </div>

            <button
              type="button"
              onClick={handleSelectAllFiltered}
              disabled={availableFiltered.length === 0}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {selectedIds.length > 0 &&
              availableFiltered.every((item) => selectedIds.includes(item.id)) ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Batal Pilih Semua</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pilih Tersedia ({availableFiltered.length})</span>
                </>
              )}
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleApplySelected}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Terapkan Terpilih ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
              <p className="text-sm font-semibold">Tidak ditemukan data kapling yang cocok</p>
              <p className="text-xs text-slate-400 mt-1">Coba kata kunci pencarian yang lain</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const used = isItemUsed(item);
                const usageInfo = getItemUsageDetails(item);

                return (
                  <div
                    key={item.id}
                    onClick={() => !used && toggleSelect(item)}
                    className={`p-3.5 rounded-xl border transition flex flex-wrap items-center justify-between gap-3 ${
                      used
                        ? 'bg-rose-50/40 border-rose-200 opacity-75 cursor-not-allowed'
                        : isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-xs cursor-pointer'
                        : 'bg-white hover:bg-slate-50 border-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={used}
                        checked={isSelected && !used}
                        onChange={() => {}} // handled by parent onClick
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 disabled:opacity-50"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-extrabold text-sm font-mono ${
                              used ? 'text-rose-900 line-through' : 'text-slate-900'
                            }`}
                          >
                            {item.noKapling}
                          </span>

                          {used ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white uppercase inline-flex items-center gap-1 shadow-2xs">
                              <Lock className="w-3 h-3" />
                              <span>SUDAH DIPAKAI</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                              TERSEDIA • {item.jenisKayu}
                            </span>
                          )}

                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            Sort: {item.sortimen}
                          </span>
                          {item.noBlok && (
                            <span className="text-[11px] text-slate-500">Blok: {item.noBlok}</span>
                          )}
                        </div>

                        {used && usageInfo ? (
                          <div className="text-xs text-rose-700 font-bold mt-1 flex items-center gap-1">
                            <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                            <span>{usageInfo.label}</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                            {item.noInvoice && (
                              <span>
                                Invoice: <strong className="text-slate-800">{item.noInvoice}</strong>
                              </span>
                            )}
                            {item.pembeli && (
                              <span>
                                Pembeli: <strong className="text-slate-800">{item.pembeli}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                      <div className="text-right">
                        <div
                          className={`text-sm font-extrabold ${
                            used ? 'text-slate-400' : 'text-emerald-700'
                          }`}
                        >
                          {item.volume ? `${Number(item.volume).toFixed(2)} m³` : '-'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.batang ? `${item.batang} Batang` : '-'}
                        </div>
                      </div>

                      {used ? (
                        <button
                          type="button"
                          disabled
                          className="px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-100 rounded-lg opacity-80 cursor-not-allowed inline-flex items-center gap-1"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Terkunci</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSingle(item);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                          title="Langsung gunakan kapling ini"
                        >
                          <span>Pilih Ini</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total {inventoryItems.length} kapling ({availableCount} Tersedia, {usedCount} Sudah Dipakai)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleApplySelected}
                className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Terapkan ({selectedIds.length} Kapling)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
