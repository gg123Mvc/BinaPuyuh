/**
 * PembelianManager.js
 * Handles Pembelian CRUD
 */
class PembelianManager {
    static init() {
         const dateInput = document.getElementById('p_date');
         if (dateInput) setDateToToday('p_date'); // Flatpickr compatible
    }

     static search() {
        const query = document.getElementById('purchaseSearch').value.toLowerCase();
        const tbody = document.getElementById('purchaseTableBody');
        const rows = tbody.getElementsByTagName('tr');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        }
    }

    static async renderTable() {
        console.log('🔍 PembelianManager.renderTable() called');
        const sb = window.supabaseClient;
        if (!sb) {
            console.error('❌ Supabase client not found');
            return;
        }
        console.log('✅ Supabase client OK');

        const tbody = document.getElementById('purchaseTableBody');
        if (!tbody) {
            console.error('❌ purchaseTableBody element not found!');
            return;
        }
        console.log('✅ tbody element found');
        
        // Clear table explicitly before fetch to avoid duplicates
        tbody.innerHTML = '';

        console.log('📡 Fetching pembelian data...');
        const { data: list, error } = await sb.from('pembelian').select('*').order('tanggal', { ascending: false });
        
        if (error) {
            console.error('❌ Pembelian fetch error:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem;">Gagal memuat data.</td></tr>`;
            return;
        }

        console.log(`✅ Data fetched: ${list ? list.length : 0} rows`);
        this.data = list;

        if (list.length === 0) {
            console.log('⚠️ Empty data');
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2rem; color: var(--dim-text);">Belum ada data pembelian.</td></tr>`;
            return;
        }

        console.log('📝 Rendering rows...');
        list.forEach((p, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.tanggal}</td>
                <td>${p.nama_barang}</td>
                <td><span style="font-size:0.8rem; padding:2px 6px; background:rgba(255,255,255,0.1); border-radius:4px;">${p.kategori}</span></td>
                <td>${p.jumlah} ${p.satuan || 'pcs'}</td>
                <td>${formatCurrency(p.harga_total)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="PembelianManager.delete(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
            if (index === 0) console.log('✅ First row rendered');
        });
        
        console.log(`✅ All ${list.length} rows rendered to DOM`);
        
        // Re-apply search if exists
        const currentSearch = document.getElementById('purchaseSearch');
        if (currentSearch && currentSearch.value) {
            this.search();
        }
    }

    static exportData() {
        if (!this.data) return alert('Data belum dimuat.');
        const headers = ['tanggal', 'nama_barang', 'kategori', 'jumlah', 'harga_total'];
        ExportManager.toCSV('Laporan_Pembelian', headers, this.data);
    }

    static async save() {
        console.log('PembelianManager.save() called');
        const sb = window.supabaseClient;
        const item = document.getElementById('p_item').value;
        const category = document.getElementById('p_category').value.toLowerCase(); 
        const qty = parseInt(document.getElementById('p_qty').value);
        const satuan = document.getElementById('p_satuan').value.toLowerCase();
        const price = parseInt(document.getElementById('p_price').value);
        const date = document.getElementById('p_date').value;

        if (!item || !date || isNaN(qty) || isNaN(price) || !satuan) {
            alert('Mohon lengkapi data pembelian (termasuk satuan).');
            return;
        }

        const total = qty * price;

        const payload = {
            nama_barang: item,
            kategori: category,
            jumlah: qty,
            satuan: satuan,
            harga_total: total,
            created_by: Auth.getCurrentName(),
            tanggal: date
        };

        console.log('Inserting Pembelian:', payload);
        const { error } = await sb.from('pembelian').insert(payload);

        if (error) {
            console.error('Supabase Pembelian Error:', error);
            alert('Gagal menyimpan: ' + error.message);
        } else {
            this.renderTable();
            // COMPATIBILITY FIX: Use applyGlobalFilter instead of renderStats
            if(window.DashboardManager && typeof DashboardManager.applyGlobalFilter === 'function') {
                DashboardManager.applyGlobalFilter();
            }
            this.closeModal(); // Close modal on success
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
                // COMPATIBILITY FIX: Use applyGlobalFilter instead of renderStats
                if(window.DashboardManager && typeof DashboardManager.applyGlobalFilter === 'function') {
                    DashboardManager.applyGlobalFilter();
                }
            }
        }
    }

    static openModal() {
        document.getElementById('purchaseForm').reset();
        setDateToToday('p_date'); // Flatpickr compatible
        document.getElementById('pembelianModal').classList.add('open');
    }

    static closeModal() {
        document.getElementById('pembelianModal').classList.remove('open');
    }

    static onCategoryChange() {
        const category = document.getElementById('p_category').value.toLowerCase();
        const satuanSelect = document.getElementById('p_satuan');
        
        // Category to unit mapping
        const categoryMap = {
            'pakan': 'kg',
            'obat': 'ml',
            'obat / vitamin': 'ml',
            'vitamin': 'ml',
            'perlengkapan': 'pcs'
        };
        
        const defaultUnit = categoryMap[category] || 'pcs';
        
        // Set the select value
        if (satuanSelect) {
            satuanSelect.value = defaultUnit;
        }
    }
}

window.PembelianManager = PembelianManager;
