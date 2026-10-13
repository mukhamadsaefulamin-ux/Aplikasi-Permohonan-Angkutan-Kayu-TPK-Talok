import { SupirInfo, PembeliInfo, PihakKetigaItem } from '../types';

export interface PejabatInfo {
  nama: string;
  reg: string;
  jabatan: string;
  satker: string;
}

export const DATA_PEJABAT: PejabatInfo[] = [
  {
    nama: 'Nurdin Hamdani',
    reg: '23230001226',
    jabatan: 'Kepala TPK Talok',
    satker: 'TPK Talok'
  },
  {
    nama: 'Budi Santoso, S.Hut',
    reg: '23230001235',
    jabatan: 'Pgs. Kepala TPK Talok',
    satker: 'TPK Talok'
  },
  {
    nama: 'Agus Purnomo',
    reg: '23230001210',
    jabatan: 'Pejabat Penerbit SKSHHK',
    satker: 'TPK Talok'
  },
  {
    nama: 'Slamet Riyadi, S.Hut',
    reg: '23230001248',
    jabatan: 'Plt. Kepala TPK Talok',
    satker: 'TPK Talok'
  }
];

export const DATA_SUPIR: SupirInfo[] = [
  { nama: 'ABDUL', nopol: 'G 9664 TG' },
  { nama: 'AKIL', nopol: 'G 8921 UG' },
  { nama: 'ANTO', nopol: 'G 9872 UG' },
  { nama: 'CARSONO', nopol: 'G 9862 TG' },
  { nama: 'DENDI', nopol: 'R 8057 MF' },
  { nama: 'DIDI', nopol: 'Z 8246 YE' },
  { nama: 'DIKRI', nopol: 'H 1157 ZF' },
  { nama: 'DODI', nopol: 'G 9716 UG' },
  { nama: 'EDI', nopol: 'G 8872 OE' },
  { nama: 'EKO', nopol: 'G 9458 TG' },
  { nama: 'GOPUR', nopol: 'G 9174 UG' },
  { nama: 'GUNAWAN', nopol: 'G 9330 IZ' },
  { nama: 'ISWANDI', nopol: 'G 8552 EZ' },
  { nama: 'JOKO', nopol: 'G 9010 VG' },
  { nama: 'KARDI', nopol: 'E 8117 ZX' },
  { nama: 'KEDOL', nopol: 'E 8117 YD' },
  { nama: 'KEKEL', nopol: 'G 9744 TG' },
  { nama: 'KHAER', nopol: 'AA 1634 LK' },
  { nama: 'KIBOY', nopol: 'R 1342 MB' },
  { nama: 'LEMAN', nopol: 'E 8294 YD' },
  { nama: 'LUKMAN', nopol: 'G 9774 EZ' },
  { nama: 'MAFTUHIN', nopol: 'G 1422 SF' },
  { nama: 'MAHMUD', nopol: 'Z 8351 DI' },
  { nama: 'NANDAR', nopol: 'Z 8510 YA' },
  { nama: 'PARMAN', nopol: 'R 9553 IE' },
  { nama: 'ROSIHIN', nopol: 'R 8633 MB' },
  { nama: 'RUDI', nopol: 'G 8619 EZ' },
  { nama: 'SAHIRIN', nopol: 'G 1725 QA' },
  { nama: 'SAMSUDIN', nopol: 'G 8618 EZ' },
  { nama: 'SARWONO', nopol: 'Z 8418 MI' },
  { nama: 'SOIMIN', nopol: 'R 8773 OD' },
  { nama: 'SURONO', nopol: 'G 9547 IZ' },
  { nama: 'SUTORO', nopol: 'G 9317 FZ' },
  { nama: 'T. HERMANSYAH', nopol: 'Z 9114 MM' },
  { nama: 'TANWO', nopol: 'G 8233 TG' },
  { nama: 'TONI', nopol: 'G 9175 VG' },
  { nama: 'UDIN', nopol: 'G 8377 TG' },
  { nama: 'UHRO', nopol: 'AA 8960 DJ' },
  { nama: 'WAHYU', nopol: 'G 9894 TG' },
  { nama: 'WANTO', nopol: 'E 8063 VE' },
  { nama: 'YADI', nopol: 'R 8376 KR' }
];

