import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { apiClient } from '../http/apiClient'
import { getAuthState } from '../../store/auth'

/**
 * The app's single WebSocket connection to Laravel Reverb (Pusher protocol).
 *
 * Everything real-time goes through getEcho() so a tab only ever holds one
 * socket. Features subscribe to channels on it and remove their own listeners
 * on unmount (stopListening), never leave()/disconnect() - other features may
 * be listening on the same channel. The connection is replaced when the
 * signed-in token changes and closed by disconnectEcho() on logout.
 */

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

// laravel-echo looks the Pusher client up on window.
if (typeof window !== 'undefined') {
  window.Pusher = Pusher
}

type ReverbEcho = Echo<'reverb'>

let instance: ReverbEcho | null = null
let instanceToken: string | null = null

/** The per-user private channel the backend authorizes in routes/channels.php. */
export const userChannelName = (userId: number | string): string => `App.Models.User.${userId}`

export function getEcho(): ReverbEcho | null {
  const { token } = getAuthState()
  const key = import.meta.env.VITE_REVERB_APP_KEY

  if (!token || !key) {
    return null
  }

  if (instance && instanceToken === token) {
    return instance
  }

  disconnectEcho()

  const port = Number(import.meta.env.VITE_REVERB_PORT) || 443

  instance = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: port,
    wssPort: port,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    // Private-channel auth goes through the shared apiClient, so it carries the
    // current Bearer token and the app's usual 401 handling.
    authorizer: (channel: { name: string }) => ({
      authorize: (socketId: string, callback: (error: Error | null, data: any) => void) => {
        apiClient
          .post('/broadcasting/auth', { socket_id: socketId, channel_name: channel.name }, { _skipToast: true } as any)
          .then((response) => callback(null, response.data))
          .catch((error) => callback(error instanceof Error ? error : new Error(String(error)), null))
      },
    }),
  }) as ReverbEcho
  instanceToken = token

  return instance
}

export function disconnectEcho(): void {
  instance?.disconnect()
  instance = null
  instanceToken = null
}
