import { XIcon, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { firestore, storage } from "../../../utils/firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";

export default function ResourceModal({ groupId, onClose }) {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef();

  const fetchFiles = async () => {
    try {
      const q = query(
        collection(doc(firestore, "groups", groupId), "resources"),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFiles(data);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return Swal.fire("No file", "Please select a file first.", "info");

    const file = selectedFile;
    const storageRef = ref(storage, `groupData/groupResources/${groupId}/${file.name}`);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await setDoc(doc(firestore, "groups", groupId, "resources", file.name), {
        name: file.name,
        url: downloadURL,
        timestamp: serverTimestamp()
      });

      Swal.fire("Uploaded!", `${file.name} uploaded successfully.`, "success");
      setSelectedFile(null);
      fetchFiles();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "File upload failed.", "error");
    }
  };

  const handleDelete = async (file) => {
    const confirm = await Swal.fire({
      title: `Delete ${file.name}?`,
      text: "This will remove it permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e3342f"
    });

    if (!confirm.isConfirmed) return;

    try {
      const storageRef = ref(storage, `groupData/groupResources/${groupId}/${file.name}`);
      await deleteObject(storageRef);
      await deleteDoc(doc(firestore, "groups", groupId, "resources", file.name));

      Swal.fire("Deleted!", "File has been deleted.", "success");
      fetchFiles();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete the file.", "error");
    }
  };

  return (
    <div className="fixed top-0 right-0 w-96 h-full bg-white shadow-lg z-50 flex flex-col border-l border-gray-200">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Shared Resources</h2>
        <button onClick={onClose} className="text-red-500">
          <XIcon />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-auto flex-1">
        <input
          type="file"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Choose File
          </button>
          <button
            onClick={handleUpload}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Send
          </button>
        </div>

        {selectedFile && (
          <p className="text-sm text-gray-700">Selected: {selectedFile.name}</p>
        )}

        <div className="space-y-3">
          {files.length === 0 && (
            <p className="text-sm text-gray-500">No resources uploaded yet.</p>
          )}
          {files.map(file => (
            <div
              key={file.name}
              className="flex justify-between items-center border p-2 rounded"
            >
              <div className="flex flex-col">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {file.name}
                </a>
                <span className="text-xs text-gray-500">
                  {file.timestamp?.toDate().toLocaleString() ?? "Uploading..."}
                </span>
              </div>
              <button onClick={() => handleDelete(file)} className="text-red-500 hover:text-red-700">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
