/**
 * PakanManager.js
 * Handles CRUD for 'pemberian_pakan' table
 */

class PakanManager {
    static async renderTable() {
        const sb = window.supabaseClient;
        if (!sb) {
            alert('FATAL: Supabase client not found!');
            return;
        }

        const tbody = document.getElementById('pakanTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Sedang memuat data...</td></tr>';

        // 1. Fetch Pakan Data
        const { data: list, error } = await sb
            .from('pemberian_pakan')
            .select('*')
            .order('tanggal', { ascending: false });

        if (error) {
            console.error(error);
            tbody.innerHTML = `<tr><td colspan="6" style="color:red">Error: ${error.message}</td></tr>`;
            return;
        }

        // Store for export
        this.data = list;

        // 2. Fetch Kandang Data manually (to handle missing Foreign Key in DB)
        const { data: kandangs } = await sb.from('kandang').select('id, nama_kandang');
        const kandangMap = {};
        if (kandangs) {
            kandangs.forEach(k => kandangMap[k.id] = k.nama_kandang);
        }

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Data Kosong.</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        list.forEach(item => {
            const tr = document.createElement('tr');
            const date = new Date(item.tanggal).toLocaleDateString('id-ID');
            
            // Use manual map, fallback to join if exists, fallback to ID
            let name = kandangMap[item.kandang_id] || 'ID: ' + item.kandang_id;
            
            // Enrich data for export just in case
            item.nama_kandang = name; 

            tr.innerHTML = `
                <td>${date}</td>
                <td><strong>${name}</strong></td>
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

    static exportData() {
        if (!this.data) return alert('Data belum dimuat.');
        const headers = ['tanggal', 'nama_kandang', 'jenis_pakan', 'jumlah_pakan', 'catatan'];
        ExportManager.toCSV('Laporan_Pakan', headers, this.data);
    }

    static async getStockStatus() {
        const sb = window.supabaseClient;
        // 1. Get Total Purchased (Category ~ 'pakan')
        // note: using ilike for case-insensitive match if needed, but we force lower on save
        const { data: purchases, error: err1 } = await sb.from('pembelian')
            .select('jumlah')
            .ilike('kategori', '%pakan%');
        
        if (err1) { console.error(err1); return 0; }
        const totalPurchased = purchases.reduce((acc, curr) => acc + (curr.jumlah || 0), 0);

        // 2. Get Total Consumed
        const { data: consumed, error: err2 } = await sb.from('pemberian_pakan').select('jumlah_pakan');
        if (err2) { console.error(err2); return 0; }
        const totalConsumed = consumed.reduce((acc, curr) => acc + (curr.jumlah_pakan || 0), 0);

        return totalPurchased - totalConsumed;
    }

    static async predictStock() {
        const sb = window.supabaseClient;
        // Get last 7 days consumption
        const today = new Date();
        const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString();

        const { data: usage } = await sb.from('pemberian_pakan')
            .select('jumlah_pakan')
            .gte('tanggal', lastWeek);
        
        if (!usage || usage.length === 0) return null;

        const totalUsed = usage.reduce((sum, item) => sum + (item.jumlah_pakan || 0), 0);
        const avgDaily = totalUsed / 7;
        
        if (avgDaily <= 0) return null; // No usage

        const currentStock = await this.getStockStatus();
        const daysLeft = Math.floor(currentStock / avgDaily);
        
        return { avgDaily, daysLeft };
    }

    static async updateStockDisplay() {
        const stockFn = document.getElementById('pak_stock_info');
        if (!stockFn) return;
        stockFn.innerText = 'Menghitung stok...';
        stockFn.style.color = 'gray';

        const stock = await this.getStockStatus();
        let predictionText = '';
        
        // Add Prediction
        const prediction = await this.predictStock();
        if (prediction) {
            predictionText = ` (Cukup untuk ~${prediction.daysLeft} hari)`;
        }

        stockFn.innerText = `Stok Tersedia: ${stock.toLocaleString('id-ID')} Kg${predictionText}`;
        
        if (stock <= 0) {
            stockFn.style.color = 'var(--error-color)';
            stockFn.innerText = 'Stok Habis! (0 Kg)';
        } else if (prediction && prediction.daysLeft < 3) {
            stockFn.style.color = 'var(--warning)'; // Low stock warning
        } else {
            stockFn.style.color = 'var(--success-color)';
        }
        return stock;
    }

    static async save() {
        const currentStock = await this.getStockStatus();
        
        const sb = window.supabaseClient;
        const kandangId = document.getElementById('pak_kandang').value;
        const type = document.getElementById('pak_type').value;
        const amount = parseFloat(document.getElementById('pak_amount').value);
        const note = document.getElementById('pak_note').value;
        
        if (!kandangId || !amount) {
            alert('Mohon lengkapi data.');
            return;
        }

        if (amount > currentStock) {
            alert(`Stok tidak cukup! Tersedia: ${currentStock} Kg, Diminta: ${amount} Kg`);
            return;
        }

        const payload = {
            kandang_id: kandangId,
            jenis_pakan: type,
            jumlah_pakan: amount,
            catatan: note,
            created_by: Auth.getCurrentName(),
            tanggal: new Date().toISOString()
        };

        const { error } = await sb.from('pemberian_pakan').insert(payload);

        if (error) {
            alert('Error: ' + error.message);
        } else {
            this.closeModal();
            this.renderTable();
            alert('Catatan Pakan tersimpan!');
            
            // Phase 2: Log to kandang_logs
            if (window.KandangDetailManager) {
                KandangDetailManager.addActivity({
                    kandang_id: kandangId,
                    activity_type: 'PAKAN',
                    quantity: amount,
                    unit: 'KG',
                    notes: `(Pakan) ${type} - ${note || ''}`
                });
            }
        }
    }

    static openModal() {
        document.getElementById('pakanForm').reset();
        this.loadKandangOptions();
        this.updateStockDisplay();
        document.getElementById('pakanModal').classList.add('open');
    }

    static closeModal() {
        document.getElementById('pakanModal').classList.remove('open');
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
