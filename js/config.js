/**
 * config.js
 * Supabase Configuration
 * 
 * NOTE: Credentials are hardcoded for ease of use in XAMPP/Static environments.
 * Ensure Row Level Security (RLS) is enabled in Supabase to protect data.
 */

const SUPABASE_URL = "https://cusmwcirycfhxhlypbey.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1c213Y2lyeWNmaHhobHlwYmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODk2MDQsImV4cCI6MjA4MzE2NTYwNH0.td_j7IiHjUsn9eTti34g-iQ9PFnE4UhEHR7tMy1TE4s";

// Create client and attach to WINDOW
if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase Client Initialized (Static Mode)');
} else {
    console.error('❌ Supabase Library not loaded from CDN');
    alert('Gagal memuat library Supabase. Periksa koneksi internet Anda.');
}
