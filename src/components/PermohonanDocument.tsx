import React, { useState, useMemo, useEffect } from 'react';
import { PermohonanData, PihakKetigaItem, KayuItem, SupirInfo, PembeliInfo } from '../types';
import {
  DATA_SUPIR,
  DATA_PEMBELI,
  DATA_PEJABAT,
  JENIS_KENDARAAN,
  JENIS_KAYU_LIST,
  SORTIMEN_LIST,
  getKapasitasKendaraan,
  KAPASITAS_STANDAR_KENDARAAN
} from '../data/masterData';
import {
  formatIndonesianDate,
  parseDateString,
  findSupir,
  findPembeli,
  findPejabat,
  findKapling,
  findKaplingsByInvoice,
  generateAutoDkhp,
  generateAutoNoSeri,
  getUsedKaplingsMap,
  findMatchingDocumentsByVolumeSupir
} from '../utils/autoFillHelpers';
import { SmartAutocomplete, AutocompleteOption } from './SmartAutocomplete';
import { PerhutaniLogo } from './PerhutaniLogo';
import { DocumentWatermark } from './DocumentWatermark';
import { KaplingPickerModal } from './KaplingPickerModal';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Truck,
  X,
  Sparkles,
  Calendar,
  Package,
  UserCheck,
  Building2,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

interface PermohonanDocumentProps {
  data: PermohonanData;
  onChange: (updated: PermohonanData) => void;
  pihakKetigaItems: PihakKetigaItem[];
  supirList?: SupirInfo[];
  savedHistory?: PermohonanData[];
}

