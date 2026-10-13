import { PermohonanData, PihakKetigaItem } from '../types';
import { setCachedAccessToken } from './googleAuth';

const PERMOHONAN_SPREADSHEET_NAME = 'TPK Talok - Buku Register Permohonan Angkutan Kayu';
const PERSEDIAAN_SPREADSHEET_NAME = 'TPK Talok - Data Persediaan Pihak Ketiga';
const DRIVE_FOLDER_NAME = 'TPK Talok - Arsip SKSHHK & Angkutan Kayu';

/**
 * Format Google API error response into a clean, human-readable Indonesian error string.
 * Automatically clears expired access token on 401 UNAUTHENTICATED.
 */
function parseApiErrorText(rawText: string, defaultActionMsg: string): string {
  if (!rawText) return defaultActionMsg;

  let isUnauth =
    rawText.includes('UNAUTHENTICATED') ||
    rawText.includes('invalid authentication credentials') ||
    rawText.includes('401');

  try {
    const json = JSON.parse(rawText);
    if (json?.error?.status === 'UNAUTHENTICATED' || json?.error?.code === 401) {
      isUnauth = true;
    }
    if (json?.error?.message && !isUnauth) {
      return `${defaultActionMsg}: ${json.error.message}`;
    }
  } catch {}

  if (isUnauth) {
    setCachedAccessToken(null);
    return 'Sesi login Google telah berakhir. Silakan hubungkan kembali akun Google.';
  }

  const clean = rawText.replace(/[\{\}\[\]"]/g, '').replace(/\s+/g, ' ').trim();
  return `${defaultActionMsg}: ${clean.slice(0, 100)}`;
}

interface SheetSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  createdTime: string;
  webViewLink?: string;
  size?: string;
}

/**
 * Searches for a spreadsheet by name or creates it if not found.
 */
export async function getOrCreateSpreadsheet(
  accessToken: string,
  title: string,
  headers: string[]
): Promise<SheetSyncResult> {
  const cacheKey = title.includes('Persediaan') ? 'tpk_persediaan_sheet_id' : 'tpk_permohonan_sheet_id';

  // 1. Langsung pakai cached spreadsheet ID jika sudah tersimpan agar respon instan (< 1 detik)
  const cachedId = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  if (cachedId) {
    return {
      spreadsheetId: cachedId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cachedId}/edit`,
    };
  }

  // 2. Buat spreadsheet baru di Google Sheets secara langsung dengan header lengkap (1 request)
  try {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [
          {
            properties: {
              title: 'Data',
              gridProperties: { frozenRowCount: 1 },
            },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: headers.map((h) => ({
                      userEnteredValue: { stringValue: h },
                    })),
                  },
                ],
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (createRes.ok) {
      const newSheet = await createRes.json();
      const spreadsheetId = newSheet.spreadsheetId;
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, spreadsheetId);
      }

      return {
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      };
    }
  } catch (createErr) {
    console.warn('Gagal membuat spreadsheet langsung, mencoba pencarian:', createErr);
  }

  // Fallback: cari di Google Drive
  const query = encodeURIComponent(`name = '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(6000),
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const existing = searchData.files[0];
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, existing.id);
      }
      return {
        spreadsheetId: existing.id,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${existing.id}/edit`,
      };
    }
  }

  throw new Error('Gagal menyiapkan spreadsheet di Google Sheets. Periksa akun dan izin.');
}

/**
 * Appends application record to Google Sheets
 */
export async function appendApplicationToSheet(
  accessToken: string,
  data: PermohonanData
): Promise<SheetSyncResult> {
  const headers = [
    'Waktu Simpan',
    'No. Seri SKSHHK',
    'Tanggal Angkutan',
    'Pemohon / Sopir',
    'Nomor Polisi',
    'Jenis Kendaraan',
    'Kelompok Kayu',
    'Sortimen',
    'Total Batang',
    'Total Volume (M3)',
    'Penerima',
    'Alamat Tujuan',
    'No. DKHP',
    'Pejabat Penerbit',
    'Status',
    'ID Dokumen'
  ];

  let targetSheet = await getOrCreateSpreadsheet(
    accessToken,
    PERMOHONAN_SPREADSHEET_NAME,
    headers
  );

  // Pastikan baris header terisi/diperbarui dengan kolom Sortimen & ID Dokumen
  fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${targetSheet.spreadsheetId}/values/Data!A1:P1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers],
      }),
      signal: AbortSignal.timeout(5000),
    }
  ).catch(() => {});

  const totalBtg = data.items.reduce((sum, item) => sum + (parseInt(String(item.btg)) || 0), 0);
  const totalM3 = data.items.reduce((sum, item) => sum + (parseFloat(String(item.m3)) || 0), 0);

  // Sortimen kayu dari kapling yang dimuat (contoh: "AII" atau "AI, AII")
  const sortimenList = Array.from(
    new Set(
      data.items
        .map((item) => (item.sort || '').trim().toUpperCase())
        .filter(Boolean)
    )
  );
  const sortimenStr = sortimenList.length > 0 ? sortimenList.join(', ') : 'AII';

  const row = [
    new Date().toLocaleString('id-ID'),
    data.noSeri || '-',
    data.tanggalAngkutan || '-',
    data.namaPemohon || '-',
    data.nopol || '-',
    data.jenisKendaraan || '-',
    data.jenisKayu || '-',
    sortimenStr,
    totalBtg,
    totalM3 > 0 ? totalM3.toFixed(4) : 0,
    data.namaPenerima || '-',
    data.alamatTujuan ? `${data.namaTujuan || ''} (${data.alamatTujuan})` : '-',
    data.noDkhp || '-',
    `${data.pejabatNama} (Reg: ${data.pejabatReg})`,
    data.status || 'Diajukan',
    data.id || '-'
  ];

  let appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${targetSheet.spreadsheetId}/values/Data!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
      signal: AbortSignal.timeout(8000),
    }
  );

  // Jika 404 (spreadsheet id lama tidak ditemukan), hapus cache dan buat baru
  if (appendRes.status === 404) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tpk_permohonan_sheet_id');
    }
    targetSheet = await getOrCreateSpreadsheet(accessToken, PERMOHONAN_SPREADSHEET_NAME, headers);
    appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${targetSheet.spreadsheetId}/values/Data!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
  }

  if (!appendRes.ok) {
    const errText = await appendRes.text();
    throw new Error(parseApiErrorText(errText, 'Gagal menyimpan baris ke Google Sheet'));
  }

  return { spreadsheetId: targetSheet.spreadsheetId, spreadsheetUrl: targetSheet.spreadsheetUrl };
}

/**
 * Menghapus baris rekaman dokumen permohonan dari Google Sheets dan file PDF di Google Drive
 */
export async function deleteApplicationFromSheet(
  accessToken: string,
  data: PermohonanData
): Promise<{ deletedRowsCount: number; driveFileDeleted: boolean }> {
  let deletedRowsCount = 0;
  let driveFileDeleted = false;

  // 1. Hapus file PDF di Google Drive jika ada fileId terlampir
  if (data.googleDriveFileId) {
    try {
      driveFileDeleted = await deleteFileFromGoogleDrive(accessToken, data.googleDriveFileId);
    } catch (e) {
      console.warn('Gagal menghapus file dari Drive via fileId:', e);
    }
  }

  // 1b. Cari dan hapus file arsip terkait di Google Drive berdasarkan No. Seri SKSHHK atau ID dokumen
  try {
    const folderId = await getOrCreateDriveFolder(accessToken);
    const driveFiles = await listDriveArchives(accessToken);
    if (driveFiles && driveFiles.length > 0) {
      for (const file of driveFiles) {
        const fName = file.name.toLowerCase();
        const matchSeri = data.noSeri && data.noSeri !== '-' && fName.includes(data.noSeri.toLowerCase());
        const matchId = data.id && fName.includes(data.id.toLowerCase());
        if (matchSeri || matchId || file.id === data.googleDriveFileId) {
          const ok = await deleteFileFromGoogleDrive(accessToken, file.id);
          if (ok) driveFileDeleted = true;
        }
      }
    }
  } catch (err) {
    console.warn('Gagal memeriksa/menghapus file arsip Drive:', err);
  }

  // 2. Dapatkan ID Spreadsheet
  const cachedId = typeof window !== 'undefined' ? localStorage.getItem('tpk_permohonan_sheet_id') : null;
  let spreadsheetId = cachedId;

  if (!spreadsheetId) {
    const q = encodeURIComponent(
      `name = '${PERMOHONAN_SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    try {
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(6000),
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          spreadsheetId = searchData.files[0].id;
        }
      }
    } catch (e) {
      console.warn('Gagal mencari spreadsheet:', e);
    }
  }

  if (!spreadsheetId) {
    return { deletedRowsCount: 0, driveFileDeleted };
  }

  try {
    // 3. Dapatkan sheetId dan nama sheet yang sebenarnya
    let sheetId = 0;
    let sheetTitle = 'Data';
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const dataSheet =
        meta.sheets?.find(
          (s: any) => s.properties?.title === 'Data' || s.properties?.title === 'Sheet1'
        ) || meta.sheets?.[0];
      if (dataSheet?.properties) {
        if (dataSheet.properties.sheetId !== undefined) {
          sheetId = dataSheet.properties.sheetId;
        }
        if (dataSheet.properties.title) {
          sheetTitle = dataSheet.properties.title;
        }
      }
    }

    // 4. Ambil seluruh baris data dari Google Sheet
    const rowsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A:P`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (rowsRes.ok) {
      const rowsData = await rowsRes.json();
      const rows: string[][] = rowsData.values || [];

      // Identifikasi baris yang cocok (0-indexed; row 0 adalah header)
      const matchingIndices: number[] = [];

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;

        const rowNoSeri = (r[1] || '').trim();
        const rowTanggal = (r[2] || '').trim();
        const rowPemohon = (r[3] || '').trim().toLowerCase();
        const rowNopol = (r[4] || '').trim().toLowerCase();
        const rowDkhp = (r[12] || '').trim();
        const rowDocId = (r[15] || '').trim();

        let isMatch = false;

        // Cocokkan berdasarkan ID dokumen unik
        if (data.id && (rowDocId === data.id.trim() || r.some((cell) => cell && cell.includes(data.id)))) {
          isMatch = true;
        }
        // Cocokkan berdasarkan No. Seri SKSHHK
        else if (data.noSeri && data.noSeri !== '-' && rowNoSeri && rowNoSeri.toLowerCase() === data.noSeri.trim().toLowerCase()) {
          isMatch = true;
        }
        // Cocokkan berdasarkan No. DKHP
        else if (data.noDkhp && data.noDkhp !== '-' && rowDkhp && rowDkhp.toLowerCase() === data.noDkhp.trim().toLowerCase()) {
          isMatch = true;
        }
        // Cocokkan berdasarkan kombinasi Pemohon dan Nopol/Tanggal
        else if (
          data.namaPemohon &&
          rowPemohon === data.namaPemohon.trim().toLowerCase() &&
          ((data.nopol && (rowNopol === data.nopol.trim().toLowerCase() || rowNopol.replace(/\s+/g, '') === data.nopol.trim().replace(/\s+/g, '').toLowerCase())) ||
            (data.tanggalAngkutan && rowTanggal === data.tanggalAngkutan.trim()))
        ) {
          isMatch = true;
        }

        if (isMatch) {
          matchingIndices.push(i);
        }
      }

      // Hapus baris dari indeks terbesar ke terkecil agar indeks baris lainnya tidak tergeser
      if (matchingIndices.length > 0) {
        matchingIndices.sort((a, b) => b - a);

        const requests = matchingIndices.map((rowIdx) => ({
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIdx,
              endIndex: rowIdx + 1,
            },
          },
        }));

        const deleteRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests }),
            signal: AbortSignal.timeout(8000),
          }
        );

        if (deleteRes.ok) {
          deletedRowsCount = matchingIndices.length;
        }
      }
    }
  } catch (err) {
    console.warn('Gagal menghapus baris di Google Sheets:', err);
  }

  return { deletedRowsCount, driveFileDeleted };
}

/**
 * Membersihkan semua data baris permohonan di Google Sheets (menyisakan baris header)
 * dan menghapus file-file arsip di Google Drive
 */
export async function clearAllApplicationsFromSheet(accessToken: string): Promise<boolean> {
  const cachedId = typeof window !== 'undefined' ? localStorage.getItem('tpk_permohonan_sheet_id') : null;
  let spreadsheetId = cachedId;

  if (!spreadsheetId) {
    const q = encodeURIComponent(
      `name = '${PERMOHONAN_SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    try {
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(6000),
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          spreadsheetId = searchData.files[0].id;
        }
      }
    } catch (e) {
      console.warn('Gagal mencari spreadsheet:', e);
    }
  }

  // Hapus semua file arsip di folder Google Drive
  try {
    const driveFiles = await listDriveArchives(accessToken);
    for (const f of driveFiles) {
      await deleteFileFromGoogleDrive(accessToken, f.id);
    }
  } catch (e) {
    console.warn('Gagal membersihkan folder arsip Google Drive:', e);
  }

  if (!spreadsheetId) return true;

  try {
    let sheetTitle = 'Data';
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const dataSheet =
        meta.sheets?.find(
          (s: any) => s.properties?.title === 'Data' || s.properties?.title === 'Sheet1'
        ) || meta.sheets?.[0];
      if (dataSheet?.properties?.title) {
        sheetTitle = dataSheet.properties.title;
      }
    }

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A2:P:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      }
    );
    return res.ok;
  } catch (err) {
    console.warn('Gagal membersihkan baris spreadsheet:', err);
    return false;
  }
}

