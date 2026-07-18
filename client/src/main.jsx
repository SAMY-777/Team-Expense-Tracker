/**
 * client/src/main.jsx
 * -----------------------------------------------------------------------------
 * React entry point. Mounts <App /> (wrapped in the ErrorBoundary so any
 * unexpected render-time error shows a friendly fallback instead of a blank
 * white screen) into the #root div declared in index.html.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ToastProvider } from './components/ToastContext.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
