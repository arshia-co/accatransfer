import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import AuthModal from './auth/AuthModal.jsx';
import { initSeo } from './lib/seo';

// Route-aware <head> SEO (title/description/canonical/OG/robots). Runs before
// React mounts; stays noindex until the launch switch in lib/seo.js is flipped.
initSeo();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <AuthModal />
    </AuthProvider>
  </StrictMode>,
);
