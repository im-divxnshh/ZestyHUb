import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/dashboardFeatures/header/header';
import Sidebar from '../../components/dashboardFeatures/sidebar/sidebar';
import { firestore } from '../../utils/firebaseConfig';
import { collection, query, onSnapshot, addDoc, updateDoc, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import SidePanel from '../../components/friendChatsComps/SidePanel/side';
import { FaEdit, FaTrash } from 'react-icons/fa'; // Import icons

const FriendDetailPage = () => {
  const { id: chatId } = useParams(); // Get the chatId from the route
  const [friendProfile, setFriendProfile] = useState({
    id: 'N/A',
    name: 'Unknown',
    profilePhoto: 'https://firebasestorage.googleapis.com/v0/b/vr-study-group.appspot.com/o/duggu-store%2Fkawaii-ben.gif?alt=media&token=46095e90-ebbf-48ea-9a27-04af3f501db1'
  });
  const [currentUserProfile, setCurrentUserProfile] = useState({
    id: 'N/A',
    name: 'Your Name',
    profilePhoto: 'https://firebasestorage.googleapis.com/v0/b/vr-study-group.appspot.com/o/duggu-store%2Fkawaii-ben.gif?alt=media&token=46095e90-ebbf-48ea-9a27-04af3f501db1'
  });
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const auth = getAuth();
  const currentUser = auth.currentUser ? auth.currentUser.uid : null;
  const fallbackPhotoUrl = 'https://firebasestorage.googleapis.com/v0/b/vr-study-group.appspot.com/o/duggu-store%2Fkawaii-ben.gif?alt=media&token=46095e90-ebbf-48ea-9a27-04af3f501db1';
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const contextMenuRef = useRef(null);

  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editMessageId, setEditMessageId] = useState(null);
  const isEditing = editMessageId !== null;

  useEffect(() => {
    const fetchUserProfile = async (userId) => {
      if (!userId) return { name: 'Unknown', profilePhoto: fallbackPhotoUrl };

      const userDoc = doc(firestore, 'users', userId);
      const userSnapshot = await getDoc(userDoc);
      if (userSnapshot.exists()) {
        return userSnapshot.data();
      } else {
        return { name: 'Unknown', profilePhoto: fallbackPhotoUrl };
      }
    };


    const fetchChatDetails = async () => {
      if (!currentUser) return;

      const [userAId, userBId] = chatId.split('_');
      const friendId = userAId === currentUser ? userBId : userAId;

      // Fetch profiles for the current user and the friend
      const currentUserData = await fetchUserProfile(currentUser);
      const friendData = await fetchUserProfile(friendId);

      setCurrentUserProfile(currentUserData);
      setFriendProfile(friendData);

      // Fetch messages
      const messagesRef = collection(firestore, 'friendsChats', chatId, 'messages');
      const q = query(messagesRef, orderBy('timestamp'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(msgs);

        // Mark messages as seen
        snapshot.docs.forEach(async (doc) => {
          const msg = doc.data();
          if (msg.senderId !== currentUser && !msg.seen) {
            await updateDoc(doc.ref, { seen: true });
          }
        });

        // Scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });

      return () => unsubscribe();
    };

    fetchChatDetails();
  }, [chatId, currentUser, firestore, fallbackPhotoUrl]);



  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      try {
        const messagesRef = collection(firestore, 'friendsChats', chatId, 'messages');
        if (isEditing) {
          const msgRef = doc(firestore, 'friendsChats', chatId, 'messages', editMessageId);
          await updateDoc(msgRef, { text: messageInput, edited: true });
          setEditMessageId(null);
        } else {
          await addDoc(messagesRef, {
            text: messageInput,
            timestamp: new Date(),
            senderId: currentUser,
            seen: false,
          });
        }
        setMessageInput('');
      } catch (error) {
        console.error('Error sending message', error);
      }
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
      try {
        const msgRef = doc(firestore, 'friendsChats', chatId, 'messages', contextMenu.msgId);
        await deleteDoc(msgRef);
        setContextMenu(null);
      } catch (error) {
        console.error('Error deleting message', error);
      }
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
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [contextMenu]);

  // Inline styles for custom scrollbar
  const chatContainerStyles = {
    maxHeight: 'calc(80vh - 157px)', // Adjust this value as needed
    overflowY: 'auto',
    position: 'relative',
  };

  const chatContainerWebkitStyles = `
    .chat-container::-webkit-scrollbar {
      width: 12px;
    }
    .chat-container::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    .chat-container::-webkit-scrollbar-thumb {
      background-color: #888;
      border-radius: 10px;
      border: 3px solid #f1f1f1;
    }
    .chat-container::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  `;

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

  return (

    <div className="min-h-screen bg-gray-100 flex overflow-hidden">
      <Sidebar className="w-64 bg-gray-200" />
      <div className="flex-1 flex flex-col items-center">
        <Header />
        <main className="flex-1 flex flex-col p-6  relative w-full max-w-4xl right-24">
          <SidePanel chatId={chatId} currentUserProfile={currentUserProfile} friendProfile={friendProfile} />
          <div className="w-full max-w-3xl mx-auto flex flex-col">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 ">
                <img
                  src={friendProfile.profilePhoto || fallbackPhotoUrl}
                  alt={friendProfile.name}
                  className="w-full h-full rounded-full"
                  onError={(e) => { e.target.src = fallbackPhotoUrl; }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">{friendProfile.name} (Friend)</h1>
              </div>
            </div>
            <div
              className="flex-1 p-4 rounded-lg shadow-md chat-container"
              style={{
                ...chatContainerStyles,
                backgroundImage: 'url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjE2BTJ4pWEJosJJpuHPyFeM7tddxgkIFqmkvspH0IbaK-AmH0yYtWl0En&s=10)',
                backgroundSize: 'cover', // Ensures the image covers the entire container
                backgroundPosition: 'center', // Centers the image
              }}
            >
              <style>
                {chatContainerWebkitStyles}
              </style>
              {messages.map((msg) => {
                const isCurrentUser = msg.senderId === currentUser;
                const senderProfile = isCurrentUser ? currentUserProfile : friendProfile;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                  >
                    <img
                      src={senderProfile.profilePhoto || fallbackPhotoUrl}
                      alt={senderProfile.name}
                      className="w-8 h-8 rounded-full mr-2"
                      onError={(e) => { e.target.src = fallbackPhotoUrl; }}
                    />
                    <div
                      className={`p-2 rounded-lg ${isCurrentUser ? 'bg-blue-100' : 'bg-gray-100'}`}
                    >

                      <p dangerouslySetInnerHTML={{ __html: msg.text }} />
                      {msg.edited && (
                        <span className="text-xs text-green-500 flex items-center">
                          <FaEdit className="mr-1" /> Edited
                        </span>
                      )}
                      {msg.seen && isCurrentUser && (
                        <span className="text-xs text-blue-500 flex items-center">
                          <FaEdit className="mr-1" /> Seen
                        </span>
                      )}
                      <p className="font-semibold">{senderProfile.name}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex items-center p-4 bg-white rounded-lg shadow-md mt-4" ref={inputRef}>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 p-2 border border-gray-300 rounded-l-lg"
              />
              <button type="submit" className="p-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600">
                {isEditing ? 'Save' : 'Send'}
              </button>
            </form>
          </div>
        </main>
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

export default FriendDetailPage;