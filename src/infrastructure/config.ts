// Environment configuration
export type Environment = 'development' | 'staging' | 'production';

export const config = {
  env: (import.meta.env.MODE || 'development') as Environment,
  /** When set, used for nearby / For You when logged out (no profile city). Optional. */
  defaultGuestCity: (import.meta.env.VITE_DEFAULT_GUEST_CITY as string | undefined)?.trim() || undefined,
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID as string,
    /** Legacy anon JWT (starts with eyJ). Edge Functions gateway may return 401 Invalid JWT when using sb_publishable_* only. */
    get usesLegacyJwtAnonKey() {
      const k = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
      return typeof k === 'string' && k.startsWith('eyJ');
    },
  },
  get isDev() { return this.env === 'development'; },
  get isProd() { return this.env === 'production'; },
  get functionsUrl() {
    return `${this.supabase.url}/functions/v1`;
  },
} as const;

// One-time dev warning if using localhost with hosted Supabase
if (typeof window !== 'undefined' && config.isDev) {
  const url = config.supabase.url || '';
  if ((url.includes('localhost') || url.includes('127.0.0.1')) && !(window as { __authLocalhostWarned?: boolean }).__authLocalhostWarned) {
    console.warn(
      '[Auth] VITE_SUPABASE_URL points to localhost. If auth fails, check .env — use your project URL (https://xxx.supabase.co) when using hosted Supabase.',
    );
    (window as { __authLocalhostWarned?: boolean }).__authLocalhostWarned = true;
  }
  // sb_publishable_* keys: Edge JWT verification is controlled per function in supabase/config.toml (verify_jwt).
  // This repo sets verify_jwt = false where the gateway can't validate publishable keys; no runtime warning needed.
}
