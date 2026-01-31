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
    const hostname = window.location.hostname;
    const isLocal = 
        hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') ||
        window.location.protocol === 'file:';
    
    console.error('CRITICAL: Supabase Configuration Missing.');
    
    if (isLocal) {
        alert('ERROR: Konfigurasi Database tidak ditemukan!\n\nPenyebab: Browser tidak membaca file .env secara langsung (mode Static/XAMPP/File).\n\nSOLUSI:\n1. Buka Terminal\n2. Ketik "npm run dev"\n3. Buka link localhost yang muncul.');
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
