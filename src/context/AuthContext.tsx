import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  supabase,
  getCurrentUserProfileAndMemberships,
  createRestaurantWithOwnerInSupabase,
  resolveStaffLoginEmail,
} from '../services/supabaseClient';
import { localRepository } from '../services/localRepository';
import { KdsDeviceSession, RestaurantMembership, RoleType, UserProfile } from '../types';

interface CreateRestaurantParams {
  restaurantName: string;
  outletName: string;
  outletCode: string;
  currency?: string;
  currencySymbol?: string;
  timezone?: string;
  fullName?: string;
  taxCgstPct?: number;
  taxSgstPct?: number;
  phone?: string;
  address?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  memberships: RestaurantMembership[];
  membership: RestaurantMembership | null;
  role: RoleType;
  isSuperAdmin: boolean;
  authorizedOutletId: string | null;
  kdsDevice: KdsDeviceSession | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  isAccountDeactivated: boolean;

  login: (identifierOrEmail: string, password: string, restaurantIdentifier?: string, branchCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  acceptStaffInvitation: (token: string, fullName: string, password?: string) => Promise<void>;
  createRestaurant: (params: CreateRestaurantParams) => Promise<any>;
  bootstrapOwner: (email: string, password: string, fullName: string, restaurantId: string) => Promise<void>;
  switchMembership: (membershipId: string) => void;
  pairKdsTerminal: (
    pairingCodeOrRestaurantId: string,
    options?: {
      branchCode?: string;
      stationCode?: string;
      deviceName?: string;
    }
  ) => Promise<void>;
  pairKdsWithRestaurantId: (
    restaurantCode: string,
    options?: {
      branchCode?: string;
      stationCode?: string;
      deviceName?: string;
    }
  ) => Promise<void>;
  revokeKdsTerminal: () => void;
  refreshAuthProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('restohub_cached_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [memberships, setMemberships] = useState<RestaurantMembership[]>(() => {
    try {
      const saved = localStorage.getItem('restohub_cached_memberships');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeMembershipId, setActiveMembershipId] = useState<string | null>(() => {
    return localStorage.getItem('restohub_active_membership_id') || null;
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    return localStorage.getItem('restohub_is_superadmin') === 'true';
  });
  const [cachedRole, setCachedRole] = useState<RoleType>(() => {
    return (localStorage.getItem('restohub_active_role') as RoleType) || 'owner';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
  });

  // KDS Device Session (for paired kitchen terminals)
  const [kdsDevice, setKdsDevice] = useState<KdsDeviceSession | null>(() => {
    try {
      const saved = localStorage.getItem('restohub_kds_device');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const clearError = () => setError(null);

  // Guards against concurrent duplicate syncs and duplicate auth events
  const isExplicitLoginInProgress = useRef(false);
  const inFlightSyncPromise = useRef<Promise<void> | null>(null);

  const syncProfileAndMembership = useCallback(async (activeUser: User | null) => {
    if (!activeUser) {
      setProfile(null);
      setMemberships([]);
      setIsSuperAdmin(false);
      return;
    }

    if (inFlightSyncPromise.current) {
      return inFlightSyncPromise.current;
    }

    const runSync = async () => {
      try {
        const { profile: prof, memberships: memList, isSuperAdmin: superAdmin } =
          await getCurrentUserProfileAndMemberships();

        setProfile(prof);
        setMemberships(memList);
        setIsSuperAdmin(superAdmin);

        if (prof) {
          localStorage.setItem('restohub_cached_profile', JSON.stringify(prof));
        }
        localStorage.setItem('restohub_cached_memberships', JSON.stringify(memList));
        localStorage.setItem('restohub_is_superadmin', String(superAdmin));

        // Resolve active membership
        if (memList.length > 0) {
          const savedId = localStorage.getItem('restohub_active_membership_id');
          const match = memList.find((m) => m.id === savedId) || memList[0];
          setActiveMembershipId(match.id);
          localStorage.setItem('restohub_active_membership_id', match.id);
          setCachedRole(match.role);
          localStorage.setItem('restohub_active_role', match.role);
        } else {
          setActiveMembershipId(null);
          localStorage.removeItem('restohub_active_membership_id');
        }
      } catch (err: any) {
        console.warn('Failed to sync profile & memberships:', err);
      } finally {
        inFlightSyncPromise.current = null;
      }
    };

    inFlightSyncPromise.current = runSync();
    return inFlightSyncPromise.current;
  }, []);

  const refreshAuthProfile = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    await syncProfileAndMembership(currentUser);
  };

  const switchMembership = (membershipId: string) => {
    const target = memberships.find((m) => m.id === membershipId);
    if (target) {
      setActiveMembershipId(target.id);
      localStorage.setItem('restohub_active_membership_id', target.id);
      setCachedRole(target.role);
      localStorage.setItem('restohub_active_role', target.role);
    }
  };

  // Initialize session restoration & subscribe to Supabase Auth state changes
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        setIsLoading(true);
        const { data: { session: initialSession }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          console.warn('Error restoring session:', sessionErr.message);
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          await syncProfileAndMembership(initialSession?.user ?? null);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Authentication initialization error');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Supabase Auth listener for session expiry, token refresh, and sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Skip redundant background profile sync if explicit login is handling it
        if (isExplicitLoginInProgress.current && event === 'SIGNED_IN') {
          return;
        }

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await syncProfileAndMembership(currentSession?.user ?? null);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setMemberships([]);
          setActiveMembershipId(null);
          setIsSuperAdmin(false);
          setCachedRole('owner');
          localStorage.removeItem('restohub_active_membership_id');
          localStorage.removeItem('restohub_cached_memberships');
          localStorage.removeItem('restohub_cached_profile');
          localStorage.removeItem('restohub_active_role');
          localStorage.removeItem('restohub_current_view');
          localStorage.removeItem('restohub_is_superadmin');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncProfileAndMembership]);

  // Login with Restaurant ID, Staff Login ID / Email, and Password
  const login = async (
    identifierOrEmail: string,
    password: string,
    restaurantIdentifier?: string,
    branchCode?: string
  ) => {
    if (isExplicitLoginInProgress.current) {
      return; // Prevent duplicate concurrent submissions
    }

    isExplicitLoginInProgress.current = true;
    setError(null);
    setIsLoading(true);
    try {
      let emailToUse = identifierOrEmail.trim().toLowerCase();

      // If restaurant identifier is provided, or identifier is a login ID (no @), resolve staff email securely
      if (restaurantIdentifier || !emailToUse.includes('@')) {
        const resolvedEmail = await resolveStaffLoginEmail(
          identifierOrEmail,
          restaurantIdentifier,
          branchCode
        );
        if (!resolvedEmail) {
          throw new Error('Invalid staff credentials, Restaurant ID, or branch assignment.');
        }
        emailToUse = resolvedEmail.toLowerCase();
      }

      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (loginErr) {
        throw new Error(loginErr.message || 'Invalid email, login ID, or password');
      }

      // Load verified user profile and active memberships
      const { profile: prof, memberships: memList, isSuperAdmin: superAdmin } =
        await getCurrentUserProfileAndMemberships();

      // If restaurant identifier was specified (Staff Login), strictly verify membership in that restaurant
      if (restaurantIdentifier) {
        const targetClean = restaurantIdentifier.trim().toUpperCase();
        const matchedMembership = memList.find((m) =>
          (m.restaurantCode && m.restaurantCode.toUpperCase() === targetClean) ||
          (m.restaurantSlug && m.restaurantSlug.toUpperCase() === targetClean) ||
          m.restaurantId === restaurantIdentifier.trim()
        );

        if (!matchedMembership) {
          // Untrusted or cross-tenant attempt: immediately terminate auth session
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setMemberships([]);
          throw new Error('Access denied: You do not have an active membership in this restaurant.');
        }

        // If branch code was specified, verify assigned branch
        if (branchCode) {
          const branchClean = branchCode.trim().toUpperCase();
          if (matchedMembership.outletCode && matchedMembership.outletCode.toUpperCase() !== branchClean) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setMemberships([]);
            throw new Error(`Access denied: You are not authorized for branch "${branchCode}".`);
          }
        }

        setActiveMembershipId(matchedMembership.id);
        localStorage.setItem('restohub_active_membership_id', matchedMembership.id);
      } else {
        // Owner / direct login
        if (memList.length === 0 && !superAdmin) {
          // User has no active memberships
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setMemberships([]);
          throw new Error('Account inactive: You do not have an active restaurant membership.');
        }

        if (memList.length > 0) {
          const savedId = localStorage.getItem('restohub_active_membership_id');
          const validSaved = memList.find((m) => m.id === savedId);
          const activeId = validSaved ? validSaved.id : memList[0].id;
          setActiveMembershipId(activeId);
          localStorage.setItem('restohub_active_membership_id', activeId);
        }
      }

      setSession(data.session);
      setUser(data.user);
      setProfile(prof);
      setMemberships(memList);
      setIsSuperAdmin(superAdmin);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      isExplicitLoginInProgress.current = false;
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setMemberships([]);
      setActiveMembershipId(null);
      setIsSuperAdmin(false);
      setCachedRole('owner');
      localStorage.removeItem('restohub_kds_device');
      localStorage.removeItem('restohub_active_membership_id');
      localStorage.removeItem('restohub_cached_memberships');
      localStorage.removeItem('restohub_cached_profile');
      localStorage.removeItem('restohub_active_role');
      localStorage.removeItem('restohub_current_view');
      localStorage.removeItem('restohub_is_superadmin');
      setKdsDevice(null);
      localRepository.clearTenantData();
    } catch (err: any) {
      console.warn('Error during logout:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, fullName: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpErr) throw signUpErr;

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        await syncProfileAndMembership(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset Request
  const resetPassword = async (email: string) => {
    setError(null);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin,
      });
      if (resetErr) throw resetErr;
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
      throw err;
    }
  };

  // Password Update (after clicking email recovery link)
  const updatePassword = async (newPassword: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;
      setIsPasswordRecovery(false);
      if (typeof window !== 'undefined' && (window.location.hash.includes('type=recovery') || window.location.search.includes('code='))) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in with Google (Owner Access)
  const signInWithGoogle = async () => {
    setError(null);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (oauthErr) throw oauthErr;
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google Sign-In');
      throw err;
    }
  };

  // Accept Staff Invitation
  const acceptStaffInvitation = async (token: string, fullName: string, password?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      let activeUid = user?.id;

      if (!activeUid && password) {
        // Fetch invitation details to get the intended email
        const { data: invData, error: invErr } = await supabase
          .from('staff_invitations')
          .select('email, full_name')
          .eq('token', token)
          .single();

        if (invErr || !invData) {
          throw new Error('Invalid or expired invitation token');
        }

        // Sign up or sign in
        const { data: signData, error: signErr } = await supabase.auth.signUp({
          email: invData.email,
          password,
          options: { data: { full_name: fullName || invData.full_name } },
        });

        if (signErr) {
          // If already registered, sign in
          const { data: logData, error: logErr } = await supabase.auth.signInWithPassword({
            email: invData.email,
            password,
          });
          if (logErr) throw logErr;
          activeUid = logData.user.id;
          setSession(logData.session);
          setUser(logData.user);
        } else {
          activeUid = signData.user?.id;
          setSession(signData.session);
          setUser(signData.user);
        }
      }

      if (!activeUid) {
        throw new Error('Please sign in or set a password to accept your invitation');
      }

      const { data: rpcRes, error: rpcErr } = await supabase.rpc('accept_staff_invitation', {
        p_token: token,
        p_full_name: fullName,
      });

      if (rpcErr) throw rpcErr;

      await refreshAuthProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Atomic Restaurant Creation with Owner Onboarding
  const createRestaurant = async (params: CreateRestaurantParams) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await createRestaurantWithOwnerInSupabase(params);
      await refreshAuthProfile();
      setActiveMembershipId(res.membershipId);
      localStorage.setItem('restohub_active_membership_id', res.membershipId);
      return res;
    } catch (err: any) {
      setError(err.message || 'Restaurant creation failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Backwards compatibility bootstrap owner
  const bootstrapOwner = async (
    email: string,
    password: string,
    fullName: string,
    restaurantId: string
  ) => {
    setError(null);
    setIsLoading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });

      let currentUid = authData?.user?.id;
      if (authErr) {
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (loginErr) throw loginErr;
        currentUid = loginData.user.id;
        setSession(loginData.session);
        setUser(loginData.user);
      } else if (authData.session) {
        setSession(authData.session);
        setUser(authData.user);
      }

      if (!currentUid) throw new Error('Could not establish authenticated session for Owner');

      const { error: rpcErr } = await supabase.rpc('bootstrap_restaurant_owner', {
        p_email: email.trim().toLowerCase(),
        p_full_name: fullName.trim(),
        p_restaurant_id: restaurantId,
      });

      if (rpcErr) throw rpcErr;

      await refreshAuthProfile();
    } catch (err: any) {
      setError(err.message || 'Owner onboarding failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Pair KDS Terminal via Restaurant ID
  const pairKdsWithRestaurantId = async (
    restaurantCode: string,
    options?: {
      branchCode?: string;
      stationCode?: string;
      deviceName?: string;
    }
  ) => {
    setError(null);
    setIsLoading(true);
    try {
      const { data, error: pairErr } = await supabase.rpc('pair_kds_by_restaurant_id', {
        p_restaurant_code: restaurantCode.trim(),
        p_branch_code: options?.branchCode?.trim() || null,
        p_station_code: options?.stationCode?.trim() || null,
        p_device_name: options?.deviceName?.trim() || 'Kitchen Display Terminal',
      });

      if (pairErr || !data?.success) {
        throw new Error(pairErr?.message || 'Invalid Restaurant ID or pairing failed');
      }

      const deviceData: KdsDeviceSession = {
        id: data.session_id || `kds-${Date.now()}`,
        restaurantId: data.restaurant_id,
        outletId: data.outlet_id,
        stationId: data.station_id || undefined,
        deviceName: data.device_name || 'Kitchen Display Terminal',
        deviceToken: data.device_token,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      setKdsDevice(deviceData);
      localStorage.setItem('restohub_kds_device', JSON.stringify(deviceData));
    } catch (err: any) {
      setError(err.message || 'Device pairing failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Pair KDS Terminal (supports either 6-digit code or Restaurant ID)
  const pairKdsTerminal = async (
    codeOrRestaurantId: string,
    options?: {
      branchCode?: string;
      stationCode?: string;
      deviceName?: string;
    }
  ) => {
    setError(null);
    setIsLoading(true);
    try {
      const trimmed = codeOrRestaurantId.trim();
      const isSixDigit = /^\d{6}$/.test(trimmed);

      if (isSixDigit) {
        const { data, error: pairErr } = await supabase.rpc('pair_kds_device', {
          p_pairing_code: trimmed,
        });

        if (!pairErr && data?.success) {
          const deviceData: KdsDeviceSession = {
            id: `kds-${Date.now()}`,
            restaurantId: data.restaurant_id,
            outletId: data.outlet_id,
            stationId: data.station_id || undefined,
            deviceName: data.device_name || 'Kitchen Display Terminal',
            deviceToken: data.device_token,
            isActive: true,
            createdAt: new Date().toISOString(),
          };

          setKdsDevice(deviceData);
          localStorage.setItem('restohub_kds_device', JSON.stringify(deviceData));
          return;
        } else if (pairErr) {
          throw new Error(pairErr.message || 'Invalid or expired pairing code');
        }
      }

      // If not a 6-digit code or fallback, pair with Restaurant ID
      await pairKdsWithRestaurantId(trimmed, options);
    } catch (err: any) {
      setError(err.message || 'Device pairing failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const revokeKdsTerminal = () => {
    localStorage.removeItem('restohub_kds_device');
    setKdsDevice(null);
  };

  // Resolve currently active membership
  const currentMembership =
    memberships.find((m) => m.id === activeMembershipId) ||
    memberships[0] ||
    null;

  const isAccountDeactivated = Boolean(currentMembership && !currentMembership.isActive);

  // Derive active role:
  // 1. If paired KDS device terminal active -> 'kitchen'
  // 2. If platform super admin -> 'superadmin'
  // 3. From verified restaurant membership -> currentMembership.role
  // 4. Fallback to cached role or 'owner' (never default to waiter unless explicitly assigned)
  const derivedRole: RoleType = kdsDevice
    ? 'kitchen'
    : isSuperAdmin
    ? 'superadmin'
    : currentMembership?.role || cachedRole || 'owner';

  const authorizedOutletId = kdsDevice
    ? kdsDevice.outletId
    : currentMembership?.outletId || null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        memberships,
        membership: currentMembership,
        role: derivedRole,
        isSuperAdmin,
        authorizedOutletId,
        kdsDevice,
        isLoading,
        error,
        clearError,
        isAccountDeactivated,
        login,
        logout,
        signUp,
        resetPassword,
        updatePassword,
        isPasswordRecovery,
        setIsPasswordRecovery,
        signInWithGoogle,
        acceptStaffInvitation,
        createRestaurant,
        bootstrapOwner,
        switchMembership,
        pairKdsTerminal,
        pairKdsWithRestaurantId,
        revokeKdsTerminal,
        refreshAuthProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
