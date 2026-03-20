import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/i18n';
import './styles/globals.css'
import App from './App.tsx'

// Global error boundary for debugging
window.addEventListener('error', (e) => {
  document.getElementById('root')!.innerHTML = `<pre style="padding:20px;color:red;font-size:14px;">Runtime Error:\n${e.message}\n\n${e.filename}:${e.lineno}</pre>`;
});
window.addEventListener('unhandledrejection', (e) => {
  document.getElementById('root')!.innerHTML = `<pre style="padding:20px;color:red;font-size:14px;">Unhandled Promise Rejection:\n${e.reason}</pre>`;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
