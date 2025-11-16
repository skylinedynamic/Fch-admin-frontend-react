import { apiClient } from '../http'
import { setAuth, AuthUser } from './auth'

export type LoginSuccess = { token: string; user: AuthUser }

export async function login(email: string, password: string, remember: boolean = true): Promise<LoginSuccess> {
  try {
    const res = await apiClient.post('/auth/login', { email, password, remember })
    const data = res?.data

    if (data?.status === true) {
      const token: string | undefined = data?.data?.token
      const user: AuthUser | undefined = data?.data?.user
      if (!token || !user) {
        // preserve server message shape in response for UI consumption
        const error: any = new Error('Login response missing token or user')
        error.response = { data }
        throw error
      }
      setAuth(token, user, remember)
      return { token, user }
    }

    // If API returned 200 with status=false, throw an error carrying server data
    const error: any = new Error(data?.message ?? 'Login failed')
    error.response = { data }
    throw error
  } catch (err) {
    // Axios errors already have response; just rethrow
    throw err
  }
}


export async function logout(): Promise<{ status?: boolean; message?: string; data?: any }> {
  try {
    const res = await apiClient.post('/auth/logout')
    return res?.data ?? { status: true }
  } catch (err) {
    throw err
  }
}

// Send password reset link
export async function forgotPassword(email: string): Promise<any> {
  try {
    const res = await apiClient.post('/auth/forgot', { email })
    const data = res?.data
    if (data?.status === true) {
      return data
    }
    const error: any = new Error(data?.message ?? 'Unable to process request.')
    error.response = { data }
    throw error
  } catch (err) {
    throw err
  }
}

// Reset password using token + email
export async function resetPassword(payload: {
  token: string
  email: string
  password: string
  password_confirmation: string
}): Promise<any> {
  try {
    const res = await apiClient.post('/auth/reset', payload)
    const data = res?.data
    if (data?.status === true) {
      return data
    }
    const error: any = new Error(data?.message ?? 'Unable to reset password.')
    error.response = { data }
    throw error
  } catch (err) {
    throw err
  }
}