/// <reference types="vite/client" />

// Optional: strongly type your custom env vars
declare module '*/TableLoader';
declare module '*/FormLoader';
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}