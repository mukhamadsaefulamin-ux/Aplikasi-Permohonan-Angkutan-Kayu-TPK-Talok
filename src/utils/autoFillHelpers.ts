import { DATA_SUPIR, DATA_PEMBELI, DATA_PEJABAT, PejabatInfo } from '../data/masterData';
import { PihakKetigaItem, PermohonanData, SupirInfo, PembeliInfo } from '../types';

export const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export interface ParsedDateInfo {
  tanggal: string;      // e.g. "11"
  bulan: string;        // e.g. "Oktober"
  tahun: string;        // e.g. "2026"
  hari: string;         // e.g. "Minggu"
  tanggalFormatted: string; // e.g. "11 Oktober 2026"
  isoDate: string;      // e.g. "2026-10-11"
}

/**
 * Format Date object ke dalam format Indonesia lengkap
 */
export function formatIndonesianDate(date: Date): ParsedDateInfo {
  const day = String(date.getDate());
  const monthIdx = date.getMonth();
  const year = String(date.getFullYear());
  const hari = NAMA_HARI[date.getDay()];
  const bulan = NAMA_BULAN[monthIdx];
  const isoDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;

  return {
    tanggal: day,
    bulan,
    tahun: year,
    hari,
    tanggalFormatted: `${day} ${bulan} ${year}`,
    isoDate,
  };
}

/**
 * Parsing input tanggal string (format ISO YYYY-MM-DD atau DD/MM/YYYY atau DD Bulan YYYY)
 */
export function parseDateString(val: string): ParsedDateInfo | null {
  if (!val) return null;
  const trimmed = val.trim();

  // Cek jika format YYYY-MM-DD (dari HTML5 date picker)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) {
      return formatIndonesianDate(date);
    }
  }

  // Cek jika format DD/MM/YYYY atau DD-MM-YYYY
  const slashDashMatch = trimmed.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (slashDashMatch) {
    const d = Number(slashDashMatch[1]);
    const m = Number(slashDashMatch[2]);
    const y = Number(slashDashMatch[3]);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) {
      return formatIndonesianDate(date);
    }
  }

  // Cek jika mengandung nama bulan Indonesia, e.g. "11 Oktober 2026" atau "11 Okt 2026"
  const BULAN_ALIAS: Record<string, number> = {
    jan: 0, januari: 0,
    feb: 1, februari: 1,
    mar: 2, maret: 2,
    apr: 3, april: 3,
    mei: 4,
    jun: 5, juni: 5,
    jul: 6, juli: 6,
    agu: 7, ags: 7, agt: 7, agustus: 7,
    sep: 8, sept: 8, september: 8,
    okt: 9, oktober: 9,
    nov: 10, november: 10,
    des: 11, desember: 11
  };

  const lowerTrimmed = trimmed.toLowerCase();
  for (const [alias, monthIdx] of Object.entries(BULAN_ALIAS)) {
    if (lowerTrimmed.includes(alias)) {
      const parts = trimmed.split(/[\s,/\-]+/).filter(Boolean);
      const day = parts.find((p) => /^\d{1,2}$/.test(p));
      const year = parts.find((p) => /^\d{4}$/.test(p));
      if (day && year) {
        const date = new Date(Number(year), monthIdx, Number(day));
        if (!isNaN(date.getTime())) {
          return formatIndonesianDate(date);
        }
      }
    }
  }

  return null;
}

/**
 * Cari data Supir berdasarkan nama atau nomor polisi (Nopol)
 * Sangat responsif: Mendukung pencarian sebagian nama, digit nopol (misal "9664"), dll.
 */
