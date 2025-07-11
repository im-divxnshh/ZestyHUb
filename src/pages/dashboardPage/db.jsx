import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../utils/firebaseConfig'; // Adjust the import path as needed
import { useParams } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import PhoneDb from './PhoneDb'; // Import the mobile version of the dashboard
import DesktopDb from './DesktopDb'; // Import the desktop version of the dashboard

const Dashboard = () => {
  const { suid } = useParams();
  const navigate = useNavigate();



  const isMobile = useMediaQuery({ maxWidth: 767 }); // Consider screens with max-width 767px as mobile

  return (
    <div className="min-h-screen bg-gray-100 ">
     
      
      {isMobile ? <PhoneDb /> : <DesktopDb />}
    </div>
  );
};

export default Dashboard;