export const DATA_PEMBELI: PembeliInfo[] = [
  { nama: 'ADE PRIATNA', alamat: 'SALEM', kota: 'BREBES' },
  { nama: 'AGUNG JAYA MAKMUR', alamat: 'SLAWI', kota: 'TEGAL' },
  { nama: 'CV. BERKAH SANDHI ABADI', alamat: 'LEBAKSIU', kota: 'TEGAL' },
  { nama: 'CV. SN JAYA PRIMA', alamat: 'BOJONGSARI', kota: 'PURBALINGGA' },
  { nama: 'CV. TIGRIS LESTARI ABADI', alamat: 'VILLA GRIYA', kota: 'PEKALONGAN' },
  { nama: 'JANI AL AZHAR', alamat: 'PAGUYANGAN', kota: 'BREBES' },
  { nama: 'PD. SINAR PUTRA', alamat: 'LEBAKSIU', kota: 'TEGAL' },
  { nama: 'PK. ASTA RIMBA', alamat: 'MARGADANA', kota: 'TEGAL' },
  { nama: 'PK. GUNUNG AYU SENTOSA', alamat: 'BUMIAYU', kota: 'BREBES' },
  { nama: 'PK. MEKAR JATI', alamat: 'KESAMIRAN', kota: 'TEGAL' },
  { nama: 'PK. MITRA ALAM', alamat: 'KARANG MONCOL', kota: 'PEMALANG' },
  { nama: 'PK. RIMBA SARI', alamat: 'CILONGOK', kota: 'BANYUMAS' },
  { nama: 'PT. ALAM CITRA LESTARI', alamat: 'BANGBANKEREP', kota: 'SEMARANG' },
  { nama: 'PT. BINA MEGAH INDOWOOD', alamat: 'MENGANTI', kota: 'GRESIK' },
  { nama: 'PT. INTERTREND UTAMA', alamat: 'BUDURAN', kota: 'SIDOARJO' },
  { nama: 'PT. KALIMAS WOODWORKING INDUSTRY', alamat: 'MARGADANA', kota: 'TEGAL' },
  { nama: 'PT. KARYABHAKTI MANUNGGAL', alamat: 'MEWEK', kota: 'PURBALINGGA' },
  { nama: 'PT. SENG FONG MOULDING PERKASA', alamat: 'TUNGGORONO', kota: 'JOMBANG' },
  { nama: 'RIMBA RAYA MEBEL', alamat: 'MARGASARI', kota: 'TEGAL' },
  { nama: 'UD PUTRA MANDIRI', alamat: 'WATUKUMPUL', kota: 'PEMALANG' },
  { nama: 'UD. AA JAYA', alamat: 'SLAWI', kota: 'TEGAL' },
  { nama: 'UD. BRAYAN URIP', alamat: 'PAGUYANGAN', kota: 'BREBES' },
  { nama: 'UD. BYAN MERCUSI WOOD', alamat: 'SLAWI', kota: 'TEGAL' },
  { nama: 'UD. GEMBRONG MENCORONG', alamat: 'WANGON', kota: 'CILACAP' },
  { nama: 'UD. KARYA MANDIRI', alamat: 'CILONGOK', kota: 'BANYUMAS' },
  { nama: 'PK. KARYA PUTRA', alamat: 'SALEM', kota: 'BREBES' },
  { nama: 'UD. KEMBANG BAROKAH', alamat: 'CILONGOK', kota: 'BANYUMAS' },
  { nama: 'UD. LANCAR MAKMUR', alamat: 'KABUNAN', kota: 'PEMALANG' },
  { nama: 'UD. LEO PUTRA', alamat: 'PAGUYANGAN', kota: 'BREBES' },
  { nama: 'UD. PERINTIS', alamat: 'CILONGOK', kota: 'BANYUMAS' },
  { nama: 'UD. PUTRA RIMBA', alamat: 'SOKAWANGI', kota: 'PEMALANG' },
  { nama: 'UD. SAMI ASIH', alamat: 'CILONGOK', kota: 'BANYUMAS' },
  { nama: 'UD. SUROSO', alamat: 'SALEM', kota: 'BREBES' },
  { nama: 'UD. SURYA BANJARAN', alamat: 'PATIKRAJA', kota: 'BANYUMAS' },
  { nama: 'UD. TUNGGAK SEMI', alamat: 'CILONGOK', kota: 'BANYUMAS' },
  { nama: 'UD. WUHAN', alamat: 'BUMIAYU', kota: 'BREBES' }
];

export const JENIS_KENDARAAN = ['Truk', 'Fuso', 'Truk Engkel', 'L300', 'Tronton', 'Colt Diesel', 'Pick Up'];

