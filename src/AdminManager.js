/**
 * AdminManager.js
 * Handles approval of new admins
 */
class AdminManager {
    static async renderTable(manual = false) {
        const sb = window.supabaseClient;
        if (!sb) return;

        const tbody = document.getElementById('adminTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Sedang memuat data...</td></tr>';

        // Fetch all admins
        const { data: list, error } = await sb
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (manual) {
             if (error) alert('Error: ' + error.message);
             else if (!list || list.length === 0) alert('Data kosong (0 rows found).');
             else alert(`Berhasil memuat ${list.length} data admin.`);
        }

        if (error) {
            console.error(error);
            tbody.innerHTML = `<tr><td colspan="5" style="color:red">Error: ${error.message}</td></tr>`;
            return;
        }

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Belum ada data admin.</td></tr>';
            return;
        }
        
        // alert(`DEBUG: Fetched ${list.length} admins.`); // Uncomment if needed to verify success

        tbody.innerHTML = '';

        list.forEach(item => {
            const tr = document.createElement('tr');
            
            // Badge color
            let badgeStyle = 'background-color: #eee; color: #333;';
            if (item.role === 'admin') badgeStyle = 'background-color: #d1fae5; color: #065f46;';
            else if (item.role === 'pending') badgeStyle = 'background-color: #fef3c7; color: #92400e;';

            // Actions
            let actions = '';
            if (item.role === 'pending') {
                actions = `
                    <button class="btn btn-primary btn-sm" onclick="AdminManager.approve('${item.id}')" title="Setujui"><i class="fas fa-check"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="AdminManager.reject('${item.id}')" title="Tolak/Hapus"><i class="fas fa-times"></i></button>
                `;
            } else {
                actions = `<span style="color:gray; font-size:0.8rem;"><i>Disetujui</i></span>`;
            }

            const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : '-';

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>${item.full_name || '-'}</td>
                <td>${item.email}</td>
                <td><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; ${badgeStyle}">${item.role.toUpperCase()}</span></td>
                <td>${actions}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    static async approve(id) {
        if (!confirm('Setujui user ini sebagai Admin?')) return;
        
        const sb = window.supabaseClient;
        const { error } = await sb.from('admins').update({ role: 'admin' }).eq('id', id);
        
        if (error) {
            alert('Gagal update: ' + error.message);
        } else {
            alert('User berhasil disetujui!');
            this.renderTable();
        }
    }

    static async reject(id) {
        if (!confirm('Tolak dan Hapus user ini?')) return;

        const sb = window.supabaseClient;
        // Delete from public.admins (Effectively removing access)
        const { error } = await sb.from('admins').delete().eq('id', id);

        if (error) {
            alert('Gagal menghapus: ' + error.message);
        } else {
            alert('User ditolak/dihapus.');
            this.renderTable();
        }
    }
}

window.AdminManager = AdminManager;
