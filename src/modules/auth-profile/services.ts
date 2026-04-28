import { apiClient } from '../../lib/http'
import { UpdatePasswordData, AuthProfileResponse, UpdateProfileData } from './types'

export async function updatePassword(data: UpdatePasswordData): Promise<AuthProfileResponse> {
    const response = await apiClient.post('/common/auth-profile/update-password', data)
    return response.data
}

export async function updateProfile(data: UpdateProfileData): Promise<AuthProfileResponse> {
    const response = await apiClient.post('/common/auth-profile/update-profile', data)
    return response.data
}
