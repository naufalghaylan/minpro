import { create } from "zustand";
import { persist } from "zustand/middleware";

type User = {
  id: string;
  name: string;
  username?: string;
  email: string;
  bio?: string | null;
  referralCode?: string;
  role: "CUSTOMER" | "EVENT_ORGANIZER";
};

type AuthState = {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setAuth: (user: User, token: string) => void;
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

      setHydrated: (hydrated) => {
        set({ hydrated });
      },

      logout: () => {
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