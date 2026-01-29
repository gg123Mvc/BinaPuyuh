/**
 * PopulasiManager.js
 * Handles Riwayat Populasi (Mati, Jual, Afkir)
 * Automatically updates Kandang count
 */
class PopulasiManager {
    static async renderTable() {
        const sb = window.supabaseClient;
        if (!sb) return;

        const tbody = document.getElementById('populasiTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Sedang memuat data...</td></tr>';

        // 1. Fetch Populasi Data
        const { data: list, error } = await sb
            .from('riwayat_populasi')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            tbody.innerHTML = `<tr><td colspan="6" style="color:red">Error: ${error.message}</td></tr>`;
            return;
        }

        // Store for export
        this.data = list;

        // 2. Fetch Kandang Map
        const { data: kandangs } = await sb.from('kandang').select('id, nama_kandang');
        const kandangMap = {};
        if (kandangs) {
            kandangs.forEach(k => kandangMap[k.id] = k.nama_kandang);
        }

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Belum ada data riwayat populasi.</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        list.forEach(item => {
            const tr = document.createElement('tr');
            
            // Badge for Type
            let color = 'gray';
            if (item.jenis_perubahan === 'Mati') color = 'red';
            else if (item.jenis_perubahan === 'Jual') color = 'green';
            else if (item.jenis_perubahan === 'Afkir') color = 'orange';

            const kandangName = kandangMap[item.kandang_id] || 'ID: ' + item.kandang_id;
            const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-';
            
            // Enrich for export
            item.nama_kandang = kandangName;

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td><strong>${kandangName}</strong></td>
                <td><span style="color:${color}; font-weight:bold">${item.jenis_perubahan}</span></td>
                <td>${item.jumlah} Ekor</td>
                <td>${item.keterangan || '-'}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="PopulasiManager.delete(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    static exportData() {
        if (!this.data) return alert('Data belum dimuat.');
        const headers = ['created_at', 'nama_kandang', 'jenis_perubahan', 'jumlah', 'keterangan'];
        ExportManager.toCSV('Laporan_Populasi', headers, this.data);
    }

    static async save() {
        const sb = window.supabaseClient;
        const kandangId = document.getElementById('pop_kandang').value;
        const type = document.getElementById('pop_type').value;
        const count = parseInt(document.getElementById('pop_count').value);
        const note = document.getElementById('pop_note').value;
        const date = document.getElementById('pop_date').value;

        if (!kandangId || !type || !count || !date) {
            alert('Mohon lengkapi data.');
            return;
        }

        // 1. Insert Record
        const payload = {
            kandang_id: kandangId,
            jenis_perubahan: type, // Mati, Jual, Afkir, Masuk
            jumlah: count,
            keterangan: note,
            created_at: date, // Using created_at as the 'Tanggal'
            user_input: Auth.getCurrentName() // Using user_input instead of created_by
        };

        const { error: insertError } = await sb.from('riwayat_populasi').insert(payload);
        if (insertError) {
            alert('Gagal menyimpan riwayat: ' + insertError.message);
            return;
        }

        // 2. Update Kandang Count
        // Check current count first
        const { data: currentKandang } = await sb.from('kandang').select('jumlah_puyuh').eq('id', kandangId).single();
        
        if (currentKandang) {
            let newCount = currentKandang.jumlah_puyuh;
            if (type === 'Masuk') {
                newCount += count;
            } else {
                // Mati, Jual, Afkir -> Reduce
                newCount -= count;
            }

            if (newCount < 0) newCount = 0;

            const { error: updateError } = await sb.from('kandang')
                .update({ jumlah_puyuh: newCount })
                .eq('id', kandangId);
            
            if (updateError) {
                alert('Riwayat tersimpan, tapi gagal update jumlah di kandang: ' + updateError.message);
            } else {
                alert('Data tersimpan dan jumlah populasi kandang diperbarui.');
            }
        } else {
            alert('Ryawat tersimpan, tapi data kandang tidak ditemukan untuk update jumlah.');
        }

        this.closeModal();
        this.renderTable();
        // Refresh Kandang table if visible/init
        if (window.KandangManager) KandangManager.renderTable();
        if (window.DashboardManager) DashboardManager.renderStats();

        // Phase 2: Log to kandang_logs
        if (window.KandangDetailManager) {
            let activityType = 'POPULASI_LAINNYA';
            if (type === 'Masuk') activityType = 'POPULASI_MASUK';
            else if (type === 'Mati') activityType = 'KEMATIAN';
            else if (type === 'Jual') activityType = 'JUAL';
            else if (type === 'Afkir') activityType = 'AFKIR';

            KandangDetailManager.addActivity({
                kandang_id: kandangId,
                activity_type: activityType,
                quantity: count,
                unit: 'EKOR',
                notes: `(Riwayat Populasi) ${note || ''}`
            });
        }
    }

    static async loadKandangOptions() {
        const sb = window.supabaseClient;
        const { data } = await sb.from('kandang').select('id, nama_kandang');
        if (data) {
            const select = document.getElementById('pop_kandang');
            select.innerHTML = '<option value="">-- Pilih Kandang --</option>';
            data.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k.id;
                opt.innerText = k.nama_kandang;
                select.appendChild(opt);
            });
        }
    }

    static openModal() {
        this.loadKandangOptions();
        document.getElementById('populasiForm').reset();
        document.getElementById('pop_date').valueAsDate = new Date();
        document.getElementById('populasiModal').classList.add('open');
    }

    static closeModal() {
        document.getElementById('populasiModal').classList.remove('open');
    }

    static async delete(id) {
        // Warning: Deleting history won't automatically revert the population count 
        // because we don't know the exact state back then easily without more complex logic.
        // For now, just delete the log.
        if (confirm('Hapus riwayat ini? (Jumlah puyuh di kandang TIDAK akan berubah otomatis)')) {
            const { error } = await window.supabaseClient.from('riwayat_populasi').delete().eq('id', id);
            if (!error) this.renderTable();
        }
    }
}

window.PopulasiManager = PopulasiManager;
