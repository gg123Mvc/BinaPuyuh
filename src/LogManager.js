/**
 * LogManager.js
 * Handles Activity/Audit Logs
 * (Siapa ngapain, kapan)
 */
class LogManager {
    static async log(action, details = '') {
        const sb = window.supabaseClient;
        const user = Auth.getUser(); // Get local session data
        const email = user ? user.email : 'system/anon';

        // Fire and forget (don't await strictly unless debugging)
        // We catch error silently to not block the main action
        sb.from('activity_logs').insert({
            user_email: email,
            action: action,
            details: details,
            ip_address: 'browser-client' // Client side cannot reliably get true IP without edge function
        }).then(({ error }) => {
            if (error) console.error('Log failed:', error);
        });
    }

    static async renderTable() {
        const sb = window.supabaseClient;
        const tbody = document.getElementById('logTableBody');
        if(!tbody) return;

        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Memuat log...</td></tr>';

        const { data, error } = await sb
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Limit last 50

        if (error) {
            tbody.innerHTML = `<tr><td colspan="4" style="color:red">Error: ${error.message}</td></tr>`;
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada aktivitas.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(log => {
             const tr = document.createElement('tr');
             tr.innerHTML = `
                <td>${new Date(log.created_at).toLocaleString('id-ID')}</td>
                <td>${log.user_email}</td>
                <td><strong>${log.action}</strong></td>
                <td style="font-size: 0.9em; color: gray;">${log.details}</td>
             `;
             tbody.appendChild(tr);
        });
    }
}

window.LogManager = LogManager;
