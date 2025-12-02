import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { injectSpeedInsights } from '@vercel/speed-insights'

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

// Initialize Vercel Speed Insights (client-side only)
injectSpeedInsights();

// Initialize Web Vitals monitoring (optional)
if (import.meta.env.PROD) {
  try {
    import('./utils/webVitals').then(({ initWebVitals }) => {
      initWebVitals();
    }).catch(() => {
      // Web vitals not available, continue without it
    });
  } catch {
    // Web vitals not available, continue without it
  }
}

createRoot(document.getElementById("root")!).render(<App />);
