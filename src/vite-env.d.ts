/// <reference types="vite/client" />

// Optional: strongly type your custom env vars
declare module '*/TableLoader';
declare module '*/FormLoader';
declare module '*/DeleteConfirmationModal';
declare module '*/ConfirmationModal';
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}