/**
 * Menghapus file secara permanen dari Google Drive
 */
export async function deleteFileFromGoogleDrive(
  accessToken: string,
  fileId: string
): Promise<boolean> {
  if (!fileId) return false;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(6000),
    });
    return res.ok || res.status === 404;
  } catch (e) {
    console.warn(`Gagal menghapus file ${fileId} dari Drive:`, e);
    return false;
  }
}

/**
 * Menghapus file spreadsheet lengkap dari Google Drive
 */
export async function deleteSpreadsheetFileFromDrive(
  accessToken: string,
  spreadsheetType: 'permohonan' | 'persediaan' = 'permohonan'
): Promise<boolean> {
  const cacheKey = spreadsheetType === 'persediaan' ? 'tpk_persediaan_sheet_id' : 'tpk_permohonan_sheet_id';
  const cachedId = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  if (!cachedId) return false;

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${cachedId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok || res.status === 404) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(cacheKey);
      }
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Gagal menghapus file spreadsheet dari Drive:', e);
    return false;
  }
}

/**
 * Synchronizes the entire Third-Party Inventory (Persediaan Pihak Ketiga) to Google Sheets
 */
export async function syncInventoryToSheet(
  accessToken: string,
  items: PihakKetigaItem[]
): Promise<SheetSyncResult> {
  const headers = [
    'No',
    'No. Kapling',
    'No. Blok',
    'Kelompok Kayu',
    'Sortimen',
    'Panjang (cm)',
    'Mutu',
    'Batang',
    'Volume (M3)',
    'No. Invoice',
    'Pembeli',
    'Terakhir Diperbarui'
  ];

  const { spreadsheetId, spreadsheetUrl } = await getOrCreateSpreadsheet(
    accessToken,
    PERSEDIAAN_SPREADSHEET_NAME,
    headers
  );

  const rows = items.map((item, index) => [
    index + 1,
    item.noKapling || '',
    item.noBlok || '',
    item.jenisKayu || '',
    item.sortimen || '',
    item.panjang || '',
    item.mutu || '',
    item.batang || '',
    item.volume || '',
    item.noInvoice || '',
    item.pembeli || '',
    new Date().toLocaleDateString('id-ID')
  ]);

  // Clear previous values first to ensure fresh sync
  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:L1000:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(5000),
      }
    );
  } catch {}

  // Write all rows
  if (rows.length > 0) {
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:L${rows.length + 1}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
        signal: AbortSignal.timeout(7000),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(parseApiErrorText(errText, 'Gagal menyinkronkan persediaan ke Google Sheet'));
    }
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Reads Inventory from Google Sheets if it exists
 */
