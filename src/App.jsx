import { useEffect, useState } from 'react';
import SmartApplyShell from './components/smart-apply/SmartApplyShell';
import ServiceGateway from './components/gateway/ServiceGateway';
import AITransferPreview from './components/transfer/AITransferPreview';
import AccountPortal from './components/account/AccountPortal';
import ResetPasswordPage from './auth/ResetPasswordPage';

const SMART_APPLY_PATH = '/smart-apply';
const AI_TRANSFER_PATH = '/ai-transfer';
const ACCOUNT_PATH = '/account';
const SMART_APPLY_ACCOUNT_PATH = '/smart-apply/account';
const AI_TRANSFER_ACCOUNT_PATH = '/ai-transfer/account';
const RESET_PASSWORD_PATH = '/reset-password';
const AUTH_RESET_PASSWORD_PATH = '/auth/reset-password';

function normalizedPath() {
  const path = window.location.pathname.replace(/\/+$/, '');
  return path || '/';
}

// Minimal frontend-only router. Each product keeps an isolated page boundary,
// so the Smart Apply conversation can evolve independently from the gateway.
export default function App() {
  const [path, setPath] = useState(normalizedPath);

  useEffect(() => {
    const onPop = () => setPath(normalizedPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if ([ACCOUNT_PATH, SMART_APPLY_ACCOUNT_PATH, AI_TRANSFER_ACCOUNT_PATH].includes(path)) return <AccountPortal />;
  if ([RESET_PASSWORD_PATH, AUTH_RESET_PASSWORD_PATH].includes(path)) return <ResetPasswordPage />;
  if (path === SMART_APPLY_PATH) return <SmartApplyShell />;
  if (path === AI_TRANSFER_PATH) return <AITransferPreview />;
  return <ServiceGateway />;
}
