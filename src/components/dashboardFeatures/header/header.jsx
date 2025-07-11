import React, { useState, useEffect } from 'react';
import { FaBell, FaCog } from 'react-icons/fa'; // Import the settings icon
import { auth } from '../../../utils/firebaseConfig';
import { fetchUserData } from '../fetchUserData/page';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation

import Notifications from './noti';

const Header = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const userId = auth.currentUser?.uid; // Get the current user ID
      if (userId) {
        const userData = await fetchUserData(userId);
        setUser(userData);
      }
    };

    fetchUserProfile();
  }, []);

  const navigateToSettings = () => {
    navigate('/settings'); 
  };

  // Fallback profile photo URL
  const defaultProfilePhoto = "https://firebasestorage.googleapis.com/v0/b/vr-study-group.appspot.com/o/duggu-store%2Fkawaii-ben.gif?alt=media&token=46095e90-ebbf-48ea-9a27-04af3f501db1";

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <header className="bg-white shadow-md z-10 w-full">
      <div className="max-w-full mx-auto px-4 py-3 flex justify-between items-center">
        
        {/* Logo and Title Section */}
        <div className="flex items-center space-x-4">
          <a href="https://zestyhub.netlify.app"  rel="noopener noreferrer">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/vr-study-group.appspot.com/o/android-chrome-512x512.png?alt=media&token=9611a508-1d7e-4990-afc1-af899b1221df" 
              alt="Logo Image" 
              className="w-10 h-10 rounded-full"
            />
          </a>
          <h1 href="https://zestyhub.netlify.app" className="text-xl font-bold text-gray-800">ZestyEdu Hub</h1>
        </div>

        {/* User Profile and Notification Section */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <img 
                src={user?.profilePhoto || defaultProfilePhoto} 
                alt="User Profile" 
                className="w-10 h-10 rounded-full"
              />
            </div>
            <div>
              <p className="text-gray-800 font-medium">
               <span className="font-semibold">{user?.name || 'User Name'}👋</span>
                {user?.username && (
                  <span className="text-gray-600 ml-2 text-sm">@{user.username}</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button onClick={handleBellClick} className="bg-gray-200 text-gray-800 p-2 rounded-full hover:bg-gray-300">
              <FaBell className="text-lg" /> {/* Notification icon */}
            </button>
            <button 
              className="bg-gray-200 text-gray-800 p-2 rounded-full hover:bg-gray-300"
              onClick={navigateToSettings} // Click handler for settings navigation
            >
              <FaCog className="text-lg" /> {/* Settings icon */}
            </button>
          </div>
        </div>
        <Notifications
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
       
      />
      </div>
    </header>
  );
};

export default Header;
