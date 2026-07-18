/**
 * client/src/components/ErrorBoundary.jsx
 * -----------------------------------------------------------------------------
 * A class component (React error boundaries currently must be classes)
 * that catches JavaScript errors thrown anywhere in its child component
 * tree during rendering, and shows a friendly fallback UI instead of a
 * blank white screen or a raw stack trace.
 *
 * Note: this only catches render-time errors, not errors inside async
 * event handlers (e.g. a failed fetch) - those are handled per-component
 * via try/catch + the toast notification system (see ToastContext.jsx).
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    // hasError tracks whether a render-time error was caught, so we can
    // switch to the fallback UI.
    this.state = { hasError: false };
  }

  // React calls this when a descendant component throws during render.
  // Returning a new state object triggers a re-render with hasError: true.
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // Log the error details for debugging (visible in the browser console),
  // without exposing them in the UI itself.
  componentDidCatch(error, info) {
    console.error('Unhandled UI error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <h1>Something went wrong.</h1>
          <p>The app hit an unexpected error. Try reloading the page.</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
