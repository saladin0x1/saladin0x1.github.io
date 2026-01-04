/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_TOKEN: string;
  readonly VITE_LASTFM_API_KEY: string;
  readonly VITE_LASTFM_USER: string;
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
