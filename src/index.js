import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import process from 'process';
window.process = process;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