export function findSupir(query: string, customList?: SupirInfo[]): SupirInfo | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;

  const list = customList && customList.length > 0 ? customList : DATA_SUPIR;

  // 1. Cek nama persis
  const byExactName = list.find((s) => s.nama.toLowerCase() === q);
  if (byExactName) return byExactName;

  // 2. Cek nopol persis (tanpa spasi)
  const cleanQ = q.replace(/[^a-z0-9]/g, '');
  const byNopolExact = list.find(
    (s) => s.nopol.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanQ
  );
  if (byNopolExact) return byNopolExact;

  // 3. Cek nopol mengandung (misal pengguna ketik angka nopol "9664" atau "8921" atau "9872")
  if (cleanQ.length >= 3) {
    const byNopolContains = list.find((s) =>
      s.nopol.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanQ)
    );
    if (byNopolContains) return byNopolContains;
  }

  // 4. Cek nama awalan
  const byStartsWith = list.find((s) => s.nama.toLowerCase().startsWith(q));
  if (byStartsWith) return byStartsWith;

  // 5. Cek nama mengandung (misal "HERMANSYAH" dari "T. HERMANSYAH", "JOKO", dll.)
  if (q.length >= 3) {
    const byContains = list.find((s) => s.nama.toLowerCase().includes(q));
    if (byContains) return byContains;
  }

  return null;
}

/**
 * Cari data Pembeli berdasarkan nama, kata kunci usaha (CV/PT/PK), atau kota
 */
export function findPembeli(query: string): PembeliInfo | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;

  // 1. Cek kecocokan nama persis
  const byExactName = DATA_PEMBELI.find((p) => p.nama.toLowerCase() === q);
  if (byExactName) return byExactName;

  // 2. Cek nama diawali query
  const byStartsWith = DATA_PEMBELI.find((p) => p.nama.toLowerCase().startsWith(q));
  if (byStartsWith) return byStartsWith;

  // 3. Cek nama mengandung query (misal "BERKAH", "TIGRIS", "ASTA", "RIMBA", "SENG FONG", "MEKAR", "PRIATNA")
  const byContains = DATA_PEMBELI.find((p) => p.nama.toLowerCase().includes(q));
  if (byContains) return byContains;

  // 4. Cek kota atau alamat jika query >= 4 karakter (misal "BREBES", "GRESIK", "JOMBANG", "TEGAL")
  if (q.length >= 4) {
    const byCity = DATA_PEMBELI.find(
      (p) => p.kota.toLowerCase().includes(q) || p.alamat.toLowerCase().includes(q)
    );
    if (byCity) return byCity;
  }

  return null;
}

/**
 * Cari data Pejabat TPK Talok berdasarkan nama atau jabatan
 */
export function findPejabat(query: string): PejabatInfo | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;

  // 1. Cek nama persis atau jabatan persis
  const byExact = DATA_PEJABAT.find(
    (p) => p.nama.toLowerCase() === q || p.jabatan.toLowerCase() === q
  );
  if (byExact) return byExact;

  // 2. Cek nama mengandung kata (misal "Nurdin", "Agus", "Budi", "Slamet", "Purnomo")
  const byPartial = DATA_PEJABAT.find(
    (p) => p.nama.toLowerCase().includes(q) || p.jabatan.toLowerCase().includes(q)
  );
  if (byPartial) return byPartial;

  // 3. Cek no reg
  if (q.length >= 4) {
    const byReg = DATA_PEJABAT.find((p) => p.reg.includes(q));
    if (byReg) return byReg;
  }

  return null;
}

/**
 * Cari data Kapling di inventaris pihak ketiga secara aman dan akurat
 */
