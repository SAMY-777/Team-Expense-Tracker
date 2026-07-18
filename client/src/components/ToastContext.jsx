/**
 * client/src/components/ToastContext.jsx
 * -----------------------------------------------------------------------------
 * A lightweight toast notification system implemented with React Context,
 * so any component can call useToast() to show a transient success/error
 * message without prop-drilling. This is what surfaces API errors (e.g.
 * "This category still has expenses linked to it") to the user in a
 * friendly way instead of a silent failure or a raw console error.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

/** Wrap the app in this once (see main.jsx) to enable useToast() everywhere. */
export function ToastProvider({ children }) {
  // Each toast is { id, message, type: 'error' | 'success' }.
  const [toasts, setToasts] = useState([]);

  // Removes a toast by id, used both by the auto-dismiss timer and the
  // manual close button.
  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // Adds a new toast and schedules it to auto-dismiss after 5 seconds.
  const showToast = useCallback(
    (message, type = 'error') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current, { id, message, type }]);
      setTimeout(() => dismissToast(id), 5000);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Hook used by components to trigger a toast: const { showToast } = useToast(); */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return context;
}
