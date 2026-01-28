/**
 * KandangManager.js
 * Handles Kandang CRUD
 */
class KandangManager {
    static init() {
        // Observers/Event Listeners if needed
    }

    static async renderTable() {
        const sb = window.supabaseClient;
        if (!sb) return;
        
        const { data: list, error } = await sb.from('kandang').select('*').order('id', { ascending: true });
        
        if (error) {
            console.error('Error fetching kandang:', error);
            return;
        }

        const tbody = document.getElementById('kandangTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        list.forEach((kp, index) => {
            const usagePercent = Math.round((kp.jumlah_puyuh / kp.kapasitas) * 100);
            const statusColor = usagePercent > 90 ? 'red' : (usagePercent > 50 ? 'green' : 'orange');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${kp.nama_kandang}</strong></td>
                <td>${kp.kapasitas}</td>
                <td>
                    ${kp.jumlah_puyuh} 
                    <small style="color:${statusColor}">(${usagePercent}%)</small>
                </td>
                <td><span style="padding: 2px 8px; border-radius: 10px; background: ${statusColor}; color: white; font-size: 0.75rem;">${usagePercent > 90 ? 'Penuh' : 'Aktif'}</span></td>
                <td>
                    <div class="action-btn-group">
                        <button class="btn btn-outline btn-sm" onclick="KandangManager.edit(${kp.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="KandangManager.delete(${kp.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    static openModal() {
        document.getElementById('kandangModal').classList.add('open');
        document.getElementById('kandangForm').reset();
        document.getElementById('k_id').value = '';
        document.getElementById('kandangModalTitle').innerText = 'Tambah Kandang';
    }

    static closeModal() {
        document.getElementById('kandangModal').classList.remove('open');
    }

    static async save() {
        console.log('KandangManager.save() called');
        const sb = window.supabaseClient;
        const id = document.getElementById('k_id').value;
        const name = document.getElementById('k_name').value;
        
        // Handle numbers: if empty, default to 0 for count
        let capacity = document.getElementById('k_capacity').value;
        let count = document.getElementById('k_count').value;

        if (!name || !capacity) {
            alert('Nama Kandang dan Kapasitas harus diisi.');
            return;
        }

        capacity = parseInt(capacity);
        count = count ? parseInt(count) : 0; // Default to 0 if empty

        const payload = {
            nama_kandang: name,
            kapasitas: capacity,
            jumlah_puyuh: count
        };

        let error;
        try {
            if (id) {
                // Update
                const { error: err } = await sb.from('kandang').update(payload).eq('id', id);
                error = err;
            } else {
                // Insert
                const { error: err } = await sb.from('kandang').insert(payload);
                error = err;
            }
        } catch (e) {
            console.error('Exception during save:', e);
            alert('Kesalahan aplikasi: ' + e.message);
            return;
        }

        if (error) {
            console.error('Supabase Save Error:', error);
            // Check for RLS error specifically
            if (error.code === '42501') {
                alert('Gagal menyimpan: Izin ditolak (RLS Policy). Mohon jalankan perintah SQL di Supabase.');
            } else {
                alert('Gagal menyimpan: ' + error.message);
            }
        } else {
            this.closeModal();
            this.renderTable();
            if (window.DashboardManager && typeof DashboardManager.renderStats === 'function') {
                DashboardManager.renderStats();
            }
            alert('Data Kandang berhasil disimpan!');
        }
    }

    static async edit(id) {
        const sb = window.supabaseClient;
        // Fetch specific item to ensure fresh data
        const { data, error } = await sb.from('kandang').select('*').eq('id', id).single();
        if (data) {
            document.getElementById('k_id').value = data.id;
            document.getElementById('k_name').value = data.nama_kandang;
            document.getElementById('k_capacity').value = data.kapasitas;
            document.getElementById('k_count').value = data.jumlah_puyuh;
            
            document.getElementById('kandangModalTitle').innerText = 'Edit Kandang';
            document.getElementById('kandangModal').classList.add('open');
        }
    }

    static async delete(id) {
        const sb = window.supabaseClient;
        if(confirm('Yakin ingin menghapus kandang ini?')) {
            const { error } = await sb.from('kandang').delete().eq('id', id);
            
            if (error) {
                alert('Gagal menghapus: ' + error.message);
            } else {
                this.renderTable();
                if (window.DashboardManager && typeof DashboardManager.renderStats === 'function') {
                    DashboardManager.renderStats();
                }
            }
        }
    }
}

window.KandangManager = KandangManager;
