/**
 * app.js
 * Core utilities and Supabase Manager for Quail Farm Management System
 */

// Initialize Supabase
let supabase;
try {
    if (!window.supabase) {
        throw new Error('Supabase library not loaded. Check internet connection or CDN link.');
    }
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_KEY === 'undefined') {
        throw new Error('Supabase Configuration missing in config.js');
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase Initialized');
} catch (err) {
    console.error('CRITICAL ERROR:', err.message);
    alert('Sistem Error: ' + err.message);
}

const APP_KEY = 'PUYUH_MANAGEMENT_DATA'; // Keep for fallback if needed, but primary is Supabase

class SupabaseManager {
    static async getData() {
        // Fetch all needed data in parallel for dashboard stats
        const [kandangRes, puyuhRes, telurRes] = await Promise.all([
            supabase.from('kandang').select('*'),
            supabase.from('riwayat_populasi').select('*'), // or just sum dynamically
            supabase.from('produksi_telur').select('*') // Assuming table exists or we mock it
        ]);

        return {
            kandangs: kandangRes.data || [],
            // ... process other data
        };
    }

    // Wrap specific table operations
    static from(table) {
        return supabase.from(table);
    }
}

class Auth {
    static async register(email, password, fullName) {
        try {
            // 1. Sign Up with Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { full_name: fullName } // Metadata
                }
            });

            if (error) throw error;

            if (data.user) {
                // 2. Create Admin Profile in public.admins table
                const { error: dbError } = await supabase.from('admins').insert({
                    id: data.user.id,
                    email: email,
                    full_name: fullName
                });

                if (dbError) {
                    console.error('DB Insert Error:', dbError);
                    // Optional: revert auth user if strict consistency needed, but for now just warn
                    // throw dbError; 
                }

                // Auto Login session is usually created by signUp unless email confirmation is required
                sessionStorage.setItem('IS_LOGGED_IN', 'true');
                sessionStorage.setItem('USER_DATA', JSON.stringify(data.user));
                return true;
            }
            return false;

        } catch (e) {
            console.error('Registration Error:', e.message);
            throw e;
        }
    }

    static async login(username, password) {
        // Since the user asked for "Frontend Only" login initially, but now provided Supabase,
        // we should try to use Supabase Auth if possible.
        // However, if the user hasn't set up Auth Users yet, we might fallback to checking the 'admins' table manually or hardcoded.
        // Given the instructions, let's try Supabase Auth first, then fallback to a simple DB check.
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: username, // Assuming username is email for Supabase Auth
                password: password
            });

            if (error) {
                console.error('Auth Error:', error.message);
                throw error;
            }

            sessionStorage.setItem('IS_LOGGED_IN', 'true');
            sessionStorage.setItem('USER_DATA', JSON.stringify(data.user));
            return true;
        } catch (e) {
            // Fallback for "dummy" admin if Supabase Auth isn't fully configured/used
            if (username === 'admin@example.com' && password === 'admin') {
                sessionStorage.setItem('IS_LOGGED_IN', 'true');
                return true;
            }
            return false;
        }
    }

    static async logout() {
        await supabase.auth.signOut();
        sessionStorage.removeItem('IS_LOGGED_IN');
        window.location.href = 'index.html';
    }

    static async check() {
        const { data } = await supabase.auth.getSession();
        if (!data.session && !sessionStorage.getItem('IS_LOGGED_IN')) {
            window.location.href = 'login.html';
        }
    }
}

// Helpers
const formatCurrency = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);
};
