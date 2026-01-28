/**
 * config.js
 * Supabase Configuration
 */

const SUPABASE_URL = "https://cusmwcirycfhxhlypbey.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1c213Y2lyeWNmaHhobHlwYmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODk2MDQsImV4cCI6MjA4MzE2NTYwNH0.td_j7IiHjUsn9eTti34g-iQ9PFnE4UhEHR7tMy1TE4s";

// Create client and attach to WINDOW to ensure app.js can see it
// We use 'supabaseClient' to avoid conflict with the 'supabase' library object
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Supabase Client Initialized and attached to window.supabaseClient');
