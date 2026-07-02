import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { AppProviders } from './app/providers';

import './styles/globals.css';

// The SW updates itself on deploy (skipWaiting+clientsClaim), but an already
// open tab keeps running the old bundle until a manual refresh — Lasha kept
// seeing stale UI after deploys. Reload once when the new worker takes over.
if ('serviceWorker' in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return; // guard against reload loops
    reloaded = true;
    window.location.reload();
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
