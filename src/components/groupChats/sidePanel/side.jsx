import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { VideoIcon, XIcon, ChevronLeft, ChevronRight, VideoOff, User, ShareIcon, CodeIcon } from 'lucide-react';

import DocumentModal from '../modals/DocumentModal';
import ResourceModal from "../modals/ResourceModal";

const SIGNALING_SERVER_URL = 'zestyhubgroup-production.up.railway.app';

export default function GroupVideoPanel({ currentUser, groupId }) {
  const [isVideoPanelOpen, setVideoPanelOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);
  const [isVideoEnabled, setVideoEnabled] = useState(false);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const [remoteUsers, setRemoteUsers] = useState({});
  const [isDocumentModalOpen, setDocumentModalOpen] = useState(false);
  const [isResourceModalOpen, setResourceModalOpen] = useState(false);

  const enableVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setVideoEnabled(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Connect socket
      socketRef.current = io(SIGNALING_SERVER_URL);

      socketRef.current.emit('join-room', {
        roomId: groupId,
        userId: currentUser.uid,
        name: currentUser.name
      });

      // Receive list of all users in room (including self)
      socketRef.current.on('all-users', users => {
        const updatedUsers = {};
        users.forEach(({ socketId, userId, name }) => {
          updatedUsers[socketId] = { userId, name, isVideoEnabled: false };
          if (socketId !== socketRef.current.id) {
            createPeerConnection(socketId, userId, name, true);
          }
        });

        setRemoteUsers(updatedUsers);
      });

      // New user joined
      socketRef.current.on('user-joined', ({ socketId, userId, name }) => {
        setRemoteUsers(prev => ({
          ...prev,
          [socketId]: { userId, name, isVideoEnabled: false }
        }));
        createPeerConnection(socketId, userId, name, false);
      });

      // Signaling data
      socketRef.current.on('signal', async ({ from, data }) => {
        if (!peersRef.current[from]) return;

        if (data.sdp) {
          await peersRef.current[from].setRemoteDescription(new RTCSessionDescription(data.sdp));
          if (data.sdp.type === 'offer') {
            const answer = await peersRef.current[from].createAnswer();
            await peersRef.current[from].setLocalDescription(answer);
            socketRef.current.emit('signal', {
              to: from,
              from: socketRef.current.id,
              data: { sdp: peersRef.current[from].localDescription }
            });
          }
        } else if (data.candidate) {
          try {
            await peersRef.current[from].addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.error('Error adding ICE candidate', err);
          }
        }
      });

      // User left
      socketRef.current.on('user-left', ({ socketId }) => {
        if (peersRef.current[socketId]) {
          peersRef.current[socketId].close();
          delete peersRef.current[socketId];
        }
        setRemoteStreams(prev => {
          const updated = { ...prev };
          delete updated[socketId];
          return updated;
        });
        setRemoteUsers(prev => {
          const updated = { ...prev };
          delete updated[socketId];
          return updated;
        });
      });
    } catch (err) {
      console.error('Error accessing media devices', err);
    }
  };

  const disableVideo = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setVideoEnabled(false);

    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
    setRemoteUsers({});
    socketRef.current?.disconnect();
    socketRef.current = null;
  };

  const createPeerConnection = (socketId, userId, name, isInitiator) => {
    if (peersRef.current[socketId]) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Add local tracks to connection if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = event => {
      setRemoteStreams(prev => ({
        ...prev,
        [socketId]: event.streams[0]
      }));

      // Mark that this user has video enabled
      setRemoteUsers(prev => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || { userId, name }),
          isVideoEnabled: true,
        }
      }));
    };

    // If no tracks come, isVideoEnabled remains false

    pc.onicecandidate = event => {
      if (event.candidate) {
        socketRef.current.emit('signal', {
          to: socketId,
          from: socketRef.current.id,
          data: { candidate: event.candidate }
        });
      }
    };

    peersRef.current[socketId] = pc;

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current.emit('signal', {
            to: socketId,
            from: socketRef.current.id,
            data: { sdp: pc.localDescription }
          });
        } catch (err) {
          console.error('Negotiation error', err);
        }
      };
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableVideo();
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && isVideoEnabled) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isVideoEnabled]);

  return (
    <>
      <div className="fixed mt-44 right-4 transform -translate-y-1/2 z-50">
        <div className="flex space-x-3 bg-gray-900 p-2 rounded-full shadow-lg">
          <IconButton icon={<VideoIcon />} label="Video" color="bg-blue-500" onClick={() => setVideoPanelOpen(true)} />
          <IconButton icon={<CodeIcon />} label="IDE" color="bg-yellow-500" onClick={() => setDocumentModalOpen(true)} />
          <IconButton icon={<ShareIcon />} label="Share Resources" color="bg-purple-500" onClick={() => setResourceModalOpen(true)} />
        </div>
      </div>


      {isDocumentModalOpen && (
        <DocumentModal groupId={groupId} onClose={() => setDocumentModalOpen(false)} />
      )}

      {isResourceModalOpen && (
        <ResourceModal groupId={groupId} onClose={() => setResourceModalOpen(false)} />
      )}

      {isVideoPanelOpen && (
        <div className={`fixed top-0 left-0 h-full bg-white shadow-2xl z-40 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-[800px]'}`}>
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className={`text-lg font-semibold ${isCollapsed ? 'hidden' : 'block'}`}>Group Video</h2>
            <div className="flex gap-2">
              {isVideoEnabled ? (
                <button onClick={disableVideo} className="text-gray-600 flex items-center gap-1">
                  <VideoOff size={20} /> {!isCollapsed && 'Stop Video'}
                </button>
              ) : (
                <button onClick={enableVideo} className="text-green-600 flex items-center gap-1">
                  <VideoIcon size={20} /> {!isCollapsed && 'Start Video'}
                </button>
              )}
              <button onClick={() => setCollapsed(!isCollapsed)} className="text-gray-600">
                {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
              </button>
              <button onClick={() => { setVideoPanelOpen(false); disableVideo(); }} className="text-red-500">
                <XIcon />
              </button>
            </div>
          </div>

          {!isCollapsed && (
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto h-[80vh]">
              {/* Always show local user */}
              <UserVideoOrPlaceholder
                stream={localStreamRef.current}
                isVideoEnabled={isVideoEnabled}
                videoRef={localVideoRef}
                name={currentUser.name + ' (You)'}
                muted
              />

              {/* Show all remote users */}
              {Object.entries(remoteUsers).map(([socketId, user]) => (
                <UserVideoOrPlaceholder
                  key={socketId}
                  stream={remoteStreams[socketId] || null}
                  isVideoEnabled={user.isVideoEnabled}
                  videoRef={null}
                  name={user.name}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function UserVideoOrPlaceholder({ stream, isVideoEnabled, videoRef, name, muted }) {
  const videoElement = useRef(null);

  useEffect(() => {
    if (videoElement.current && stream) {
      videoElement.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="bg-black aspect-video rounded-lg overflow-hidden relative flex items-center justify-center text-white text-xs">
      {isVideoEnabled && stream ? (
        <>
          <video
            ref={videoRef || videoElement}
            autoPlay
            playsInline
            muted={muted || false}
            className="w-full h-full object-cover"
          />
          <p className="absolute bottom-0 left-0 p-2 bg-black bg-opacity-50">{name}</p>
        </>
      ) : (
        <>
          <User size={48} />
          <p className="absolute bottom-0 left-0 p-2 bg-black bg-opacity-50">{name}</p>
        </>
      )}
    </div>
  );
}

function IconButton({ icon, label, color, onClick }) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`w-10 h-10 flex items-center justify-center rounded-full text-white ${color} hover:scale-105 transition-transform`}
        aria-label={label}
      >
        {icon}
      </button>
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}
