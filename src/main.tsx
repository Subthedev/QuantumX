import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Error fallback UI
const renderError = (error: Error) => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background: #0a0a0a; color: #fff; font-family: system-ui, -apple-system, sans-serif;">
        <div style="max-width: 600px; text-align: center;">
          <div style="width: 80px; height: 80px; margin: 0 auto 24px; border-radius: 50%; background: linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%); display: flex; align-items: center; justify-content: center; font-size: 40px;">⚠️</div>
          <h1 style="font-size: 24px; margin-bottom: 16px; font-weight: 600;">Application Load Error</h1>
          <p style="color: #999; margin-bottom: 24px; line-height: 1.6;">We're having trouble loading IgniteX. This might be due to a network issue or browser compatibility problem.</p>
          <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: left;">
            <code style="color: #ff6b6b; font-size: 12px; word-break: break-word;">${error.message}</code>
          </div>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button onclick="window.location.reload()" style="background: linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%); color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">Reload Page</button>
            <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">Clear Cache & Reload</button>
          </div>
          <p style="color: #666; margin-top: 24px; font-size: 12px;">If the problem persists, try clearing your browser cache or using a different browser.</p>
        </div>
      </div>
    `;
  }
};

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  if (!document.querySelector('[data-app-loaded]')) {
    renderError(event.error || new Error('Unknown error occurred'));
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (!document.querySelector('[data-app-loaded]')) {
    renderError(event.reason || new Error('Async operation failed'));
  }
});

try {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error('Root element not found. The HTML structure may be corrupted.');
  }

  // Mark that we're attempting to load
  rootElement.setAttribute('data-loading', 'true');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  // Mark app as loaded after a brief delay
  setTimeout(() => {
    rootElement.setAttribute('data-app-loaded', 'true');
    rootElement.removeAttribute('data-loading');
  }, 1000);

} catch (error) {
  console.error('Failed to initialize React application:', error);
  renderError(error instanceof Error ? error : new Error('Failed to initialize application'));
}
