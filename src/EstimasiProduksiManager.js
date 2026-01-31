/**
 * EstimasiProduksiManager.js
 * Handles egg production estimation display
 */
class EstimasiProduksiManager {
    static init() {
        // Initial render
    }

    static async renderTable() {
        const sb = window.supabaseClient;
        if (!sb) return;
        
        const tbody = document.getElementById('estimasiProduksiTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>';

        try {
            // Fetch all kandang with tanggal_masuk field
            const { data: kandangs, error: kandangError } = await sb
                .from('kandang')
                .select('*')
                .order('nama_kandang');

            if (kandangError) throw kandangError;

            console.log('📦 Kandangs loaded:', kandangs);

            if (!kandangs || kandangs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-dim);">Belum ada data kandang.</td></tr>';
                return;
            }

            // Fetch total production stats per kandang
            const { data: productionStats } = await sb
                .from('catatan_telur')
                .select('kandang_id, jumlah, kualitas');

            console.log('📊 Production stats loaded:', productionStats);

            // Group by kandang_id and quality
            const statsMap = {};
            if (productionStats) {
                productionStats.forEach(record => {
                    if (!statsMap[record.kandang_id]) {
                        statsMap[record.kandang_id] = { baik: 0, retak: 0, pecah: 0, total: 0 };
                    }
                    const qty = record.jumlah || 0;
                    statsMap[record.kandang_id].total += qty;
                    
                    if (record.kualitas === 'Baik') {
                        statsMap[record.kandang_id].baik += qty;
                    } else if (record.kualitas === 'Retak') {
                        statsMap[record.kandang_id].retak += qty;
                    } else if (record.kualitas === 'Pecah') {
                        statsMap[record.kandang_id].pecah += qty;
                    }
                });
            }

            console.log('📈 Stats map:', statsMap);

            tbody.innerHTML = '';
            const now = new Date();

            kandangs.forEach((kandang, index) => {
                const entryDateString = kandang.tanggal_masuk; // Read directly from kandang table
                
                let tanggalMasuk = '-';
                let umurHari = '-';
                let estimasiTanggal = '-';
                let statusProduksi = '<span style="color: var(--text-dim); font-style: italic;">Belum diset</span>';
                let statusColor = '#666';
                let statusIcon = 'fa-question-circle';

                if (entryDateString) {
                    const entryDate = new Date(entryDateString);
                    const daysSinceEntry = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
                    const eggStartDate = new Date(entryDate);
                    eggStartDate.setDate(eggStartDate.getDate() + 40);
                    const daysUntilEggs = Math.ceil((eggStartDate - now) / (1000 * 60 * 60 * 24));

                    tanggalMasuk = entryDate.toLocaleDateString('id-ID');
                    umurHari = `${daysSinceEntry} hari`;
                    estimasiTanggal = eggStartDate.toLocaleDateString('id-ID');

                    console.log(`📊 Kandang ${kandang.nama_kandang}: ${daysSinceEntry} days old`);

                    // Determine status
                    if (daysSinceEntry < 40) {
                        statusColor = '#FFA726';
                        statusIcon = 'fa-hourglass-start';
                        statusProduksi = `<strong style="color: ${statusColor};">Belum Siap</strong><br><small>${daysUntilEggs} hari lagi</small>`;
                    } else if (daysSinceEntry >= 40 && daysSinceEntry < 45) {
                        statusColor = '#FF9800';
                        statusIcon = 'fa-hourglass-half';
                        statusProduksi = `<strong style="color: ${statusColor};">Mulai Bertelur</strong><br><small>Fase awal produksi</small>`;
                    } else {
                        statusColor = '#66BB6A';
                        statusIcon = 'fa-check-circle';
                        statusProduksi = `<strong style="color: ${statusColor};">Produksi Optimal</strong><br><small>Hari ke-${daysSinceEntry}</small>`;
                    }
                } else {
                    console.warn(`⚠️ Kandang ${kandang.nama_kandang}: tanggal_masuk belum diisi`);
                }

                // Get production stats for this kandang
                const stats = statsMap[kandang.id] || { baik: 0, retak: 0, pecah: 0, total: 0 };
                const totalProduksiHTML = `
                    <div style="font-size: 0.9rem;">
                        <strong style="font-size: 1.1rem;">${stats.total.toLocaleString('id-ID')}</strong> butir
                        <div style="display: flex; gap: 0.3rem; margin-top: 0.3rem; flex-wrap: wrap;">
                            ${stats.baik > 0 ? `<span style="padding: 1px 6px; border-radius: 8px; background: #66BB6A; color: white; font-size: 0.75rem;">✓ ${stats.baik}</span>` : ''}
                            ${stats.retak > 0 ? `<span style="padding: 1px 6px; border-radius: 8px; background: #FF9800; color: white; font-size: 0.75rem;">⚠ ${stats.retak}</span>` : ''}
                            ${stats.pecah > 0 ? `<span style="padding: 1px 6px; border-radius: 8px; background: #F44336; color: white; font-size: 0.75rem;">✗ ${stats.pecah}</span>` : ''}
                        </div>
                    </div>
                `;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${kandang.nama_kandang}</strong></td>
                    <td>${kandang.jumlah_puyuh || 0} ekor</td>
                    <td>${tanggalMasuk}</td>
                    <td>${umurHari}</td>
                    <td>${estimasiTanggal}</td>
                    <td style="text-align: center;">
                        <i class="fas ${statusIcon}" style="color: ${statusColor}; margin-right: 0.5rem;"></i>
                        ${statusProduksi}
                    </td>
                    <td style="text-align: center;">
                        ${totalProduksiHTML}
                    </td>
                    <td>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <input type="number" 
                                   id="telur_${kandang.id}" 
                                   class="form-input" 
                                   placeholder="0" 
                                   min="0" 
                                   style="width: 70px; padding: 0.3rem 0.5rem; font-size: 0.9rem;">
                            <select id="kualitas_${kandang.id}" 
                                    class="form-input" 
                                    style="width: 85px; padding: 0.3rem 0.5rem; font-size: 0.85rem;">
                                <option value="Baik">Baik</option>
                                <option value="Retak">Retak</option>
                                <option value="Pecah">Pecah</option>
                            </select>
                            <button class="btn btn-sm btn-primary" 
                                    onclick="EstimasiProduksiManager.simpanTelur(${kandang.id}, '${kandang.nama_kandang}')"
                                    title="Simpan produksi telur">
                                <i class="fas fa-save"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error('❌ Error loading production estimates:', error);
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--danger);">Gagal memuat data.</td></tr>';
        }
    }
    
    static async simpanTelur(kandangId, kandangName) {
        const jumlahInput = document.getElementById(`telur_${kandangId}`);
        const kualitasInput = document.getElementById(`kualitas_${kandangId}`);
        
        const jumlah = parseInt(jumlahInput.value);
        const kualitas = kualitasInput.value;
        
        if (!jumlah || jumlah <= 0) {
            alert('⚠️ Masukkan jumlah telur yang valid!');
            return;
        }
        
        const sb = window.supabaseClient;
        const today = new Date().toISOString().split('T')[0];
        
        const payload = {
            tanggal: today,
            kandang_id: kandangId,
            jumlah: jumlah,
            kualitas: kualitas,
            catatan: `Input dari Estimasi Produksi`,
            created_by: Auth.getCurrentName()
        };
        
        const { error } = await sb.from('catatan_telur').insert(payload);
        
        if (error) {
            alert('❌ Error: ' + error.message);
        } else {
            // Clear input
            jumlahInput.value = '';
            kualitasInput.value = 'Baik';
            
            // Show success
            alert(`✅ Berhasil mencatat ${jumlah} telur dari ${kandangName}!`);
            
            // Refresh table to update stats
            this.renderTable();
            
            // Refresh dashboard stats if available
            if (window.DashboardManager && typeof DashboardManager.renderStats === 'function') {
                DashboardManager.renderStats();
            }
        }
    }
}

window.EstimasiProduksiManager = EstimasiProduksiManager;
//✓ 420 = Baik (hijau #66BB6A)
//⚠ 25 = Retak (orange #FF9800)
//✗ 5 = Pecah (merah #F44336)