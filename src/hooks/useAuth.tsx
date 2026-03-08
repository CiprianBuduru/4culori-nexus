import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, UserProfile, UserRole, roleAccess } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasAccess: (page: string) => boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewAllData: boolean;
  canEditData: boolean;
  accessLevel: number;
  getUserDepartments: () => string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    

    // Guaranteed timeout - never stay loading forever
    timeoutRef.current = setTimeout(() => {
      console.warn('[AUTH TIMEOUT] Auth bootstrap exceeded 5s, forcing loading=false');
      setLoading(false);
    }, AUTH_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          finishLoading();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        finishLoading();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const finishLoading = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setLoading(false);
  };

  const fetchUserData = async (userId: string) => {
    try {
      console.log('[PROFILE FETCH] Fetching profile for:', userId);
      console.log('[ROLE FETCH] Fetching role for:', userId);

      const [profileResult, roleResult] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileResult.status === 'fulfilled' && profileResult.value.data) {
        setProfile(profileResult.value.data as UserProfile);
        console.log('[PROFILE FETCH] loaded:', profileResult.value.data.email);
      } else {
        setProfile(null);
        console.warn('[PROFILE FETCH] No profile found');
      }

      if (roleResult.status === 'fulfilled' && roleResult.value.data) {
        setUserRole(roleResult.value.data as UserRole);
        console.log('[ROLE FETCH] loaded:', roleResult.value.data.role);
      } else {
        setUserRole(null);
        console.warn('[ROLE FETCH] No role found');
      }
    } catch (error) {
      console.error('[AUTH INIT] Error fetching user data:', error);
      setProfile(null);
      setUserRole(null);
    } finally {
      finishLoading();
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUserRole(null);
  };

  const DEV_MODE = false;

  const hasAccess = (page: string): boolean => {
    if (DEV_MODE) return true;
    if (!userRole) return false;
    const access = roleAccess[userRole.role as AppRole];
    return access?.pages.includes(page) ?? false;
  };

  const DEV_BYPASS_AUTH = false;

  const canManageUsers = DEV_BYPASS_AUTH ? true : (userRole ? roleAccess[userRole.role as AppRole]?.canManageUsers ?? false : false);
  const canManageSettings = DEV_BYPASS_AUTH ? true : (userRole ? roleAccess[userRole.role as AppRole]?.canManageSettings ?? false : false);
  const canViewAllData = DEV_BYPASS_AUTH ? true : (userRole ? roleAccess[userRole.role as AppRole]?.canViewAllData ?? false : false);
  const canEditData = DEV_BYPASS_AUTH ? true : (userRole ? roleAccess[userRole.role as AppRole]?.canEditData ?? false : false);
  const accessLevel = DEV_BYPASS_AUTH ? 4 : (userRole ? roleAccess[userRole.role as AppRole]?.level ?? 0 : 0);

  const getUserDepartments = (): string[] => {
    return userRole?.departments ?? [];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        userRole,
        loading,
        signIn,
        signOut,
        hasAccess,
        canManageUsers,
        canManageSettings,
        canViewAllData,
        canEditData,
        accessLevel,
        getUserDepartments,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
