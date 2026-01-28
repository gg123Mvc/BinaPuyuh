/**
 * PopulasiManager.js
 * Handles 'riwayat_populasi' and updates 'kandang' counts
 */

class PopulasiManager {
    static async renderTable() {
        const sb = window.supabaseClient;
        if (!sb) return;

        const { data: list, error } = await sb
            .from('riwayat_populasi')
            .select('*, kandang:kandang_id(nama_kandang)')
            .order('created_at', { ascending: false });
        
        if (error) return;

        const tbody = document.getElementById('populasiTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        list.forEach(item => {
            const tr = document.createElement('tr');
            const date = new Date(item.created_at).toLocaleDateString('id-ID');
            const kandangName = item.kandang ? item.kandang.nama_kandang : 'Unknown';
            
            let color = 'text-red-600';
            if (item.jenis_perubahan === 'penambahan') color = 'text-green-600';

            tr.innerHTML = `
                <td>${date}</td>
                <td>${kandangName}</td>
                <td style="font-weight:bold" class="${color}">${item.jenis_perubahan.toUpperCase()}</td>
                <td>${item.jumlah} Ekor</td>
                <td>${item.alasan || '-'}</td>
                <td>${item.keterangan || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    static async save() {
        const sb = window.supabaseClient;
        const kandangId = document.getElementById('pop_kandang').value;
        const type = document.getElementById('pop_type').value; // 'penambahan' or 'pengurangan'
        const count = parseInt(document.getElementById('pop_count').value);
        const reason = document.getElementById('pop_reason').value;
        const note = document.getElementById('pop_note').value;

        // 1. Record History
        const payload = {
            kandang_id: kandangId,
            jenis_perubahan: type,
            jumlah: count,
            alasan: reason,
            keterangan: note
        };

        const { error } = await sb.from('riwayat_populasi').insert(payload);
        if (error) {
            alert('Error: ' + error.message);
            return;
        }

        // 2. Update Kandang Count (Transactional-ish)
        // Retrieve current count first
        const { data: currentKandang } = await sb.from('kandang').select('jumlah_puyuh').eq('id', kandangId).single();
        if (currentKandang) {
            let newCount = currentKandang.jumlah_puyuh;
            if (type === 'penambahan') newCount += count;
            else newCount -= count;

            if (newCount < 0) newCount = 0;

            await sb.from('kandang').update({ jumlah_puyuh: newCount }).eq('id', kandangId);
        }

        document.getElementById('populasiForm').reset();
        this.renderTable();
        
        // Refresh dashboard stats or kandang table if visible
        if(window.DashboardManager) DashboardManager.renderStats();
        if(window.KandangManager) KandangManager.renderTable();

        alert('Populasi berhasil diperbarui!');
    }

    static async loadKandangOptions() {
        const sb = window.supabaseClient;
        const { data } = await sb.from('kandang').select('id, nama_kandang');
        if (data) {
            const select = document.getElementById('pop_kandang');
            select.innerHTML = '';
            data.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k.id;
                opt.innerText = k.nama_kandang;
                select.appendChild(opt);
            });
        }
    }
}

window.PopulasiManager = PopulasiManager;
