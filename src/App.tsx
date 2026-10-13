/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PermohonanData, PihakKetigaItem, SupirInfo } from './types';
import { INITIAL_PIHAK_KETIGA, DATA_SUPIR, DATA_PEMBELI, getKapasitasKendaraan } from './data/masterData';
import { PermohonanDocument } from './components/PermohonanDocument';
import { PihakKetigaTable } from './components/PihakKetigaTable';
import { SupirManager } from './components/SupirManager';
import { PembeliPerusahaanManager, PerusahaanInfo } from './components/PembeliPerusahaanManager';
import { DashboardSummaryCard } from './components/DashboardSummaryCard';
import { CloudArchiveModal } from './components/CloudArchiveModal';
import { HistoryModal } from './components/HistoryModal';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { NewDocumentModal } from './components/NewDocumentModal';
import { PerhutaniLogo } from './components/PerhutaniLogo';
import { LogoSettingsModal } from './components/LogoSettingsModal';
import { SisaPersediaanModal } from './components/SisaPersediaanModal';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken
} from './services/googleAuth';
import { generatePdfFile, generatePdfBlob } from './utils/pdfExport';
import { findPembeli, getUsedKaplingsMap, findMatchingDocumentsByVolumeSupir } from './utils/autoFillHelpers';
import {
  appendApplicationToSheet,
  syncInventoryToSheet,
  fetchInventoryFromSheet,
  uploadFileToGoogleDrive,
  listDriveArchives,
  DriveFileInfo,
  deleteApplicationFromSheet,
  clearAllApplicationsFromSheet
} from './services/googleWorkspace';
import {
  testConnection,
  savePermohonanToFirestore,
  loadPermohonanListFromFirestore,
  saveInventoryToFirestore,
  loadInventoryFromFirestore
} from './services/firestoreService';
import { User } from 'firebase/auth';
import {
  FileText,
  Table,
  Truck,
  Building2,
  Printer,
  FileDown,
  Cloud,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  History,
  FolderOpen,
  LogOut,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Menu,
  X,
  ChevronRight,
  Image as ImageIcon,
  ShieldCheck,
  TreePine
} from 'lucide-react';

const STORAGE_KEY_CURRENT_PERMOHONAN = 'tpk_talok_current_permohonan_v1';
const STORAGE_KEY_INVENTORY = 'tpk_talok_inventory_v1';
const STORAGE_KEY_HISTORY = 'tpk_talok_history_v1';
const STORAGE_KEY_SUPIR = 'tpk_talok_supir_v1';
const STORAGE_KEY_PERUSAHAAN = 'tpk_talok_perusahaan_v1';

declare global {
  interface Window {
    html2pdf: any;
  }
}

