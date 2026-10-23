import { demoPhoneAuth, type PhoneAuth } from './auth';
import { createSupabasePhoneAuth } from './supabaseAuth';

// Read at bundle time from .env.local (or EAS environment variables). See .env.example.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Real texts through Supabase once its URL and key are set; otherwise the demo, which sends nothing. */
export const phoneAuth: PhoneAuth = url && key ? createSupabasePhoneAuth(url, key) : demoPhoneAuth;
