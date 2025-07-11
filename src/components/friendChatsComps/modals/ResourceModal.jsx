import React, { useState, useEffect } from 'react';
import { firestore, storage } from '../../../utils/firebaseConfig'; // Ensure correct path
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { CircularProgress } from '@mui/material'; // Using Material-UI for spinner
import { FaUpload, FaTrashAlt, FaEye, FaTrash } from 'react-icons/fa';

const ResourceModal = ({ show, onClose, onUpload, chatId }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);

  const fetchAndDisplayResources = async () => {
    if (!chatId) {
      console.warn('No chatId provided.');
      return;
    }

    setLoading(true);
    try {
      const resourcesRef = collection(firestore, 'friendsChats', chatId, 'resources');
      const querySnapshot = await getDocs(resourcesRef);
      const resourcesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(resourcesData);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show) {
      fetchAndDisplayResources();
    }
  }, [show, chatId]);

  const handleFileChange = (e) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length > 0) {
      setLoading(true);
      try {
        for (const file of selectedFiles) {
          await onUpload(file);
        }
        setSelectedFiles([]);
        // Clear file input field
        document.querySelector('input[type="file"]').value = '';
        // Refresh resources after upload
        await fetchAndDisplayResources();
      } catch (error) {
        console.error('Error uploading file:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleContextMenu = (e, resource) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
    setSelectedResource(resource);
  };

  const handleDeleteResource = async (resourceId, fileURL) => {
    try {
      // Delete file from Firebase Storage
      const storageRef = ref(getStorage(), fileURL);
      await deleteObject(storageRef);
      
      // Delete document from Firestore
      const resourceRef = doc(firestore, 'friendsChats', chatId, 'resources', resourceId);
      await deleteDoc(resourceRef);
      
      // Refresh resources after deletion
      const updatedResources = resources.filter(res => res.id !== resourceId);
      setResources(updatedResources);
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };

  const handleDelete = async () => {
    if (selectedResource) {
      await handleDeleteResource(selectedResource.id, selectedResource.fileURL);
      setContextMenu(null);
    }
  };

  const handleClickOutside = (e) => {
    if (contextMenu && !e.target.closest('.context-menu')) {
      setContextMenu(null);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  const modalStyles = {
    display: show ? 'block' : 'none',
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100%',
    width: '400px',
    backgroundColor: 'white',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    transform: show ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.3s ease-in-out',
    zIndex: 20,
    overflowY: 'scroll', // Scrollable
    overflowX: 'hidden',
    padding: '16px',
    borderRadius: '10px',
  };

  const overlayStyles = {
    display: show ? 'block' : 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  };

  const contextMenuStyles = {
    position: 'absolute',
    top: contextMenu?.y,
    left: contextMenu?.x,
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    zIndex: 30,
    padding: '8px',
  };

  return (
    <>
      <div style={overlayStyles} onClick={onClose} />
      <div style={modalStyles}>
        <div style={{ marginBottom: '20px' }}>
          <h2 className="text-lg font-bold mb-4">Upload Resources</h2>
          <input
            type="file"
            onChange={handleFileChange}
            className="mb-4 w-full"
            multiple
          />
          <button
            onClick={handleUpload}
            className="bg-blue-500 text-white p-2 rounded w-full flex items-center justify-center"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} className="mr-2" /> : <FaUpload />}
          </button>
        </div>
        <div>
          <h2 className="text-lg font-bold mb-4">Shared Resources</h2>
          {loading ? (
            <div className="flex justify-center items-center" style={{ height: '200px' }}>
              <CircularProgress />
            </div>
          ) : (
            <div>
              {resources.length > 0 ? (
                resources.map((resource, index) => (
                  <div
                    key={index}
                    className="bg-gray-100 p-4 rounded-lg mb-2 shadow-md"
                    onContextMenu={(e) => handleContextMenu(e, resource)}
                  >
                    <div className="flex justify-between items-center">
                      <a href={resource.fileURL} download className="text-blue-500 hover:underline">
                        {resource.fileName}
                      </a>
                      <div className="flex items-center">
                        <button 
                          onClick={() => window.open(resource.fileURL, '_blank')} 
                          className="bg-green-500 text-white p-2 rounded mr-2 hover:bg-green-600"
                          title="View"
                        >
                          <FaEye />
                        </button>
                        <button 
                          onClick={() => handleDeleteResource(resource.id, resource.fileURL)}
                          className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-2">{new Date(resource.date).toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No resources available.</p>
              )}
            </div>
          )}
        </div>
        {contextMenu && (
          <div className="context-menu" style={contextMenuStyles}>
            <button
              onClick={handleDelete}
              className="flex items-center p-2 w-full text-red-500 hover:bg-red-100"
              title="Delete"
            >
              <FaTrashAlt className="mr-2" />
              Delete
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ResourceModal;
