import { useEffect, useRef } from 'react';
import { Drawer, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const Notifications = ({ showNotifications, setShowNotifications, isSidebarOpen }) => {
  const notificationsRef = useRef(null);

  const notifications = [
    
    'Coming Soon..........🔃',
   
  ];

  const handleClickOutside = (event) => {
    if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
      setShowNotifications(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Drawer
      anchor="right"
      open={showNotifications}
      onClose={() => setShowNotifications(false)}
    >
      <div className="w-80 p-4" ref={notificationsRef}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <IconButton onClick={() => setShowNotifications(false)}>
            <CloseIcon />
          </IconButton>
        </div>
        <ul className="space-y-2">
          {notifications.map((notification, index) => (
            <li
              key={index}
              className="p-2 hover:bg-gray-200 rounded-lg cursor-pointer"
            >
              {notification}
            </li>
          ))}
        </ul>
      </div>
    </Drawer>
  );
};

export default Notifications;
