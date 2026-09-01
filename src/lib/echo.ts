import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from './auth/auth';

// Assign Pusher to window so Laravel Echo can use it
window.Pusher = Pusher;

export const initEcho = () => {
  const token = getToken();

  if (!token) {
    return null;
  }

  const appKey = import.meta.env.VITE_REVERB_APP_KEY;

  if (!appKey) {
    console.warn(
      'VITE_REVERB_APP_KEY is not set — skipping Echo/Pusher initialization. ' +
      'Live reminder updates will be unavailable; the app will still poll for due reminders.'
    );
    return null;
  }

  // Use environment variables for configuration.
  // Make sure you add these to your .env file in the React project!
  return new Echo({
    broadcaster: 'reverb',
    key: appKey,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${import.meta.env.VITE_API_URL}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};
