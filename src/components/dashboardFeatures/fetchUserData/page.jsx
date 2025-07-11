import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../../../utils/firebaseConfig'; // Import your Firebase auth configuration

const db = getFirestore();

export const fetchUserData = async (userId) => {
  try {
    const userDoc = doc(db, 'users', userId);
    const docSnap = await getDoc(userDoc);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log('No such document!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};
