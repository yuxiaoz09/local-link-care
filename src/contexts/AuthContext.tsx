import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { sessionManager, logSecurityEvent } from '@/lib/security';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthContext: Setting up auth listener...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 AuthContext: Auth state changed', { event, hasSession: !!session, userId: session?.user?.id });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        console.log('🔐 AuthContext: Loading set to false');
        
        // Security: Log auth events and manage session timeout
        if (event === 'SIGNED_IN') {
          logSecurityEvent('User signed in', { userId: session?.user?.id });
          sessionManager.startTimer(() => {
            logSecurityEvent('Session timeout - auto logout');
            supabase.auth.signOut();
          });
        } else if (event === 'SIGNED_OUT') {
          logSecurityEvent('User signed out');
          sessionManager.clearTimer();
        }
      }
    );

    // Get initial session
    console.log('🔐 AuthContext: Getting initial session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔐 AuthContext: Initial session result', { 
        hasSession: !!session, 
        error, 
        userId: session?.user?.id,
        accessToken: session?.access_token ? 'present' : 'missing',
        expiresAt: session?.expires_at,
        now: Math.floor(Date.now() / 1000)
      });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      console.log('🔐 AuthContext: Loading set to false (initial session)');
      
      // Security: Start session timer for existing sessions
      if (session) {
        sessionManager.startTimer(() => {
          logSecurityEvent('Session timeout - auto logout');
          supabase.auth.signOut();
        });
      }
    }).catch((error) => {
      console.error('🔐 AuthContext: Error getting initial session', error);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      sessionManager.clearTimer();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};