import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { Profile, TokenResponse, UserRole } from "../types";

interface AuthState {
  token: string | null;
  role: UserRole | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<TokenResponse>;
  register: (payload: Record<string, string>) => Promise<TokenResponse>;
  logout: () => void;
  refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("hn_token"));
  const [role, setRole] = useState<UserRole | null>(() => (localStorage.getItem("hn_role") as UserRole) || null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!!token);

  async function refreshProfile() {
    if (!localStorage.getItem("hn_token")) {
      setProfile(null);
      setLoading(false);
      return null;
    }
    const { data } = await api.get<Profile>("/users/me");
    setProfile(data);
    setRole(data.role);
    setLoading(false);
    return data;
  }

  useEffect(() => {
    if (token) {
      refreshProfile().catch(() => {
        logout();
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function applyToken(res: TokenResponse) {
    localStorage.setItem("hn_token", res.access_token);
    localStorage.setItem("hn_role", res.role);
    setToken(res.access_token);
    setRole(res.role);
    return res;
  }

  const value = useMemo<AuthState>(
    () => ({
      token,
      role,
      profile,
      loading,
      async login(email, password, rememberMe) {
        const { data } = await api.post<TokenResponse>("/auth/login", {
          email,
          password,
          remember_me: rememberMe,
        });
        return applyToken(data);
      },
      async register(payload) {
        const { data } = await api.post<TokenResponse>("/auth/register", payload);
        return applyToken(data);
      },
      logout() {
        localStorage.removeItem("hn_token");
        localStorage.removeItem("hn_role");
        setToken(null);
        setRole(null);
        setProfile(null);
      },
      refreshProfile,
    }),
    [token, role, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function logout() {
  localStorage.removeItem("hn_token");
  localStorage.removeItem("hn_role");
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
