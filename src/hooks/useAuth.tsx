import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AUTH INIT] Setting up auth state listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH INIT] onAuthStateChange event:', event, 'user:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          setLoading(false);
          console.log('[AUTH INIT] No session, loading set to false');
        }
      }
    );

    console.log('[AUTH INIT] Checking existing session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH INIT] getSession result:', session?.user?.email ?? 'no session');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
        console.log('[AUTH INIT] No existing session, loading set to false');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      console.log('[PROFILE FETCH] Starting profile fetch for:', userId);
      console.log('[ROLE FETCH] Starting role fetch for:', userId);

      const [profileResult, roleResult] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileResult.status === 'fulfilled' && profileResult.value.data) {
        setProfile(profileResult.value.data as UserProfile);
        console.log('[Auth] Profile loaded:', profileResult.value.data.email);
      } else {
        setProfile(null);
        console.warn('[Auth] No profile found for user', userId);
      }

      if (roleResult.status === 'fulfilled' && roleResult.value.data) {
        setUserRole(roleResult.value.data as UserRole);
        console.log('[Auth] Role loaded:', roleResult.value.data.role);
      } else {
        setUserRole(null);
        console.warn('[Auth] No role found for user', userId);
      }
    } catch (error) {
      console.error('[Auth] Error fetching user data:', error);
      setProfile(null);
      setUserRole(null);
    } finally {
      console.log('[Auth] Loading complete');
      setLoading(false);
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

  // Development mode bypass constant
  const DEV_MODE = false;

  const hasAccess = (page: string): boolean => {
    if (DEV_MODE) return true; // Full access in dev mode
    if (!userRole) return false;
    const access = roleAccess[userRole.role as AppRole];
    return access?.pages.includes(page) ?? false;
  };

  // Development mode bypass - full admin access
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
