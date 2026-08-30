import { useMutation } from '@tanstack/react-query'
import { updatePassword, updateProfile, updateProfilePicture } from './services'
import type { UpdatePasswordData, UpdateProfileData, UpdateProfilePictureData } from './types'

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

export const useUpdateProfilePicture = () => {
    return useMutation({
        mutationFn: (payload: { image: string }) => updateProfilePicture(payload),
    })
}
