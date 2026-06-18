import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { migrateGuestTransferDraft, upsertProfile } from '../services/accountService';
import { rememberAccountPreview } from './accountPreview';

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

    await upsertProfile(data.user, product, {
      language,
      fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
      avatarUrl: data.user.user_metadata?.avatar_url,
    });
    rememberAccountPreview(data.user);
    const migratedDraft = await migrateGuestTransferDraft(data.user);
    setAuthRequest(null);
    return { user: data.user, migratedDraft };
  }, []);

  const signInWithPassword = useCallback(async ({ email, password, product = 'smart_apply' }) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    if (!data.user) throw new Error('Login could not be completed.');
    await upsertProfile(data.user, product, {
      fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
      avatarUrl: data.user.user_metadata?.avatar_url,
    });
    rememberAccountPreview(data.user);
    const migratedDraft = await migrateGuestTransferDraft(data.user);
    setAuthRequest(null);
    return { user: data.user, migratedDraft };
  }, []);

  const signUpWithPassword = useCallback(async ({
    email,
    password,
    fullName,
    product = 'smart_apply',
    language = 'fa',
  }) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const cleanName = fullName.trim();
    const redirectTo = typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}/account`;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: cleanName,
          current_product: product,
          language,
        },
      },
    });
    if (error) throw error;

    if (data.session && data.user) {
      await upsertProfile(data.user, product, { fullName: cleanName, language });
      rememberAccountPreview(data.user, { full_name: cleanName });
      const migratedDraft = await migrateGuestTransferDraft(data.user);
      setAuthRequest(null);
      return { user: data.user, session: data.session, migratedDraft, needsEmailConfirmation: false };
    }

    return { user: data.user, session: data.session, needsEmailConfirmation: true };
  }, []);

  const resetPassword = useCallback(async ({ email }) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const redirectTo = typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}/account`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw error;
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
    signUpWithPassword,
    resetPassword,
    signOut,
  }), [
    session,
    loading,
    authRequest,
    openAuth,
    closeAuth,
    sendCode,
    verifyCode,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
