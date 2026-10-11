/// <reference types="vite/client" />

// Optional: strongly type your custom env vars
declare module '*/TableLoader';
declare module '*/FormLoader';
declare module '*/DeleteConfirmationModal';
declare module '*/ConfirmationModal';
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  // Laravel Reverb (real-time notifications); leave the key empty to disable.
  readonly VITE_REVERB_APP_KEY?: string
  readonly VITE_REVERB_HOST?: string
  readonly VITE_REVERB_PORT?: string
  readonly VITE_REVERB_SCHEME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}