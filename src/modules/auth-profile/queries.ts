import { useMutation } from '@tanstack/react-query'
import { updatePassword } from './services'
import type { UpdatePasswordData } from './types'

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
