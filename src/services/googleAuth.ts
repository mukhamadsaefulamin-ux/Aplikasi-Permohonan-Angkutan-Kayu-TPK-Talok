import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;

// Cache the access token in memory and sessionStorage for seamless 1-click saves during browser session
let cachedAccessToken: string | null = (typeof window !== 'undefined' ? sessionStorage.getItem('google_access_token') : null);

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken && typeof window !== 'undefined') {
        cachedAccessToken = sessionStorage.getItem('google_access_token');
      }
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || '');
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('google_access_token');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token dari Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('google_access_token', cachedAccessToken);
      } catch {}
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // If the user simply closed or cancelled the popup window, handle quietly
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }

    if (error?.code === 'auth/popup-blocked') {
      const blockedErr = new Error('Jendela popup login diblokir oleh browser. Harap izinkan popup di browser Anda.');
      (blockedErr as any).code = 'auth/popup-blocked';
      throw blockedErr;
    }

    console.warn('Sign in warning:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('google_access_token');
    if (stored) {
      cachedAccessToken = stored;
      return stored;
    }
  }
  return null;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      try { sessionStorage.setItem('google_access_token', token); } catch {}
    } else {
      sessionStorage.removeItem('google_access_token');
    }
  }
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    try { sessionStorage.removeItem('google_access_token'); } catch {}
  }
};
