/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RADIX_NETWORK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
