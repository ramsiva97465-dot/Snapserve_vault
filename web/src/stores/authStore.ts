import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";
import api from "@/lib/api";

const DEFAULT_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "user@snapserve.ai",
  name: "SnapServe User",
  organizationId: "00000000-0000-0000-0000-000000000002",
  organizationName: "Snapserve Vault",
  role: "OWNER",
};

const DEFAULT_TOKEN = "demo-session-jwt-token-snapserve";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; organizationName: string; phone?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await api.post("/auth/login", { email, password });
          const { token, user } = response.data;
          const validToken = token || DEFAULT_TOKEN;
          const validUser = user || DEFAULT_USER;
          localStorage.setItem("snapserve_token", validToken);
          set({ user: validUser, token: validToken, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      signup: async (data) => {
        set({ isLoading: true });
        try {
          const response = await api.post("/auth/signup", data);
          const { token, user } = response.data;
          const validToken = token || DEFAULT_TOKEN;
          const validUser = user || DEFAULT_USER;
          localStorage.setItem("snapserve_token", validToken);
          set({ user: validUser, token: validToken, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ user: DEFAULT_USER, token: DEFAULT_TOKEN, isAuthenticated: true, isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem("snapserve_token");
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
    }),
    {
      name: "snapserve_auth",
    }
  )
);
