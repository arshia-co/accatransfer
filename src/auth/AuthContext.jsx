import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { getTurnstileToken } from '../lib/turnstile';
import {
  migrateGuestTransferDraftV2 as migrateGuestTransferDraft,
  sendAccountAdminAlert,
  sendAccountEventEmail,
  upsertProfile,
} from '../services/accountService';
import { rememberAccountPreview } from './accountPreview';

const AuthContext = createContext(null);

function isRecentlyCreatedUser(user) {
  const createdAt = new Date(user?.created_at || 0).getTime();
  return Number.isFinite(createdAt) && Date.now() - createdAt < 60 * 60 * 1000;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authRequest, setAuthRequest] = useState(null);
  const sessionMigrationRef = useRef('');
  const sessionUser = session?.user || null;

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

  useEffect(() => {
    if (!sessionUser?.id) return;
    const key = `${sessionUser.id}:${sessionUser.email || ''}`;
    if (sessionMigrationRef.current === key) return;
    sessionMigrationRef.current = key;
    migrateGuestTransferDraft(sessionUser).catch(() => {
      sessionMigrationRef.current = '';
    });
  }, [sessionUser]);

  const openAuth = useCallback((product = 'smart_apply', options = {}) => {
    setAuthRequest({ product, ...options });
  }, []);

  const closeAuth = useCallback(() => setAuthRequest(null), []);

  const sendCode = useCallback(async ({ email, product, language = 'fa' }) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const captchaToken = await getTurnstileToken('login_otp');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        ...(captchaToken ? { captchaToken } : {}),
        data: { current_product: product, language },
      },
    });
    if (error) throw error;
  }, []);

  const verifyCode = useCallback(async ({ email, token, product, language = 'fa', type = 'email' }) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const cleanEmail = email.trim();
    const cleanToken = token.trim();
    // A signup-confirmation code and a login OTP use different verifyOtp "type"s.
    // Try the expected type first, then fall back to the other so the same code works
    // whether the user is confirming a brand-new account or logging in.
    const candidateTypes = type === 'signup' ? ['signup', 'email'] : ['email', 'signup'];
    let data = null;
    let lastError = null;
    for (const candidate of candidateTypes) {
      const result = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanToken, type: candidate });
      if (!result.error && result.data?.user) {
        data = result.data;
        lastError = null;
        break;
      }
      lastError = result.error || new Error('Login could not be completed.');
    }
    if (!data || !data.user) throw lastError || new Error('Login could not be completed.');

    await upsertProfile(data.user, product, {
      language,
      fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
      avatarUrl: data.user.user_metadata?.avatar_url,
    });
    if (isRecentlyCreatedUser(data.user)) {
      await sendAccountAdminAlert('signup', {
        method: 'email_otp',
        product,
        language,
        source: 'auth_modal',
        needsEmailConfirmation: false,
      }).catch(() => null);
    }
    await sendAccountAdminAlert('login', {
      method: 'email_otp',
      product,
      language,
      source: 'auth_modal',
    }).catch(() => null);
    await sendAccountEventEmail('login', {
      method: 'email_otp',
      product,
      source: 'auth_modal',
    }).catch(() => null);
    rememberAccountPreview(data.user);
    const migratedDraft = await migrateGuestTransferDraft(data.user);
    setAuthRequest(null);
    return { user: data.user, migratedDraft };
  }, []);

  const resendSignupCode = useCallback(async ({ email }) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async ({ email, password, product = 'smart_apply' }) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    const captchaToken = await getTurnstileToken('login_password');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      ...(captchaToken ? { options: { captchaToken } } : {}),
    });
    if (error) throw error;
    if (!data.user) throw new Error('Login could not be completed.');
    await upsertProfile(data.user, product, {
      fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
      avatarUrl: data.user.user_metadata?.avatar_url,
    });
    await sendAccountAdminAlert('login', {
      method: 'password',
      product,
      source: 'auth_modal',
    }).catch(() => null);
    await sendAccountEventEmail('login', {
      method: 'password',
      product,
      source: 'auth_modal',
    }).catch(() => null);
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
    const captchaToken = await getTurnstileToken('signup_password');

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        ...(captchaToken ? { captchaToken } : {}),
        data: {
          full_name: cleanName,
          current_product: product,
          language,
        },
      },
    });
    if (error) throw error;

    if (data.user) {
      await sendAccountAdminAlert('signup', {
        userId: data.user.id,
        email: data.user.email || email.trim(),
        fullName: cleanName,
        method: 'password',
        product,
        language,
        source: 'auth_modal',
        needsEmailConfirmation: !data.session,
      }).catch(() => null);
    }

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
      : `${window.location.origin}/?/reset-password`;
    const captchaToken = await getTurnstileToken('password_reset');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
      ...(captchaToken ? { captchaToken } : {}),
    });
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
    resendSignupCode,
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
    resendSignupCode,
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
