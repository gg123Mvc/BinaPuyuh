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
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-dim);">Belum ada data kandang.</td></tr>';
                return;
            }

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
                `;
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error('❌ Error loading production estimates:', error);
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--danger);">Gagal memuat data.</td></tr>';
        }
    }
}

window.EstimasiProduksiManager = EstimasiProduksiManager;
