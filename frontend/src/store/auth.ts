import { create } from "zustand";
import { persist } from "zustand/middleware";

type User = {
  id: string;
  name: string;
  username?: string;
  email: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  referralCode?: string;
  role: "CUSTOMER" | "EVENT_ORGANIZER";
  referredBy: string | null;
};

type AuthState = {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
  setHydrated: (hydrated: boolean) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,

      setAuth: (user, token) => {
        set({ user, token });
      },

      setAccessToken: (token) => {
        set({ token });
      },

      setHydrated: (hydrated) => {
        set({ hydrated });
      },

      logout: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({ user: null, token: null });
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);