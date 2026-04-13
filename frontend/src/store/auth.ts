import { create } from 'zustand';

export type UserRole = 'CUSTOMER' | 'EVENT_ORGANIZER';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setUser: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user, token) => set({ user, accessToken: token }),
  logout: () => {
    localStorage.removeItem('accessToken');
    set({ user: null, accessToken: null });
  },
}));
