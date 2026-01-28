/**
 * PakanManager.js
 * Handles CRUD for 'pemberian_pakan' table
 */

class PakanManager {
    static async renderTable() {
        const sb = window.supabaseClient;
        if (!sb) return;

        // Join with Kandang to get name
        const { data: list, error } = await sb
            .from('pemberian_pakan')
            .select('*, kandang:kandang_id(nama_kandang)')
            .order('tanggal', { ascending: false });
        
        if (error) {
            console.error('Pakan Error:', error);
            return;
        }

        const tbody = document.getElementById('pakanTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        list.forEach(item => {
            const tr = document.createElement('tr');
            // Format timestamp to readable date
            const date = new Date(item.tanggal).toLocaleDateString('id-ID');
            const kandangName = item.kandang ? item.kandang.nama_kandang : 'Unknown';

            tr.innerHTML = `
                <td>${date}</td>
                <td>${kandangName}</td>
                <td>${item.jenis_pakan}</td>
                <td>${item.jumlah_pakan} Kg</td>
                <td>${item.catatan || '-'}</td>
                <td>
                     <button class="btn btn-danger btn-sm" onclick="PakanManager.delete(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    static async save() {
        const sb = window.supabaseClient;
        const kandangId = document.getElementById('pak_kandang').value;
        const type = document.getElementById('pak_type').value;
        const amount = parseFloat(document.getElementById('pak_amount').value);
        const note = document.getElementById('pak_note').value;
        
        const payload = {
            kandang_id: kandangId,
            jenis_pakan: type,
            jumlah_pakan: amount,
            catatan: note,
            tanggal: new Date().toISOString()
        };

        const { error } = await sb.from('pemberian_pakan').insert(payload);

        if (error) {
            alert('Error: ' + error.message);
        } else {
            document.getElementById('pakanForm').reset();
            this.renderTable();
            alert('Catatan Pakan tersimpan!');
        }
    }

    static async delete(id) {
        const confirm = await window.Confirm.show('Hapus catatan pakan ini?', 'Hapus Data');
        if (confirm) {
            const { error } = await window.supabaseClient.from('pemberian_pakan').delete().eq('id', id);
            if (!error) this.renderTable();
        }
    }

    static async loadKandangOptions() {
        const sb = window.supabaseClient;
        const { data } = await sb.from('kandang').select('id, nama_kandang');
        if (data) {
            const select = document.getElementById('pak_kandang');
            select.innerHTML = '<option value="">-- Pilih Kandang --</option>';
            data.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k.id;
                opt.innerText = k.nama_kandang;
                select.appendChild(opt);
            });
        }
    }
}

window.PakanManager = PakanManager;