export async function fetchInventoryFromSheet(
  accessToken: string
): Promise<PihakKetigaItem[] | null> {
  const query = encodeURIComponent(`name = '${PERSEDIAAN_SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!searchRes.ok) return null;
  const data = await searchRes.json();
  if (!data.files || data.files.length === 0) return null;

  const spreadsheetId = data.files[0].id;
  const readRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:L500`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!readRes.ok) return null;
  const readData = await readRes.json();
  if (!readData.values || readData.values.length === 0) return null;

  return readData.values.map((row: any[], idx: number) => ({
    id: Date.now() + idx,
    noKapling: row[1] || '',
    noBlok: row[2] || '',
    jenisKayu: row[3] || '',
    sortimen: row[4] || '',
    panjang: row[5] || '',
    mutu: row[6] || '',
    batang: row[7] || '',
    volume: row[8] || '',
    noInvoice: row[9] || '',
    pembeli: row[10] || '',
  }));
}

/**
 * Gets or creates the application archive folder in Google Drive
 */
export async function getOrCreateDriveFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error('Gagal membuat folder arsip di Google Drive');
  }

  const folder = await createRes.json();
  return folder.id;
}

/**
 * Uploads a PDF or backup file to Google Drive folder
 */
export async function uploadFileToGoogleDrive(
  accessToken: string,
  fileBlob: Blob,
  fileName: string,
  mimeType: string = 'application/pdf'
): Promise<DriveUploadResult> {
  const folderId = await getOrCreateDriveFolder(accessToken);

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: mimeType,
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', fileBlob);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(parseApiErrorText(errText, 'Gagal mengunggah file ke Google Drive'));
  }

  const uploaded = await uploadRes.json();
  return {
    fileId: uploaded.id,
    webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
  };
}

/**
 * Lists archived files in Google Drive folder
 */
export async function listDriveArchives(accessToken: string): Promise<DriveFileInfo[]> {
  const folderId = await getOrCreateDriveFolder(accessToken);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,webViewLink,size)&orderBy=createdTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.files || [];
}

/**
 * Fetches an image or binary file from Google Drive by File ID and converts it to a Base64 data URL
 */
export async function fetchDriveFileAsDataUrl(
  fileId: string,
  accessToken?: string | null
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers,
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Gagal mengunduh file gambar dari Google Drive:', err);
    return null;
  }
}
