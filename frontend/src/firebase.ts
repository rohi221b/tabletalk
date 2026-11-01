import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isRealConfig = apiKey && !apiKey.includes('your_') && apiKey.length > 5;

let auth: any = null;
let db: any = null;

if (isRealConfig) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.warn('Firebase init error, using local fallback:', e);
  }
}

export { auth, db };

// Fallback UID generator for demo / zero-setup mode
function getLocalUid(): string {
  let uid = localStorage.getItem('tabletalk_local_uid');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('tabletalk_local_uid', uid);
  }
  return uid;
}

export async function ensureAnonymousAuth(): Promise<string> {
  if (auth) {
    try {
      if (auth.currentUser) return auth.currentUser.uid;
      const cred = await signInAnonymously(auth);
      return cred.user.uid;
    } catch (err) {
      console.warn('Firebase signInAnonymously failed, falling back to local UID:', err);
    }
  }
  return getLocalUid();
}

export async function getIdToken(): Promise<string> {
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (err) {
      console.warn('getIdToken failed, falling back to local UID:', err);
    }
  }
  return ensureAnonymousAuth();
}
