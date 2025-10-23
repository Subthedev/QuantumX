import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initWebVitals } from './utils/webVitals'

// Register service worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(() => {
        // Service worker registered successfully
      })
      .catch(() => {
        // Service worker registration failed
      });
  });
}

// Initialize Web Vitals monitoring
if (import.meta.env.PROD) {
  initWebVitals();
}

createRoot(document.getElementById("root")!).render(<App />);
