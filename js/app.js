/**
 * app.js
 * Core utilities and Supabase Manager for Quail Farm Management System
 */

const APP_KEY = 'PUYUH_MANAGEMENT_DATA'; 

// Helper to access the client
function getSupabase() {
    return window.supabaseClient;
}

class SupabaseManager {
    static async getData() {
        const sb = getSupabase();
        if (!sb) return { kandangs: [], stats: {} };
        
        // Fetch all needed data in parallel for dashboard stats
        const [kandangRes, puyuhRes, telurRes] = await Promise.all([
            sb.from('kandang').select('*'),
            sb.from('riwayat_populasi').select('*'), 
            sb.from('produksi_telur').select('*') 
        ]);

        return {
            kandangs: kandangRes.data || [],
            // ... process other data
        };
    }

    // Wrap specific table operations
    static from(table) {
        const sb = getSupabase();
        if (!sb) {
            console.error('Supabase client not ready');
            return { select: () => ({ data: [], error: 'Supabase not ready' }) }; // Dummy
        }
        return sb.from(table);
    }
}

class Auth {
    static async register(email, password, fullName) {
        const sb = getSupabase();
        if (!sb) throw new Error('Supabase not connected');
        try {
            // 1. Sign Up with Supabase Auth
            const { data, error } = await sb.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { full_name: fullName } // Metadata
                }
            });

            if (error) throw error;

            if (data.user) {
                // 2. Create Admin Profile in public.admins table
                const { error: dbError } = await sb.from('admins').insert({
                    id: data.user.id,
                    email: email,
                    full_name: fullName
                });

                if (dbError) {
                    console.error('DB Insert Error:', dbError);
                }

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
        const sb = getSupabase();
        if (!sb) throw new Error('Supabase not connected');
        try {
            const { data, error } = await sb.auth.signInWithPassword({
                email: username, 
                password: password
            });

            if (error) throw error;

            sessionStorage.setItem('IS_LOGGED_IN', 'true');
            sessionStorage.setItem('USER_DATA', JSON.stringify(data.user));
            return true;
        } catch (e) {
            // Fallback for "dummy" admin
            if (username === 'admin@example.com' && password === 'admin') {
                sessionStorage.setItem('IS_LOGGED_IN', 'true');
                return true;
            }
            return false;
        }
    }

    static async logout() {
        const sb = getSupabase();
        if (sb) await sb.auth.signOut();
        sessionStorage.removeItem('IS_LOGGED_IN');
        window.location.href = 'index.html';
    }

    static async check() {
        // If dummy login, just pass
        if (sessionStorage.getItem('IS_LOGGED_IN')) return;

        const sb = getSupabase();
        if (sb) {
            const { data } = await sb.auth.getSession();
            if (!data.session) {
                window.location.href = 'login.html';
            }
        } else {
             window.location.href = 'login.html';
        }
    }
}

// Helpers
const formatCurrency = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);
};

// EXPORT TO WINDOW
window.Auth = Auth;
window.SupabaseManager = SupabaseManager;