export function findKapling(query: string, items: PihakKetigaItem[]): PihakKetigaItem | null {
  if (!query || !items || items.length === 0) return null;
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;

  // 1. Cari persis
  const exact = items.find((pk) => pk.noKapling.trim().toLowerCase() === q);
  if (exact) return exact;

  // 2. Cari persis tanpa tanda baca/spasi (misal "04a" matches "04A" atau "04-A")
  const cleanQ = q.replace(/[^a-z0-9]/g, '');
  if (cleanQ.length >= 3) {
    const cleanExact = items.find(
      (pk) => pk.noKapling.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanQ
    );
    if (cleanExact) return cleanExact;

    // Cari jika nomor kapling mengandung kode/angka tersebut (misal "001", "002", "003")
    const cleanContains = items.find((pk) =>
      pk.noKapling.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanQ)
    );
    if (cleanContains) return cleanContains;
  }

  // 3. Jika query >= 3 karakter, cari awalan atau contains langsung
  if (q.length >= 3) {
    const starts = items.find((pk) => pk.noKapling.toLowerCase().startsWith(q));
    if (starts) return starts;

    const contains = items.find((pk) => pk.noKapling.toLowerCase().includes(q));
    if (contains) return contains;
  }

  return null;
}

/**
 * Cari semua kapling yang terikat dengan nomor Invoice tertentu
 */
export function findKaplingsByInvoice(invoice: string, items: PihakKetigaItem[]): PihakKetigaItem[] {
  if (!invoice || !items) return [];
  const q = invoice.trim().toLowerCase();
  return items.filter((pk) => pk.noInvoice && pk.noInvoice.trim().toLowerCase() === q);
}

/**
 * Generate nomor DKHP otomatis
 */
export function generateAutoDkhp(year?: string, blockOrKapling?: string): string {
  const yr = year || String(new Date().getFullYear());
  const randNum = String(Math.floor(Math.random() * 89) + 10);
  const code = blockOrKapling ? blockOrKapling.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() : '04A';
  return `DKHP/TLK/${yr}/${code}-${randNum}`;
}

/**
 * Generate nomor seri SKSHHK otomatis
 */
export function generateAutoNoSeri(year?: string): string {
  const yr = year || String(new Date().getFullYear());
  const randSeq = String(Math.floor(Math.random() * 900) + 100).padStart(4, '0');
  return `SKSHHK-TLK-${yr}-${randSeq}`;
}

export interface UsedKaplingInfo {
  docId: string;
  noKwitansi: string;
  tanggal: string;
  supir: string;
  pembeli?: string;
  status?: string;
}

/**
 * Mengumpulkan seluruh No. Kapling yang sudah pernah digunakan di dokumen-dokumen tersimpan (savedHistory) maupun permohonan aktif.
 * Mendukung pemisahan otomatis kapling majemuk yang dipisahkan koma, titik koma, atau baris baru.
 */
export function getUsedKaplingsMap(
  savedHistory: PermohonanData[] = [],
  excludeDocId?: string,
  currentPermohonan?: PermohonanData
): Map<string, UsedKaplingInfo> {
  const usedMap = new Map<string, UsedKaplingInfo>();

  const allDocs = [...savedHistory];
  if (currentPermohonan && (!excludeDocId || currentPermohonan.id !== excludeDocId)) {
    // Sisipkan dokumen aktif jika belum ada di list
    if (!allDocs.some((d) => d.id === currentPermohonan.id)) {
      allDocs.push(currentPermohonan);
    }
  }

  if (allDocs.length === 0) return usedMap;

  allDocs.forEach((doc) => {
    if (excludeDocId && doc.id === excludeDocId) return;

    if (doc.items && Array.isArray(doc.items)) {
      doc.items.forEach((item) => {
        if (item.noKapling && item.noKapling.trim()) {
          // Pisahkan string jika berisi beberapa nomor kapling (misal: "5044, 4219, 4217, 4220")
          const subKaplings = item.noKapling
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          subKaplings.forEach((rawK) => {
            const info: UsedKaplingInfo = {
              docId: doc.id,
              noKwitansi: doc.noKwitansi || doc.id,
              tanggal: doc.tanggalAngkutan || doc.tanggalBeritaAcara || '-',
              supir: doc.namaSupir || doc.namaPemohon || '-',
              pembeli: doc.namaPenerima || doc.namaTujuan || '-',
              status: doc.status || 'Tersimpan',
            };

            // 1. Pemetaan persis (lowercase, trimmed)
            const keyLower = rawK.toLowerCase();
            if (!usedMap.has(keyLower)) {
              usedMap.set(keyLower, info);
            }

            // 2. Pemetaan kode bersih tanpa karakter khusus (misal: "5044" dari "KPL-5044/TLK/2026")
            const cleanCode = rawK.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            if (cleanCode && cleanCode !== keyLower && !usedMap.has(cleanCode)) {
              usedMap.set(cleanCode, info);
            }

            // 3. Pemetaan khusus digit angka (misal: "5044", "4219", "4217")
            const digitsMatch = rawK.match(/\b\d{3,6}\b/);
            if (digitsMatch) {
              const numKey = digitsMatch[0];
              if (!usedMap.has(numKey)) {
                usedMap.set(numKey, info);
              }
            }
          });
        }
      });
    }
  });

  return usedMap;
}

