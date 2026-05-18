import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { Dashboard } from './features/dashboard/Dashboard';
import { AccountsPage } from './features/social/AccountsPage';
import { ComposePage } from './features/social/ComposePage';
import { InboxPage } from './features/social/InboxPage';
import { AdminTokenGate } from './components/shell/AdminTokenGate';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminTokenGate>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/social" element={<AccountsPage />} />
            <Route path="/social/callback" element={<AccountsPage />} />
            <Route path="/social/compose" element={<ComposePage />} />
            <Route path="/social/inbox" element={<InboxPage />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </AdminTokenGate>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
