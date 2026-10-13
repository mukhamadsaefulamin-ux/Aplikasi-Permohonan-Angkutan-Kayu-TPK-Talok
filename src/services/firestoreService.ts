import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { app } from './googleAuth';
import firebaseConfig from '../../firebase-applet-config.json';
import { PermohonanData, PihakKetigaItem } from '../types';

// Initialize Firestore with specific database ID if provided
const firestoreDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = firestoreDbId
  ? getFirestore(app, firestoreDbId)
  : getFirestore(app);

/**
 * Validate connection to Firestore on application boot
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore: Offline atau periksa konfigurasi.');
      return false;
    }
    // Permission denied or not found is normal for test doc
    return true;
  }
}

/**
 * Saves or updates a Permohonan document in Firestore
 */
export async function savePermohonanToFirestore(
  data: PermohonanData,
  userId?: string
): Promise<void> {
  const docRef = doc(db, 'permohonan', data.id);
  const totalBtg = data.items.reduce((sum, item) => sum + (parseInt(String(item.btg)) || 0), 0);
  const totalM3 = data.items.reduce((sum, item) => sum + (parseFloat(String(item.m3)) || 0), 0);

  await setDoc(
    docRef,
    {
      ...data,
      totalBtg,
      totalM3,
      userId: userId || 'anonymous',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Loads all saved Permohonan documents from Firestore
 */
export async function loadPermohonanListFromFirestore(): Promise<PermohonanData[]> {
  try {
    const colRef = collection(db, 'permohonan');
    const q = query(colRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    const list: PermohonanData[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PermohonanData);
    });
    return list;
  } catch (err) {
    console.warn('Gagal memuat permohonan dari Firestore:', err);
    return [];
  }
}

/**
 * Saves entire third-party timber inventory to Firestore
 */
export async function saveInventoryToFirestore(items: PihakKetigaItem[]): Promise<void> {
  const batch = writeBatch(db);

  for (const item of items) {
    const docId = String(item.id || item.noKapling.replace(/[\/\s]/g, '_'));
    const docRef = doc(db, 'persediaan', docId);
    batch.set(
      docRef,
      {
        ...item,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}

/**
 * Loads third-party timber inventory from Firestore
 */
export async function loadInventoryFromFirestore(): Promise<PihakKetigaItem[]> {
  try {
    const colRef = collection(db, 'persediaan');
    const snapshot = await getDocs(colRef);

    const list: PihakKetigaItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PihakKetigaItem);
    });
    return list;
  } catch (err) {
    console.warn('Gagal memuat persediaan dari Firestore:', err);
    return [];
  }
}