export interface KapasitasKendaraanInfo {
  jenis: string;
  maxM3: number;
  label: string;
  deskripsi: string;
}

export const KAPASITAS_STANDAR_KENDARAAN: KapasitasKendaraanInfo[] = [
  { jenis: 'Pick Up', maxM3: 2.5, label: 'Pick Up', deskripsi: 'Kapasitas maksimal standar ~2.50 m³' },
  { jenis: 'L300', maxM3: 3.5, label: 'Mitsubishi L300', deskripsi: 'Kapasitas maksimal standar ~3.50 m³' },
  { jenis: 'Truk Engkel', maxM3: 6.0, label: 'Truk Engkel (4 Roda)', deskripsi: 'Kapasitas maksimal standar ~6.00 m³' },
  { jenis: 'Colt Diesel', maxM3: 9.5, label: 'Colt Diesel (6 Roda)', deskripsi: 'Kapasitas maksimal standar ~9.50 m³' },
  { jenis: 'Truk', maxM3: 10.0, label: 'Truk Standar (6 Roda)', deskripsi: 'Kapasitas maksimal standar ~10.00 m³' },
  { jenis: 'Fuso', maxM3: 16.0, label: 'Fuso / Tronton Engkel', deskripsi: 'Kapasitas maksimal standar ~16.00 m³' },
  { jenis: 'Tronton', maxM3: 25.0, label: 'Tronton (10 Roda)', deskripsi: 'Kapasitas maksimal standar ~25.00 m³' },
];

export function getKapasitasKendaraan(jenisKendaraan?: string): KapasitasKendaraanInfo | null {
  if (!jenisKendaraan) return null;
  const normalized = jenisKendaraan.trim().toLowerCase();

  if (normalized.includes('tronton')) return KAPASITAS_STANDAR_KENDARAAN.find(k => k.jenis === 'Tronton') || null;
  if (normalized.includes('fuso')) return KAPASITAS_STANDAR_KENDARAAN.find(k => k.jenis === 'Fuso') || null;
  if (normalized.includes('engkel')) return KAPASITAS_STANDAR_KENDARAAN.find(k => k.jenis === 'Truk Engkel') || null;
  if (normalized.includes('l300') || normalized.includes('l-300')) return KAPASITAS_STANDAR_KENDARAAN.find(k => k.jenis === 'L300') || null;
  if (normalized.includes('pick') || normalized.includes('pickup')) return KAPASITAS_STANDAR_KENDARAAN.find(k => k.jenis === 'Pick Up') || null;
  if (normalized.includes('colt')) return KAPASITAS_STANDAR_KENDARAAN.find(k => k.jenis === 'Colt Diesel') || null;
  if (normalized.includes('truk')) return KAPASITAS_STANDAR_KENDARAAN.find(k => k.jenis === 'Truk') || null;

  return null;
}

export const JENIS_KAYU_LIST = ['PINUS', 'JATI', 'SONOKELING', 'SONO BRIT', 'MAHONI', 'ALBASIA', 'GMELINA'];

export const SORTIMEN_LIST = ['AI', 'AII', 'AIII'];

export const INITIAL_PIHAK_KETIGA: PihakKetigaItem[] = [
  {
    id: 1,
    noKapling: 'KPL-001/TLK/2026',
    noBlok: '04A',
    jenisKayu: 'PINUS',
    sortimen: 'AII',
    panjang: '200',
    mutu: 'P',
    batang: 48,
    volume: 5.4210,
    noInvoice: 'INV/2026/03/012',
    pembeli: 'CV. BERKAH SANDHI ABADI'
  },
  {
    id: 2,
    noKapling: 'KPL-002/TLK/2026',
    noBlok: '05B',
    jenisKayu: 'JATI',
    sortimen: 'AIII',
    panjang: '250',
    mutu: 'T',
    batang: 32,
    volume: 6.8450,
    noInvoice: 'INV/2026/03/018',
    pembeli: 'PT. KARYABHAKTI MANUNGGAL'
  },
  {
    id: 3,
    noKapling: 'KPL-003/TLK/2026',
    noBlok: '02C',
    jenisKayu: 'SONOKELING',
    sortimen: 'AI',
    panjang: '150',
    mutu: 'P',
    batang: 25,
    volume: 2.3140,
    noInvoice: 'INV/2026/03/024',
    pembeli: 'RIMBA RAYA MEBEL'
  }
];
