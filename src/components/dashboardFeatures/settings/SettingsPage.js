import React, { useState, useEffect } from 'react';
import { auth } from '../../../utils/firebaseConfig'; 
import { fetchUserData } from '../fetchUserData/page';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../../../utils/firebaseConfig'; 
import Swal from 'sweetalert2';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Header from '../../../components/dashboardFeatures/header/header';

const SettingsPage = () => {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [userName, setUserName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEmailProvider, setIsEmailProvider] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState(true); // New state for username availability
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const db = firestore;
  const storage = getStorage();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const userId = auth.currentUser?.uid;
      if (userId) {
        const userData = await fetchUserData(userId);
        setUser(userData);
        setName(userData?.name || '');
        setUserName(userData?.username || '');
        setProfilePhoto(userData?.profilePhoto || 'https://firebasestorage.googleapis.com/v0/b/vr-study-group.appspot.com/o/duggu-store%2Fkawaii-ben.gif?alt=media&token=46095e90-ebbf-48ea-9a27-04af3f501db1');

        const providerId = auth.currentUser?.providerData[0]?.providerId;
        setIsEmailProvider(providerId === 'password');
      }
    };

    fetchUserProfile();
  }, []);

  // Function to check if username is taken
  const checkUsernameAvailability = async (newUserName) => {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('username', '==', newUserName));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  };

  // Handle username input change
  const handleUserNameChange = async (e) => {
    const newUserName = e.target.value;
    setUserName(newUserName);
    
    if (newUserName) {
      const isUsernameAvailable = await checkUsernameAvailability(newUserName);
      setUsernameAvailability(isUsernameAvailable);
      setError(isUsernameAvailable ? '' : 'Username is already taken.');
    } else {
      setUsernameAvailability(true);
      setError('');
    }
  };

  const handleProfileUpdate = async () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      try {
        let photoURL = profilePhoto;

        if (profilePhoto && typeof profilePhoto !== 'string') {
          const storageRef = ref(storage, `userData/profilePics/${userId}/profilePic`);
          const snapshot = await uploadBytes(storageRef, profilePhoto);
          photoURL = await getDownloadURL(snapshot.ref);
        }

        // Check username availability before updating
        if (!usernameAvailability) {
          Swal.fire('Error', 'Username is already taken. Please choose a different one.', 'error');
          return;
        }

        await setDoc(doc(db, 'users', userId), { name, username: userName, profilePhoto: photoURL }, { merge: true });
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: name, photoURL });
        }

        Swal.fire('Profile Updated', 'Your profile has been updated successfully!', 'success');
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating profile:', error);
        Swal.fire('Error', 'Failed to update profile', 'error');
      }
    }
  };

  const handleForgotPassword = async () => {
    if (auth.currentUser) {
      if (isEmailProvider) {
        try {
          await sendPasswordResetEmail(auth, auth.currentUser.email);
          Swal.fire('Email Sent', 'A password reset email has been sent to your email address!', 'success');
        } catch (error) {
          console.error('Error sending password reset email:', error);
          Swal.fire('Error', 'Failed to send password reset email', 'error');
        }
      } else {
        Swal.fire('Not Supported', 'You are logged in with Google. Password reset is only available for email/password accounts.', 'info');
      }
    }
  };

  const handleLogout = () => {
    auth.signOut().then(() => {
      navigate('/dashboard/suid'); // Redirect to /dashboard/suid after logout
    }).catch((error) => {
      console.error('Error signing out:', error);
    });
  };

  const handleProfilePhotoChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePhoto(file);
    }
  };

  return (
   
    
    <div >
  {/* Background Video */}
  <video
    autoPlay
    loop
    muted
    playsInline
    style={{
      position: 'fixed',
     
     
      objectFit: 'cover',
      zIndex: -1,
    }}
  >
    <source src="https://firebasestorage.googleapis.com/v0/b/vr-study-group.appspot.com/o/duggu-store%2FsettingBg.mp4?alt=media&token=ad09b4dd-bb44-499e-9e72-e1458e00554b" type="video/mp4" />
    Your browser does not support the video tag.
  </video>

  <div className="flex-1 flex flex-col" >
  <Header />
    <div className="min-h-screen flex overflow-hidden">
   
    <div className="settings-container max-w-4xl mx-auto p-6">
      
      {/* Edit Profile Section */}
      {!isEditing ? (
        <button 
          onClick={() => setIsEditing(true)} 
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-full shadow-md hover:shadow-lg transform transition-transform hover:scale-105"
        >
          Edit Profile
        </button>
      ) : (
        <div className="profile-edit-form bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Edit Profile</h2>
          <div className="flex items-center mb-4">
            <div className="w-24 h-24 mr-4">
              {profilePhoto && typeof profilePhoto === 'string' ? (
                <img 
                  src={profilePhoto} 
                  alt="Profile Preview" 
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-500">No Photo</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleProfilePhotoChange} 
              className="border p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 font-semibold">Username:</label>
            <input 
              type="text" 
              value={userName} 
              onChange={handleUserNameChange} 
              className={`border p-2 w-full rounded-lg ${usernameAvailability ? 'border-green-500' : 'border-red-500'} bg-gray-100 hover:bg-gray-200 transition`}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 font-semibold">Name:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="border p-2 w-full rounded-lg bg-gray-100 hover:bg-gray-200 transition"
            />
          </div>
          <button 
            onClick={handleProfileUpdate} 
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-full shadow-md hover:shadow-lg transform transition-transform hover:scale-105"
          >
            Save Changes
          </button>
        </div>
      )}

      {/* Forgot Password Button */}
      {auth.currentUser && (
        <button 
          onClick={handleForgotPassword} 
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-3 rounded-full shadow-md hover:shadow-lg transform transition-transform hover:scale-105 mt-4"
        >
          Forgot Password
        </button>
      )}

      {/* Log Out Button */}
      <button 
        onClick={handleLogout} 
        className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-full shadow-md hover:shadow-lg transform transition-transform hover:scale-105 mt-4"
      >
        Log Out
      </button>
    </div>
    </div>
    </div>
    </div>
  
  );
};

export default SettingsPage;
