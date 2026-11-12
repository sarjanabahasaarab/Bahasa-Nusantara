import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Abaikan galat tak tertangani dari ekstensi peramban pihak ketiga (seperti MetaMask)
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      const src = event.filename || '';
      const msg = event.message || '';
      if (
        src.includes('chrome-extension://') ||
        src.includes('moz-extension://') ||
        msg.includes('MetaMask')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return true;
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      const msg = typeof reason === 'string' ? reason : (reason?.message || '');
      const stack = reason?.stack || '';
      if (
        msg.includes('MetaMask') ||
        stack.includes('chrome-extension://') ||
        stack.includes('moz-extension://')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(<App />);
