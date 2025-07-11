import React, { useState, useEffect } from 'react';
import { firestore } from '../../../utils/firebaseConfig';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/theme-monokai';

const languageExtensions = {
  javascript: 'javascript',
  python: 'python',
  html: 'html',
  css: 'css',
  cpp: 'c_cpp',
  'express.js': 'javascript',
};

const defaultCode = {
  javascript: 'console.log("Hello, World!");',
  python: 'print("Hello, World!")',
  html: `<!DOCTYPE html>\n<html>\n<head>\n\t<title>Hello World</title>\n\t<link rel="stylesheet" href="styles.css">\n</head>\n<body>\n\t<h1>Hello, World!</h1>\n\t<script src="script.js"></script>\n</body>\n</html>`,
  css: 'h1 { color: blue; }',
  cpp: '#include <iostream>\nint main() { std::cout << "Hello, World!"; return 0; }',
  'express.js': `const express = require('express');\nconst app = express();\napp.get('/', (req, res) => res.send('Hello, World!'));\napp.listen(3000, () => console.log('Server running'))`,
};

const DocumentModal = ({ show, onClose, chatId, currentUserProfile }) => {
  const [docContent, setDocContent] = useState('');
  const [codeContent, setCodeContent] = useState(defaultCode);
  const [error, setError] = useState('');
  const [isIdeMode, setIsIdeMode] = useState(false);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [fileNames, setFileNames] = useState({ html: 'index.html', css: 'styles.css', javascript: 'script.js' });

  // Live updates and fetching content without sending too many read/write requests
  useEffect(() => {
    if (!chatId) return;

    const docRef = doc(firestore, 'friendsChats', chatId, 'documents', 'plainDocument');

    const unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setDocContent(docSnap.data().content || '');
      }
    }, (err) => {
      console.error("Error fetching document content:", err);
      setError('Failed to fetch document content.');
    });

    return () => {
      unsubscribeDoc();
    };
  }, [chatId]);

  const handleDocContentChange = async (value) => {
    setDocContent(value);

    try {
      if (value && currentUserProfile?.uid) {
        const docRef = doc(firestore, 'friendsChats', chatId, 'documents', 'plainDocument');
        await setDoc(docRef, { content: value, lastUpdatedBy: currentUserProfile.uid });
      } else if (!value) {
        setError('Content is undefined.');
      }
    } catch (err) {
      console.error("Error updating document:", err);
      setError('Failed to update the document.');
    }
  };

  const handleContentChange = (value, lang = language) => {
    if (isIdeMode) {
      setCodeContent(prevCodeContent => ({ ...prevCodeContent, [lang]: value }));
    } else {
      setDocContent(value);

      if (value && currentUserProfile?.uid) {
        const docRef = doc(firestore, 'friendsChats', chatId, 'documents', 'plainDocument');
        setDoc(docRef, { content: value, lastUpdatedBy: currentUserProfile.uid })
          .catch(err => {
            console.error("Error updating document:", err);
            setError('Failed to update the document.');
          });
      } else if (!value) {
        setError('Content is undefined.');
      }
    }
  };


  const handleFileNameChange = (e) => {
    const { name, value } = e.target;
    setFileNames((prevFileNames) => ({ ...prevFileNames, [name]: value }));
  };

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const switchMode = () => {
    setIsIdeMode(!isIdeMode);
  };

  const executeCode = () => {
    let result = '';
    try {
      if (language === 'javascript' || language === 'express.js') {
        result = eval(codeContent.javascript); 
        setOutput(String(result || "Execution completed."));
      } else if (language === 'html' || language === 'css') {
        const iframe = document.getElementById('output-container');
        iframe.contentDocument.open();
        iframe.contentDocument.write(language === 'css' ? `<style>${codeContent.css}</style>${codeContent.html}` : codeContent.html);
        iframe.contentDocument.close();
        setOutput('');
      } else if (language === 'python' || language === 'cpp') {
        result = "Execution not supported for this language in the browser.";
        setOutput(result);
      }
    } catch (err) {
      setOutput('Error in code execution.');
    }
  };

  return (
    show && (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
        <div className="bg-gray-900 w-full h-full p-4 rounded-lg shadow-lg relative flex flex-col overflow-hidden">
          <h2 className="text-xl font-semibold text-white mb-4">Document Collaboration</h2>

          {error && <div className="text-red-500 mb-2">{error}</div>}

          <div className="flex justify-between items-center mb-4">
            <button
              onClick={switchMode}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700"
            >
              {isIdeMode ? 'Switch to Document Editor' : 'Switch to IDE Mode'}
            </button>

            {isIdeMode && (
              <>
                <select
                  value={language}
                  onChange={handleLanguageChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-700 text-white"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="cpp">C++</option>
                  <option value="express.js">Express.js</option>
                </select>
                {language === 'html' && (
                  <>
                    <input
                      name="html"
                      value={fileNames.html}
                      onChange={handleFileNameChange}
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-700 text-white ml-2"
                      placeholder="HTML File Name"
                    />
                    <input
                      name="css"
                      value={fileNames.css}
                      onChange={handleFileNameChange}
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-700 text-white ml-2"
                      placeholder="CSS File Name"
                    />
                    <input
                      name="javascript"
                      value={fileNames.javascript}
                      onChange={handleFileNameChange}
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-700 text-white ml-2"
                      placeholder="JavaScript File Name"
                    />
                  </>
                )}
              </>
            )}
          </div>

          {isIdeMode ? (
            <div className="flex flex-grow overflow-hidden">
              <div className="w-1/3 h-full p-2 border border-gray-800 rounded-lg overflow-auto bg-gray-900 text-white">
                {language === 'html' && (
                  <>
                    <h3 className="text-lg font-semibold mb-2">HTML</h3>
                    <textarea
                      className="w-full h-28 p-2 border border-gray-300 rounded-lg resize-none overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-200 bg-gray-900 text-white"
                      value={codeContent.html}
                      onChange={(e) => handleContentChange(e.target.value, 'html')}
                      placeholder="Write HTML code..."
                    />
                    <h3 className="text-lg font-semibold mb-2 mt-4">CSS</h3>
                    <textarea
                      className="w-full h-28 p-2 border border-gray-300 rounded-lg resize-none overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-200 bg-gray-900 text-white"
                      value={codeContent.css}
                      onChange={(e) => handleContentChange(e.target.value, 'css')}
                      placeholder="Write CSS code..."
                    />
                    <h3 className="text-lg font-semibold mb-2 mt-4">JavaScript</h3>
                    <textarea
                      className="w-full h-28 p-2 border border-gray-300 rounded-lg resize-none overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-200 bg-gray-900 text-white"
                      value={codeContent.javascript}
                      onChange={(e) => handleContentChange(e.target.value, 'javascript')}
                      placeholder="Write JavaScript code..."
                    />
                  </>
                )}
                {language !== 'html' && (
                  <AceEditor
                    mode={languageExtensions[language]}
                    theme="monokai"
                    onChange={(value) => handleContentChange(value)}
                    name="code-editor"
                    fontSize={14}
                    value={codeContent[language]}
                    width="100%"
                    height="100%"
                    setOptions={{
                      enableBasicAutocompletion: true,
                      enableLiveAutocompletion: true,
                      enableSnippets: true,
                      showLineNumbers: true,
                      tabSize: 2,
                      useWorker: false // Disable workers to prevent network error
                    }}
                  />
                )}
              </div>

              <div className="w-2/3 h-full p-2 border border-gray-800 rounded-lg ml-4 overflow-auto bg-gray-900 text-white">
                <h3 className="text-lg font-semibold mb-2">Output</h3>
                <div className="p-2 border border-gray-800 rounded-lg output-display" style={{ whiteSpace: 'pre-wrap' }}>
                  {output}
                </div>
                {(language === 'html' || language === 'css') && (
                  <iframe id="output-container" className="w-full h-full"></iframe>
                )}
              </div>
            </div>
          ) : (
            <textarea
              className="w-full h-full p-2 border border-gray-800 rounded-lg resize-none overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-200 bg-gray-900 text-white"
              value={docContent}
              onChange={(e) => handleDocContentChange(e.target.value)}
              placeholder="Write your document content..."
            />
          )}

          {isIdeMode && (
            <button
              onClick={executeCode}
              className="px-4 py-2 text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 mt-4"
            >
              Run Code
            </button>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white bg-red-600 p-2 rounded-lg shadow-md hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  );
};

export default DocumentModal;