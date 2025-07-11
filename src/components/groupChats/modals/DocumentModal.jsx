import { useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { firestore } from "../../../utils/firebaseConfig";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import Editor from "@monaco-editor/react";

export default function DocumentModal({ groupId, onClose }) {
  const [activeTab, setActiveTab] = useState("code");
  const [code, setCode] = useState("// Start coding...");
  const [notes, setNotes] = useState("<p>Start taking notes...</p>");
  const [language, setLanguage] = useState("javascript");
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef(null);
  const notesTimeout = useRef(null);

  const docRef = doc(firestore, "groups", groupId, "documents", "main");
  const notesRef = doc(firestore, "groups", groupId, "documents", "mainNotes");

  // Load code & notes
  useEffect(() => {
    const unsubCode = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCode(data.content || "");
        setLanguage(data.language || "javascript");
      }
    });

    const unsubNotes = onSnapshot(notesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setNotes(data.content || "");
      }
    });

    return () => {
      unsubCode();
      unsubNotes();
    };
  }, [groupId]);

  // Code autosave
  const handleEditorChange = (value) => {
    setCode(value);

    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      await setDoc(
        docRef,
        {
          content: value,
          language,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaving(false);
    }, 1000);
  };

  // Notes autosave
  const handleNotesChange = (e) => {
    const value = e.target.value;
    setNotes(value);

    if (notesTimeout.current) clearTimeout(notesTimeout.current);

    notesTimeout.current = setTimeout(() => {
      setDoc(notesRef, { content: value, updatedAt: serverTimestamp() });
    }, 800);
  };

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    await setDoc(docRef, { language: newLang }, { merge: true });
  };

  const renderOutput = () => {
    if (["html", "css", "javascript"].includes(language)) {
      let html = "";
      if (language === "html") html = code;
      if (language === "css") html = `<style>${code}</style>`;
      if (language === "javascript") html = `<script>${code}<\/script>`;

      return (
        <iframe
          className="w-full h-full bg-white border"
          sandbox="allow-scripts"
          srcDoc={html}
          title="Live Preview"
        />
      );
    }

    return (
      <div className="text-sm text-gray-500 p-4">
        No live preview for <strong>{language}</strong>.
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">
          Realtime IDE - Group: {groupId}
        </h2>
        <button
          onClick={onClose}
          className="text-red-500 hover:text-red-700"
        >
          <XIcon />
        </button>
      </div>

      <div className="flex items-center gap-4 px-4 py-2 bg-gray-100 border-b">
        <button
          onClick={() => setActiveTab("code")}
          className={`px-3 py-1 rounded ${
            activeTab === "code" ? "bg-blue-600 text-white" : "bg-white border"
          }`}
        >
          Code
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-3 py-1 rounded ${
            activeTab === "notes" ? "bg-blue-600 text-white" : "bg-white border"
          }`}
        >
          Notes
        </button>

        {activeTab === "code" && (
          <>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="border px-2 py-1 rounded"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="json">JSON</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
            </select>
            {saving && (
              <span className="text-xs text-gray-500">Saving...</span>
            )}
          </>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
        {/* Left panel */}
        <div className="h-full overflow-hidden">
          {activeTab === "code" ? (
            <Editor
              height="100%"
              defaultLanguage="javascript"
              language={language}
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
              }}
            />
          ) : (
            <textarea
              className="w-full h-full p-4 text-sm font-mono border-0 outline-none resize-none"
              value={notes}
              onChange={handleNotesChange}
              placeholder="Write your notes in HTML..."
            />
          )}
        </div>

        {/* Right panel */}
        <div className="h-full border-l">
          {activeTab === "code" ? (
            renderOutput()
          ) : (
            <iframe
              className="w-full h-full bg-white"
              srcDoc={notes}
              sandbox=""
              title="Notes Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
}
