// Centralized configuration with reliable fallbacks for cloud deployment (e.g. Vercel)
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://wkkldshtmroixtcxrtog.supabase.co'

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indra2xkc2h0bXJvaXh0Y3hydG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5Nzg1NDIsImV4cCI6MjEwOTU1NDU0Mn0.hFR4C9qWOTSst3I5pkAzxtKDVrcgaiqaF0AHGbOTzS4'

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
