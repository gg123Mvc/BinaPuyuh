/**
 * config.js
 * Supabase Configuration
 */

let SUPABASE_URL, SUPABASE_KEY;

// 1. Try to load from Vite Environment Variables
try {
    // Check if running in Vite (import.meta.env exists)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
} catch (e) {
    console.warn('Vite Env not detected:', e);
}

// 2. Validation
if (!SUPABASE_URL || !SUPABASE_KEY) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    console.error('CRITICAL: Supabase Configuration Missing.');
    
    if (isLocal) {
        alert('ERROR: Konfigurasi Database tidak ditemukan!\n\nJika Anda menjalankan di XAMPP: Browser tidak bisa membaca file .env secara langsung.\nSolusi: Gunakan "npm run dev" di terminal.\n\nJika menggunakan Vite: Pastikan file .env ada dan berisi kredensial.');
    } else {
        alert('ERROR: Konfigurasi Supabase belum diatur di server hosting (Environment Variables).');
    }
} else {
    // 3. Initialize Client
    if (window.supabase) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase Client Connected via Vite');
    } else {
        console.error('❌ Supabase JS Library not loaded (CDN Issue)');
        alert('Gagal memuat library Supabase. Periksa koneksi internet Anda.');
    }
}
