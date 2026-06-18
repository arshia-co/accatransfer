import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { migrateGuestTransferDraft, upsertProfile } from '../services/accountService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authRequest, setAuthRequest] = useState(null);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const openAuth = useCallback((product = 'smart_apply', options = {}) => {
    setAuthRequest({ product, ...options });
  }, []);

  const closeAuth = useCallback(() => setAuthRequest(null), []);

  const sendCode = useCallback(async ({ email, product, language = 'fa' }) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        data: { current_product: product, language },
      },
    });
    if (error) throw error;
  }, []);

  const verifyCode = useCallback(async ({ email, token, product, language = 'fa' }) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });
    if (error) throw error;
    if (!data.user) throw new Error('Login could not be completed.');

    await upsertProfile(data.user, product, { language });
    const migratedDraft = await migrateGuestTransferDraft(data.user);
    setAuthRequest(null);
    return { user: data.user, migratedDraft };
  }, []);

  const signInWithPassword = useCallback(async ({ email, password, product = 'smart_apply' }) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    if (!data.user) throw new Error('Login could not be completed.');
    await upsertProfile(data.user, product, {});
    const migratedDraft = await migrateGuestTransferDraft(data.user);
    setAuthRequest(null);
    return { user: data.user, migratedDraft };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    user: session?.user || null,
    session,
    loading,
    isConfigured: isSupabaseConfigured,
    authRequest,
    openAuth,
    closeAuth,
    sendCode,
    verifyCode,
    signInWithPassword,
    signOut,
  }), [session, loading, authRequest, openAuth, closeAuth, sendCode, verifyCode, signInWithPassword, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
