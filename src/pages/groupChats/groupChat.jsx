import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { firestore } from '../../utils/firebaseConfig';
import {
  collection, onSnapshot, addDoc, updateDoc, getDocs, doc, getDoc, query, deleteDoc, orderBy
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Header from '../../components/dashboardFeatures/header/header';
import Sidebar from '../../components/dashboardFeatures/sidebar/sidebar';
import { FaEdit, FaTrash } from 'react-icons/fa';
import GroupSidePanel from '../../components/groupChats/sidePanel/side';
// Use a default photo if user has no photo
const defaultGroupPhoto =
  'https://firebasestorage.googleapis.com/v0/b/vr-study-group.appspot.com/o/duggu-store%2Fkawaii-ben.gif?alt=media&token=46095e90-ebbf-48ea-9a27-04af3f501db1';

const GroupDetailPage = () => {
  const { groupId } = useParams();
  const [groupData, setGroupData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [userProfiles, setUserProfiles] = useState({}); // key: uid, value: {name, profilePhoto}
  const [contextMenu, setContextMenu] = useState(null);
  const [editMessageId, setEditMessageId] = useState(null);

  const auth = getAuth();
  const currentUser = auth.currentUser ? auth.currentUser.uid : null;
  const inputRef = useRef(null);
  const contextMenuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [groupMembers, setGroupMembers] = useState([]); // [{uid, name, profilePhoto, online}]
  const memberIds = groupData?.members || [];

  const isEditing = editMessageId !== null;

  // Fetch group info
  useEffect(() => {
    const fetchGroupData = async () => {
      if (groupId) {
        const groupDocRef = doc(firestore, 'groups', groupId);
        const groupDocSnap = await getDoc(groupDocRef);
        if (groupDocSnap.exists()) {
          setGroupData({ ...groupDocSnap.data(), id: groupId });
        }
      }
    };
    fetchGroupData();
  }, [groupId]);

  // Fetch messages for the group with real-time updates
  useEffect(() => {
    if (!groupData) return;

    const messagesRef = collection(firestore, 'groups', groupId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));  // Ensure messages are ordered by timestamp

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();  // Clean up on unmount
  }, [groupData, groupId]);

useEffect(() => {
  if (!groupData || !groupData.id) return;

  const fetchMembers = async () => {
    const membersSnapshot = await getDocs(collection(firestore, 'groups', groupData.id, 'members'));

    const membersData = await Promise.all(
      membersSnapshot.docs.map(async (memberDoc) => {
        const uid = memberDoc.id;
        const memberInfo = memberDoc.data(); // This contains the role field
        if (!uid) return null;

        try {
          const userDoc = await getDoc(doc(firestore, 'users', uid));
          const userData = userDoc.exists() ? userDoc.data() : {};

          return {
            uid,
            name: userData.name || "Unknown",
            profilePhoto: userData.profilePhoto || defaultGroupPhoto,
            online: userData.online || false,
            role: memberInfo.role || 'User', // ← Get role from the member subcollection document
          };
        } catch (e) {
          console.warn(`Failed to fetch user ${uid}`, e);
          return {
            uid,
            name: "Unknown",
            profilePhoto: defaultGroupPhoto,
            online: false,
            role: memberInfo.role || 'User',
          };
        }
      })
    );

    const filteredMembersData = membersData.filter(m => m !== null);
    setGroupMembers(filteredMembersData);
  };

  fetchMembers();
}, [groupData]);





  // Mark messages as seen
  useEffect(() => {
    if (!currentUser) return;
    messages.forEach(async (msg) => {
      if (!msg.seenBy?.includes(currentUser)) {
        const msgRef = doc(firestore, 'groups', groupId, 'messages', msg.id);
        await updateDoc(msgRef, {
          seenBy: [...(msg.seenBy || []), currentUser]
        });
      }
    });
  }, [messages, currentUser]);

  // Cache user profiles for senders and viewers (seenBy)
  useEffect(() => {
    const uids = new Set();
    messages.forEach(msg => {
      if (msg.senderId) uids.add(msg.senderId);
      if (msg.seenBy) msg.seenBy.forEach(uid => uids.add(uid));
    });
    const unloadedUids = Array.from(uids).filter(
      (uid) => uid && !userProfiles[uid]
    );
    if (unloadedUids.length === 0) return;
    const fetchProfiles = async () => {
      const newProfiles = {};
      await Promise.all(unloadedUids.map(async (uid) => {
        try {
          const userDoc = await getDoc(doc(firestore, "users", uid));
          if (userDoc.exists()) {
            const d = userDoc.data();
            newProfiles[uid] = {
              name: d.name || "Unknown",
              profilePhoto: d.profilePhoto || defaultGroupPhoto,
            };
          } else {
            newProfiles[uid] = {
              name: "Unknown",
              profilePhoto: defaultGroupPhoto,
            };
          }
        } catch {
          newProfiles[uid] = {
            name: "Unknown",
            profilePhoto: defaultGroupPhoto,
          };
        }
      }));
      setUserProfiles((prev) => ({ ...prev, ...newProfiles }));
    };
    fetchProfiles();
  }, [messages]);

  // Message send/edit logic
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      const messagesRef = collection(firestore, 'groups', groupId, 'messages');
      if (isEditing) {
        const msgRef = doc(messagesRef, editMessageId);
        await updateDoc(msgRef, { text: messageInput, edited: true });
        setEditMessageId(null);
      } else {
        await addDoc(messagesRef, {
          text: messageInput,
          timestamp: new Date(),
          senderId: currentUser,
          // Optionally: Store senderName/profilePhoto snapshot for historical/log use
        });
      }
      setMessageInput('');
    }
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    if (msg.senderId === currentUser) {
      setContextMenu({ x: e.clientX, y: e.clientY, msgId: msg.id });
    }
  };

  const handleDeleteMessage = async () => {
    if (contextMenu && contextMenu.msgId) {
      const msgRef = doc(firestore, 'groups', groupId, 'messages', contextMenu.msgId);
      await deleteDoc(msgRef);
      setContextMenu(null);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        contextMenuRef.current && !contextMenuRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [contextMenu]);

  const ContextMenu = ({ onEdit, onDelete }) => (
    <div
      className="absolute bg-white border border-gray-300 rounded-lg shadow-lg"
      style={{ top: contextMenu?.y, left: contextMenu?.x }}
      ref={contextMenuRef}
    >
      <button
        onClick={onEdit}
        className="flex items-center px-4 py-2 text-left w-full hover:bg-gray-100"
      >
        <FaEdit className="mr-2" /> Edit Message
      </button>
      <button
        onClick={onDelete}
        className="flex items-center px-4 py-2 text-left w-full hover:bg-gray-100"
      >
        <FaTrash className="mr-2" /> Delete Message
      </button>
    </div>
  );

  const sortedGroupMembers = React.useMemo(() => {
    if (!groupMembers) return [];

    return groupMembers.slice().sort((a, b) => {
      if (a.uid === currentUser) return -1;
      if (b.uid === currentUser) return 1;

      if (a.role === 'Owner' && b.role !== 'Owner') return -1;
      if (b.role === 'Owner' && a.role !== 'Owner') return 1;

      return 0;
    });
  }, [groupMembers, currentUser]);

  if (!groupData) return <div>Loading group information...</div>;

  const chatContainerStyles = {
    maxHeight: 'calc(80vh - 157px)', // Adjust this value as needed
    overflowY: 'auto',
    position: 'relative',
  };


  return (
    <div className="min-h-screen bg-gray-100 flex overflow-hidden">
      <Sidebar className="w-64 bg-gray-200" />
      <div className="flex-1 flex flex-col items-center">
        <Header />
        <main className="flex-1 flex flex-col p-6 relative w-full max-w-4xl">
          {/* Group Info */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-4">
              <img
                src={groupData.iconUrl || defaultGroupPhoto}
                alt={groupData.name}
                className="w-12 h-12 rounded-full"
              />
              <h1 className="text-2xl font-semibold text-gray-800">{groupData.name} (Group)</h1>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 p-4 rounded-lg shadow-md chat-container"
            style={{
              ...chatContainerStyles,
              backgroundImage: 'url(https://i0.wp.com/www.gizdev.com/wp-content/uploads/2022/02/WhatsApp-Chat-Background-Walls-1.jpg?resize=1140%2C2027&quality=100&ssl=1)',
              backgroundSize: 'cover', // Ensures the image covers the entire container
              backgroundPosition: 'center', // Centers the image
            }}
          >
            {messages.map((msg) => {
              const sender = userProfiles[msg.senderId] || {};
              return (
                <div
                  key={msg.id}
                  className={`flex items-start mb-4 ${msg.senderId === currentUser ? 'justify-end' : 'justify-start'}`}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                >
                  <img
                    src={sender.profilePhoto || defaultGroupPhoto}
                    alt={sender.name || 'User'}
                    className="w-8 h-8 rounded-full mr-2"
                  />
                  <div className={`p-2 rounded-lg ${msg.senderId === currentUser ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <p>{msg.text}</p>
                    <span className="text-xs text-gray-600 block">{sender.name}</span>
                    {msg.edited && (
                      <span className="text-xs text-green-500 flex items-center">
                        <FaEdit className="mr-1" /> Edited
                      </span>
                    )}
                    {msg.seenBy && msg.seenBy.length > 0 && (
                      <div className="flex mt-1 space-x-1">
                        {msg.seenBy.map(uid => {
                          const seenUser = userProfiles[uid] || {};
                          return (
                            <img
                              key={uid}
                              src={seenUser.profilePhoto || defaultGroupPhoto}
                              title={seenUser.name}
                              alt={seenUser.name}
                              className="w-5 h-5 rounded-full border border-gray-200"
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="flex items-center p-4 bg-white rounded-lg shadow-md mt-4"
            ref={inputRef}
          >
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border border-gray-300 rounded-l-lg"
            />
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600"
            >
              {isEditing ? 'Save' : 'Send'}
            </button>
          </form>
        </main>
      </div>
      <div className="pt-6 flex-shrink-0 rounded-lg p-6 mt-0 bg-white shadow-lg min-w-[260px]">
        <h1 className="text-2xl text-gray-600 pb-2 font-semibold">Group Info:</h1>
        <div className="text-gray-700 space-y-2">
          <p><strong>Group Name:</strong> {groupData.name}</p>
          <p><strong>Group ID:</strong> {groupData.id}</p>
          <p><strong>Owner Name:</strong> {groupData.ownerName}</p>
          <p><strong>Connected Users:</strong> {groupMembers.length}</p>
        </div>
        <hr className="my-4" />
        <div>
          <h2 className="text-lg font-semibold text-gray-600 mb-2">
            Members{groupMembers.length > 0 ? ` (${groupMembers.length})` : null}
          </h2>
          {groupMembers.length === 0 ? (
            <p className="text-gray-500">No members yet</p>
          ) : (
            <div className="overflow-y-auto max-h-60 pr-2 space-y-2 pb-6">
              {groupMembers.map((member) => {
                const displayName = member.uid === groupData.ownerId ? groupData.ownerName : member.name;
                return (
                  <div key={member.uid} className="flex items-center space-x-3 p-1 rounded hover:bg-gray-50">
                    <img
                      src={member.profilePhoto}
                      alt={displayName}
                      className="w-8 h-8 rounded-full border"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">{displayName}</span>
                      <span className="text-sm text-gray-500">{member.role}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        <GroupSidePanel
          groupId={groupData.id}
          currentUser={{ uid: auth.currentUser.uid, name: userProfiles[auth.currentUser.uid]?.name || 'Me' }}
          groupMembers={sortedGroupMembers}
        />


      </div>

      {contextMenu && (
        <ContextMenu
          onEdit={() => {
            setEditMessageId(contextMenu.msgId);
            const msg = messages.find((m) => m.id === contextMenu.msgId);
            if (msg) setMessageInput(msg.text);
            setContextMenu(null);
          }}
          onDelete={handleDeleteMessage}
        />
      )}
    </div>
  );
};

export default GroupDetailPage;
