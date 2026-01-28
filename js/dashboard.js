/**
 * dashboard.js
 * Handles UI interactions and Data Rendering for the Admin Dashboard
 * Refactored for Supabase Async Operations
 */

document.addEventListener('DOMContentLoaded', () => {
    Auth.check(); // Redirect if not logged in
    
    // UI Init
    SidebarManager.init();
    
    // Async Data Init
    (async () => {
        await DashboardManager.init();
        await KandangManager.renderTable();
        await PembelianManager.renderTable();
    })();
});

const SidebarManager = {
    init() {
        // Nav Click handling
        document.querySelectorAll('.nav-item[data-target]').forEach(item => {
            item.addEventListener('click', () => {
                // Active State
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                // Show Section
                const targetId = item.dataset.target;
                document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
                const targetSection = document.getElementById(targetId);
                if (targetSection) targetSection.classList.add('active');

                // Mobile specific: close sidebar after click
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            });
        });

        // Mobile Toggle
        const toggleBtn = document.getElementById('toggleSidebar');
        const closeBtn = document.getElementById('closeSidebar');
        const sidebar = document.getElementById('sidebar');

        if (toggleBtn) {
            toggleBtn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
            toggleBtn.addEventListener('click', () => sidebar.classList.add('open'));
        }
        if (closeBtn) closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));

        window.addEventListener('resize', () => {
            if (toggleBtn) toggleBtn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
        });
    }
};

const DashboardManager = {
    async init() {
        this.renderStats();
        this.renderChart();
    },

    async renderStats() {
        // Fetch Real Data via Supabase
        const { data: kandangs, error: kError } = await supabase.from('kandang').select('jumlah_puyuh');
        const { data: pembelian, error: pError } = await supabase.from('pembelian').select('harga_total, tanggal');
        
        let totalPuyuh = 0;
        if (!kError && kandangs) {
            totalPuyuh = kandangs.reduce((sum, k) => sum + (k.jumlah_puyuh || 0), 0);
        }

        let totalExp = 0;
        if (!pError && pembelian) {
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            totalExp = pembelian
                .filter(p => p.tanggal.startsWith(currentMonth))
                .reduce((sum, p) => sum + (p.harga_total || 0), 0);
        }

        document.getElementById('dash-total-puyuh').innerText = totalPuyuh;
        document.getElementById('dash-total-telur').innerText = Math.floor(totalPuyuh * 0.8); // Estimate
        document.getElementById('dash-expenses').innerText = formatCurrency(totalExp);
    },

    renderChart() {
        const ctx = document.getElementById('productionChart');
        if(!ctx) return;
        
        // Mock data for chart - Could be replaced by `riwayat_populasi` or `produksi` table later
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
                datasets: [{
                    label: 'Produksi Telur (Butir)',
                    data: [820, 850, 840, 890, 880, 900, 895],
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
};

const KandangManager = {
    init() {
        // Form Submit
        document.getElementById('kandangForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.save();
        });
    },

    async renderTable() {
        const { data: list, error } = await supabase.from('kandang').select('*').order('id', { ascending: true });
        
        if (error) {
            console.error('Error fetching kandang:', error);
            return;
        }

        const tbody = document.getElementById('kandangTableBody');
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
    },

    openModal() {
        document.getElementById('kandangModal').classList.add('open');
        document.getElementById('kandangForm').reset();
        document.getElementById('k_id').value = '';
        document.getElementById('kandangModalTitle').innerText = 'Tambah Kandang';
    },

    closeModal() {
        document.getElementById('kandangModal').classList.remove('open');
    },

    async save() {
        const id = document.getElementById('k_id').value;
        const name = document.getElementById('k_name').value;
        const capacity = parseInt(document.getElementById('k_capacity').value);
        const count = parseInt(document.getElementById('k_count').value);

        const payload = {
            nama_kandang: name,
            kapasitas: capacity,
            jumlah_puyuh: count
        };

        let error;
        if (id) {
            // Update
            const { error: err } = await supabase.from('kandang').update(payload).eq('id', id);
            error = err;
        } else {
            // Insert
            const { error: err } = await supabase.from('kandang').insert(payload);
            error = err;
        }

        if (error) {
            alert('Gagal menyimpan: ' + error.message);
        } else {
            this.closeModal();
            this.renderTable();
            DashboardManager.renderStats();
            alert('Data Kandang berhasil disimpan!');
        }
    },

    async edit(id) {
        // Fetch specific item to ensure fresh data
        const { data, error } = await supabase.from('kandang').select('*').eq('id', id).single();
        if (data) {
            document.getElementById('k_id').value = data.id;
            document.getElementById('k_name').value = data.nama_kandang;
            document.getElementById('k_capacity').value = data.kapasitas;
            document.getElementById('k_count').value = data.jumlah_puyuh;
            
            document.getElementById('kandangModalTitle').innerText = 'Edit Kandang';
            document.getElementById('kandangModal').classList.add('open');
        }
    },

    async delete(id) {
        if(confirm('Yakin ingin menghapus kandang ini?')) {
            const { error } = await supabase.from('kandang').delete().eq('id', id);
            
            if (error) {
                alert('Gagal menghapus: ' + error.message);
            } else {
                this.renderTable();
                DashboardManager.renderStats();
            }
        }
    }
};

// Initialize listeners immediately
KandangManager.init();


const PembelianManager = {
    init() {
        document.getElementById('p_date').valueAsDate = new Date(); // Default today

        document.getElementById('purchaseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.save();
        });
    },

    async renderTable() {
        const { data: list, error } = await supabase.from('pembelian').select('*').order('tanggal', { ascending: false });
        
        if (error) {
            console.warn('Pembelian error:', error);
            return;
        }

        const tbody = document.getElementById('purchaseTableBody');
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
    },

    async save() {
        const item = document.getElementById('p_item').value;
        const category = document.getElementById('p_category').value;
        const qty = parseInt(document.getElementById('p_qty').value);
        const price = parseInt(document.getElementById('p_price').value);
        const date = document.getElementById('p_date').value;

        const total = qty * price;

        const payload = {
            nama_barang: item,
            kategori: category,
            jumlah: qty,
            satuan: 'pcs', // Default or add input for it
            harga_total: total,
            tanggal: date
        };

        const { error } = await supabase.from('pembelian').insert(payload);

        if (error) {
            alert('Gagal menyimpan: ' + error.message);
        } else {
            this.renderTable();
            DashboardManager.renderStats();
            document.getElementById('purchaseForm').reset();
            document.getElementById('p_date').valueAsDate = new Date();
            alert('Transaksi berhasil disimpan!');
        }
    },

    async delete(id) {
        if(confirm('Hapus riwayat transaksi ini?')) {
            const { error } = await supabase.from('pembelian').delete().eq('id', id);
            if (error) {
                alert('Gagal menghapus: ' + error.message);
            } else {
                this.renderTable();
                DashboardManager.renderStats();
            }
        }
    }
};

// Init Listeners
PembelianManager.init();
