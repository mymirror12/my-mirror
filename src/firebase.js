import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAPkQnmSgZ-ey28hA64irATffh3R7uXePM",
  authDomain: "mymirror-f59e4.firebaseapp.com",
  projectId: "mymirror-f59e4",
  storageBucket: "mymirror-f59e4.firebasestorage.app",
  messagingSenderId: "292713274242",
  appId: "1:292713274242:web:a65cdbcd16e4c0e1360d9b"
};


const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const provider = new GoogleAuthProvider();