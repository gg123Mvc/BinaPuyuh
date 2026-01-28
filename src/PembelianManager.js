/**
 * PembelianManager.js
 * Handles Pembelian CRUD
 */
class PembelianManager {
    static init() {
         const dateInput = document.getElementById('p_date');
         if (dateInput) dateInput.valueAsDate = new Date(); // Default today
    }

    static async renderTable() {
        const sb = window.supabaseClient;
        if (!sb) return;

        const { data: list, error } = await sb.from('pembelian').select('*').order('tanggal', { ascending: false });
        
        if (error) {
            console.warn('Pembelian error:', error);
            return;
        }

        const tbody = document.getElementById('purchaseTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        list.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.tanggal}</td>
                <td>${p.nama_barang}</td>
                <td><span style="font-size:0.8rem; padding:2px 6px; background:#eee; border-radius:4px;">${p.kategori}</span></td>
                <td>${p.jumlah} ${p.satuan || ''}</td>
                <td>${formatCurrency(p.harga_total)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="PembelianManager.delete(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    static async save() {
        console.log('PembelianManager.save() called');
        const sb = window.supabaseClient;
        const item = document.getElementById('p_item').value;
        // Force lowercase to match DB check constraint
        const category = document.getElementById('p_category').value.toLowerCase(); 
        const qty = parseInt(document.getElementById('p_qty').value);
        const price = parseInt(document.getElementById('p_price').value);
        const date = document.getElementById('p_date').value;

        if (!item || !date || isNaN(qty) || isNaN(price)) {
            alert('Mohon lengkapi data pembelian.');
            return;
        }

        const total = qty * price;

        const payload = {
            nama_barang: item,
            kategori: category,
            jumlah: qty,
            satuan: 'pcs', // Default or add input for it
            harga_total: total,
            tanggal: date
        };

        console.log('Inserting Pembelian:', payload);
        const { error } = await sb.from('pembelian').insert(payload);

        if (error) {
            console.error('Supabase Pembelian Error:', error);
            alert('Gagal menyimpan: ' + error.message);
        } else {
            this.renderTable();
            if(window.DashboardManager && typeof DashboardManager.renderStats === 'function') {
                DashboardManager.renderStats();
            }
            document.getElementById('purchaseForm').reset();
            document.getElementById('p_date').valueAsDate = new Date();
            alert('Transaksi berhasil disimpan!');
        }
    }

    static async delete(id) {
        const sb = window.supabaseClient;
        if(confirm('Hapus riwayat transaksi ini?')) {
            const { error } = await sb.from('pembelian').delete().eq('id', id);
            if (error) {
                alert('Gagal menghapus: ' + error.message);
            } else {
                this.renderTable();
                if(window.DashboardManager && typeof DashboardManager.renderStats === 'function') {
                    DashboardManager.renderStats();
                }
            }
        }
    }
}

window.PembelianManager = PembelianManager;
