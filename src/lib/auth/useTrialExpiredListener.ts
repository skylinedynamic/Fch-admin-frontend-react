import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { clearAuth } from './auth'
import { useAuthStore } from '../../store/auth'
import { getEcho, userChannelName } from '../realtime/echo'
import { ENTITY_TYPE_BORROWER } from '../../config/appConfig'

const TRIAL_EXPIRED_EVENT = '.trial.expired'

/**
 * Logs the user out as soon as the backend broadcasts that their free trial
 * (partner) / free plan (borrower) expired. Listens on the shared Reverb
 * connection and removes only its own listener on unmount.
 */
export function useTrialExpiredListener(): void {
  const token = useAuthStore((state) => state.token)
  const userId = useAuthStore((state) => state.user?.id)
  const entityType = useAuthStore((state) => state.user?.entity_type)

  useEffect(() => {
    const echo = token && userId ? getEcho() : null
    if (!echo || !userId) return

    const channel = echo.private(userChannelName(userId))
    const handleExpired = () => {
      clearAuth()
      const message = entityType === ENTITY_TYPE_BORROWER
        ? 'Your free plan has expired. You have been logged out.'
        : 'Your free trial has expired. You have been logged out.'
      toast.error(message, { toastId: 'reverb-trial-expired' })
      window.location.assign('/login')
    }

    channel.listen(TRIAL_EXPIRED_EVENT, handleExpired)

    return () => {
      channel.stopListening(TRIAL_EXPIRED_EVENT, handleExpired)
    }
  }, [token, userId, entityType])
}