export interface MatchingDocResult {
  doc: PermohonanData;
  reason: string;
  isSameDkhp: boolean;
  isDifferentDkhp: boolean;
  matchedVolume: number;
  matchedBatang: number;
  matchedSupir: string;
}

/**
 * Otomatis mendeteksi DOKUMEN GANDA SEBENARNYA (True Duplicates)
 * Yaitu dokumen yang memiliki Nomor DKHP atau Nomor Seri SKSHHK yang SAMA PERSIS dengan riwayat.
 * Jika No. DKHP atau No. Seri BERBEDA, maka DOKUMEN TERSEBUT ADALAH PENGANGKUTAN BERBEDA YANG SAH (BUKAN FILE GANDA).
 */
export function findMatchingDocumentsByVolumeSupir(
  current: PermohonanData,
  history: PermohonanData[]
): MatchingDocResult[] {
  if (!current || !history || history.length === 0) return [];

  const currentDkhp = (current.noDkhp || '').trim().toLowerCase();
  const currentSeri = (current.noSeri || '').trim().toLowerCase();

  // Jika belum ada No. DKHP atau No. Seri yang diisi, bukan dokumen ganda
  if (!currentDkhp && !currentSeri) return [];

  const matches: MatchingDocResult[] = [];

  history.forEach((doc) => {
    if (doc.id === current.id) return; // Abaikan jika id dokumen sama persis
    if (doc.status === 'Draft') return; // Abaikan draft

    const docDkhp = (doc.noDkhp || '').trim().toLowerCase();
    const docSeri = (doc.noSeri || '').trim().toLowerCase();

    // Cek kecocokan PERSIS No. Seri SKSHHK atau No. DKHP
    const seriMatch = Boolean(currentSeri) && Boolean(docSeri) && docSeri === currentSeri;
    const dkhpMatch = Boolean(currentDkhp) && Boolean(docDkhp) && docDkhp === currentDkhp;

    // HANYA dianggap ganda jika No. Seri SAMA PERSIS atau No. DKHP SAMA PERSIS
    if (seriMatch || dkhpMatch) {
      const docTotalM3 = doc.items.reduce((acc, i) => acc + (parseFloat(String(i.m3)) || 0), 0);
      const docTotalBtg = doc.items.reduce((acc, i) => acc + (parseInt(String(i.btg)) || 0), 0);

      matches.push({
        doc,
        reason: seriMatch
          ? `No. Seri SKSHHK ("${doc.noSeri}") SAMA PERSIS dengan dokumen di Riwayat.`
          : `No. DKHP ("${doc.noDkhp}") SAMA PERSIS dengan dokumen di Riwayat.`,
        isSameDkhp: dkhpMatch,
        isDifferentDkhp: false, // Karena beda DKHP bukan lagi file ganda
        matchedVolume: docTotalM3,
        matchedBatang: docTotalBtg,
        matchedSupir: doc.namaSupir || doc.namaPemohon || '-',
      });
    }
  });

  return matches;
}

