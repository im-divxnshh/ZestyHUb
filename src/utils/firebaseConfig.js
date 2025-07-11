import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider  } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyBMQQI_IVhs0L1PFeBfccmfJYKRdsJjd34",
    authDomain: "vr-study-group.firebaseapp.com",
    projectId: "vr-study-group",
    storageBucket: "vr-study-group.appspot.com",
    messagingSenderId: "1050754608267",
    appId: "1:1050754608267:web:000447b26a2344a17cf88e",
    measurementId: "G-23GD0385WR"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();
const storage = getStorage(app);


export { auth, googleProvider, firestore ,storage,database };
