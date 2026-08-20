import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";
import api from "@/lib/api";

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
          if (!token || !user) {
            throw new Error("Invalid response from server");
          }
          localStorage.setItem("snapserve_token", token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          throw error;
        }
      },

      signup: async (data) => {
        set({ isLoading: true });
        try {
          const response = await api.post("/auth/signup", data);
          const { token, user } = response.data;
          if (!token || !user) {
            throw new Error("Invalid response from server");
          }
          localStorage.setItem("snapserve_token", token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          throw error;
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
