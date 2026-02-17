import { apiClient } from '../http'
import { setAuth, AuthUser, setUserSubscription } from './auth'

export interface ApiResponse<T = any> {
  status: boolean
  message?: string
  data?: T
}

export type LoginSuccess = { token: string; user: AuthUser }

export async function login(email: string, password: string, remember: boolean = true): Promise<LoginSuccess> {
  try {
    const res = await apiClient.post('/auth/login', { email, password, remember })
    const data = res?.data

    if (data?.status === true) {
      const loginData = data.data as { token: string; user: AuthUser }
      const token: string | undefined = loginData?.token
      const user: AuthUser | undefined = loginData?.user
      if (!token || !user) {
        // preserve server message shape in response for UI consumption
        const error: any = new Error('Login response missing token or user')
        error.response = { data }
        throw error
      }
      setAuth(token, user, remember)

      setUserSubscription({
        enrollment_type: user.enrollment_type as string | undefined,
        subscription_status: user.subscription_status as string | undefined,
        first_payment_date: user.first_payment_date as string | null | undefined,
        platform_fee_start_date: user.platform_fee_start_date as string | null | undefined,
        next_installment_date: user.next_installment_date as string | null | undefined,
        next_platform_fee_date: user.next_platform_fee_date as string | null | undefined,
        enrollment_completed_at: user.enrollment_completed_at as string | null | undefined,
        subscription_start_date: user.subscription_start_date as string | null | undefined,
        subscription_end_date: user.subscription_end_date as string | null | undefined,
        phase: user.phase as string | undefined,
        is_host: user.is_host as boolean | undefined
      })

      return { token, user }
    }

    // If API returned 200 with status=false, throw an error carrying server data
    const error: any = new Error((data as ApiResponse)?.message ?? 'Login failed')
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
    const error: any = new Error((data as ApiResponse)?.message ?? 'Unable to process request.')
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
    const error: any = new Error((data as ApiResponse)?.message ?? 'Unable to reset password.')
    error.response = { data }
    throw error
  } catch (err) {
    throw err
  }
}

// Get fresh user details
export async function getUserDetails(): Promise<any> {
    try {
        const res = await apiClient.get('/common/user-details')
        const data = res?.data
        if (data?.status === true) {
            return data
        }
        return null
    } catch (err) {
        return null
    }
}
