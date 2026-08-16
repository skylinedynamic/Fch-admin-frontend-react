import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AuthUser = {
  id?: string | number
  name?: string
  email?: string
  role?: string
  image?: string
  entity_type?: string
  entity_id?: string | number
  permissions?: string[]
  [key: string]: unknown
}

export type UserSubscription = {
  enrollment_type?: string
  subscription_status?: string
  subscription_start_date?: string | null
  subscription_end_date?: string | null
  phase?: string
  is_host?: boolean
  is_free_trail?: boolean
  free_trail_end_date?: string | null
  [key: string]: unknown
}


type AuthState = {
  token?: string
  user?: AuthUser | null
  rememberMe?: boolean
  userSubscription?: UserSubscription | null
  setCredentials: (payload: { token?: string; user?: AuthUser | null; rememberMe?: boolean }) => void
  setUserSubscription: (subscription: UserSubscription | null) => void
  clearCredentials: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: undefined,
      user: null,
      rememberMe: true,
      setCredentials: ({ token, user, rememberMe }) => set(() => ({ token, user, rememberMe })),
      setUserSubscription: (subscription) => set(() => ({ userSubscription: subscription })),
      clearCredentials: () => set(() => ({ token: undefined, user: null })),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => localStorage),
      // Always persist token and user, regardless of rememberMe
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        rememberMe: state.rememberMe
      }),
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

export const setUserSubscriptionState = (subscription: UserSubscription | null) => {
  useAuthStore.getState().setUserSubscription(subscription)
}

export const getUserSubscriptionState = () => {
  const { userSubscription } = useAuthStore.getState()
  return userSubscription
}