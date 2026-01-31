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

        // Fetch latest hatch entry dates for each kandang
        const { data: hatchRecords, error: hatchError } = await sb
            .from('riwayat_populasi')
            .select('kandang_id, created_at, keterangan')
            .ilike('keterangan', '%Menetas dari Inkubator%')
            .order('created_at', { ascending: false });

        console.log('🥚 Hatch Records Found:', hatchRecords);

        // Map kandang to latest hatch date
        const hatchDateMap = {};
        if (hatchRecords && hatchRecords.length > 0) {
            hatchRecords.forEach(record => {
                if (!hatchDateMap[record.kandang_id]) {
                    hatchDateMap[record.kandang_id] = record.created_at;
                    console.log(`✅ Kandang ${record.kandang_id}: Hatch date = ${record.created_at}`);
                }
            });
        } else {
            console.warn('⚠️ No hatch records found. Make sure quails have entered kandang from incubator.');
        }

        const tbody = document.getElementById('kandangTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const now = new Date();

        list.forEach((kp, index) => {
            const usagePercent = Math.round((kp.jumlah_puyuh / kp.kapasitas) * 100);
            const statusColor = usagePercent > 90 ? 'red' : (usagePercent > 50 ? 'green' : 'orange');
            
            // Calculate egg production estimate
            let eggProductionInfo = '';
            if (hatchDateMap[kp.id]) {
                const hatchDate = new Date(hatchDateMap[kp.id]);
                const eggStartDate = new Date(hatchDate);
                eggStartDate.setDate(eggStartDate.getDate() + 40); // Min 40 days
                
                const daysUntilEggs = Math.ceil((eggStartDate - now) / (1000 * 60 * 60 * 24));
                
                console.log(`📊 Kandang ${kp.nama_kandang}: ${daysUntilEggs} days until eggs`);
                
                if (daysUntilEggs > 0) {
                    eggProductionInfo = `<br><small style="color: #FFA726;"><i class="fas fa-egg"></i> Estimasi bertelur: ${daysUntilEggs} hari lagi (${eggStartDate.toLocaleDateString('id-ID')})</small>`;
                } else {
                    eggProductionInfo = `<br><small style="color: #66BB6A;"><i class="fas fa-check-circle"></i> Sudah siap bertelur</small>`;
                }
            } else {
                console.log(`ℹ️ Kandang ${kp.nama_kandang}: No hatch data`);
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <strong>${kp.nama_kandang}</strong>${eggProductionInfo}
                </td>
                <td>${kp.kapasitas}</td>
                <td>
                    ${kp.jumlah_puyuh} 
                    <small style="color:${statusColor}">(${usagePercent}%)</small>
                </td>
                <td><span style="padding: 2px 8px; border-radius: 10px; background: ${statusColor}; color: white; font-size: 0.75rem;">${usagePercent > 90 ? 'Penuh' : 'Aktif'}</span></td>
                <td>
                    <div class="action-btn-group">
                        <button class="btn btn-primary btn-sm" onclick="KandangDetailManager.show(${kp.id})"><i class="fas fa-eye"></i> Detail</button>
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
        let tanggalMasuk = document.getElementById('k_tanggal_masuk').value || null;

        if (!name || !capacity) {
            alert('Nama Kandang dan Kapasitas harus diisi.');
            return;
        }

        capacity = parseInt(capacity);
        count = count ? parseInt(count) : 0; // Default to 0 if empty

        const payload = {
            nama_kandang: name,
            kapasitas: capacity,
            jumlah_puyuh: count,
            tanggal_masuk: tanggalMasuk,
            created_by: Auth.getCurrentName()
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
            document.getElementById('k_tanggal_masuk').value = data.tanggal_masuk || '';
            
            document.getElementById('kandangModalTitle').innerText = 'Edit Kandang';
            document.getElementById('kandangModal').classList.add('open');
        }
    }

    static async delete(id) {
        const sb = window.supabaseClient;
        
        // First check if there are related records
        const { data: relatedRecords } = await sb
            .from('riwayat_populasi')
            .select('id')
            .eq('kandang_id', id)
            .limit(1);
        
        if (relatedRecords && relatedRecords.length > 0) {
            const proceed = confirm(
                '⚠️ Kandang ini memiliki riwayat populasi yang tercatat.\n\n' +
                'Untuk menghapus kandang, Anda harus:\n' +
                '1. Hapus semua riwayat populasi di kandang ini terlebih dahulu, ATAU\n' +
                '2. Edit tabel riwayat_populasi di Supabase untuk mengubah foreign key menjadi ON DELETE CASCADE\n\n' +
                'Apakah Anda ingin melihat Detail Kandang untuk meninjau riwayatnya?'
            );
            
            if (proceed) {
                KandangDetailManager.show(id);
            }
            return;
        }
        
        // If no related records, proceed with normal deletion
        if(confirm('Yakin ingin menghapus kandang ini?')) {
            const { error } = await sb.from('kandang').delete().eq('id', id);
            
            if (error) {
                if (error.code === '23503') { // Foreign key violation
                    alert(
                        '❌ Tidak dapat menghapus kandang.\n\n' +
                        'Kandang ini masih terhubung dengan data lain (riwayat populasi, logs, dll).\n' +
                        'Silakan hapus data terkait terlebih dahulu atau hubungi administrator.'
                    );
                } else {
                    alert('Gagal menghapus: ' + error.message);
                }
            } else {
                this.renderTable();
                if (window.DashboardManager && typeof DashboardManager.renderStats === 'function') {
                    DashboardManager.renderStats();
                }
                alert('✅ Kandang berhasil dihapus!');
            }
        }
    }
}

window.KandangManager = KandangManager;
