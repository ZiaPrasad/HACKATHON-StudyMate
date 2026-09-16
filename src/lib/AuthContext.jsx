import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { supabase, isLocalMode } from '@/lib/supabaseClient';

const AuthContext = createContext();

const mapSupabaseUser = (u) =>
  u
    ? {
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
        role: 'user',
      }
    : null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    if (isLocalMode()) {
      // LOCAL MODE: Supabase Auth only — no Base44 backend involved.
      setIsLoadingPublicSettings(false);
      let active = true;
      supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        setUser(data.session ? mapSupabaseUser(data.session.user) : null);
        setIsAuthenticated(!!data.session);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session ? mapSupabaseUser(session.user) : null);
        setIsAuthenticated(!!session);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      });
      return () => {
        active = false;
        sub.subscription.unsubscribe();
      };
    }
    checkAppState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      try {
        const publicSettings = await base44.app.getPublicSettings();
        setAppPublicSettings(publicSettings);

        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);

        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    if (isLocalMode()) {
      const { data } = await supabase.auth.getSession();
      setUser(data.session ? mapSupabaseUser(data.session.user) : null);
      setIsAuthenticated(!!data.session);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    if (isLocalMode()) {
      setUser(null);
      setIsAuthenticated(false);
      supabase.auth.signOut();
      if (shouldRedirect) window.location.href = '/login';
      return;
    }
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    if (isLocalMode()) {
      window.location.href = '/login';
      return;
    }
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};