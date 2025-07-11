import React, { useState, useEffect } from 'react';
import Header from '../../components/dashboardFeatures/header/header';
import Sidebar from '../../components/dashboardFeatures/sidebar/sidebar';
import Skeleton from 'react-loading-skeleton'; 
import { FaChevronLeft } from 'react-icons/fa'; 
import { collection, getDocs , doc ,getDoc} from 'firebase/firestore';
import { firestore, auth } from '../../utils/firebaseConfig'; // 🔄 Make sure auth is exported from here
import { onAuthStateChanged } from 'firebase/auth';

const DesktopDb = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [friendCount, setFriendCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [userId, setUserId] = useState(null);

  // Listen to auth state to get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

useEffect(() => {
  const fetchData = async () => {
    if (!userId) return;

    try {
      // Fetch Friend Count
      const friendsRef = collection(firestore, 'users', userId, 'friends');
      const friendsSnapshot = await getDocs(friendsRef);
      setFriendCount(friendsSnapshot.size);

      // Fetch Group Count
      const groupsSnapshot = await getDocs(collection(firestore, 'groups'));

      let count = 0;

      for (const groupDoc of groupsSnapshot.docs) {
        const groupId = groupDoc.id;

        const memberDocRef = doc(firestore, 'groups', groupId, 'members', userId);
        const memberDocSnap = await getDoc(memberDocRef);

        if (memberDocSnap.exists()) {
          count++;
        }
      }

      setGroupCount(count);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, [userId]);

  return (
    <div className="min-h-screen bg-gray-100 flex overflow-hidden">
      <Sidebar className="w-64 bg-gray-200">
        {isLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton height={50} width="80%" />
            <Skeleton height={50} width="80%" />
            <Skeleton height={50} width="80%" />
            <Skeleton height={50} width="80%" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="text-lg font-semibold text-gray-800">Friends</div>
            <div className="text-lg font-semibold text-gray-800">Groups</div>
            <div className="text-lg font-semibold text-gray-800">Settings</div>
          </div>
        )}
      </Sidebar>

      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 bg-gray-50">
          {isLoading ? (
            <div>
              <Skeleton width={300} height={40} />
              <Skeleton width={150} height={30} className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-r from-gray-300 to-gray-500 text-white rounded-lg p-6 shadow-lg"
                  >
                    <Skeleton height={30} width="80%" className="mb-4" />
                    <Skeleton height={50} width="50%" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-3xl font-semibold text-gray-700 mb-6">Welcome to your Dashboard</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold">Total Friends</h3>
                  <p className="text-4xl font-bold mt-4">{friendCount}</p>
                </div>

                <div className="bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold">Total Groups</h3>
                  <p className="text-4xl font-bold mt-4">{groupCount}</p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="text-center mt-8 max-w-md w-full bg-gray-400 p-8 rounded-lg shadow-lg transform transition-transform hover:scale-105">
                  <div className="flex items-center justify-center mb-4">
                    <FaChevronLeft className="text-gray-600 text-2xl mr-4" />
                    <h1 className="text-2xl font-semibold text-gray-700">
                      Click on Groups & Friend Tabs in left sidebar
                    </h1>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DesktopDb;
