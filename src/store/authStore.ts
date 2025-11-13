import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AuthUser = {
  id?: string | number
  name?: string
  email?: string
  role?: string
  image?: string
  permissions?: string[]
  [key: string]: unknown
}

type AuthState = {
  token?: string
  user?: AuthUser | null
  rememberMe?: boolean
  setCredentials: (payload: { token?: string; user?: AuthUser | null; rememberMe?: boolean }) => void
  clearCredentials: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: undefined,
      user: null,
      rememberMe: true,
      setCredentials: ({ token, user, rememberMe }) => set(() => ({ token, user, rememberMe })),
      clearCredentials: () => set(() => ({ token: undefined, user: null })),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => localStorage),
      // Persist token only when rememberMe is true; always persist rememberMe flag
      partialize: (state) => (
        state.rememberMe
          ? { token: state.token, user: state.user, rememberMe: state.rememberMe }
          : { rememberMe: state.rememberMe }
      ),
    }
  )
)

// Non-hook helpers for library code (axios interceptors, guards, etc.)
export const getAuthState = () => {
  const { token, user, rememberMe } = useAuthStore.getState()
  return { token, user, rememberMe }
}

export const setAuthState = (payload: { token?: string; user?: AuthUser | null; rememberMe?: boolean }) => {
  useAuthStore.getState().setCredentials(payload)
}

export const clearAuthState = () => {
  useAuthStore.getState().clearCredentials()
}