export default function App() {
  const getBlankPermohonan = (): PermohonanData => {
    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const currentYear = today.getFullYear().toString();

    return {
      id: `APP-${Date.now()}`,
      noKwitansi: '',
      tanggalKwitansi: today.getDate().toString(),
      bulanKwitansi: months[today.getMonth()],
      tahunKwitansi: currentYear,
      jenisKayu: 'PINUS',
      namaPemohon: '',
      pekerjaanPemohon: 'Sopir / Pengemudi',
      alamatPemohon: '',
      jenisKendaraan: 'Truk',
      namaSupir: '',
      nopol: '',
      tanggalAngkutan: `${today.getDate()} ${months[today.getMonth()]} ${currentYear}`,
      namaPenerima: '',
      alamatPenerima: '',
      telpPenerima: '',
      namaTujuan: '',
      alamatTujuan: '',
      telpTujuan: '',
      noKtpSim: '',
      noDkhp: '',
      noSeri: '',
      hariBeritaAcara: days[today.getDay()],
      tanggalBeritaAcara: `${today.getDate()} ${months[today.getMonth()]} ${currentYear}`,
      pejabatNama: 'Nurdin Hamdani',
      pejabatReg: '23230001226',
      pejabatJabatan: 'Kepala TPK Talok',
      pejabatSatker: 'TPK Talok',
      items: [
        { id: Date.now(), noKapling: '', sort: 'AII', btg: '', m3: '' },
      ],
      status: 'Draft',
      updatedAt: new Date().toISOString(),
    };
  };

  const getSamplePermohonan = (): PermohonanData => {
    const today = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return {
      id: `APP-${Date.now()}`,
      noKwitansi: 'INV/2026/03/012',
      tanggalKwitansi: today.getDate().toString(),
      bulanKwitansi: months[today.getMonth()],
      tahunKwitansi: today.getFullYear().toString(),
      jenisKayu: 'PINUS',
      namaPemohon: 'ABDUL',
      pekerjaanPemohon: 'Sopir / Pengemudi',
      alamatPemohon: 'Desa Talok, Kab. Brebes',
      jenisKendaraan: 'Truk',
      namaSupir: 'ABDUL',
      nopol: 'G 9664 TG',
      tanggalAngkutan: `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`,
      namaPenerima: 'CV. BERKAH SANDHI ABADI',
      alamatPenerima: 'LEBAKSIU, TEGAL',
      telpPenerima: '0812-3456-7890',
      namaTujuan: 'CV. BERKAH SANDHI ABADI',
      alamatTujuan: 'LEBAKSIU, TEGAL',
      telpTujuan: '0812-3456-7890',
      noKtpSim: '3329012304900001',
      noDkhp: 'DKHP/TLK/2026/089',
      noSeri: 'SKSHHK-TLK-2026-041',
      hariBeritaAcara: days[today.getDay()],
      tanggalBeritaAcara: `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`,
      pejabatNama: 'Nurdin Hamdani',
      pejabatReg: '23230001226',
      pejabatJabatan: 'Kepala TPK Talok',
      pejabatSatker: 'TPK Talok',
      items: [
        { id: 1, noKapling: 'KPL-001/TLK/2026', sort: 'AII', btg: 48, m3: 5.4210 },
      ],
      status: 'Draft',
      updatedAt: new Date().toISOString(),
    };
  };

  const getInitialPermohonan = (): PermohonanData => {
    return getSamplePermohonan();
  };

  // State
  const [activeTab, setActiveTab] = useState<'angkutan' | 'pihak_ketiga' | 'supir' | 'perusahaan'>('angkutan');
  const [supirList, setSupirList] = useState<SupirInfo[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SUPIR);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved supir list', e);
      }
    }
    return DATA_SUPIR;
  });
  const [perusahaanList, setPerusahaanList] = useState<PerusahaanInfo[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PERUSAHAAN);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved perusahaan list', e);
      }
    }
    return DATA_PEMBELI;
  });
  const [permohonan, setPermohonan] = useState<PermohonanData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENT_PERMOHONAN);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved permohonan', e);
      }
    }
    return getInitialPermohonan();
  });

  const [inventoryItems, setInventoryItems] = useState<PihakKetigaItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_INVENTORY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved inventory', e);
      }
    }
    return INITIAL_PIHAK_KETIGA;
  });

  const [savedHistory, setSavedHistory] = useState<PermohonanData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
    return [];
  });

  // Auth & Cloud State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [permohonanSheetUrl, setPermohonanSheetUrl] = useState<string | undefined>();
  const [persediaanSheetUrl, setPersediaanSheetUrl] = useState<string | undefined>();

  // Modals & Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isSisaModalOpen, setIsSisaModalOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileInfo[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);

  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    action: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  // Real-time Vehicle Capacity Overload Check
  const currentTotalM3 = permohonan.items.reduce(
    (sum, item) => sum + (parseFloat(String(item.m3)) || 0),
    0
  );
  const currentKapasitas = getKapasitasKendaraan(permohonan.jenisKendaraan);
  const isOverloadCapacity = Boolean(currentKapasitas && currentTotalM3 > currentKapasitas.maxM3);
  const currentExcessM3 = isOverloadCapacity && currentKapasitas ? currentTotalM3 - currentKapasitas.maxM3 : 0;

  // Intercept action if overloaded to prompt warning
  const proceedSaveWithOverloadCheck = (onProceed: () => void) => {
    if (activeTab === 'angkutan' && isOverloadCapacity && currentKapasitas) {
      setConfirmDialog({
        isOpen: true,
        title: '⚠️ Peringatan Overload Kapasitas Armada',
        message: `Total volume kayu (${currentTotalM3.toFixed(2)} m³) telah MELEBIHI kapasitas standar rekomendasi untuk kendaraan ${currentKapasitas.label} (maksimal ${currentKapasitas.maxM3.toFixed(2)} m³). Kelebihan volume: +${currentExcessM3.toFixed(2)} m³. Apakah Anda yakin ingin tetap melanjutkan pemrosesan dokumen ini?`,
        isDestructive: false,
        confirmLabel: 'Tetap Lanjutkan',
        cancelLabel: 'Batal & Sesuaikan',
        action: () => {
          setConfirmDialog((c) => ({ ...c, isOpen: false }));
          onProceed();
        },
      });
      return;
    }
    onProceed();
  };

  // Persistent local save
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENT_PERMOHONAN, JSON.stringify(permohonan));
  }, [permohonan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inventoryItems));
  }, [inventoryItems]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(savedHistory));
  }, [savedHistory]);

  // Auth & Firestore setup on mount
  useEffect(() => {
    testConnection();

    // Check if there are documents in Firestore to sync
    loadPermohonanListFromFirestore().then((remoteList) => {
      if (remoteList && remoteList.length > 0) {
        setSavedHistory((localList) => {
          const ids = new Set(localList.map((l) => l.id));
          const toAdd = remoteList.filter(
            (r) => !ids.has(r.id) && (!r.status || r.status.toLowerCase() !== 'draft')
          );
          return [...localList, ...toAdd];
        });
      }
    });

    loadInventoryFromFirestore().then((remoteInv) => {
      if (remoteInv && remoteInv.length > 0) {
        setInventoryItems(remoteInv);
      }
    });

    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) setAuthToken(token);
      },
      () => {
        setCurrentUser(null);
        setAuthToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAuthToken(result.accessToken);
        setCloudMessage({
          type: 'success',
          text: `Berhasil terhubung ke akun Google: ${result.user.email}`,
        });
      }
      // If result is null, the user cancelled or closed the popup window - no error needed
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        setCloudMessage({
          type: 'info',
          text: 'Jendela popup Google diblokir oleh peramban. Harap izinkan popup untuk situs ini.',
        });
      } else {
        setCloudMessage({
          type: 'error',
          text: `Gagal masuk: ${err.message || 'Coba lagi'}`,
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setAuthToken(null);
    setCloudMessage({ type: 'info', text: 'Telah keluar dari akun Google.' });
  };

  // Helper to ensure valid token with optional forced refresh on 401 expiration
  const getValidToken = async (forceRefresh = false): Promise<string | null> => {
    let token = forceRefresh ? null : (authToken || (await getAccessToken()));
    if (!token && !currentUser) {
      // Trigger sign-in flow
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAuthToken(res.accessToken);
        return res.accessToken;
      }
      return null;
    }
    if (!token) {
      setAuthToken(null);
      // Token might be expired in memory, prompt re-signin
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAuthToken(res.accessToken);
        return res.accessToken;
      }
    }
    return token;
  };

  // Sync Permohonan to Google Sheets & Instant Guaranteed Save (< 1 Detik)
  const handleSavePermohonanToSheets = async () => {
    // 0. DETEKSI DOKUMEN / FILE GANDA: Cegah jika Nomor DKHP / Nomor Seri SKSHHK SAMA PERSIS dengan riwayat
    const matchingDocs = findMatchingDocumentsByVolumeSupir(permohonan, savedHistory);
    if (matchingDocs.length > 0) {
      const match = matchingDocs[0];

      setCloudMessage({
        type: 'error',
        text: `⛔ DITOLAK GOOGLE SHEET: ${match.reason} Harap periksa dan ganti dengan No. DKHP / No. Seri baru.`,
      });

      setConfirmDialog({
        isOpen: true,
        title: '⛔ Nomor DKHP / Seri SKSHHK Ganda Terdeteksi',
        message: `Sistem mendeteksi bahwa ${match.reason}\n\nUntuk menghindari data ganda di Google Sheets, pastikan Anda menggunakan Nomor DKHP atau Seri SKSHHK baru yang sesuai dengan dokumen pengangkutan ini.`,
        isDestructive: true,
        confirmLabel: 'Mengerti & Sesuaikan Nomor',
        cancelLabel: 'Tutup',
        action: () => {
          setConfirmDialog((c) => ({ ...c, isOpen: false }));
        },
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; // Batal simpan ke Google Sheets
    }

    const targetDocId = permohonan.id;
    const docLabel = permohonan.noSeri || permohonan.noKwitansi || 'Dokumen';

    // 1. LANGSUNG SIMPAN SECARA INSTAN KE SISTEM (State, LocalStorage & Riwayat)
    const updatedPermohonan: PermohonanData = {
      ...permohonan,
      status: 'Tersimpan',
      updatedAt: new Date().toISOString(),
    };

    // Simpan ke riwayat lokal & localStorage secara langsung tanpa jeda
    setSavedHistory((prev) => {
      const filtered = prev.filter((p) => p.id !== updatedPermohonan.id);
      const nextList = [updatedPermohonan, ...filtered];
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(nextList));
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }
      return nextList;
    });

    // Simpan ke Firestore secara asynchronous di latar belakang (tanpa memblokir tombol)
    savePermohonanToFirestore(updatedPermohonan, currentUser?.uid).catch((fsErr) => {
      console.warn('Firestore background write notice:', fsErr);
    });

    // 2. OTOMATIS LANGSUNG BUAT FORMULIR BARU BERSIH UNTUK PENGISIAN DOKUMEN BERIKUTNYA
    const freshDoc = getBlankPermohonan();
    setPermohonan(freshDoc);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_PERMOHONAN, JSON.stringify(freshDoc));
    } catch {}

    // 3. SIMPAN KE GOOGLE SHEETS SECARA OTOMATIS
    setIsCloudSyncing(true);
    setCloudMessage({
      type: 'info',
      text: `⏳ Dokumen "${docLabel}" telah berhasil disimpan ke Riwayat! Editor otomatis beralih ke Formulir Baru. Menyinkronkan ke Google Sheets...`,
    });

    let token = authToken || (await getAccessToken());
    if (!token) {
      token = await getValidToken();
    }

    if (!token) {
      setIsCloudSyncing(false);
      setCloudMessage({
        type: 'success',
        text: `✅ Dokumen "${docLabel}" berhasil disimpan ke Riwayat & Database! Editor telah otomatis diperbarui ke FORMULIR BARU.`,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      let res;
      try {
        res = await Promise.race([
          appendApplicationToSheet(token, updatedPermohonan),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Waktu respon Google Sheets habis (timeout).')), 12000)
          ),
        ]);
      } catch (firstErr: any) {
        const errMsg = String(firstErr?.message || firstErr);
        if (
          errMsg.includes('berakhir') ||
          errMsg.includes('401') ||
          errMsg.includes('UNAUTHENTICATED') ||
          errMsg.includes('credentials')
        ) {
          setAuthToken(null);
          const freshToken = await getValidToken(true);
          if (freshToken) {
            res = await appendApplicationToSheet(freshToken, updatedPermohonan);
          } else {
            throw firstErr;
          }
        } else {
          throw firstErr;
        }
      }

      if (res?.spreadsheetUrl) {
        setPermohonanSheetUrl(res.spreadsheetUrl);
        try { localStorage.setItem('tpk_permohonan_sheet_url', res.spreadsheetUrl); } catch {}
      }

      const syncedDoc: PermohonanData = {
        ...updatedPermohonan,
        status: 'Tersinkronisasi Cloud',
      };
      setSavedHistory((prev) => [syncedDoc, ...prev.filter((p) => p.id !== syncedDoc.id)]);
      savePermohonanToFirestore(syncedDoc, currentUser?.uid).catch(() => {});

      setCloudMessage({
        type: 'success',
        text: `✅ Dokumen "${docLabel}" berhasil disimpan ke Riwayat & Google Sheets! Editor telah otomatis diperbarui ke FORMULIR BARU.`,
      });
    } catch (err: any) {
      console.warn('Google Sheets sync warning:', err);
      let errorNote = 'Perlu login Google';
      const errMsg = String(err?.message || err);
      if (
        errMsg.includes('berakhir') ||
        errMsg.includes('401') ||
        errMsg.includes('UNAUTHENTICATED') ||
        errMsg.includes('login') ||
        errMsg.includes('credentials')
      ) {
        setAuthToken(null);
        errorNote = 'Sesi login Google telah berakhir. Silakan hubungkan kembali akun Google';
      } else if (err?.message) {
        errorNote = err.message.replace(/[\{\}\[\]"]/g, '').slice(0, 100);
      }
      setCloudMessage({
        type: 'success',
        text: `✅ Dokumen "${docLabel}" telah tersimpan aman di Database & Riwayat! Editor telah otomatis diperbarui ke FORMULIR BARU. (Sinkron Sheets: ${errorNote})`,
      });
    } finally {
      setIsCloudSyncing(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Sync Inventory to Google Sheets & Instant Guaranteed Save (< 1 Detik)
  const handleSyncInventoryToSheets = async () => {
    // 1. Simpan langsung ke localStorage & Firestore di latar belakang
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inventoryItems));
    } catch {}

    saveInventoryToFirestore(inventoryItems).catch((fsErr) => {
      console.warn('Firestore inventory background write notice:', fsErr);
    });

    // 2. Hubungkan ke Google Sheets
    setIsCloudSyncing(true);
    setCloudMessage({
      type: 'info',
      text: '⏳ Sedang menyimpan persediaan ke Google Sheets...',
    });

    let token = authToken || (await getAccessToken());
    if (!token) {
      token = await getValidToken();
    }

    if (!token) {
      setIsCloudSyncing(false);
      setCloudMessage({
        type: 'info',
        text: `✅ Data persediaan (${inventoryItems.length} kapling) telah aman tersimpan di Database & Riwayat Lokal.`,
      });
      return;
    }

    try {
      let res;
      try {
        res = await Promise.race([
          syncInventoryToSheet(token, inventoryItems),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Waktu respon Google Sheets habis (timeout).')), 12000)
          ),
        ]);
      } catch (firstErr: any) {
        const errMsg = String(firstErr?.message || firstErr);
        if (
          errMsg.includes('berakhir') ||
          errMsg.includes('401') ||
          errMsg.includes('UNAUTHENTICATED') ||
          errMsg.includes('credentials')
        ) {
          setAuthToken(null);
          const freshToken = await getValidToken(true);
          if (freshToken) {
            res = await syncInventoryToSheet(freshToken, inventoryItems);
          } else {
            throw firstErr;
          }
        } else {
          throw firstErr;
        }
      }

      if (res?.spreadsheetUrl) {
        setPersediaanSheetUrl(res.spreadsheetUrl);
        try { localStorage.setItem('tpk_persediaan_sheet_url', res.spreadsheetUrl); } catch {}
      }

      setCloudMessage({
        type: 'success',
        text: `✅ Semua data ${inventoryItems.length} kapling berhasil langsung disinkronkan ke Google Sheets!`,
      });
    } catch (err: any) {
      console.warn('Google Sheets sync inventory warning:', err);
      let errorNote = 'Perlu login Google';
      const errMsg = String(err?.message || err);
      if (
        errMsg.includes('berakhir') ||
        errMsg.includes('401') ||
        errMsg.includes('UNAUTHENTICATED') ||
        errMsg.includes('login') ||
        errMsg.includes('credentials')
      ) {
        setAuthToken(null);
        errorNote = 'Sesi login Google telah berakhir. Silakan hubungkan kembali akun Google';
      } else if (err?.message) {
        errorNote = err.message.replace(/[\{\}\[\]"]/g, '').slice(0, 100);
      }
      setCloudMessage({
        type: 'info',
        text: `✅ Data persediaan sudah aman tersimpan di sistem. (Sinkron Sheets: ${errorNote})`,
      });
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Pull Inventory from Google Sheets
  const handleFetchInventoryFromSheets = async () => {
    setIsCloudSyncing(true);
    setCloudMessage(null);
    try {
      const token = await getValidToken();
      if (!token) return;

      const items = await fetchInventoryFromSheet(token);
      if (items && items.length > 0) {
        setInventoryItems(items);
        setCloudMessage({
          type: 'success',
          text: `Berhasil memuat ${items.length} data persediaan dari Google Sheets cloud!`,
        });
      } else {
        setCloudMessage({
          type: 'info',
          text: 'Belum ada data spreadsheet persediaan yang tersimpan di Google Drive.',
        });
      }
    } catch (err: any) {
      console.error('Error pulling inventory:', err);
      setCloudMessage({
        type: 'error',
        text: `Gagal memuat persediaan: ${err.message || 'Terjadi kesalahan'}`,
      });
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Load files from Google Drive
  const loadDriveFiles = async () => {
    setIsLoadingDriveFiles(true);
    try {
      const token = await getValidToken();
      if (!token) return;
      const files = await listDriveArchives(token);
      setDriveFiles(files);
    } catch (err) {
      console.error('Error loading drive files:', err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  // Generate PDF and upload directly to Google Drive
  const handleUploadCurrentDocToDrive = async () => {
    const isPihakKetiga = activeTab === 'pihak_ketiga';
    const elementId = isPihakKetiga ? 'cetak-pihak-ketiga' : 'cetak-angkutan';
    const element = document.getElementById(elementId);
    if (!element) return;

    setIsDriveUploading(true);
    setCloudMessage(null);

    const fileName = isPihakKetiga
      ? `Data_Persediaan_Pihak_Ketiga_${new Date().toISOString().slice(0, 10)}.pdf`
      : `SKSHHK_${permohonan.noSeri || 'Draft'}_${permohonan.namaPemohon || 'Kayu'}.pdf`;

    try {
      const token = await getValidToken();
      if (!token) {
        setCloudMessage({
          type: 'error',
          text: 'Silakan masuk ke Google untuk mengarsipkan ke Drive.',
        });
        return;
      }

      // Generate sanitized PDF blob with oklch conversion
      const pdfBlob = await generatePdfBlob(element, {
        fileName,
        isLandscape: isPihakKetiga,
      });

      const uploadResult = await uploadFileToGoogleDrive(token, pdfBlob, fileName);
      setCloudMessage({
        type: 'success',
        text: `Dokumen berhasil diarsipkan ke Google Drive! File: ${fileName}`,
      });

      // Update permohonan metadata
      setPermohonan((prev) => ({
        ...prev,
        googleDriveFileId: uploadResult.fileId,
        googleDriveLink: uploadResult.webViewLink,
        status: 'Tersinkronisasi Cloud',
      }));

      // Reload drive list if modal open
      await loadDriveFiles();
    } catch (err: any) {
      console.error('Gagal arsip ke Drive:', err);
      let errMsg = err?.message || 'Terjadi kesalahan';
      if (
        errMsg.includes('berakhir') ||
        errMsg.includes('401') ||
        errMsg.includes('UNAUTHENTICATED') ||
        errMsg.includes('credentials')
      ) {
        setAuthToken(null);
        errMsg = 'Sesi login Google telah berakhir. Silakan login kembali dengan akun Google.';
      } else {
        errMsg = errMsg.replace(/[\{\}\[\]"]/g, '').slice(0, 100);
      }
      setCloudMessage({
        type: 'error',
        text: `Gagal mengarsipkan ke Google Drive: ${errMsg}`,
      });
    } finally {
      setIsDriveUploading(false);
    }
  };

  // Export to PDF file (local download)
  const handleExportPDF = async () => {
    const isPihakKetiga = activeTab === 'pihak_ketiga';
    const elementId = isPihakKetiga ? 'cetak-pihak-ketiga' : 'cetak-angkutan';
    const element = document.getElementById(elementId);
    if (!element) return;

    const fileName = isPihakKetiga
      ? `Data_Persediaan_Pihak_Ketiga_${new Date().toISOString().slice(0, 10)}.pdf`
      : `Permohonan_Angkutan_${permohonan.noSeri || ''}_${permohonan.namaPemohon || 'TPK_Talok'}.pdf`;

    try {
      await generatePdfFile(element, {
        fileName,
        isLandscape: isPihakKetiga,
      });
      setCloudMessage({
        type: 'success',
        text: `Berhasil mengunduh dokumen PDF: ${fileName}`,
      });
    } catch (err: any) {
      console.error('Gagal cetak PDF:', err);
      setCloudMessage({
        type: 'error',
        text: `Gagal mencetak PDF: ${err.message || 'Terjadi kesalahan'}`,
      });
    }
  };

  // Cetak fisik ke printer dengan orientasi & ukuran kertas Legal
  const handlePrintDocument = () => {
    const isPihakKetiga = activeTab === 'pihak_ketiga';
    let printStyle = document.getElementById('dynamic-legal-print-style') as HTMLStyleElement | null;
    if (!printStyle) {
      printStyle = document.createElement('style');
      printStyle.id = 'dynamic-legal-print-style';
      document.head.appendChild(printStyle);
    }
    // Set Legal Landscape (355.6mm x 215.9mm) untuk persediaan kayu atau Legal Portrait (215.9mm x 355.6mm) untuk formulir permohonan
    printStyle.innerHTML = isPihakKetiga
      ? `@media print { @page { size: 355.6mm 215.9mm; margin: 0; } }`
      : `@media print { @page { size: 215.9mm 355.6mm; margin: 0; } }`;
    window.print();
  };

  // Buka dialog pilihan Buat Dokumen Baru
  const handleNewDocument = () => {
    setIsNewDocModalOpen(true);
  };

  // Buat formulir permohonan baru yang bersih (kosong)
  const handleCreateBlankDocument = () => {
    // Amankan dokumen aktif ke riwayat lokal HANYA jika sudah disimpan (bukan status Draft)
    if (permohonan.status && permohonan.status.toLowerCase() !== 'draft') {
      setSavedHistory((prev) => [permohonan, ...prev.filter((p) => p.id !== permohonan.id)]);
    }
    const blankDoc = getBlankPermohonan();
    setPermohonan(blankDoc);
    setActiveTab('angkutan');
    setIsNewDocModalOpen(false);
    setCloudMessage({
      type: 'success',
      text: 'Formulir permohonan baru (bersih) siap diisi. Tanggal otomatis diatur ke hari ini.',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Buat formulir dengan contoh data pengujian (demo)
  const handleCreateSampleDocument = () => {
    if (permohonan.status && permohonan.status.toLowerCase() !== 'draft') {
      setSavedHistory((prev) => [permohonan, ...prev.filter((p) => p.id !== permohonan.id)]);
    }
    const sampleDoc = getSamplePermohonan();
    setPermohonan(sampleDoc);
    setActiveTab('angkutan');
    setIsNewDocModalOpen(false);
    setCloudMessage({
      type: 'info',
      text: 'Data contoh permohonan (demo) berhasil dimuat ke editor.',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tambah baris kapling baru pada persediaan pihak ketiga
  const handleAddNewKapling = () => {
    const nextNum = inventoryItems.length + 1;
    const newItem: PihakKetigaItem = {
      id: Date.now(),
      noKapling: `KPL-${String(nextNum).padStart(3, '0')}/TLK/2026`,
      noBlok: '',
      jenisKayu: 'PINUS',
      sortimen: 'AII',
      panjang: '200',
      mutu: 'P',
      batang: '',
      volume: '',
      noInvoice: '',
      pembeli: '',
    };
    setInventoryItems((prev) => [...prev, newItem]);
    setCloudMessage({
      type: 'success',
      text: `Kapling persediaan baru (KPL-${String(nextNum).padStart(3, '0')}/TLK/2026) berhasil ditambahkan.`,
    });
  };

  // Gunakan kapling persediaan langsung untuk Formulir Permohonan (Auto-Fill seluruh kolom)
  const handleUseKaplingForPermohonan = (item: PihakKetigaItem) => {
    if (item.noKapling && item.noKapling.trim()) {
      const usedMap = getUsedKaplingsMap(savedHistory);
      const usage = usedMap.get(item.noKapling.trim().toLowerCase());
      if (usage) {
        setCloudMessage({
          type: 'error',
          text: `⛔ Kapling "${item.noKapling}" SUDAH DIPAKAI pada Kwitansi "${usage.noKwitansi}" (${usage.tanggal}) dan tidak dapat digunakan lagi!`,
        });
        return;
      }
    }

    const buyer = item.pembeli ? findPembeli(item.pembeli) : null;
    const buyerAddress = buyer ? `${buyer.alamat}, ${buyer.kota}` : '';

    setPermohonan((prev) => ({
      ...prev,
      noKwitansi: item.noInvoice || prev.noKwitansi,
      jenisKayu: item.jenisKayu || prev.jenisKayu,
      items: [
        {
          id: Date.now(),
          noKapling: item.noKapling,
          sort: item.sortimen || 'AII',
          btg: item.batang || '',
          m3: item.volume || '',
        },
      ],
      namaPenerima: item.pembeli || prev.namaPenerima,
      alamatPenerima: buyerAddress || prev.alamatPenerima,
      namaTujuan: item.pembeli || prev.namaTujuan,
      alamatTujuan: buyerAddress || prev.alamatTujuan,
    }));

    setActiveTab('angkutan');
    setCloudMessage({
      type: 'success',
      text: `Kapling "${item.noKapling}" (${item.jenisKayu}) berhasil dimuat ke Formulir Angkutan! Seluruh kolom terkait terisi otomatis.`,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistoryItem = (id: string) => {
    const itemToDelete = savedHistory.find((item) => item.id === id);
    const docLabel = itemToDelete?.noSeri
      ? `No. Seri ${itemToDelete.noSeri}`
      : itemToDelete?.namaPemohon
      ? `Pemohon ${itemToDelete.namaPemohon}`
      : 'Dokumen ini';

    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Riwayat & Data di Google Sheets?',
      message: `Apakah Anda yakin ingin menghapus "${docLabel}"? Dokumen ini akan dihapus dari riwayat lokal dan baris datanya di Google Sheets / Google Drive akan otomatis dihapus juga secara permanen.`,
      isDestructive: true,
      action: async () => {
        // 1. Hapus seketika dari riwayat lokal
        setSavedHistory((prev) => prev.filter((item) => item.id !== id));
        setConfirmDialog((c) => ({ ...c, isOpen: false }));

        if (!itemToDelete) return;

        // 2. Hapus otomatis data di Google Sheets & Google Drive
        setCloudMessage({
          type: 'info',
          text: `⏳ Sedang menghapus "${docLabel}" dari Google Sheets & Drive...`,
        });

        try {
          const token = authToken || (await getAccessToken());
          if (token) {
            const result = await deleteApplicationFromSheet(token, itemToDelete);
            if (result.deletedRowsCount > 0 || result.driveFileDeleted) {
              setCloudMessage({
                type: 'success',
                text: `✅ Dokumen "${docLabel}" berhasil dihapus dari riwayat dan ${result.deletedRowsCount} baris data di Google Sheets telah terhapus otomatis!`,
              });
            } else {
              setCloudMessage({
                type: 'success',
                text: `✅ Dokumen "${docLabel}" berhasil dihapus dari riwayat lokal.`,
              });
            }
          } else {
            setCloudMessage({
              type: 'info',
              text: `✅ Dokumen "${docLabel}" dihapus dari riwayat lokal. (Untuk sinkronisasi otomatis hapus di Google Sheets, login ke akun Google).`,
            });
          }
        } catch (err: any) {
          console.warn('Gagal sinkronisasi hapus ke Google Sheets:', err);
          setCloudMessage({
            type: 'info',
            text: `✅ Dokumen "${docLabel}" dihapus dari riwayat lokal. (Sinkron Sheets: ${err.message || 'Perlu verifikasi'})`,
          });
        }
      },
    });
  };

  const handleClearAllHistory = () => {
    if (savedHistory.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Semua Riwayat & Bersihkan Google Sheets?',
      message: `Apakah Anda yakin ingin MENGHAPUS SEMUA ${savedHistory.length} riwayat dokumen? Seluruh rekaman data pada Google Sheets juga akan dibersihkan otomatis.`,
      isDestructive: true,
      action: async () => {
        setSavedHistory([]);
        setConfirmDialog((c) => ({ ...c, isOpen: false }));

        setCloudMessage({
          type: 'info',
          text: '⏳ Sedang membersihkan data di Google Sheets...',
        });

        try {
          const token = authToken || (await getAccessToken());
          if (token) {
            const cleared = await clearAllApplicationsFromSheet(token);
            if (cleared) {
              setCloudMessage({
                type: 'success',
                text: '✅ Semua riwayat dokumen dan seluruh baris data di Google Sheets berhasil dihapus dan dibersihkan!',
              });
            } else {
              setCloudMessage({
                type: 'success',
                text: '✅ Semua riwayat lokal berhasil dibersihkan.',
              });
            }
          } else {
            setCloudMessage({
              type: 'success',
              text: '✅ Semua riwayat lokal dibersihkan.',
            });
          }
        } catch (err: any) {
          console.warn('Gagal membersihkan Google Sheets:', err);
          setCloudMessage({
            type: 'info',
            text: `✅ Riwayat lokal dibersihkan. (Pembersihan Sheets: ${err.message || 'Perlu login Google'})`,
          });
        }
      },
    });
  };

  const handleUpdateHistoryItem = (updatedItem: PermohonanData) => {
    setSavedHistory((prev) => {
      const nextList = prev.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(nextList));
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }
      return nextList;
    });

    if (permohonan.id === updatedItem.id) {
      setPermohonan(updatedItem);
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT_PERMOHONAN, JSON.stringify(updatedItem));
      } catch {}
    }

    savePermohonanToFirestore(updatedItem, currentUser?.uid).catch((fsErr) => {
      console.warn('Firestore update history notice:', fsErr);
    });

    setCloudMessage({
      type: 'success',
      text: `Unit angkutan untuk dokumen No. Seri ${updatedItem.noSeri || '-'} diubah menjadi ${updatedItem.lokasiTpk || 'TPK'}.`,
    });
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 flex font-sans overflow-x-hidden">
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden no-print"
        />
      )}

      {/* ========================================================
          LEFT SIDEBAR NAVIGATION (NATIVE SAAS DESK)
         ======================================================== */}
      <aside
        className={`no-print fixed lg:sticky top-0 left-0 h-screen w-64 sm:w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between z-50 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto p-4">
          {/* BRAND HEADER */}
          <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsLogoModalOpen(true)}
                title="Atur Logo Perhutani"
                className="bg-emerald-950/60 hover:bg-emerald-900/80 p-2 rounded-2xl border border-emerald-700/50 transition cursor-pointer shadow-inner shrink-0"
              >
                <PerhutaniLogo size={32} showText={false} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-black tracking-tight text-white truncate">
                  TPK TALOK
                </h1>
                <p className="text-[11px] text-emerald-400 font-bold truncate">
                  Perum Perhutani
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MAIN MENU SECTION 1: NAVIGASI FORMULIR & MANAJEMEN */}
          <div className="space-y-1 mb-5">
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/80 mb-2">
              Navigasi Utama
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab('angkutan');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'angkutan'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 shrink-0 text-emerald-300" />
                <span className="truncate">Permohonan & SKSHHK</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'angkutan' ? 'opacity-100 text-white' : 'opacity-40 text-slate-400'}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('pihak_ketiga');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pihak_ketiga'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Table className="w-4 h-4 shrink-0 text-emerald-300" />
                <span className="truncate">Persediaan Pihak Ketiga</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/80 shrink-0">
                {inventoryItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('supir');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'supir'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Truck className="w-4 h-4 shrink-0 text-emerald-300" />
                <span className="truncate">Nama Supir & Armada</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/80 shrink-0">
                {supirList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('perusahaan');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'perusahaan'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Building2 className="w-4 h-4 shrink-0 text-emerald-300" />
                <span className="truncate">Perusahaan & Lokasi Bongkar</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/80 shrink-0">
                {perusahaanList.length}
              </span>
            </button>
          </div>

          {/* MAIN MENU SECTION 2: AKSI CEPAT DOKUMEN */}
          <div className="space-y-1 mb-5 pt-3 border-t border-slate-800/60">
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/80 mb-2">
              Aksi Cepat Dokumen
            </div>

            <button
              type="button"
              onClick={() => {
                if (activeTab === 'pihak_ketiga') {
                  handleAddNewKapling();
                } else {
                  handleNewDocument();
                }
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">
                {activeTab === 'pihak_ketiga' ? '+ Tambah Kapling Baru' : '+ Buat Permohonan Baru'}
              </span>
            </button>

            {activeTab === 'angkutan' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    proceedSaveWithOverloadCheck(handleSavePermohonanToSheets);
                    setIsSidebarOpen(false);
                  }}
                  disabled={isCloudSyncing}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  <Cloud className={`w-4 h-4 text-emerald-400 shrink-0 ${isCloudSyncing ? 'animate-pulse' : ''}`} />
                  <span className="truncate">{isCloudSyncing ? 'Menyimpan...' : 'Simpan ke Google Sheets'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    proceedSaveWithOverloadCheck(handleExportPDF);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">Simpan Dokumen PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    proceedSaveWithOverloadCheck(handlePrintDocument);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">Print Legal</span>
                </button>
              </>
            )}

            {activeTab === 'pihak_ketiga' && (
              <button
                type="button"
                onClick={() => {
                  handleSyncInventoryToSheets();
                  setIsSidebarOpen(false);
                }}
                disabled={isCloudSyncing}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <Cloud className={`w-4 h-4 text-emerald-400 shrink-0 ${isCloudSyncing ? 'animate-pulse' : ''}`} />
                <span className="truncate">{isCloudSyncing ? 'Menyimpan...' : 'Simpan Persediaan ke Sheets'}</span>
              </button>
            )}
          </div>

          {/* MAIN MENU SECTION 3: CLOUD, RIWAYAT & AKSEK */}
          <div className="space-y-1 mb-6 pt-3 border-t border-slate-800/60">
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/80 mb-2">
              Cloud & Pengaturan
            </div>

            <button
              type="button"
              onClick={() => {
                loadDriveFiles();
                setIsArchiveModalOpen(true);
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Drive & Sheets Cloud</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsHistoryModalOpen(true);
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <History className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Riwayat Dokumen</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 shrink-0">
                {savedHistory.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSisaModalOpen(true);
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer bg-emerald-950/40 border border-emerald-800/50"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <TreePine className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Laporan Sisa Persediaan</span>
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Belum Diangkut
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLogoModalOpen(true);
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Logo & Watermark</span>
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Anti-Palsu
              </span>
            </button>
          </div>
        </div>

        {/* BOTTOM USER ACCOUNT / GOOGLE CLOUD FOOTER */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950">
          {currentUser ? (
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-emerald-500/80 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {currentUser.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-xs font-bold text-white truncate">
                    {currentUser.displayName || currentUser.email}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-semibold truncate">
                    Google Terhubung
                  </p>
                </div>
              </div>
              <button
                onClick={handleGoogleLogout}
                title="Keluar dari akun Google"
                className="p-1.5 text-slate-400 hover:text-red-400 transition rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk Google Cloud'}</span>
            </button>
          )}
        </div>
      </aside>

      {/* ========================================================
          MAIN WORKSPACE VIEWPORT
         ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-900">
        {/* TOP CONTEXTUAL HEADER BAR */}
        <header className="no-print bg-slate-950/90 border-b border-slate-800/90 sticky top-0 z-30 backdrop-blur-md px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl cursor-pointer"
                title="Buka Menu Navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>
                    {activeTab === 'angkutan'
                      ? 'Permohonan & SKSHHK (Legal)'
                      : activeTab === 'pihak_ketiga'
                      ? 'Persediaan Kayu Pihak Ketiga'
                      : activeTab === 'supir'
                      ? 'Daftar Supir & Armada Transportasi'
                      : 'Daftar Perusahaan Pembeli & Lokasi Bongkar'}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  {activeTab === 'angkutan'
                    ? 'Manajemen Dokumen Legalitas Kayu SKSHHK & Surat Angkutan TPK Talok'
                    : activeTab === 'pihak_ketiga'
                    ? 'Pencatatan Kapling, Sortimen, Volume, & Invoice Pembeli'
                    : activeTab === 'supir'
                    ? 'Pencatatan Pengemudi, Nomor Polisi, & Wilayah Pelat Kendaraan'
                    : 'Pencatatan Pabrik Industri Kayu, Alamat Penerima, & Tujuan Bongkar'}
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS TOOLBAR */}
            <div className="flex flex-wrap items-center gap-2">
              {isOverloadCapacity && currentKapasitas && activeTab === 'angkutan' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-amber-950 text-xs font-black rounded-lg shadow-xs animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-red-700" />
                  <span>
                    Overload: {currentTotalM3.toFixed(2)} m³ (Maks: {currentKapasitas.maxM3} m³)
                  </span>
                </div>
              )}

              {activeTab === 'angkutan' ? (
                <button
                  type="button"
                  onClick={handleNewDocument}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-md cursor-pointer"
                  title="Buat dokumen formulir permohonan baru"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-950" />
                  <span>+ Buat Baru</span>
                </button>
              ) : activeTab === 'pihak_ketiga' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsSisaModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 rounded-xl transition shadow-md cursor-pointer border border-teal-500/50"
                    title="Buka Laporan Sisa Persediaan Kayu Belum Diangkut"
                  >
                    <TreePine className="w-4 h-4 text-emerald-300" />
                    <span>Laporan Sisa Persediaan</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddNewKapling}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-md cursor-pointer"
                    title="Tambah data kapling persediaan baru"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-950" />
                    <span>+ Tambah Kapling</span>
                  </button>
                </>
              ) : null}

              {activeTab === 'angkutan' ? (
                <button
                  type="button"
                  onClick={() => proceedSaveWithOverloadCheck(handleSavePermohonanToSheets)}
                  disabled={isCloudSyncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
                  title="1-Klik langsung simpan ke database sistem & Google Sheets"
                >
                  <Cloud className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-pulse' : ''}`} />
                  <span>{isCloudSyncing ? 'Menyimpan...' : 'Simpan ke Sheets'}</span>
                </button>
              ) : activeTab === 'pihak_ketiga' ? (
                <button
                  type="button"
                  onClick={handleSyncInventoryToSheets}
                  disabled={isCloudSyncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
                  title="1-Klik langsung simpan persediaan ke database sistem & Google Sheets"
                >
                  <Cloud className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-pulse' : ''}`} />
                  <span>{isCloudSyncing ? 'Menyimpan...' : 'Simpan ke Sheets'}</span>
                </button>
              ) : null}

              {((activeTab === 'angkutan' && permohonanSheetUrl) || (activeTab === 'pihak_ketiga' && persediaanSheetUrl)) && (
                <a
                  href={activeTab === 'angkutan' ? permohonanSheetUrl : persediaanSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 rounded-xl border border-emerald-700/60 transition shadow-2xs"
                  title="Buka Spreadsheet di Google Sheets"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Buka Sheets ↗</span>
                </a>
              )}

              {activeTab === 'angkutan' && (
                <>
                  <button
                    onClick={() => proceedSaveWithOverloadCheck(handleExportPDF)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-md cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Simpan PDF</span>
                  </button>

                  <button
                    onClick={() => proceedSaveWithOverloadCheck(handlePrintDocument)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition shadow-md cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Print Legal</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* NOTIFICATION BANNER */}
          {cloudMessage && (
            <div
              className={`mt-3 px-4 py-2 text-xs rounded-xl flex items-center justify-between transition ${
                cloudMessage.type === 'success'
                  ? 'bg-emerald-800/90 text-white border border-emerald-600'
                  : cloudMessage.type === 'error'
                  ? 'bg-rose-800/90 text-white border border-rose-600'
                  : 'bg-sky-800/90 text-white border border-sky-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {cloudMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-300" />
                )}
                <span className="font-semibold">{cloudMessage.text}</span>
              </div>
              <button
                onClick={() => setCloudMessage(null)}
                className="text-white/80 hover:text-white px-2 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </header>

        {/* WORKSPACE VIEWPORT */}
        <main className="w-full flex-1 flex flex-col items-center py-6 px-3 sm:px-6">
          <DashboardSummaryCard
            activeTab={activeTab}
            permohonan={permohonan}
            inventoryItems={inventoryItems}
            onOpenSisaReport={() => setIsSisaModalOpen(true)}
          />

          {activeTab === 'angkutan' ? (
            <PermohonanDocument
              data={permohonan}
              onChange={setPermohonan}
              pihakKetigaItems={inventoryItems}
              supirList={supirList}
              savedHistory={savedHistory}
            />
          ) : activeTab === 'pihak_ketiga' ? (
            <PihakKetigaTable
              items={inventoryItems}
              onChange={setInventoryItems}
              onSyncToSheets={handleSyncInventoryToSheets}
              onFetchFromSheets={handleFetchInventoryFromSheets}
              onUseForPermohonan={handleUseKaplingForPermohonan}
              onOpenSisaReport={() => setIsSisaModalOpen(true)}
              isSyncing={isCloudSyncing}
              sheetsUrl={persediaanSheetUrl}
              savedHistory={savedHistory}
            />
          ) : activeTab === 'supir' ? (
            <SupirManager
              supirList={supirList}
              onUpdateList={(newList) => {
                setSupirList(newList);
                try {
                  localStorage.setItem(STORAGE_KEY_SUPIR, JSON.stringify(newList));
                } catch {}
              }}
              onSelectForForm={(selectedSupir) => {
                setPermohonan((prev) => ({
                  ...prev,
                  namaSupir: selectedSupir.nama,
                  namaPemohon: selectedSupir.nama,
                  nopol: selectedSupir.nopol,
                  pekerjaanPemohon: 'Sopir / Pengemudi',
                  jenisKendaraan: selectedSupir.jenisKendaraan || prev.jenisKendaraan,
                }));
                setActiveTab('angkutan');
                setCloudMessage({
                  type: 'success',
                  text: `Data Supir "${selectedSupir.nama}" (${selectedSupir.nopol}) berhasil dimuat ke Formulir Permohonan & SKSHHK!`,
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              activeSupirName={permohonan.namaSupir}
              activeNopol={permohonan.nopol}
            />
          ) : (
            <PembeliPerusahaanManager
              perusahaanList={perusahaanList}
              onUpdateList={(newList) => {
                setPerusahaanList(newList);
                try {
                  localStorage.setItem(STORAGE_KEY_PERUSAHAAN, JSON.stringify(newList));
                } catch {}
              }}
              onSelectForForm={(selectedPerusahaan) => {
                const fullAddr = `${selectedPerusahaan.alamat}${selectedPerusahaan.kota ? `, ${selectedPerusahaan.kota}` : ''}`;
                setPermohonan((prev) => ({
                  ...prev,
                  namaPenerima: selectedPerusahaan.nama,
                  alamatPenerima: fullAddr,
                  telpPenerima: selectedPerusahaan.telp || prev.telpPenerima,
                  namaTujuan: selectedPerusahaan.nama,
                  alamatTujuan: fullAddr,
                  telpTujuan: selectedPerusahaan.telp || prev.telpTujuan,
                }));
                setActiveTab('angkutan');
                setCloudMessage({
                  type: 'success',
                  text: `Data Perusahaan "${selectedPerusahaan.nama}" (${selectedPerusahaan.kota}) berhasil dimuat ke Penerima & Lokasi Bongkar!`,
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              activePenerimaName={permohonan.namaPenerima}
              activeTujuanName={permohonan.namaTujuan}
            />
          )}
        </main>
      </div>

      {/* ========================================================
          MODALS & CONFIRMATIONS
         ======================================================== */}
      <CloudArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        files={driveFiles}
        isLoading={isLoadingDriveFiles}
        onRefresh={loadDriveFiles}
        onUploadCurrentDoc={() => proceedSaveWithOverloadCheck(handleUploadCurrentDocToDrive)}
        isUploading={isDriveUploading}
        permohonanSheetUrl={permohonanSheetUrl}
        persediaanSheetUrl={persediaanSheetUrl}
        userEmail={currentUser?.email || undefined}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        savedList={savedHistory}
        onSelect={(item) => {
          setPermohonan(item);
          setActiveTab('angkutan');
          setCloudMessage({
            type: 'info',
            text: `Dokumen permohonan No. Seri: ${item.noSeri || '-'} dimuat ke editor.`,
          });
        }}
        onDelete={handleDeleteHistoryItem}
        onNew={handleNewDocument}
        onClearAll={handleClearAllHistory}
        onUpdateItem={handleUpdateHistoryItem}
      />

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((c) => ({ ...c, isOpen: false }))}
      />

      <LogoSettingsModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
      />

      <NewDocumentModal
        isOpen={isNewDocModalOpen}
        onClose={() => setIsNewDocModalOpen(false)}
        onCreateBlank={handleCreateBlankDocument}
        onCreateSample={handleCreateSampleDocument}
      />

      <SisaPersediaanModal
        isOpen={isSisaModalOpen}
        onClose={() => setIsSisaModalOpen(false)}
        inventoryItems={inventoryItems}
        savedHistory={savedHistory}
        currentPermohonan={permohonan}
        onUseForPermohonan={handleUseKaplingForPermohonan}
      />
    </div>
  );
}
