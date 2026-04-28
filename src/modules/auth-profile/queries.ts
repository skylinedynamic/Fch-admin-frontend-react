import { useMutation } from '@tanstack/react-query'
import { updatePassword, updateProfile } from './services'
import type { UpdatePasswordData, UpdateProfileData } from './types'

export const queryKeys = {
    authProfile: {
        all: ['auth-profile'],
    },
}

export const useUpdatePassword = () => {
    return useMutation({
        mutationFn: (payload: UpdatePasswordData) => updatePassword(payload),
    })
}

export const useUpdateProfile = () => {
    return useMutation({
        mutationFn: (payload: UpdateProfileData) => updateProfile(payload),
    })
}
