import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, query, where, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged, collection, getDocs, query, where, doc, getDoc, setDoc, deleteDoc, serverTimestamp };
export type { User };

/**
 * 학생이 허용된 목록에 있는지 확인합니다.
 */
export async function isStudentAllowed(email: string): Promise<boolean> {
  try {
    const q = query(collection(db, 'allowedStudents'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking student allowance:", error);
    return false;
  }
}

/**
 * 사용자가 관리자인지 확인합니다.
 */
export async function isUserAdmin(email: string): Promise<boolean> {
  // 기본 관리자 (사용자 이메일)
  if (email === 'aiden8584@gmail.com') return true;
  
  try {
    const q = query(collection(db, 'admins'), where('email', '==', email), where('role', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}
