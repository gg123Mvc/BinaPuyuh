/**
 * CatatanTelurManager.js
 * Handles daily egg production recording
 */
class CatatanTelurManager {
    static async renderTable() {
        const sb = window.supabaseClient;
        if (!sb) return;
        
        const tbody = document.getElementById('catatanTelurTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Memuat data...</td></tr>';
        
        const { data: list, error } = await sb
            .from('catatan_telur')
            .select('*, kandang(nama_kandang)')
            .order('tanggal', { ascending: false });
        
        if (error) {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red">Error: ' + error.message + '</td></tr>';
            return;
        }
        
        this.data = list;
        
        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Belum ada catatan telur.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        list.forEach(item => {
            const tr = document.createElement('tr');
            const date = new Date(item.tanggal).toLocaleDateString('id-ID');
            const kandangName = item.kandang?.nama_kandang || 'ID: ' + item.kandang_id;
            
            let kualitasBadge = 'green';
            if (item.kualitas === 'Retak') kualitasBadge = 'orange';
            if (item.kualitas === 'Pecah') kualitasBadge = 'red';
            
            tr.innerHTML = `
                <td>${date}</td>
                <td><strong>${kandangName}</strong></td>
                <td>${item.jumlah} butir</td>
                <td><span style="padding: 2px 8px; border-radius: 10px; background: ${kualitasBadge}; color: white; font-size: 0.75rem;">${item.kualitas}</span></td>
                <td>${item.catatan || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="CatatanTelurManager.edit(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="CatatanTelurManager.delete(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    static exportData() {
        if (!this.data) return alert('Data belum dimuat.');
        const headers = ['tanggal', 'kandang', 'jumlah', 'kualitas', 'catatan'];
        const exportData = this.data.map(item => ({
            ...item,
            kandang: item.kandang?.nama_kandang || 'ID: ' + item.kandang_id
        }));
        ExportManager.toCSV('Laporan_Catatan_Telur', headers, exportData);
    }
    
    static async save() {
        const sb = window.supabaseClient;
        const id = document.getElementById('ct_id').value;
        const tanggal = document.getElementById('ct_tanggal').value;
        const kandangId = document.getElementById('ct_kandang').value;
        const jumlah = parseInt(document.getElementById('ct_jumlah').value);
        const kualitas = document.getElementById('ct_kualitas').value;
        const catatan = document.getElementById('ct_catatan').value;
        
        if (!tanggal || !kandangId || !jumlah) {
            alert('Harap lengkapi data: Tanggal, Kandang, dan Jumlah.');
            return;
        }
        
        const payload = {
            tanggal,
            kandang_id: kandangId,
            jumlah,
            kualitas,
            catatan,
            created_by: Auth.getCurrentName()
        };
        
        let error;
        if (id) {
            ({ error } = await sb.from('catatan_telur').update(payload).eq('id', id));
        } else {
            ({ error } = await sb.from('catatan_telur').insert(payload));
        }
        
        if (error) {
            alert('Error: ' + error.message);
        } else {
            this.closeModal();
            this.renderTable();
            
            // Update dashboard stats if available
            if (window.DashboardManager && typeof DashboardManager.renderStats === 'function') {
                DashboardManager.renderStats();
            }
            
            alert('✅ Catatan telur berhasil disimpan!');
        }
    }
    
    static async edit(id) {
        const sb = window.supabaseClient;
        const { data, error } = await sb.from('catatan_telur').select('*').eq('id', id).single();
        
        if (data) {
            document.getElementById('ct_id').value = data.id;
            document.getElementById('ct_tanggal').value = data.tanggal;
            document.getElementById('ct_kandang').value = data.kandang_id;
            document.getElementById('ct_jumlah').value = data.jumlah;
            document.getElementById('ct_kualitas').value = data.kualitas || 'Baik';
            document.getElementById('ct_catatan').value = data.catatan || '';
            
            document.getElementById('catatanTelurModalTitle').innerText = 'Edit Catatan Telur';
            document.getElementById('catatanTelurModal').classList.add('open');
        }
    }
    
    static async delete(id) {
        if (!confirm('Yakin ingin menghapus catatan ini?')) return;
        
        const sb = window.supabaseClient;
        const { error } = await sb.from('catatan_telur').delete().eq('id', id);
        
        if (error) {
            alert('Error: ' + error.message);
        } else {
            this.renderTable();
            alert('✅ Catatan telur berhasil dihapus!');
        }
    }
    
    static openModal() {
        document.getElementById('catatanTelurForm').reset();
        document.getElementById('ct_id').value = '';
        document.getElementById('ct_kualitas').value = 'Baik';
        setDateToToday('ct_tanggal');
        this.loadKandangOptions();
        document.getElementById('catatanTelurModalTitle').innerText = 'Tambah Catatan Telur';
        document.getElementById('catatanTelurModal').classList.add('open');
    }
    
    static closeModal() {
        document.getElementById('catatanTelurModal').classList.remove('open');
    }
    
    static async loadKandangOptions() {
        const sb = window.supabaseClient;
        const { data: kandangs } = await sb.from('kandang').select('id, nama_kandang').order('nama_kandang');
        
        const select = document.getElementById('ct_kandang');
        select.innerHTML = '<option value="">-- Pilih Kandang --</option>';
        
        if (kandangs) {
            kandangs.forEach(k => {
                const option = document.createElement('option');
                option.value = k.id;
                option.textContent = k.nama_kandang;
                select.appendChild(option);
            });
        }
    }
}

window.CatatanTelurManager = CatatanTelurManager;
