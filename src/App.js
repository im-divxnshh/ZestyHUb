import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './utils/AuthContext';
import AuthPage from './pages/loginPage/login';
import Dashboard from './pages/dashboardPage/db';
import SettingsPage from './components/dashboardFeatures/settings/SettingsPage'; // Import the SettingsPage component
import PrivateRoute from './utils/PrivateRoute';
import LoadingScreen from './components/loginComponents/LoadingScreen';
import FriendDetailPage from './pages/friendsChats/friendChats';
import GroupInfoPage from './pages/groupChats/groupChat';

const App = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate a loading delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // Adjust the duration as needed

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="App">
      {loading ? (
        <LoadingScreen />
      ) : (
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<AuthPage />} />
              <Route path="/dashboard/:suid" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute>
                  <SettingsPage />
                </PrivateRoute>
              } />
               <Route path="/chat/:id" element={
                <PrivateRoute>
                  <FriendDetailPage />
                </PrivateRoute>
              } />
               <Route path="/dashboard/:groupName/:groupId" element={
                <PrivateRoute>
                  <GroupInfoPage />
                </PrivateRoute>
              } />
              {/* Add other routes here */}
            </Routes>
          </Router>
        </AuthProvider>
      )}
    </div>
  );
};

export default App;
