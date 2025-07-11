import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserPlus, FaTimes, FaEnvelope, FaRegEdit } from 'react-icons/fa';
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { auth, firestore, storage } from '../../../utils/firebaseConfig';
import { collection, doc, getDoc, setDoc, query, where, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

Modal.setAppElement('#root');

const Sidebar = () => {
  const [active, setActive] = useState('group');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState(null);
  const [userData, setUserData] = useState({ name: '', uid: '' });
  const [userGroups, setUserGroups] = useState([]);
  const [allZests, setAllZests] = useState([]);
  const [userFriends, setUserFriends] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [invitationsWithProfiles, setInvitationsWithProfiles] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [friendModalIsOpen, setFriendModalIsOpen] = useState(false);
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState({});
  const [joinModalIsOpen, setJoinModalIsOpen] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState('');

  const navigate = useNavigate();

  const fallbackPhoto = 'https://firebasestorage.googleapis.com/v0/b/vr-study-group.appspot.com/o/duggu-store%2Fkawaii-ben.gif?alt=media&token=46095e90-ebbf-48ea-9a27-04af3f501db1';

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserData({
            name: userDocSnap.data()?.name || '',
            uid: user.uid
          });
        }
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchInvitationsWithProfiles = async () => {
      try {
        const invitePromises = invitations.map(async (invite) => {
          const { name, profilePhoto } = await fetchUserProfile(invite.sender);

          return {
            ...invite,
            name,
            profilePhoto: profilePhoto || fallbackPhoto
          };
        });

        const resolvedInvites = await Promise.all(invitePromises);
        setInvitationsWithProfiles(resolvedInvites);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      }
    };

    if (invitations.length > 0) {
      fetchInvitationsWithProfiles();
    }
  }, [invitations]);

  useEffect(() => {
    const fetchUserDataAndSetupListeners = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.error('User is not authenticated.');
        return;
      }

      // Listener for user groups
      const qGroups = query(collection(firestore, 'groups'), where('userId', '==', user.uid));
      const unsubscribeGroups = onSnapshot(qGroups, (querySnapshot) => {
        const groups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUserGroups(groups);
      }, (error) => {
        console.error('Error fetching groups:', error);
      });

      // Listener for all users (Zests)
      const qZests = query(collection(firestore, 'users'));
      const unsubscribeZests = onSnapshot(qZests, (querySnapshot) => {
        const zests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllZests(zests);
      }, (error) => {
        console.error('Error fetching users:', error);
      });

      // Listener for user friends
      const userFriendsRef = collection(firestore, `users/${user.uid}/friends`);
      const unsubscribeFriends = onSnapshot(userFriendsRef, async (querySnapshot) => {
        try {
          const friendPromises = querySnapshot.docs.map(async (doc) => {
            const friendUID = doc.id;
            const friendProfile = await fetchUserProfile(friendUID);
            return { id: friendUID, ...doc.data(), ...friendProfile };
          });

          const friendsWithProfiles = await Promise.all(friendPromises);
          setUserFriends(friendsWithProfiles.filter(friend => friend.status === 'accepted'));
        } catch (error) {
          console.error('Error processing friends:', error);
        }
      }, (error) => {
        console.error('Error fetching friends:', error);
      });

      // Listener for invitations
      const invitationsRef = collection(firestore, `users/${user.uid}/friends`);
      const unsubscribeInvitations = onSnapshot(invitationsRef, async (querySnapshot) => {
        try {
          const invitePromises = querySnapshot.docs.map(async (doc) => {
            const friendData = doc.data();
            if (friendData.status === 'pending') {
              const profileData = await fetchUserProfile(friendData.sender);
              return { id: doc.id, ...friendData, ...profileData };
            }
            return null;
          });

          const invitesWithProfiles = (await Promise.all(invitePromises)).filter(Boolean);
          setInvitations(invitesWithProfiles);
        } catch (error) {
          console.error('Error processing invitations:', error);
        }
      }, (error) => {
        console.error('Error fetching invitations:', error);
      });

      // Clean up the listeners on component unmount or dependency change
      return () => {
        unsubscribeGroups();
        unsubscribeZests();
        unsubscribeFriends();
        unsubscribeInvitations();
      };
    };

    fetchUserDataAndSetupListeners();
  }, [userData.uid]);

  const handleClick = (section) => setActive(section);
  const openModal = () => setModalIsOpen(true);
  const closeModal = () => setModalIsOpen(false);
  const openFriendModal = () => setFriendModalIsOpen(true);
  const closeFriendModal = () => setFriendModalIsOpen(false);
  const openInvitationModal = () => setInvitationModalOpen(true);
  const closeInvitationModal = () => setInvitationModalOpen(false);
  const handleInvitationClick = () => setInvitationModalOpen(true);
  const handleImageChange = (event) => setGroupImage(event.target.files[0]);

 const handleSubmit = async (event) => {
  event.preventDefault();
  closeModal();

  const user = auth.currentUser;
  if (!user) return;

  const groupId = `hub-${Math.random().toString(36).substring(2, 7)}`;

  const groupDetails = {
    id: groupId,
    name: groupName,
    inviteLink: `http://localhost:3000/invite/${groupId}`,
    ownerName: userData.name,
    userId: user.uid
  };

  await setDoc(doc(firestore, 'groups', groupId), groupDetails);

  // Add the owner as a member of the group
  const memberRef = doc(firestore, 'groups', groupId, 'members', user.uid);
  const memberData = {
    name: userData.name,
    uid: user.uid,
    role: 'owner'
  };
  await setDoc(memberRef, memberData);

  // If there's a group image, upload it and save the download URL
  if (groupImage) {
    const imageRef = ref(storage, `groupData/groupIcons/${groupId}`);
    const uploadTask = await uploadBytes(imageRef, groupImage);
    const downloadURL = await getDownloadURL(uploadTask.ref);

    await setDoc(doc(firestore, 'groups', groupId), { iconUrl: downloadURL }, { merge: true });
  }

  setGroupName('');
  setGroupImage(null);
};

  const handleSendFriendRequest = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user && user.uid && selectedFriend) {
        const friendUID = selectedFriend; // Ensure this is the UID

        const friendRequest = {
          sender: user.uid,
          status: 'pending'
        };

        await setDoc(doc(firestore, `users/${friendUID}/friends`, user.uid), friendRequest);

        setSelectedFriend('');
        toast.success('Friend request sent successfully!');
      }
    } catch (error) {
      toast.error('Error sending friend request.');
      console.error('Error sending friend request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (senderUID) => {
    const user = auth.currentUser;
    if (user && user.uid) {
      const recipientUID = user.uid;

      try {
        const friendRefForRecipient = doc(firestore, `users/${recipientUID}/friends/${senderUID}`);
        await setDoc(friendRefForRecipient, { status: 'accepted', sender: senderUID }, { merge: true });

        const friendRefForSender = doc(firestore, `users/${senderUID}/friends/${recipientUID}`);
        await setDoc(friendRefForSender, { status: 'accepted', sender: recipientUID }, { merge: true });

        setUserFriends(friends => friends.map(friend =>
          friend.id === senderUID ? { ...friend, status: 'accepted' } : friend
        ));

        toast.success('Friend request accepted successfully!');
      } catch (error) {
        console.error("Error accepting invitation: ", error);
        toast.error('Failed to accept the invitation.');
      }
    } else {
      toast.error('User not authenticated.');
    }
  };

  const handleRejectInvitation = async (senderUID) => {
    const user = auth.currentUser;
    if (user && user.uid) {
      const recipientUID = user.uid;

      try {
        const friendRefForRecipient = doc(firestore, `users/${recipientUID}/friends/${senderUID}`);
        await deleteDoc(friendRefForRecipient);

        const friendRefForSender = doc(firestore, `users/${senderUID}/friends/${recipientUID}`);
        await deleteDoc(friendRefForSender);

        setUserFriends(friends => friends.filter(friend => friend.id !== senderUID));

        toast.success('Friend request rejected successfully!');
      } catch (error) {
        console.error("Error rejecting invitation: ", error);
        toast.error('Failed to reject the invitation.');
      }
    } else {
      toast.error('User not authenticated.');
    }
  };

  useEffect(() => {
    const fetchUserGroups = async () => {
      const user = auth.currentUser;
      if (!user) return;
  
      const groupDocs = await getDocs(collection(firestore, 'groups'));
      const groups = [];
  
      for (const groupDoc of groupDocs.docs) {
        const data = groupDoc.data();
  
        // Owned group
        if (data.userId === user.uid) {
          groups.push({ id: groupDoc.id, ...data });
          continue;
        }
  
        // Joined as member
        const memberRef = doc(firestore, 'groups', groupDoc.id, 'members', user.uid);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) {
          groups.push({ id: groupDoc.id, ...data });
        }
      }
  
      setUserGroups(groups);
    };
  
    fetchUserGroups();
  }, [userData.uid]);

  const fetchUserProfile = async (userId) => {
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const { name, profilePhoto } = userSnap.data();
      return { name, profilePhoto };
    }

    return { name: 'Unknown User', profilePhoto: null };
  };

  const filteredZests = allZests.filter(zest => {
    const zestUid = zest.id || ''; // Make sure 'id' is present and represents UID
    const userUid = userData.uid || '';
    const search = searchTerm || '';

    return zestUid !== userUid
      && zest.username.toLowerCase().includes(search.toLowerCase().replace('@', ''))
      && !userFriends.some(friend => friend.id === zestUid);
  });

  // New function to handle friend click
  const handleFriendClick = (friend) => {
    // Generate a chatId based on both user IDs
    const chatId = [userData.uid, friend.id].sort().join('_');

    // Navigate to the chat route with dynamically generated chatId
    navigate(`/chat/${chatId}`);
  };

  // NEW function to handle group click
  const handleGroupClick = (group) => {
    setSelectedGroup(group.id);
    navigate(`/dashboard/${group.name}/${group.id}`, {
      state: { groupName: group.name, groupId: group.id }
    });
  };

  const isAlreadyFriend = (uid) => {
    // Check if the UID is already in the list of friends
    return userFriends.some(friend => friend.id === uid && friend.status === 'accepted');
  };


  return (
    <aside className="w-64 bg-gray-800 text-white shadow-md h-screen flex flex-col">
      <ToastContainer />
      <div className="p-4 border-b border-gray-700">
        <div className="mt-2 flex justify-between">
          <button
            className={`bg-gradient-to-r from-blue-500 to-blue-700 text-white px-3 py-1 rounded-md shadow-md transform transition-all duration-300 ease-in-out ${active === 'group' ? 'neon-effect' : 'hover:from-blue-600 hover:to-blue-800'}`}
            onClick={() => handleClick('group')}
          >
            Group
          </button>
          <button
            className={`bg-gradient-to-r from-green-500 to-teal-500 text-white px-3 py-1 rounded-md shadow-md transform transition-all duration-300 ease-in-out ${active === 'friends' ? 'neon-effect' : 'hover:from-green-600 hover:to-teal-700'}`}
            onClick={() => handleClick('friends')}
          >
            Friends
          </button>
        </div>
      </div>

      <div className="p-4 flex-grow overflow-y-auto">
        {active === 'group' && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Group Options</h3>
            <div className="flex space-x-2 mb-4">
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded-md shadow-md hover:bg-blue-700 transition-all flex items-center text-sm"
                onClick={openModal}
              >
                <FaRegEdit className="mr-1" /> Create
              </button>
              <button className="bg-blue-600 text-white px-3 py-1 rounded-md shadow-md hover:bg-blue-700 transition-all flex items-center text-sm" onClick={() => setJoinModalIsOpen(true)}>
                <FaUsers className="mr-1" /> Join
              </button>
            </div>

            <div className="mt-4">
              <div className="flex flex-col space-y-2">
                {userGroups.map(group => (
                  <div key={group.id} onClick={() => handleGroupClick(group)}
                    className={`flex items-center space-x-2 hover:bg-gray-700 p-2 rounded-md cursor-pointer ${selectedGroup === group.id ? 'bg-gray-700' : ''}`}>
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      {group.iconUrl ? (
                        <img src={group.iconUrl} alt={group.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-white">{group.name.charAt(0)}</span>
                      )}
                    </div>
                    <span>{group.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {active === 'friends' && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Friends Options</h3>
            <div className="flex space-x-2 mb-4">
              <button
                className="bg-green-600 text-white px-3 py-1 rounded-md shadow-md hover:bg-green-700 transition-all flex items-center text-sm"
                onClick={openFriendModal}
                disabled={loading}
              >
                <FaUserPlus className="mr-1" /> {loading ? 'Sending...' : 'Add'}
              </button>
              <button
                className={`bg-yellow-600 text-white px-3 py-1 rounded-md shadow-md hover:bg-yellow-700 transition-all flex items-center text-sm ${invitations.length > 0 ? 'bg-yellow-500' : ''}`}
                onClick={handleInvitationClick}
              >
                <FaEnvelope className="mr-1" /> Invitations ({invitations.length})
              </button>
            </div>

            {userFriends.length === 0 ? (
              <p>You don't have any friends yet. Click on "Add" to find friends.</p>
            ) : (
              <div>
                <div className="flex flex-col space-y-2">
                  {userFriends.map(friend => (
                    <div key={friend.id} onClick={() => handleFriendClick(friend)}
                      className={`flex items-center space-x-2 hover:bg-gray-700 p-2 rounded-md cursor-pointer ${selectedFriend === friend.username ? 'bg-gray-700' : ''}`}>
                      <img src={friend.profilePhoto || fallbackPhoto} alt={friend.name} className="w-8 h-8 object-cover rounded-full" />
                      <span className="text-white ml-2">
                        {friend.name || friend.username}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for Group Creation */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Create Group"
        className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center"
        overlayClassName="fixed inset-0"
      >
        <div className="bg-gray-900 text-white p-6 rounded-lg w-80 relative">
          <button
            onClick={closeModal}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-700"
          >
            <FaTimes className="text-white" />
          </button>
          <h2 className="text-lg font-semibold mb-4">Create New Group</h2>
          <form onSubmit={handleSubmit}>
            <label className="block mb-2">
              Group Name
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="mt-1 block w-full p-2 rounded bg-gray-700"
                required
              />
            </label>
            <label className="block mb-2">
              Group Icon
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-1 block w-full p-2 rounded bg-gray-700"
              />
            </label>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-700 transition-all w-full"            >
              Create Group
            </button>
          </form>
        </div>
      </Modal>

      <Modal
        isOpen={joinModalIsOpen}
        onRequestClose={() => setJoinModalIsOpen(false)}
        contentLabel="Join Group"
        className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center"
        overlayClassName="fixed inset-0"
      >
        <div className="bg-gray-900 text-white p-6 rounded-lg w-80 relative">
          <button
            onClick={() => setJoinModalIsOpen(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-700"
          >
            <FaTimes className="text-white" />
          </button>
          <h2 className="text-lg font-semibold mb-4">Join Group</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              // fetch current user
              const user = auth.currentUser;
              if (!user) {
                toast.error('User not authenticated');
                return;
              }
              // add to group members
              try {
                await setDoc(doc(firestore, 'groups', joinGroupId, 'members', user.uid), {
                  uid: user.uid,
                  name: userData.name
                });
                toast.success('Joined group successfully!');
                setJoinModalIsOpen(false);
                setJoinGroupId('');
              } catch (err) {
                toast.error('Error joining group');
                console.error(err);
              }
            }}
          >
            <label className="block mb-2">
              Group ID
              <input
                type="text"
                value={joinGroupId}
                onChange={(e) => setJoinGroupId(e.target.value)}
                className="mt-1 block w-full p-2 rounded bg-gray-700"
                required
              />
            </label>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-700 transition-all w-full"
            >
              Join
            </button>
          </form>
        </div>
      </Modal>

      <Modal
        isOpen={friendModalIsOpen}
        onRequestClose={closeFriendModal}
        contentLabel="Add Friend"
        className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center"
        overlayClassName="fixed inset-0"
      >
        <div className="bg-gray-900 text-white p-6 rounded-lg w-80 relative">
          <button
            onClick={closeFriendModal}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-700"
          >
            <FaTimes className="text-white" />
          </button>
          <h2 className="text-lg font-semibold mb-4">Add Friend</h2>
          <input
            type="text"
            placeholder="Search by @username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 mb-4 rounded bg-gray-700"
          />
          <div className="flex flex-col space-y-2 mb-4">
            {filteredZests.map(zest => (
              <div key={zest.id} className="flex items-center space-x-2 hover:bg-gray-700 p-2 rounded-md cursor-pointer">
                <img
                  src={zest.profilePhoto || fallbackPhoto}
                  alt={zest.name || zest.username}
                  className="w-8 h-8 object-cover rounded-full"
                />
                <span className="text-white ml-2">{zest.name || zest.username}</span>
                {isAlreadyFriend(zest.id) ? (
                  <span className="ml-2 text-green-500">&#10003; Already Friends</span>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedFriend(zest.id);
                      handleSendFriendRequest();
                    }}
                    className="bg-green-600 text-white px-2 py-1 rounded-md shadow-md hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Add'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>


      {/* Modal for Invitations */}
      <Modal
        isOpen={invitationModalOpen}
        onRequestClose={closeInvitationModal}
        contentLabel="Manage Invitations"
        className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center"
        overlayClassName="fixed inset-0"
      >
        <div className="bg-gray-900 text-white p-6 rounded-lg w-80 relative">
          <button
            onClick={closeInvitationModal}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-700"
          >
            <FaTimes className="text-white" />
          </button>
          <h2 className="text-lg font-semibold mb-4">Invitations</h2>
          <div className="flex flex-col space-y-2 mb-4">
            {invitationsWithProfiles.length === 0 ? (
              <p>You have no invitations at the moment.</p>
            ) : (
              invitationsWithProfiles.map(invite => (
                <div key={invite.id} className="flex items-center space-x-2 bg-gray-800 p-2 rounded-md">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <img
                      src={invite.profilePhoto || fallbackPhoto}
                      alt={invite.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span>{invite.name}</span>
                  <div className="flex ml-auto space-x-2">
                    <button
                      onClick={() => handleAcceptInvitation(invite.id)}
                      className="bg-green-600 text-white px-2 py-1 rounded-md shadow-md hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectInvitation(invite.id)}
                      className="bg-red-600 text-white px-2 py-1 rounded-md shadow-md hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </aside>
  );
};

export default Sidebar;
