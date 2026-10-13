export interface KayuItem {
  id: number | string;
  noKapling: string;
  sort: string;
  btg: string | number;
  m3: string | number;
}

export interface PihakKetigaItem {
  id: number | string;
  noKapling: string;
  noBlok: string;
  jenisKayu: string;
  sortimen: string;
  panjang: string;
  mutu: string;
  batang: string | number;
  volume: string | number;
  noInvoice: string;
  pembeli: string;
}

export interface PermohonanData {
  id: string;
  noKwitansi: string;
  tanggalKwitansi: string;
  bulanKwitansi: string;
  tahunKwitansi: string;
  jenisKayu: string;
  namaPemohon: string;
  pekerjaanPemohon: string;
  alamatPemohon: string;
  jenisKendaraan: string;
  namaSupir: string;
  nopol: string;
  tanggalAngkutan: string;
  namaPenerima: string;
  alamatPenerima: string;
  telpPenerima: string;
  namaTujuan: string;
  alamatTujuan: string;
  telpTujuan: string;
  noKtpSim: string;
  noDkhp: string;
  noSeri: string;
  hariBeritaAcara: string;
  tanggalBeritaAcara: string;
  pejabatNama: string;
  pejabatReg: string;
  pejabatJabatan: string;
  pejabatSatker: string;
  items: KayuItem[];
  status?: 'Draft' | 'Tersimpan' | 'Tersinkronisasi Cloud' | 'Diterbitkan';
  lokasiTpk?: 'TPK' | 'TPKH';
  updatedAt: string;
  googleDriveFileId?: string;
  googleDriveLink?: string;
}

export interface SupirInfo {
  id?: string;
  nama: string;
  nopol: string;
  jenisKendaraan?: string;
  kontak?: string;
  catatan?: string;
}

export interface PembeliInfo {
  nama: string;
  alamat: string;
  kota: string;
}
