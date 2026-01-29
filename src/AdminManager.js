/**
 * AdminManager.js
 * Handles approval of new admins
 */
class AdminManager {
    static async renderTable(manual = false) {
        const sb = window.supabaseClient;
        if (!sb) {
            console.error('AdminManager: Supabase client not found');
            return;
        }

        const tbody = document.getElementById('adminTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Sedang memuat data...</td></tr>';

        // Fetch all admins
        const { data: list, error } = await sb
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });
        
        console.log('AdminManager: Data fetched', list, 'Error:', error);

        if (manual) {
             if (error) alert('Error fetching admins: ' + error.message);
             else if (!list || list.length === 0) alert('Data kosong (0 rows found). Cek RLS policies di Supabase.');
             else alert(`Berhasil memuat ${list.length} data admin.`);
        }

        if (error) {
            console.error('AdminManager Error:', error);
            tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center">
                Error: ${error.message}<br>
                <small>Hint: Check Table Permissions (RLS)</small>
            </td></tr>`;
            return;
        }

        if (!list || list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #666;">
                Belum ada data admin.<br>
                <small>Jika Anda yakin ada data, cek RLS Policies di Supabase.</small>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = '';

        list.forEach(item => {
            try {
                const tr = document.createElement('tr');
                
                // Badge color
                let badgeStyle = 'background-color: #eee; color: #333;';
                if (item.role === 'admin') badgeStyle = 'background-color: #d1fae5; color: #065f46;';
                else if (item.role === 'pending') badgeStyle = 'background-color: #fef3c7; color: #92400e;';

                // Actions
                let actions = '';
                if (item.role === 'pending') {
                    // Use explicit text buttons for clarity
                    actions = `
                        <div class="action-btn-group">
                            <button class="btn btn-success btn-sm" onclick="AdminManager.approve('${item.id}', '${item.email}')">
                                <i class="fas fa-check"></i> Konfirmasi
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="AdminManager.reject('${item.id}')">
                                <i class="fas fa-times"></i> Tolak
                            </button>
                        </div>
                    `;
                } else {
                    // Approved admins
                    actions = `
                        <div style="display:flex; align-items:center; gap: 10px;">
                            <span style="color:green; font-size:0.8rem; font-weight:600;">
                                <i class="fas fa-check-circle"></i> Disetujui
                            </span>
                            <button class="btn btn-outline btn-sm" style="border-color:red; color:red;" onclick="AdminManager.reject('${item.id}')" title="Hapus Akses">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }

                const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : '-';
                const fullName = item.full_name || '-'; // Handle null name
                const email = item.email || '-';
                const role = item.role ? item.role.toUpperCase() : 'UNKNOWN';

                tr.innerHTML = `
                    <td>${dateStr}</td>
                    <td>${fullName}</td>
                    <td>${email}</td>
                    <td><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; ${badgeStyle}">${role}</span></td>
                    <td>${actions}</td>
                `;
                tbody.appendChild(tr);
            } catch (renderErr) {
                console.error('Error rendering admin row:', renderErr, item);
            }
        });
    }

    static async approve(id, email) {
        const confirmed = await window.Modal.confirm(
            `Sistem akan mengirimkan email OTP otomatis ke:\n${email}`,
            'Setujui Admin Ini?',
            'primary',
            'Ya, Setujui & Kirim'
        );
        
        if (!confirmed) return;
        
        const sb = window.supabaseClient;
        
        // 1. Update Role locally
        const { error } = await sb.from('admins').update({ role: 'admin' }).eq('id', id);
        
        if (error) {
            await window.Modal.alert('Gagal update: ' + error.message, 'Error', 'error');
            return;
        }

        // 2. Send Magic Link / OTP
        // Note: This relies on Supabase Email Provider being enabled
        // Use a non-blocking toast or just wait? Let's show a loading alert or just proceed.
        // Since we don't have a toast system, we'll just await the result.
        
        const { error: otpError } = await sb.auth.signInWithOtp({ 
            email: email,
            options: {
                shouldCreateUser: false // User must exist
            }
        });

        if (otpError) {
            console.error(otpError);
            if (otpError.message.includes('rate limit')) {
                await window.Modal.alert(
                    'GAGAL Mengirim Email: Batas pengiriman email terlampaui (Rate Limit).\n\nSupabase membatasi jumlah email ke alamat yang sama dalam waktu singkat.\n\nSolusi:\n1. Tunggu beberapa saat (biasanya 1 jam).\n2. Atau gunakan EMAIL LAIN untuk testing.',
                    'Rate Limit Exceeded',
                    'error'
                );
            } else {
                await window.Modal.alert(
                    'User berhasil disetujui, TAPI GAGAL mengirim email OTP: ' + otpError.message,
                    'Warning',
                    'warning'
                );
            }
        } else {
            await window.Modal.alert('User disetujui dan email OTP telah dikirim.', 'Sukses', 'success');
        }
        
        this.renderTable();
    }

    static async reject(id) {
        const confirmed = await window.Modal.confirm(
            'Yakin ingin MENGHAPUS akses admin ini?\nUser tidak akan bisa login lagi.',
            'Hapus Akses Admin?',
            'danger',
            'Ya, Hapus'
        );

        if (!confirmed) return;

        const sb = window.supabaseClient;
        // Delete from public.admins (Effectively removing access)
        const { error } = await sb.from('admins').delete().eq('id', id);

        if (error) {
            await window.Modal.alert('Gagal menghapus: ' + error.message, 'Error', 'error');
        } else {
            await window.Modal.alert('Akses admin berhasil dihapus.', 'Terhapus', 'success');
            this.renderTable();
        }
    }
}

window.AdminManager = AdminManager;
