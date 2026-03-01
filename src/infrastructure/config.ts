// Environment configuration
export type Environment = 'development' | 'staging' | 'production';

export const config = {
  env: (import.meta.env.MODE || 'development') as Environment,
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID as string,
  },
  get isDev() { return this.env === 'development'; },
  get isProd() { return this.env === 'production'; },
  get functionsUrl() {
    return `${this.supabase.url}/functions/v1`;
  },
} as const;