export const PermohonanDocument: React.FC<PermohonanDocumentProps> = ({
  data,
  onChange,
  pihakKetigaItems,
  supirList = DATA_SUPIR,
  savedHistory = [],
}) => {
  const [showKapasitasModal, setShowKapasitasModal] = useState(false);
  const [isKaplingPickerOpen, setIsKaplingPickerOpen] = useState(false);
  const [autoFillNotice, setAutoFillNotice] = useState<string | null>(null);

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

  useEffect(() => {
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

  // Synchronize and validate No. Invoice / Kwitansi based on kapling selection
  // If kaplings have DIFFERENT invoice numbers, noKwitansi is blanked out.
  // Unless ALL kapling items share the exact same invoice number.
  useEffect(() => {
    if (!data.items || data.items.length === 0 || !pihakKetigaItems || pihakKetigaItems.length === 0) {
      return;
    }

    const filledItems = data.items.filter((it) => it.noKapling && it.noKapling.trim() !== '');
    if (filledItems.length === 0) return;

    const invoicesSet = new Set<string>();
    filledItems.forEach((it) => {
      const matched = findKapling(it.noKapling.trim(), pihakKetigaItems);
      if (matched && matched.noInvoice && matched.noInvoice.trim() !== '') {
        invoicesSet.add(matched.noInvoice.trim());
      }
    });

    const invoiceList = Array.from(invoicesSet);

    if (invoiceList.length > 1) {
      // Different invoice numbers found -> Leave no. invoice BLANK
      if (data.noKwitansi !== '') {
        onChange({
          ...data,
          noKwitansi: '',
        });
        showNotice('⚠️ No. Invoice / Kwitansi dikosongkan karena No. Kapling berasal dari No. Invoice yang berbeda.');
      }
    } else if (invoiceList.length === 1) {
      // All kaplings belong to the SAME invoice number
      const singleInvoice = invoiceList[0];
      if (data.noKwitansi !== singleInvoice) {
        onChange({
          ...data,
          noKwitansi: singleInvoice,
        });
      }
    }
  }, [data.items, pihakKetigaItems]);

  const toggleWatermarkStyle = () => {
    if (!watermarkEnabled) {
      setWatermarkEnabled(true);
      setWatermarkStyle('clean');
      localStorage.setItem('tpk_watermark_enabled', 'true');
      localStorage.setItem('tpk_watermark_style', 'clean');
      showNotice('Watermark diaktifkan: Mode Clean & Halus (Rapi & Tidak Mengganggu).');
    } else if (watermarkStyle === 'clean') {
      setWatermarkStyle('ribbon');
      localStorage.setItem('tpk_watermark_style', 'ribbon');
      showNotice('Watermark diubah ke: Mode Pita Keamanan.');
    } else {
      setWatermarkEnabled(false);
      localStorage.setItem('tpk_watermark_enabled', 'false');
      showNotice('Watermark dinonaktifkan (Dokumen Polos & Bersih).');
    }
    window.dispatchEvent(new Event('tpk_watermark_update'));
  };

  // Helper trigger notifikasi pengisian otomatis
  const showNotice = (msg: string) => {
    setAutoFillNotice(msg);
    setTimeout(() => {
      setAutoFillNotice(null);
    }, 4000);
  };

  const updateField = (field: keyof PermohonanData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // ========================================================
  // SMART AUTOCOMPLETE DATA LISTS
  // ========================================================

  // 1. Opsi Pemohon (Gabungan Supir & Pembeli)
  const pemohonOptions = useMemo<AutocompleteOption[]>(() => {
    const drivers: AutocompleteOption[] = supirList.map((s) => ({
      id: `s-${s.nama}`,
      label: s.nama,
      subLabel: `Nopol: ${s.nopol} • Pengemudi / Sopir`,
      badge: 'Pengemudi',
      badgeColor: 'blue',
      data: { type: 'supir', ...s },
    }));

    const pembeliList: AutocompleteOption[] = DATA_PEMBELI.map((p) => ({
      id: `p-${p.nama}`,
      label: p.nama,
      subLabel: `${p.alamat}, ${p.kota} • Pembeli Kayu`,
      badge: 'Pembeli',
      badgeColor: 'emerald',
      data: { type: 'pembeli', ...p },
    }));

    return [...drivers, ...pembeliList];
  }, [supirList]);

  // 2. Opsi Supir
  const supirOptions = useMemo<AutocompleteOption<SupirInfo>[]>(() => {
    return supirList.map((s) => ({
      id: `sup-${s.nama}`,
      label: s.nama,
      subLabel: `Nopol: ${s.nopol}${s.jenisKendaraan ? ` • ${s.jenisKendaraan}` : ''}`,
      badge: 'Armada TPK',
      badgeColor: 'blue',
      data: s,
    }));
  }, [supirList]);

  // 3. Opsi Nopol
  const nopolOptions = useMemo<AutocompleteOption<SupirInfo>[]>(() => {
    return supirList.map((s) => ({
      id: `npl-${s.nopol}`,
      label: s.nopol,
      subLabel: `Pengemudi: ${s.nama}${s.jenisKendaraan ? ` (${s.jenisKendaraan})` : ''}`,
      badge: 'Nopol',
      badgeColor: 'purple',
      data: s,
    }));
  }, [supirList]);

  // 4. Opsi Kendaraan
  const kendaraanOptions = useMemo<AutocompleteOption<string>[]>(() => {
    return JENIS_KENDARAAN.map((k) => {
      const info = getKapasitasKendaraan(k);
      return {
        id: `knd-${k}`,
        label: k,
        subLabel: info ? `Kapasitas maks: ${info.maxM3} m³ (${info.label})` : 'Armada angkutan',
        badge: 'Armada',
        badgeColor: 'amber',
        data: k,
      };
    });
  }, []);

  // 5. Opsi Invoice dari Persediaan Pihak Ketiga
  const invoiceOptions = useMemo<AutocompleteOption<string>[]>(() => {
    const map = new Map<string, { count: number; pembeli: string; jenisKayu: string }>();
    pihakKetigaItems.forEach((pk) => {
      if (pk.noInvoice && pk.noInvoice.trim()) {
        const inv = pk.noInvoice.trim();
        const existing = map.get(inv) || { count: 0, pembeli: pk.pembeli || '', jenisKayu: pk.jenisKayu || '' };
        existing.count += 1;
        if (!existing.pembeli && pk.pembeli) existing.pembeli = pk.pembeli;
        map.set(inv, existing);
      }
    });

    return Array.from(map.entries()).map(([inv, info]) => ({
      id: `inv-${inv}`,
      label: inv,
      subLabel: `${info.count} kapling • Kayu: ${info.jenisKayu || '-'} • Pembeli: ${info.pembeli || '-'}`,
      badge: 'Invoice',
      badgeColor: 'emerald',
      data: inv,
    }));
  }, [pihakKetigaItems]);

  // 6. Opsi Pembeli / Rekanan
  const pembeliOptions = useMemo<AutocompleteOption<PembeliInfo>[]>(() => {
    return DATA_PEMBELI.map((p) => ({
      id: `pbl-${p.nama}`,
      label: p.nama,
      subLabel: `${p.alamat}, ${p.kota}`,
      badge: 'Pembeli',
      badgeColor: 'emerald',
      data: p,
    }));
  }, []);

  // 7. Opsi Pejabat Penerbit
  const pejabatOptions = useMemo<AutocompleteOption<any>[]>(() => {
    return DATA_PEJABAT.map((p) => ({
      id: `pjb-${p.nama}`,
      label: p.nama,
      subLabel: `${p.jabatan} • Reg: ${p.reg} • ${p.satker}`,
      badge: 'Pejabat',
      badgeColor: 'blue',
      data: p,
    }));
  }, []);

  // 8. Opsi Kelompok Kayu
  const jenisKayuOptions = useMemo<AutocompleteOption<string>[]>(() => {
    return JENIS_KAYU_LIST.map((jk) => ({
      id: `jk-${jk}`,
      label: jk,
      subLabel: 'Kelompok jenis kayu TPK Talok',
      badge: 'Kayu',
      badgeColor: 'emerald',
      data: jk,
    }));
  }, []);

  // 9. Opsi Sortimen
  const sortimenOptions = useMemo<AutocompleteOption<string>[]>(() => {
    return SORTIMEN_LIST.map((s) => ({
      id: `srt-${s}`,
      label: s,
      subLabel: s === 'AI' ? 'Diameter 10-19 cm' : s === 'AII' ? 'Diameter 20-29 cm' : 'Diameter ≥ 30 cm',
      badge: 'Sortimen',
      badgeColor: 'amber',
      data: s,
    }));
  }, []);

  // Map kapling yang sudah dipakai dari dokumen tersimpan
  const usedKaplingsMap = useMemo(() => {
    return getUsedKaplingsMap(savedHistory, data.id);
  }, [savedHistory, data.id]);

  // 10. Opsi Kapling untuk Tabel
  const kaplingOptions = useMemo<AutocompleteOption<PihakKetigaItem>[]>(() => {
    return pihakKetigaItems
      .filter((pk) => pk.noKapling && pk.noKapling.trim())
      .map((pk) => {
        const kKey = pk.noKapling.trim().toLowerCase();
        const usage = usedKaplingsMap.get(kKey);
        const isUsed = Boolean(usage);
        return {
          id: `kpl-${pk.id}-${pk.noKapling}`,
          label: pk.noKapling,
          subLabel: isUsed
            ? `⛔ SUDAH DIPAKAI (Kwitansi: ${usage?.noKwitansi || usage?.docId} • ${usage?.tanggal})`
            : `${pk.jenisKayu} • Sort ${pk.sortimen || 'AII'} • ${pk.batang} Btg • ${pk.volume} m³ • ${pk.pembeli || '-'}`,
          badge: isUsed ? 'SUDAH DIPAKAI' : pk.sortimen || 'Kapling',
          badgeColor: isUsed ? 'rose' : 'emerald',
          disabled: isUsed,
          disabledReason: usage ? `Terpakai di Kwitansi ${usage.noKwitansi}` : undefined,
          data: pk,
        };
      });
  }, [pihakKetigaItems, usedKaplingsMap]);

  // ========================================================
  // SELECTION & TYPING HANDLERS UNTUK AUTO-FILL OTOMATIS
  // ========================================================

  const handleSelectPemohonOption = (item: any) => {
    if (item.type === 'supir' || (!item.type && item.nopol)) {
      onChange({
        ...data,
        namaPemohon: item.nama,
        namaSupir: item.nama,
        nopol: item.nopol,
        pekerjaanPemohon: 'Sopir / Pengemudi',
      });
      showNotice(`Data pengemudi "${item.nama}" & Nopol "${item.nopol}" terisi otomatis!`);
    } else if (item.type === 'pembeli' || (!item.type && item.alamat)) {
      const fullAddress = `${item.alamat}, ${item.kota}`;
      onChange({
        ...data,
        namaPemohon: item.nama,
        pekerjaanPemohon: 'Wiraswasta / Pembeli Kayu',
        alamatPemohon: fullAddress,
        namaPenerima: data.namaPenerima || item.nama,
        alamatPenerima: data.alamatPenerima || fullAddress,
        namaTujuan: data.namaTujuan || item.nama,
        alamatTujuan: data.alamatTujuan || fullAddress,
      });
      showNotice(`Data pembeli "${item.nama}" & alamat terisi otomatis!`);
    } else {
      updateField('namaPemohon', item.nama || item);
    }
  };

  const handlePemohonChange = (typedVal: string) => {
    // 1. Cek kecocokan supir
    const supir = findSupir(typedVal, supirList);
    if (supir) {
      onChange({
        ...data,
        namaPemohon: typedVal,
        namaSupir: supir.nama,
        nopol: supir.nopol,
        pekerjaanPemohon: 'Sopir / Pengemudi',
      });
      showNotice(`Pengemudi "${supir.nama}" & Nopol "${supir.nopol}" terisi otomatis!`);
      return;
    }

    // 2. Cek kecocokan pembeli
    const pembeli = findPembeli(typedVal);
    if (pembeli) {
      const fullAddress = `${pembeli.alamat}, ${pembeli.kota}`;
      onChange({
        ...data,
        namaPemohon: typedVal,
        pekerjaanPemohon: 'Wiraswasta / Pembeli Kayu',
        alamatPemohon: fullAddress,
        namaPenerima: data.namaPenerima || pembeli.nama,
        alamatPenerima: data.alamatPenerima || fullAddress,
        namaTujuan: data.namaTujuan || pembeli.nama,
        alamatTujuan: data.alamatTujuan || fullAddress,
      });
      showNotice(`Pembeli "${pembeli.nama}" & alamat tujuan terisi otomatis!`);
      return;
    }

    // Default jika belum cocok
    updateField('namaPemohon', typedVal);
  };

  const handleSelectSupirOption = (supir: SupirInfo) => {
    onChange({
      ...data,
      namaSupir: supir.nama,
      nopol: supir.nopol,
      namaPemohon: !data.namaPemohon || data.namaPemohon === data.namaSupir ? supir.nama : data.namaPemohon,
      pekerjaanPemohon: !data.namaPemohon || data.namaPemohon === data.namaSupir ? 'Sopir / Pengemudi' : data.pekerjaanPemohon,
    });
    showNotice(`Supir "${supir.nama}" & Nopol "${supir.nopol}" terisi otomatis!`);
  };

  const handleSupirChange = (typedVal: string) => {
    const supir = findSupir(typedVal, supirList);
    if (supir) {
      onChange({
        ...data,
        namaSupir: typedVal,
        nopol: supir.nopol,
        namaPemohon: !data.namaPemohon || data.namaPemohon === data.namaSupir ? supir.nama : data.namaPemohon,
        pekerjaanPemohon: !data.namaPemohon || data.namaPemohon === data.namaSupir ? 'Sopir / Pengemudi' : data.pekerjaanPemohon,
      });
      showNotice(`Nopol "${supir.nopol}" terisi otomatis untuk pengemudi "${supir.nama}"!`);
      return;
    }
    updateField('namaSupir', typedVal);
  };

  const handleSelectNopolOption = (supir: SupirInfo) => {
    onChange({
      ...data,
      nopol: supir.nopol,
      namaSupir: supir.nama,
      namaPemohon: !data.namaPemohon || data.namaPemohon === data.namaSupir ? supir.nama : data.namaPemohon,
      pekerjaanPemohon: !data.namaPemohon || data.namaPemohon === data.namaSupir ? 'Sopir / Pengemudi' : data.pekerjaanPemohon,
    });
    showNotice(`Nopol "${supir.nopol}" & Supir "${supir.nama}" terisi otomatis!`);
  };

  const handleNopolChange = (typedVal: string) => {
    const upper = typedVal.toUpperCase();
    const supir = findSupir(upper, supirList);
    if (supir) {
      onChange({
        ...data,
        nopol: upper,
        namaSupir: supir.nama,
        namaPemohon: !data.namaPemohon || data.namaPemohon === data.namaSupir ? supir.nama : data.namaPemohon,
        pekerjaanPemohon: !data.namaPemohon || data.namaPemohon === data.namaSupir ? 'Sopir / Pengemudi' : data.pekerjaanPemohon,
      });
      showNotice(`Pengemudi "${supir.nama}" terisi otomatis dari Nopol "${upper}"!`);
      return;
    }
    updateField('nopol', upper);
  };

  const handleSelectPenerimaOption = (pembeli: PembeliInfo) => {
    const fullAddress = `${pembeli.alamat}, ${pembeli.kota}`;
    onChange({
      ...data,
      namaPenerima: pembeli.nama,
      alamatPenerima: fullAddress,
      namaTujuan: data.namaTujuan || pembeli.nama,
      alamatTujuan: data.alamatTujuan || fullAddress,
    });
    showNotice(`Penerima "${pembeli.nama}" & alamat tujuan terisi otomatis!`);
  };

  const handlePenerimaChange = (typedVal: string) => {
    const pembeli = findPembeli(typedVal);
    if (pembeli) {
      const fullAddress = `${pembeli.alamat}, ${pembeli.kota}`;
      onChange({
        ...data,
        namaPenerima: typedVal,
        alamatPenerima: fullAddress,
        namaTujuan: !data.namaTujuan || data.namaTujuan === data.namaPenerima ? pembeli.nama : data.namaTujuan,
        alamatTujuan: !data.alamatTujuan || data.alamatTujuan === data.alamatPenerima ? fullAddress : data.alamatTujuan,
      });
      showNotice(`Alamat "${fullAddress}" terisi otomatis untuk penerima "${pembeli.nama}"!`);
      return;
    }
    updateField('namaPenerima', typedVal);
  };

  const handleSelectTujuanOption = (pembeli: PembeliInfo) => {
    const fullAddress = `${pembeli.alamat}, ${pembeli.kota}`;
    onChange({
      ...data,
      namaTujuan: pembeli.nama,
      alamatTujuan: fullAddress,
    });
    showNotice(`Tujuan bongkar "${pembeli.nama}" & alamat terisi otomatis!`);
  };

  const handleTujuanChange = (typedVal: string) => {
    const pembeli = findPembeli(typedVal);
    if (pembeli) {
      const fullAddress = `${pembeli.alamat}, ${pembeli.kota}`;
      onChange({
        ...data,
        namaTujuan: typedVal,
        alamatTujuan: fullAddress,
      });
      showNotice(`Alamat bongkar "${fullAddress}" terisi otomatis!`);
      return;
    }
    updateField('namaTujuan', typedVal);
  };

  const handleSelectPejabatOption = (pejabat: any) => {
    onChange({
      ...data,
      pejabatNama: pejabat.nama,
      pejabatReg: pejabat.reg,
      pejabatJabatan: pejabat.jabatan,
      pejabatSatker: pejabat.satker,
    });
    showNotice(`Pejabat "${pejabat.nama}" (Reg: ${pejabat.reg}) terisi otomatis!`);
  };

  const handlePejabatChange = (nama: string) => {
    const found = findPejabat(nama);
    if (found) {
      onChange({
        ...data,
        pejabatNama: nama,
        pejabatReg: found.reg,
        pejabatJabatan: found.jabatan,
        pejabatSatker: found.satker,
      });
      showNotice(`Pejabat "${found.nama}" (Reg: ${found.reg}) terisi otomatis!`);
      return;
    }
    updateField('pejabatNama', nama);
  };

  const handleApplyKaplingToRow = (rowId: number | string, matched: PihakKetigaItem) => {
    const newItems = data.items.map((item) => {
      if (item.id === rowId) {
        return {
          ...item,
          noKapling: matched.noKapling,
          sort: matched.sortimen || item.sort || 'AII',
          btg: matched.batang || item.btg,
          m3: matched.volume || item.m3,
        };
      }
      return item;
    });

    const updates: Partial<PermohonanData> = { items: newItems };

    if (matched.jenisKayu && (!data.jenisKayu || data.jenisKayu === 'PINUS')) {
      updates.jenisKayu = matched.jenisKayu;
    }
    const invoicesSet = new Set<string>();
    newItems.forEach((it) => {
      if (!it.noKapling || !it.noKapling.trim()) return;
      const m = findKapling(it.noKapling.trim(), pihakKetigaItems);
      if (m && m.noInvoice && m.noInvoice.trim()) {
        invoicesSet.add(m.noInvoice.trim());
      }
    });

    if (invoicesSet.size > 1) {
      updates.noKwitansi = '';
    } else if (invoicesSet.size === 1) {
      updates.noKwitansi = Array.from(invoicesSet)[0];
    }
    if (matched.pembeli && !data.namaPenerima) {
      updates.namaPenerima = matched.pembeli;
      const buyerInfo = findPembeli(matched.pembeli);
      if (buyerInfo) {
        const fullAddress = `${buyerInfo.alamat}, ${buyerInfo.kota}`;
        updates.alamatPenerima = fullAddress;
        if (!data.namaTujuan) {
          updates.namaTujuan = buyerInfo.nama;
          updates.alamatTujuan = fullAddress;
        }
      }
    }

    onChange({ ...data, ...updates });
    showNotice(
      `Kapling "${matched.noKapling}": Sortimen ${matched.sortimen || 'AII'}, ${matched.batang} Btg, ${matched.volume} m³ terisi otomatis!`
    );
  };

  // ========================================================
  // SISTEM PENGISIAN OTOMATIS: INVOICE / KWITANSI
  // ========================================================
  const handleInvoiceChange = (invoice: string) => {
    updateField('noKwitansi', invoice);
    if (!invoice || !invoice.trim()) return;

    const matchedKaplings = findKaplingsByInvoice(invoice, pihakKetigaItems);
    if (matchedKaplings.length > 0) {
      const first = matchedKaplings[0];
      const buyerInfo = first.pembeli ? findPembeli(first.pembeli) : null;
      const fullAddress = buyerInfo ? `${buyerInfo.alamat}, ${buyerInfo.kota}` : '';

      const newItems: KayuItem[] = matchedKaplings.map((k, idx) => ({
        id: Date.now() + idx,
        noKapling: k.noKapling,
        sort: k.sortimen || 'AII',
        btg: k.batang || '',
        m3: k.volume || '',
      }));

      onChange({
        ...data,
        noKwitansi: invoice,
        jenisKayu: first.jenisKayu || data.jenisKayu,
        items: newItems,
        namaPenerima: first.pembeli || data.namaPenerima,
        alamatPenerima: fullAddress || data.alamatPenerima,
        namaTujuan: first.pembeli || data.namaTujuan,
        alamatTujuan: fullAddress || data.alamatTujuan,
      });

      showNotice(
        `Invoice "${invoice}": ${matchedKaplings.length} kapling, jenis kayu, dan data pembeli terisi otomatis!`
      );
    }
  };

  // ========================================================
  // SISTEM PENGISIAN OTOMATIS: BARIS KAPLING
  // ========================================================
  const handleItemChange = (id: number | string, field: keyof KayuItem, value: any) => {
    if (field === 'noKapling') {
      const rawVal = String(value || '');
      const parts = rawVal.split(',').map((p) => p.trim()).filter(Boolean);

      let totalBtg = 0;
      let totalM3 = 0;
      let matchedSortimen = '';
      let matchedKayu = '';
      let matchedPembeli = '';
      let matchedCount = 0;

      parts.forEach((part) => {
        const m = findKapling(part, pihakKetigaItems);
        if (m) {
          matchedCount++;
          totalBtg += (typeof m.batang === 'number' ? m.batang : parseInt(String(m.batang)) || 0);
          totalM3 += (typeof m.volume === 'number' ? m.volume : parseFloat(String(m.volume)) || 0);
          if (!matchedSortimen && m.sortimen) matchedSortimen = m.sortimen;
          if (!matchedKayu && m.jenisKayu) matchedKayu = m.jenisKayu;
          if (!matchedPembeli && m.pembeli) matchedPembeli = m.pembeli;
        }
      });

      const newItems = data.items.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            noKapling: rawVal,
            ...(matchedCount > 0
              ? {
                  sort: matchedSortimen || item.sort || 'AII',
                  btg: totalBtg > 0 ? String(totalBtg) : item.btg,
                  m3: totalM3 > 0 ? totalM3.toFixed(2) : item.m3,
                }
              : {}),
          };
        }
        return item;
      });

      const updates: Partial<PermohonanData> = { items: newItems };
      if (matchedKayu && (!data.jenisKayu || data.jenisKayu === 'PINUS')) {
        updates.jenisKayu = matchedKayu;
      }
      if (matchedPembeli && !data.namaPenerima) {
        updates.namaPenerima = matchedPembeli;
        const buyer = findPembeli(matchedPembeli);
        if (buyer) {
          const fullAddr = `${buyer.alamat}, ${buyer.kota}`;
          updates.alamatPenerima = fullAddr;
          if (!data.namaTujuan) {
            updates.namaTujuan = buyer.nama;
            updates.alamatTujuan = fullAddr;
          }
        }
      }

      onChange({ ...data, ...updates });
      if (matchedCount > 0) {
        showNotice(
          `Terdeteksi ${matchedCount} kapling ("${rawVal}"): Total ${totalBtg} Btg, ${totalM3.toFixed(2)} m³ terisi otomatis!`
        );
      }
      return;
    }

    const newItems = data.items.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    updateField('items', newItems);
  };

  const addItem = () => {
    updateField('items', [
      ...data.items,
      { id: Date.now(), noKapling: '', sort: 'AII', btg: '', m3: '' },
    ]);
  };

  const removeItem = (id: number | string) => {
    if (data.items.length > 1) {
      updateField(
        'items',
        data.items.filter((item) => item.id !== id)
      );
    }
  };

  // ========================================================
  // SISTEM PENGISIAN OTOMATIS: TANGGAL & HARI
  // ========================================================
  const handleDateSync = (dateVal: string | Date) => {
    let parsed = null;
    if (dateVal instanceof Date) {
      parsed = formatIndonesianDate(dateVal);
    } else if (typeof dateVal === 'string') {
      parsed = parseDateString(dateVal);
    }

    if (parsed) {
      onChange({
        ...data,
        tanggalKwitansi: parsed.tanggal,
        bulanKwitansi: parsed.bulan,
        tahunKwitansi: parsed.tahun,
        tanggalAngkutan: parsed.tanggalFormatted,
        hariBeritaAcara: parsed.hari,
        tanggalBeritaAcara: parsed.tanggalFormatted,
      });
      showNotice(`Semua kolom tanggal & hari disinkronkan ke: ${parsed.hari}, ${parsed.tanggalFormatted}.`);
    } else if (typeof dateVal === 'string') {
      updateField('tanggalAngkutan', dateVal);
    }
  };

  // Terapkan pemilihan kapling dari KaplingPickerModal
  const handleSelectKaplingFromModal = (selectedItems: PihakKetigaItem[]) => {
    if (!selectedItems || selectedItems.length === 0) return;
    const first = selectedItems[0];
    const buyerInfo = first.pembeli ? findPembeli(first.pembeli) : null;
    const fullAddress = buyerInfo ? `${buyerInfo.alamat}, ${buyerInfo.kota}` : '';

    const newItems: KayuItem[] = selectedItems.map((item, idx) => ({
      id: Date.now() + idx,
      noKapling: item.noKapling,
      sort: item.sortimen || 'AII',
      btg: item.batang || '',
      m3: item.volume || '',
    }));

    // Check if selected kaplings have the exact same invoice number or different invoice numbers
    const selectedInvoices = Array.from(
      new Set(
        selectedItems
          .map((item) => item.noInvoice && item.noInvoice.trim())
          .filter(Boolean) as string[]
      )
    );

    const targetInvoice = selectedInvoices.length === 1 ? selectedInvoices[0] : '';

    onChange({
      ...data,
      noKwitansi: targetInvoice,
      jenisKayu: first.jenisKayu || data.jenisKayu,
      items: newItems,
      namaPenerima: first.pembeli || data.namaPenerima,
      alamatPenerima: fullAddress || data.alamatPenerima,
      namaTujuan: first.pembeli || data.namaTujuan,
      alamatTujuan: fullAddress || data.alamatTujuan,
    });

    if (selectedInvoices.length > 1) {
      showNotice(
        `Berhasil menerapkan ${selectedItems.length} kapling! No. Invoice dikosongkan karena kapling berasal dari No. Invoice yang berbeda.`
      );
    } else {
      showNotice(
        `Berhasil menerapkan ${selectedItems.length} kapling dari persediaan! Seluruh kolom formulir terisi otomatis.`
      );
    }
  };

  // Generate Nomor Otomatis untuk DKHP dan Seri SKSHHK
  const handleGenerateOfficialNumbers = () => {
    const firstKapling = data.items[0]?.noKapling || '';
    const newDkhp = generateAutoDkhp(data.tahunKwitansi, firstKapling);
    const newSeri = generateAutoNoSeri(data.tahunKwitansi);
    onChange({
      ...data,
      noDkhp: newDkhp,
      noSeri: newSeri,
    });
    showNotice(`Nomor DKHP (${newDkhp}) dan Seri SKSHHK (${newSeri}) berhasil dibuat otomatis.`);
  };

  // Total dan Kapasitas
  const totalBtg = data.items.reduce((sum, item) => {
    const clean = String(item.btg || '0').replace(/[^0-9]/g, '');
    const val = parseInt(clean, 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const totalM3 = data.items.reduce((sum, item) => {
    const normalized = String(item.m3 || '0').replace(',', '.');
    const val = parseFloat(normalized);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const kapasitasInfo = getKapasitasKendaraan(data.jenisKendaraan);
  const isOverload = Boolean(kapasitasInfo && totalM3 > kapasitasInfo.maxM3);
  const excessM3 = isOverload && kapasitasInfo ? totalM3 - kapasitasInfo.maxM3 : 0;
  const overloadPercent = isOverload && kapasitasInfo ? Math.round((totalM3 / kapasitasInfo.maxM3) * 100) : 0;

  // Otomatis Deteksi Dokumen Kembarnya dengan Volume, Batang & Supir SAMA tetapi No. DKHP BERBEDA
  const matchingDocs = useMemo(() => {
    return findMatchingDocumentsByVolumeSupir(data, savedHistory);
  }, [data, savedHistory]);

  // Daftar unik untuk datalist
  const uniqueInvoices = Array.from(
    new Set(pihakKetigaItems.map((p) => p.noInvoice).filter(Boolean))
  );

  return (
    <div id="cetak-angkutan" className="flex flex-col items-center w-full py-4 print:py-0">
      {/* NOTIFIKASI OTOMATIS: NOMOR DKHP / SERI GANDA */}
      {matchingDocs.length > 0 && (
        <div className="no-print w-full max-w-[215.9mm] lg:max-w-6xl mb-4 bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-4 text-rose-100 shadow-xl animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-500/30 text-rose-300 rounded-xl border border-rose-400/50 shrink-0">
              <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-extrabold text-sm text-rose-200 flex items-center gap-2">
                  <span>⚠️ NOMOR DKHP / NO. SERI GANDA TERDETEKSI</span>
                  <span className="px-2.5 py-0.5 text-[10px] font-black bg-rose-500 text-white rounded-full uppercase tracking-wider">
                    Ditolak Google Sheet
                  </span>
                </h4>
              </div>
              <p className="text-xs text-rose-100 mt-1.5 leading-relaxed font-medium">
                {matchingDocs[0].reason}
              </p>
              <p className="text-xs font-bold text-rose-200 mt-2 bg-rose-900/80 p-2.5 rounded-xl border border-rose-700/80 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                <span>🚫 <strong>PERBAIKAN SISTEM:</strong> Nomor DKHP atau Seri SKSHHK yang persis sama tidak dapat disimpan ganda. Harap gunakan Nomor DKHP / Seri baru untuk pengangkutan ini.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          BILAH ASISTEN PENGISIAN KOLOM OTOMATIS (NO-PRINT)
         ======================================================== */}
      <div className="no-print w-full max-w-[215.9mm] lg:max-w-6xl mb-4 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-4 shadow-lg border border-emerald-700/60 animate-in fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-700/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
              <Sparkles className="w-5 h-5 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Asisten Pengisian Kolom Otomatis TPK Talok</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-400 text-emerald-950 rounded-full">
                  Aktif
                </span>
              </h3>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                Pilih sumber data terdaftar untuk mengisi formulir permohonan & berita acara seketika
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-emerald-950/80 p-1 rounded-xl border border-emerald-700/60 text-xs">
              <span className="text-[10px] font-bold text-emerald-200 px-1">Unit:</span>
              <button
                type="button"
                onClick={() => updateField('lokasiTpk', 'TPK')}
                className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                  (data.lokasiTpk || 'TPK') === 'TPK'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'text-emerald-300 hover:text-white'
                }`}
                title="Kategorikan dokumen ini sebagai Angkutan TPK"
              >
                TPK
              </button>
              <button
                type="button"
                onClick={() => updateField('lokasiTpk', 'TPKH')}
                className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                  data.lokasiTpk === 'TPKH'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-emerald-300 hover:text-white'
                }`}
                title="Kategorikan dokumen ini sebagai Angkutan TPKH"
              >
                TPKH
              </button>
            </div>

            <button
              type="button"
              onClick={toggleWatermarkStyle}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer ${
                !watermarkEnabled
                  ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  : watermarkStyle === 'clean'
                  ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/50 hover:bg-emerald-500/40'
                  : 'bg-emerald-600 text-white border border-emerald-400 hover:bg-emerald-500'
              }`}
              title="Klik untuk mengubah gaya watermark (Clean / Pita Keamanan / Off)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>
                Watermark: {!watermarkEnabled ? 'Off (Polos)' : watermarkStyle === 'clean' ? 'Clean & Halus' : 'Pita Keamanan'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsKaplingPickerOpen(true)}
              className="px-3.5 py-1.5 text-xs font-extrabold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 rounded-xl transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-emerald-950" />
              <span>📦 Pilih dari Persediaan ({pihakKetigaItems.length} Kapling)</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateOfficialNumbers}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-500/50 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              title="Generate otomatis No. DKHP & Seri SKSHHK resmi"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Auto No. DKHP & Seri</span>
            </button>
          </div>
        </div>

        {/* Quick Autofill Controls Bar */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {/* 1. Atur Tanggal Otomatis */}
          <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-700/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-200 font-semibold mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                Tanggal & Hari
              </span>
              <button
                type="button"
                onClick={() => handleDateSync(new Date())}
                className="text-[10px] font-bold text-emerald-300 hover:text-white underline cursor-pointer"
              >
                Hari Ini
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                onChange={(e) => {
                  if (e.target.value) handleDateSync(e.target.value);
                }}
                className="w-full px-2 py-1 bg-emerald-900/90 text-white border border-emerald-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                title="Pilih tanggal untuk sinkronisasi otomatis ke semua kolom tanggal & hari"
              />
            </div>
          </div>

          {/* 2. Pilih Pengemudi / Nopol Cepat */}
          <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-700/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-200 font-semibold mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px]">
                <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                Pengemudi & Nopol
              </span>
              <span className="text-[10px] text-emerald-300">({supirList.length} Armada)</span>
            </div>
            <select
              onChange={(e) => {
                if (e.target.value) handleSupirChange(e.target.value);
              }}
              value={data.namaSupir || ''}
              className="w-full px-2 py-1 bg-emerald-900/90 text-white border border-emerald-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="">Pilih Supir Terdaftar...</option>
              {supirList.map((s, idx) => (
                <option key={`qsup-${idx}`} value={s.nama}>
                  {s.nama} ({s.nopol})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pilih Pembeli & Tujuan Cepat */}
          <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-700/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-200 font-semibold mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                Pembeli & Tujuan
              </span>
              <span className="text-[10px] text-emerald-300">({DATA_PEMBELI.length} Rekanan)</span>
            </div>
            <select
              onChange={(e) => {
                if (e.target.value) handlePenerimaChange(e.target.value);
              }}
              value={data.namaPenerima || ''}
              className="w-full px-2 py-1 bg-emerald-900/90 text-white border border-emerald-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="">Pilih Pembeli / Tujuan...</option>
              {DATA_PEMBELI.map((p, idx) => (
                <option key={`qpem-${idx}`} value={p.nama}>
                  {p.nama} ({p.kota})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Pilih Pejabat TPK Talok Cepat */}
          <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-700/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-200 font-semibold mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px]">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-300" />
                Pejabat Penerbit SKSHHK
              </span>
            </div>
            <select
              onChange={(e) => {
                if (e.target.value) handlePejabatChange(e.target.value);
              }}
              value={data.pejabatNama || ''}
              className="w-full px-2 py-1 bg-emerald-900/90 text-white border border-emerald-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="">Pilih Pejabat Terdaftar...</option>
              {DATA_PEJABAT.map((pj, idx) => (
                <option key={`qpj-${idx}`} value={pj.nama}>
                  {pj.nama} - {pj.jabatan}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner Notifikasi Pengisian Otomatis */}
        {autoFillNotice && (
          <div className="mt-2.5 py-1.5 px-3 bg-emerald-400 text-emerald-950 font-bold rounded-lg text-[11.5px] flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-900 flex-shrink-0" />
            <span>{autoFillNotice}</span>
          </div>
        )}
      </div>

      {/* ========================================================
          HALAMAN 1: RENCANA PENGANGKUTAN KAYU (F4 PORTRAIT)
         ======================================================== */}
      <div
        className="document-container text-black leading-snug relative"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px' }}
      >
        <DocumentWatermark variant="portrait" />

        <div className="relative z-10">
          {/* KOP SURAT */}
          <div className="relative mb-6 border-b border-black pb-3">
          <div className="flex items-center justify-between">
            <PerhutaniLogo size={52} />
            <div className="text-right text-[11px] text-slate-600 print:text-black">
              <span className="font-semibold block">PERUM PERHUTANI</span>
              <span>DIVISI REGIONAL JAWA TENGAH</span>
            </div>
          </div>
          <div className="text-center font-bold text-lg mt-3 uppercase tracking-wide">
            RENCANA PENGANGKUTAN KAYU
          </div>
        </div>

        {/* TUJUAN SURAT */}
        <div className="mb-4">
          <p>Kepada Yth.</p>
          <p className="font-bold">Pejabat Penerbit SKSHHK TPK TALOK</p>
          <p>Di</p>
          <p className="indent-8 font-semibold">- BANTARKAWUNG</p>
        </div>

        {/* IDENTITAS PEMOHON */}
        <div className="mb-4">
          <p>Yang bertanda tangan di bawah ini :</p>
          <div className="grid grid-cols-[120px_10px_1fr] items-center gap-y-1.5 mt-2 ml-4">
            <span className="font-medium">Nama</span>
            <span>:</span>
            <SmartAutocomplete
              value={data.namaPemohon}
              onChange={handlePemohonChange}
              onSelect={handleSelectPemohonOption}
              options={pemohonOptions}
              placeholder="Ketik nama pemohon, pengemudi, atau pembeli..."
              inputClassName="paper-input font-bold w-full"
              className="w-full"
              minDropdownWidth="min-w-[320px]"
              title="Ketik nama pemohon, pengemudi, atau pembeli (pilihan otomatis muncul)"
            />

            <span className="font-medium">Pekerjaan</span>
            <span>:</span>
            <input
              type="text"
              className="paper-input"
              placeholder="Pekerjaan Pemohon"
              value={data.pekerjaanPemohon}
              onChange={(e) => updateField('pekerjaanPemohon', e.target.value)}
            />

            <span className="self-start mt-1 font-medium">Alamat</span>
            <span className="self-start mt-1">:</span>
            <textarea
              rows={2}
              className="paper-input resize-none w-full"
              placeholder="Alamat Lengkap Pemohon"
              value={data.alamatPemohon}
              onChange={(e) => updateField('alamatPemohon', e.target.value)}
            />
          </div>
        </div>

        {/* PENGANTAR TABEL */}
        <div className="leading-relaxed mb-4 text-justify">
          Menyampaikan rencana pengangkutan atas pembelian kayu dengan kwitansi / invoice pembelian nomor{' '}
          <SmartAutocomplete
            value={data.noKwitansi}
            onChange={(val) => handleInvoiceChange(val)}
            onSelect={(inv: string) => handleInvoiceChange(inv)}
            options={invoiceOptions}
            placeholder="No. Invoice / Kwitansi"
            inputClassName="paper-input w-44 mx-1 text-center font-bold"
            className="inline-block"
            minDropdownWidth="min-w-[300px]"
            title="Ketik No. Invoice untuk mengisi kapling, kayu, dan pembeli otomatis"
          />{' '}
          tanggal{' '}
          <input
            type="text"
            className="paper-input w-12 mx-1 text-center"
            value={data.tanggalKwitansi}
            onChange={(e) => updateField('tanggalKwitansi', e.target.value)}
            title="Tanggal Kwitansi (Hari)"
          />{' '}
          bulan{' '}
          <input
            type="text"
            className="paper-input w-28 mx-1 text-center"
            value={data.bulanKwitansi}
            onChange={(e) => updateField('bulanKwitansi', e.target.value)}
            title="Bulan Kwitansi"
          />{' '}
          tahun{' '}
          <input
            type="text"
            className="paper-input w-16 mx-1 text-center"
            value={data.tahunKwitansi}
            onChange={(e) => updateField('tahunKwitansi', e.target.value)}
            title="Tahun Kwitansi"
          />{' '}
          kelompok jenis kayu{' '}
          <SmartAutocomplete
            value={data.jenisKayu}
            onChange={(val) => updateField('jenisKayu', val.toUpperCase())}
            onSelect={(jk: string) => {
              updateField('jenisKayu', jk);
              showNotice(`Kelompok jenis kayu diatur ke "${jk}".`);
            }}
            options={jenisKayuOptions}
            placeholder="Ketik/Pilih Kayu"
            inputClassName="paper-input w-36 mx-1 text-center font-bold uppercase"
            className="inline-block"
            uppercase
            minDropdownWidth="min-w-[200px]"
          />{' '}
          atas kapling sebagai berikut :
        </div>

        {/* NOTIFIKASI PERINGATAN OVERLOAD KAPASITAS KENDARAAN */}
        {isOverload && kapasitasInfo && (
          <div className="no-print my-3 p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl shadow-xs flex items-start gap-3 animate-in fade-in">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-amber-950 uppercase tracking-wide flex items-center gap-1.5 text-[12.5px]">
                  ⚠️ Peringatan Kelebihan Muatan Kendaraan ({overloadPercent}%)
                </span>
                <span className="px-2.5 py-0.5 bg-red-600 text-white font-bold rounded-full text-[11px] shadow-2xs">
                  Overload +{excessM3.toFixed(2)} m³
                </span>
              </div>
              <p className="text-amber-900 mt-1.5 leading-relaxed text-[12px]">
                Total volume kayu saat ini sebesar <strong>{totalM3.toFixed(2)} m³</strong> telah{' '}
                <strong>MELEBIHI kapasitas standar rekomendasi</strong> untuk armada{' '}
                <strong>{kapasitasInfo.label}</strong> (maksimal <strong>{kapasitasInfo.maxM3.toFixed(2)} m³</strong>).
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-amber-800 font-semibold">Saran:</span>
                <span className="text-slate-700 bg-white/90 px-2 py-0.5 rounded border border-amber-200">
                  Ganti ke armada lebih besar (misal: Fuso atau Tronton)
                </span>
                <span className="text-slate-700 bg-white/90 px-2 py-0.5 rounded border border-amber-200">
                  Kurangi volume atau bagi ke dalam 2 rit perjalanan
                </span>
                <button
                  type="button"
                  onClick={() => setShowKapasitasModal(true)}
                  className="text-amber-900 hover:text-amber-950 font-bold underline ml-auto cursor-pointer"
                >
                  Lihat Standar Kapasitas Semua Armada →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TABEL RINCIAN KAYU */}
        <div className="mb-4">
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100 print:bg-transparent text-center font-bold">
                <th className="border border-black p-1.5 w-10">No.</th>
                <th className="border border-black p-1.5">Nomor Kapling</th>
                <th className="border border-black p-1.5 w-24" title="Sortimen Kayu (AI, AII, AIII)">Sortimen</th>
                <th className="border border-black p-1.5 w-24">Btg</th>
                <th className="border border-black p-1.5 w-32">M3</th>
                <th className="border border-black p-1.5 w-12 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => {
                const kKey = item.noKapling ? item.noKapling.trim().toLowerCase() : '';
                const usageInfo = kKey ? usedKaplingsMap.get(kKey) : null;
                const isDupInDoc = kKey
                  ? data.items.some(
                      (it) => it.id !== item.id && it.noKapling && it.noKapling.trim().toLowerCase() === kKey
                    )
                  : false;
                const isInvalidKapling = Boolean(usageInfo || isDupInDoc);

                return (
                  <tr
                    key={item.id}
                    className={`text-xs ${
                      isInvalidKapling ? 'bg-rose-50/80 print:bg-transparent' : 'hover:bg-slate-50 print:bg-transparent'
                    }`}
                  >
                    <td className="border border-black p-1 text-center font-medium">{index + 1}</td>
                    <td className="border border-black p-1 relative">
                      <input
                        type="text"
                        value={item.noKapling || ''}
                        onChange={(e) => handleItemChange(item.id, 'noKapling', e.target.value)}
                        placeholder="Ketik/Pilih Kapling (misal: 4303, 4304)..."
                        className={`table-paper-input text-center px-2 font-bold w-full ${
                          usageInfo
                            ? 'text-rose-900 border-2 border-rose-500 bg-rose-100/70 font-extrabold'
                            : isDupInDoc
                            ? 'text-amber-900 border-2 border-amber-500 bg-amber-100/70 font-extrabold'
                            : ''
                        }`}
                        title={
                          usageInfo
                            ? `⛔ KAPLING INI SUDAH DIPAKAI di Kwitansi ${usageInfo.noKwitansi} (${usageInfo.tanggal})`
                            : isDupInDoc
                            ? '⚠️ Kapling ganda pada formulir ini'
                            : 'Ketik nomor kapling (bisa tunggal atau dipisahkan koma seperti: 4303, 4304, 4305)'
                        }
                      />
                      {usageInfo && (
                        <div className="no-print text-[9px] font-extrabold text-rose-800 bg-rose-100/90 px-1.5 py-0.5 rounded mt-0.5 border border-rose-300 flex items-center gap-1">
                          <span>⛔ Terpakai di Kwitansi: {usageInfo.noKwitansi}</span>
                        </div>
                      )}
                      {isDupInDoc && !usageInfo && (
                        <div className="no-print text-[9px] font-extrabold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded mt-0.5 border border-amber-300 flex items-center gap-1">
                          <span>⚠️ Duplikasi baris di formulir ini</span>
                        </div>
                      )}
                    </td>
                    <td className="border border-black p-1 relative">
                      <div className="relative flex items-center justify-center w-full">
                        <select
                          value={['AI', 'AII', 'AIII'].includes(item.sort?.toUpperCase()) ? item.sort.toUpperCase() : (item.sort || 'AII')}
                          onChange={(e) => handleItemChange(item.id, 'sort', e.target.value)}
                          className="table-paper-input uppercase text-center font-bold w-full cursor-pointer bg-transparent appearance-none pr-4 focus:bg-emerald-50 rounded-xs"
                          title="Pilih sortimen AI, AII, atau AIII"
                        >
                          {!['AI', 'AII', 'AIII'].includes(item.sort?.toUpperCase()) && item.sort && (
                            <option value={item.sort}>{item.sort}</option>
                          )}
                          <option value="AI">AI</option>
                          <option value="AII">AII</option>
                          <option value="AIII">AIII</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-700 pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 no-print" />
                      </div>
                    </td>
                    <td className="border border-black p-1">
                      <input
                        type="text"
                        value={item.btg ?? ''}
                        onChange={(e) => handleItemChange(item.id, 'btg', e.target.value)}
                        placeholder="0"
                        className="table-paper-input text-center font-bold"
                      />
                    </td>
                    <td className="border border-black p-1">
                      <input
                        type="text"
                        value={item.m3 ?? ''}
                        onChange={(e) => handleItemChange(item.id, 'm3', e.target.value)}
                        placeholder="0.00"
                        className="table-paper-input text-center font-bold"
                      />
                    </td>
                    <td className="border border-black p-1 text-center no-print">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1 inline-flex items-center justify-center rounded cursor-pointer"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className={`font-bold text-xs ${isOverload ? 'bg-amber-50 print:bg-transparent' : 'bg-slate-50 print:bg-transparent'}`}>
                <td colSpan={3} className="border border-black p-1.5 text-center uppercase tracking-wide">
                  Jumlah
                </td>
                <td className="border border-black p-1.5 text-center">{totalBtg || 0}</td>
                <td className={`border border-black p-1.5 text-center ${isOverload ? 'bg-amber-100 text-red-700' : ''}`}>
                  <div className="font-bold">{totalM3 > 0 ? totalM3.toFixed(2) : '0.00'}</div>
                  {isOverload && kapasitasInfo && (
                    <div className="no-print text-[9px] font-extrabold text-red-600 leading-tight mt-0.5">
                      ⚠️ Overload (+{excessM3.toFixed(2)} m³)
                    </div>
                  )}
                </td>
                <td className="border border-black p-1.5 text-center no-print">
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1 w-full flex items-center justify-center transition cursor-pointer"
                    title="Tambah baris kapling"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PENJELASAN PENGANGKUTAN */}
        <div className="mb-3">
          <p className="mb-1.5 leading-relaxed">
            Sehubungan dengan hal tersebut, mohon diterbitkan Surat Keterangan Sah Hasil Hutan Kayu
            (SKSHHK) atas angkutan kayu dimaksud.
          </p>
          <p className="mb-1.5 font-medium">Pengangkutan hasil hutan kayu diatas dilaksanakan dengan penjelasan :</p>

          <div className="ml-4 space-y-1.5">
            <div className="font-semibold text-slate-900">1. Alat Angkut</div>
            <div className="ml-6 grid grid-cols-[130px_10px_1fr] items-center gap-y-1">
              <span>a. Jenis Kendaraan</span>
              <span>:</span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 w-full">
                <SmartAutocomplete
                  value={data.jenisKendaraan}
                  onChange={(val) => updateField('jenisKendaraan', val)}
                  onSelect={(k: string) => {
                    updateField('jenisKendaraan', k);
                    showNotice(`Armada kendaraan diatur ke "${k}".`);
                  }}
                  options={kendaraanOptions}
                  placeholder="Pilih / Ketik Kendaraan..."
                  inputClassName="paper-input flex-1 w-full font-semibold"
                  className="flex-1"
                  minDropdownWidth="min-w-[260px]"
                />
                {kapasitasInfo && (
                  <span
                    className={`no-print text-[10.5px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 inline-flex items-center gap-1 ${
                      isOverload
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {isOverload ? (
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                    ) : (
                      <Truck className="w-3 h-3 text-emerald-700" />
                    )}
                    <span>Maks: {kapasitasInfo.maxM3} m³</span>
                    <span className="font-normal">
                      {isOverload ? `(+${excessM3.toFixed(2)} m³)` : '(Sesuai)'}
                    </span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowKapasitasModal(true)}
                  className="no-print text-slate-400 hover:text-emerald-700 p-0.5 transition cursor-pointer"
                  title="Lihat tabel standar kapasitas armada kayu TPK Talok"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              <span>b. Nama Supir</span>
              <span>:</span>
              <SmartAutocomplete
                value={data.namaSupir}
                onChange={handleSupirChange}
                onSelect={handleSelectSupirOption}
                options={supirOptions}
                placeholder="Pilih / Ketik Nama Supir..."
                inputClassName="paper-input w-full font-bold"
                className="w-full"
                minDropdownWidth="min-w-[280px]"
                title="Pilih supir untuk mengisi nopol dan pemohon otomatis"
              />

              <span>c. Nomor Polisi</span>
              <span>:</span>
              <SmartAutocomplete
                value={data.nopol}
                onChange={handleNopolChange}
                onSelect={handleSelectNopolOption}
                options={nopolOptions}
                placeholder="Contoh: G 9664 TG"
                inputClassName="paper-input font-bold tracking-wider uppercase w-full"
                className="w-full"
                uppercase
                minDropdownWidth="min-w-[280px]"
                title="Pilih atau ketik Nopol untuk mencari supir otomatis"
              />
            </div>

            <div className="mt-1 flex items-center">
              <span className="w-[140px] font-semibold text-slate-900">2. Tanggal Angkutan</span>
              <span className="mr-2">:</span>
              <input
                type="text"
                className="paper-input flex-1 font-bold"
                value={data.tanggalAngkutan}
                onChange={(e) => handleDateSync(e.target.value)}
                title="Format: 11 Oktober 2026 (otomatis menyelaraskan hari dan berita acara)"
              />
            </div>

            <div className="mt-1 font-semibold text-slate-900">3. Penerima</div>
            <div className="ml-6 grid grid-cols-[130px_10px_1fr] items-center gap-y-1">
              <span>a. Nama</span>
              <span>:</span>
              <SmartAutocomplete
                value={data.namaPenerima}
                onChange={handlePenerimaChange}
                onSelect={handleSelectPenerimaOption}
                options={pembeliOptions}
                placeholder="Pilih / Ketik Nama Penerima..."
                inputClassName="paper-input w-full font-bold"
                className="w-full"
                minDropdownWidth="min-w-[320px]"
                title="Pilih pembeli untuk auto-fill alamat dan tujuan bongkar"
              />

              <span>b. Alamat</span>
              <span>:</span>
              <input
                type="text"
                className="paper-input w-full"
                value={data.alamatPenerima}
                onChange={(e) => updateField('alamatPenerima', e.target.value)}
                placeholder="Alamat Penerima"
              />

              <span>c. No. Telp</span>
              <span>:</span>
              <input
                type="text"
                className="paper-input w-full"
                value={data.telpPenerima}
                onChange={(e) => updateField('telpPenerima', e.target.value)}
                placeholder="Nomor Telepon Penerima"
              />
            </div>

            <div className="mt-1 font-semibold text-slate-900">4. Tujuan Bongkar</div>
            <div className="ml-6 grid grid-cols-[130px_10px_1fr] items-center gap-y-1">
              <span>a. Nama Lokasi</span>
              <span>:</span>
              <SmartAutocomplete
                value={data.namaTujuan}
                onChange={handleTujuanChange}
                onSelect={handleSelectTujuanOption}
                options={pembeliOptions}
                placeholder="Pilih / Ketik Lokasi Tujuan Bongkar..."
                inputClassName="paper-input w-full font-bold"
                className="w-full"
                minDropdownWidth="min-w-[320px]"
              />

              <span>b. Alamat Bongkar</span>
              <span>:</span>
              <input
                type="text"
                className="paper-input w-full"
                value={data.alamatTujuan}
                onChange={(e) => updateField('alamatTujuan', e.target.value)}
                placeholder="Alamat Tempat Bongkar"
              />

              <span>c. No. Telp</span>
              <span>:</span>
              <input
                type="text"
                className="paper-input w-full"
                value={data.telpTujuan}
                onChange={(e) => updateField('telpTujuan', e.target.value)}
                placeholder="Nomor Telepon"
              />
            </div>

            <div className="mt-1 font-semibold text-slate-900">5. Kelengkapan lain terlampir</div>
            <div className="ml-6 grid grid-cols-[250px_10px_1fr] items-center gap-y-1">
              <span>a. Identitas diri: Foto copy KTP/SIM*)</span>
              <span>:</span>
              <input
                type="text"
                className="paper-input w-full"
                value={data.noKtpSim}
                onChange={(e) => updateField('noKtpSim', e.target.value)}
                placeholder="Nomor KTP / SIM Pengemudi"
              />

              <span className="self-center font-medium">b. Daftar Kayu Hasil Pemanenan (DKHP)</span>
              <span className="self-center font-bold">:</span>
              <input
                type="text"
                className="paper-input w-full font-black text-[18px] text-black tracking-wide py-0.5"
                placeholder="Ketik No. DKHP di sini..."
                value={data.noDkhp}
                onChange={(e) => updateField('noDkhp', e.target.value)}
                title="Nomor Daftar Kayu Hasil Pemanenan (DKHP)"
              />
            </div>
          </div>
        </div>

        <p className="mb-1 text-justify leading-relaxed">
          Dokumen SKSHHK dimaksud untuk melengkapi pengangkutan hasil hutan kayu sesuai dengan ketentuan
          peraturan perundang-undangan yang berlaku.
        </p>
        <p className="mb-3">Demikian surat kami buat dengan sebenarnya untuk menjadi dasar penerbitan SKSHHK.</p>

        {/* TANDA TANGAN HALAMAN 1 */}
        <div className="flex justify-between items-start pt-2 break-avoid">
          <div className="text-left flex-1">
            <div className="font-semibold text-slate-900">Perintah Penerbitan :</div>
            <div className="flex items-end mb-1">
              <span className="whitespace-nowrap font-medium">Diterbitkan SKSHHK seri :</span>
              <input
                type="text"
                className="paper-input flex-1 ml-2 max-w-[200px] font-bold text-slate-900"
                value={data.noSeri}
                onChange={(e) => updateField('noSeri', e.target.value)}
                placeholder="Ketik No. Seri SKSHHK..."
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="font-semibold">Pejabat Penerbit SKSHHK</p>
              <span className="no-print text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Pilih/Ganti ▾
              </span>
            </div>
            <div className="h-14" />
            <div className="flex flex-col items-start">
              <SmartAutocomplete
                value={data.pejabatNama}
                onChange={handlePejabatChange}
                onSelect={handleSelectPejabatOption}
                options={pejabatOptions}
                placeholder="Pilih/Ketik Nama Pejabat..."
                inputClassName="paper-input font-bold underline text-slate-900 w-full max-w-[220px]"
                className="w-full max-w-[220px]"
                minDropdownWidth="min-w-[280px]"
                title="Pilih pejabat penerbit terdaftar atau ketik nama pengganti"
              />
              <div className="flex items-center gap-1 text-xs text-slate-600 font-medium mt-0.5">
                <span>No. Reg.</span>
                <input
                  type="text"
                  className="paper-input w-32 text-xs text-slate-600 font-medium"
                  placeholder="No. Register"
                  value={data.pejabatReg}
                  onChange={(e) => updateField('pejabatReg', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="w-64 text-center">
            <div className="flex justify-center items-center mb-1">
              <span className="font-medium">Talok, </span>
              <input
                type="text"
                className="paper-input w-36 text-center font-bold"
                value={data.tanggalAngkutan}
                onChange={(e) => handleDateSync(e.target.value)}
              />
            </div>
            <p className="font-semibold">Pemohon,</p>
            <div className="h-16" />
            <input
              type="text"
              className="paper-input w-full text-center font-bold text-slate-900"
              placeholder="( Nama Terang Pemohon / Ttd )"
              value={data.namaPemohon}
              onChange={(e) => handlePemohonChange(e.target.value)}
            />
          </div>
        </div>
        </div>
      </div>

      {/* ========================================================
          HALAMAN 2: BERITA ACARA SERAH TERIMA SKSHHK (F4 PORTRAIT)
         ======================================================== */}
      <div
        className="document-container pdf-page-break text-black leading-snug mt-6 print:mt-0 relative"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px' }}
      >
        <DocumentWatermark variant="portrait" />

        <div className="relative z-10">
          {/* KOP SURAT BERITA ACARA */}
        <div className="relative mb-6 border-b border-black pb-3">
          <div className="flex items-center justify-between">
            <PerhutaniLogo size={52} />
            <div className="text-right text-[11px] text-slate-600 print:text-black">
              <span className="font-semibold block">PERUM PERHUTANI - DIVRE JATENG</span>
              <span>KPH PEKALONGAN BARAT / TPK TALOK</span>
            </div>
          </div>
          <div className="text-center font-bold text-lg mt-3 uppercase leading-tight">
            BERITA ACARA SERAH TERIMA<br />
            SURAT KETERANGAN SAH HASIL HUTAN (SKSHHK)
          </div>
        </div>

        {/* PEMBUKA BERITA ACARA */}
        <div className="mb-4 text-justify leading-relaxed">
          Pada hari ini{' '}
          <input
            type="text"
            className="paper-input w-24 text-center font-bold"
            value={data.hariBeritaAcara}
            onChange={(e) => updateField('hariBeritaAcara', e.target.value)}
            placeholder="Hari"
          />{' '}
          tanggal{' '}
          <input
            type="text"
            className="paper-input w-44 text-center font-bold"
            value={data.tanggalAngkutan}
            onChange={(e) => handleDateSync(e.target.value)}
            placeholder="Tanggal Lengkap"
          />{' '}
          kami yang bertanda tangan di bawah ini :
        </div>

        {/* PIHAK KESATU */}
        <div className="mb-3 pl-2">
          <div className="grid grid-cols-[20px_180px_10px_1fr] items-start gap-y-1.5">
            <span className="font-bold text-black">1.</span>
            <span className="font-medium text-black">Nama</span>
            <span className="text-black">:</span>
            <SmartAutocomplete
              value={data.pejabatNama}
              onChange={handlePejabatChange}
              onSelect={handleSelectPejabatOption}
              options={pejabatOptions}
              placeholder="Pilih/Ketik Nama Pejabat..."
              inputClassName="paper-input font-bold text-black w-full"
              className="w-full"
              minDropdownWidth="min-w-[320px]"
            />

            <span className="font-bold text-black">2.</span>
            <span className="font-medium text-black">No. Register P2 SKSHHK</span>
            <span className="text-black">:</span>
            <input
              type="text"
              className="paper-input font-bold text-black w-full"
              value={data.pejabatReg}
              onChange={(e) => updateField('pejabatReg', e.target.value)}
              placeholder="No. Register P2"
            />

            <span className="font-bold text-black">3.</span>
            <span className="font-medium text-black">Jabatan</span>
            <span className="text-black">:</span>
            <input
              type="text"
              className="paper-input font-bold text-black w-full"
              value={data.pejabatJabatan}
              onChange={(e) => updateField('pejabatJabatan', e.target.value)}
              placeholder="Jabatan"
            />

            <span className="font-bold text-black">4.</span>
            <span className="font-medium text-black">Satuan Kerja</span>
            <span className="text-black">:</span>
            <input
              type="text"
              className="paper-input font-bold text-black w-full"
              value={data.pejabatSatker || 'TPK Talok'}
              onChange={(e) => updateField('pejabatSatker', e.target.value)}
              placeholder="TPK Talok"
            />
          </div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-black">
            UNTUK SELANJUTNYA DISEBUT SEBAGAI <strong>PIHAK KESATU</strong>.
          </div>
        </div>

        {/* PIHAK KEDUA */}
        <div className="mb-4 pl-2">
          <div className="grid grid-cols-[20px_180px_10px_1fr] items-start gap-y-1.5">
            <span className="font-bold text-black">5.</span>
            <span className="font-medium text-black">Nama</span>
            <span className="text-black">:</span>
            <SmartAutocomplete
              value={data.namaPemohon}
              onChange={handlePemohonChange}
              onSelect={handleSelectPemohonOption}
              options={pemohonOptions}
              placeholder="Nama Lengkap Pihak Kedua..."
              inputClassName="paper-input font-bold text-black w-full"
              className="w-full"
              minDropdownWidth="min-w-[320px]"
            />

            <span className="font-bold text-black">6.</span>
            <span className="font-medium text-black">Pekerjaan</span>
            <span className="text-black">:</span>
            <input
              type="text"
              className="paper-input font-bold text-black w-full"
              value={data.pekerjaanPemohon}
              onChange={(e) => updateField('pekerjaanPemohon', e.target.value)}
              placeholder="Pekerjaan"
            />

            <span className="font-bold self-start mt-1 text-black">7.</span>
            <span className="font-medium self-start mt-1 text-black">Alamat</span>
            <span className="self-start mt-1 text-black">:</span>
            <textarea
              rows={2}
              className="paper-input resize-none font-bold text-black w-full"
              value={data.alamatPemohon}
              onChange={(e) => updateField('alamatPemohon', e.target.value)}
              placeholder="Alamat Sesuai KTP"
            />
          </div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-black">
            UNTUK SELANJUTNYA DISEBUT SEBAGAI <strong>PIHAK KEDUA</strong>.
          </div>
        </div>

        <div className="text-justify mb-3 leading-relaxed">
          Kedua belah pihak telah melakukan pemeriksaan bersama atas isi dokumen SKSHHK beserta hasil
          hutan kayu yang akan diangkut dan dengan ini menyatakan sebagai berikut :
        </div>

        {/* 4 POIN PERNYATAAN */}
        <div className="space-y-3 text-justify ml-2 leading-relaxed">
          <div className="flex gap-2">
            <span className="font-bold">1.</span>
            <div>
              PIHAK KESATU dan PIHAK KEDUA menyatakan kebenaran isi dokumen SKSHHK Nomor Seri{' '}
              <input
                type="text"
                className="paper-input w-44 mx-1 text-center font-bold text-slate-900"
                value={data.noSeri}
                onChange={(e) => updateField('noSeri', e.target.value)}
                placeholder="No. Seri SKSHHK"
              />{' '}
              dan kondisi fisik kayu yang akan diangkut berupa kayu jenis{' '}
              <SmartAutocomplete
                value={data.jenisKayu}
                onChange={(val) => updateField('jenisKayu', val.toUpperCase())}
                onSelect={(jk: string) => updateField('jenisKayu', jk)}
                options={jenisKayuOptions}
                placeholder="Jenis Kayu"
                inputClassName="paper-input w-32 mx-1 text-center font-bold uppercase"
                className="inline-block"
                uppercase
                minDropdownWidth="min-w-[180px]"
              />{' '}
              sejumlah{' '}
              <strong className="underline mx-1">{totalBtg || 0}</strong> Btg volume{' '}
              <strong className="underline mx-1">
                {totalM3 > 0 ? totalM3.toFixed(2) : '0.00'}
              </strong>{' '}
              M3.
            </div>
          </div>

          <div className="flex gap-2">
            <span className="font-bold">2.</span>
            <div>
              Dokumen SKSHHK tersebut digunakan untuk pengangkutan hasil hutan kayu dari TPK/Industri{' '}
              <input
                type="text"
                className="paper-input w-40 mx-1 text-center font-bold text-slate-900"
                value={data.pejabatSatker}
                onChange={(e) => updateField('pejabatSatker', e.target.value)}
                placeholder="..................................."
              />{' '}
              dengan tujuan pengangkutan (lokasi bongkar){' '}
              <strong className="underline mx-1">
                {data.namaTujuan
                  ? `${data.namaTujuan} - ${data.alamatTujuan}`
                  : '...........................................................................................'}
              </strong>
              .
            </div>
          </div>

          <div className="flex gap-2">
            <span className="font-bold">3.</span>
            <div>
              Sejak dokumen SKSHHK diserahkan dari PIHAK KESATU kepada PIHAK KEDUA, maka tanggung jawab
              selama perjalanan sampai dengan tujuan bongkar menjadi tanggung jawab PIHAK KEDUA.
            </div>
          </div>

          <div className="flex gap-2">
            <span className="font-bold">4.</span>
            <div>
              Apabila dalam masa rentang waktu pengangkutan sampai dengan tujuan bongkar, dokumen
              SKSHHK tersebut mengalami kerusakan fisik, perubahan jenis, jumlah dan volume Hasil
              Hutan dan hal-hal lainnya, yang menyebabkan tidak sahnya SKSHHK tersebut sebagaimana diatur
              dalam Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor P.24/Menlhk-setjen/2015,
              tentang penatausahaan Hasil Hutan Kayu yang berasal dari Hutan Tanaman pada Hutan Produksi,
              sehingga dikenai sanksi oleh yang berwenang, maka resiko yang terjadi menjadi tanggung jawab
              PIHAK KEDUA.
            </div>
          </div>
        </div>

        <div className="mt-4 mb-4 text-justify leading-relaxed">
          Demikian Berita Acara Serah Terima SKSHHK ini dibuat dengan sebenarnya untuk dipergunakan
          sebagaimana mestinya.
        </div>

        {/* TANDA TANGAN HALAMAN 2 */}
        <div className="flex justify-between items-start break-avoid mt-6">
          <div className="w-64 text-center">
            <p className="font-bold text-slate-900">PIHAK KEDUA</p>
            <p className="text-xs text-slate-500">Penerima Dokumen / Pengemudi</p>
            <div className="h-20" />
            <input
              type="text"
              className="paper-input w-full text-center font-bold text-slate-900"
              placeholder="( Nama Terang / Ttd )"
              value={data.namaPemohon}
              onChange={(e) => handlePemohonChange(e.target.value)}
            />
          </div>

          <div className="w-64 text-center">
            <div className="flex justify-center items-center mb-1">
              <span className="font-medium">Talok, </span>
              <input
                type="text"
                className="paper-input w-36 text-center font-bold"
                value={data.tanggalAngkutan}
                onChange={(e) => handleDateSync(e.target.value)}
              />
            </div>
            <p className="font-bold text-slate-900">PIHAK KESATU</p>
            <p className="text-xs text-slate-500">{data.pejabatJabatan || 'Kepala TPK Talok'}</p>
            <div className="h-16" />
            <SmartAutocomplete
              value={data.pejabatNama}
              onChange={handlePejabatChange}
              onSelect={handleSelectPejabatOption}
              options={pejabatOptions}
              placeholder="( Nama Pejabat / Ttd )"
              inputClassName="paper-input w-full text-center font-bold underline text-slate-900"
              className="w-full"
              minDropdownWidth="min-w-[280px]"
            />
            <div className="flex justify-center items-center gap-1 text-xs text-slate-600 font-medium mt-0.5">
              <span>No. Reg.</span>
              <input
                type="text"
                className="paper-input w-28 text-center text-xs text-slate-600 font-medium"
                value={data.pejabatReg}
                onChange={(e) => updateField('pejabatReg', e.target.value)}
                placeholder="No. Reg."
              />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ========================================================
          DATALISTS UNTUK AUTO-FILL SEMUA KOLOM
         ======================================================== */}
      {/* Datalist Invoices dari Persediaan */}
      <datalist id="datalist-invoices">
        {uniqueInvoices.map((inv, idx) => (
          <option key={`inv-${idx}`} value={inv}>
            Invoice Persediaan TPK Talok
          </option>
        ))}
      </datalist>

      {/* Datalist Nomor Polisi */}
      <datalist id="datalist-nopol">
        {DATA_SUPIR.map((s, idx) => (
          <option key={`nopol-${idx}`} value={s.nopol}>
            {s.nama} - Pengemudi
          </option>
        ))}
      </datalist>

      {/* Datalist Supir */}
      <datalist id="datalist-supir">
        {DATA_SUPIR.map((s, idx) => (
          <option key={`supir-${idx}`} value={s.nama}>
            {s.nopol}
          </option>
        ))}
      </datalist>

      {/* Datalist Pemohon (Supir & Pembeli) */}
      <datalist id="datalist-pemohon">
        {DATA_SUPIR.map((s, idx) => (
          <option key={`pmh-s-${idx}`} value={s.nama}>
            Pengemudi ({s.nopol})
          </option>
        ))}
        {DATA_PEMBELI.map((p, idx) => (
          <option key={`pmh-p-${idx}`} value={p.nama}>
            Pembeli ({p.kota})
          </option>
        ))}
      </datalist>

      {/* Datalist Pembeli / Rekanan */}
      <datalist id="datalist-pembeli">
        {DATA_PEMBELI.map((p, idx) => (
          <option key={`pembeli-${idx}`} value={p.nama}>
            {p.alamat}, {p.kota}
          </option>
        ))}
      </datalist>

      {/* Datalist Pejabat Penerbit */}
      <datalist id="datalist-pejabat">
        {DATA_PEJABAT.map((p, idx) => (
          <option key={`pejabat-${idx}`} value={p.nama}>
            {p.jabatan} - No. Reg. {p.reg}
          </option>
        ))}
      </datalist>

      {/* Datalist Kendaraan */}
      <datalist id="datalist-kendaraan">
        {JENIS_KENDARAAN.map((k, idx) => (
          <option key={`kendaraan-${idx}`} value={k} />
        ))}
      </datalist>

      {/* Datalist Jenis Kayu */}
      <datalist id="datalist-jenis-kayu">
        {JENIS_KAYU_LIST.map((jk, idx) => (
          <option key={`jk-${idx}`} value={jk} />
        ))}
      </datalist>

      {/* Datalist Sortimen */}
      <datalist id="datalist-sortimen">
        {SORTIMEN_LIST.map((sort, idx) => (
          <option key={`sort-${idx}`} value={sort} />
        ))}
      </datalist>

      {/* Datalist Kapling dari Persediaan */}
      <datalist id="datalist-kapling">
        {pihakKetigaItems
          .filter((pk) => pk.noKapling)
          .map((pk, idx) => (
            <option key={`kpl-${idx}`} value={pk.noKapling}>
              {pk.jenisKayu} ({pk.sortimen}) - Vol: {pk.volume} m³ - {pk.pembeli}
            </option>
          ))}
      </datalist>

      {/* ========================================================
          MODAL-MODAL PEMBANTU
         ======================================================== */}
      {/* Modal Pemilih Kapling */}
      <KaplingPickerModal
        isOpen={isKaplingPickerOpen}
        onClose={() => setIsKaplingPickerOpen(false)}
        inventoryItems={pihakKetigaItems}
        onSelectKapling={handleSelectKaplingFromModal}
        savedHistory={savedHistory}
        currentItems={data.items}
        currentDocId={data.id}
      />

      {/* Modal Referensi Kapasitas Kendaraan */}
      {showKapasitasModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  Standar Kapasitas Muatan Kayu TPK Talok
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKapasitasModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Berikut acuan batas volume kubikasi standar maksimal (m³) per jenis armada angkutan kayu
              untuk menjaga kepatuhan tonase dan keselamatan pengangkutan :
            </p>

            <div className="mt-3.5 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {KAPASITAS_STANDAR_KENDARAAN.map((k, idx) => {
                const isSelected = data.jenisKendaraan && k.jenis.toLowerCase() === data.jenisKendaraan.toLowerCase();
                return (
                  <div
                    key={`kap-${idx}`}
                    onClick={() => {
                      updateField('jenisKendaraan', k.jenis);
                      setShowKapasitasModal(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{k.label}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 bg-emerald-700 text-white rounded text-[9px]">
                            Dipilih
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{k.deskripsi}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-emerald-700 block">
                        {k.maxM3.toFixed(2)} m³
                      </span>
                      <span className="text-[10px] text-slate-400">Batas Maks</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-[11px] text-slate-500 italic">
                Klik salah satu armada untuk memilih otomatis.
              </span>
              <button
                type="button"
                onClick={() => setShowKapasitasModal(false)}
                className="px-3 py-1.5 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
