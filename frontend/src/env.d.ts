/// <reference types="vite/client" />

// Custom typings for Vite environment variables used in this project
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // add more env vars here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
