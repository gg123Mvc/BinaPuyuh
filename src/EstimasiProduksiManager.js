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
                    
                    // === PRODUCTION HEALTH CHECK ===
                    const healthCheck = this.checkProductionHealth(kandang, daysSinceEntry, statsMap[kandang.id] || { total: 0 });
                    if (healthCheck.hasAlert) {
                        // Override with warning status
                        statusColor = healthCheck.severity === 'critical' ? '#F44336' : '#FFA726';
                        statusIcon = healthCheck.severity === 'critical' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
                        statusProduksi = `
                            <strong style="color: ${statusColor};">${healthCheck.alertTitle}</strong><br>
                            <small>${healthCheck.alertMessage}</small><br>
                            <button onclick="EstimasiProduksiManager.showRecommendations(${JSON.stringify(healthCheck).replace(/"/g, '&quot;')}, '${kandang.nama_kandang}')" 
                                    style="margin-top: 0.5rem; background: var(--primary-color); color: white; border: none; padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                                <i class="fas fa-lightbulb"></i> Lihat Solusi
                            </button>
                        `;
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
    
    /**
     * Check if production health matches expected rates
     * Returns alert object if anomaly detected
     */
    static checkProductionHealth(kandang, ageInDays, productionStats) {
        const totalQuails = kandang.jumlah_puyuh || 0;
        const totalEggsToday = productionStats.total || 0;
        
        // Calculate actual production rate (eggs per quail)
        const actualRate = totalQuails > 0 ? (totalEggsToday / totalQuails) : 0;
        
        // Expected rates by age range
        let expectedRate = 0;
        let alertType = null;
        let severity = 'info';
        let alertTitle = '';
        let alertMessage = '';
        let recommendations = [];
        
        if (ageInDays < 40) {
            // Days 0-39: No production expected
            expectedRate = 0;
            if (actualRate > 0.05) { // More than 5% producing
                alertType = 'early_production';
                severity = 'warning';
                alertTitle = 'Produksi Prematur';
                alertMessage = 'Puyuh bertelur terlalu dini (< 40 hari)';
                recommendations = ['check_stress', 'review_lighting'];
            }
        } else if (ageInDays >= 40 && ageInDays < 45) {
            // Days 40-44: Starting production (5-20% expected)
            expectedRate = 0.10;
            // No alerts in this phase - normal variation
        } else if (ageInDays >= 45 && ageInDays < 50) {
            // Days 45-49: Ramping up (30-50% expected)
            expectedRate = 0.40;
            if (actualRate < 0.20) { // Less than 20%
                alertType = 'low_production';
                severity = 'warning';
                alertTitle = 'Produksi Rendah';
                alertMessage = `${Math.round(actualRate * 100)}% (expected: 30-50%)`;
                recommendations = ['check_nutrition', 'check_health'];
            }
        } else {
            // Days 50+: Optimal production (70-80% expected)
            expectedRate = 0.75;
            if (actualRate === 0) {
                // CRITICAL: No production at all
                alertType = 'no_production';
                severity = 'critical';
                alertTitle = '⚠️ TIDAK BERTELUR';
                alertMessage = `Umur ${ageInDays} hari - sudah seharusnya produksi`;
                recommendations = ['switch_feed', 'add_medicine', 'check_environment', 'check_lighting'];
            } else if (actualRate < 0.50) { // Less than 50%
                alertType = 'low_production';
                severity = actualRate < 0.30 ? 'critical' : 'warning';
                alertTitle = 'Produksi Rendah';
                alertMessage = `${Math.round(actualRate * 100)}% (expected: 70-80%)`;
                recommendations = ['check_nutrition', 'check_environment', 'check_health'];
            }
        }
        
        return {
            hasAlert: alertType !== null,
            alertType,
            severity,
            alertTitle,
            alertMessage,
            expectedRate,
            actualRate,
            ageInDays,
            recommendations
        };
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
    
    /**
     * Show recommendations modal with actionable solutions
     */
    static showRecommendations(healthCheckData, kandangName) {
        const recommendations = {
            'switch_feed': {
                icon: '🌾',
                title: 'Beralih ke Pakan Berkualitas',
                desc: 'Gunakan pakan dengan protein min 18-20%',
                action: () => {
                    alert(`💡 Buka form Pakan dan pilih "Pakan Berkualitas" untuk ${kandangName}`);
                    // TODO: Auto-open Pakan modal with pre-selected quality feed
                }
            },
            'add_medicine': {
                icon: '💊',
                title: 'Berikan Obat/Vitamin',
                desc: 'Vitamin untuk meningkatkan produktivitas',
                action: () => {
                    alert(`💡 Buka form Pembelian dan beli Obat/Vitamin untuk ${kandangName}`);
                    // TODO: Navigate to Pembelian with Obat category
                }
            },
            'check_environment': {
                icon: '🌡️',
                title: 'Periksa Kondisi Kandang',
                desc: 'Suhu ideal: 20-25°C, Kepadatan: max 40 ekor/m²',
                action: null
            },
            'check_lighting': {
                icon: '💡',
                title: 'Periksa Pencahayaan',
                desc: 'Puyuh butuh 14-16 jam cahaya per hari',
                action: null
            },
            'check_nutrition': {
                icon: '🍽️',
                title: 'Periksa Kebutuhan Pakan',
                desc: 'Pastikan pakan cukup dan berkualitas',
                action: null
            },
            'check_health': {
                icon: '🏥',
                title: 'Konsultasi Dokter Hewan',
                desc: 'Periksa kemungkinan penyakit',
                action: null
            },
            'check_stress': {
                icon: '😰',
                title: 'Kurangi Stres',
                desc: 'Hindari kebisingan dan gangguan berlebihan',
                action: null
            },
            'review_lighting': {
                icon: '🔆',
                title: 'Tinjau Ulang Pencahayaan',
                desc: 'Produksi prematur bisa karena pencahayaan berlebihan',
                action: null
            }
        };
        
        let html = `
        <div style="
            position: fixed; 
            top: 0; left: 0; 
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 1rem;
        " onclick="this.remove()">
            <div style="
                background: #1e1e1e;
                border-radius: 12px;
                padding: 2rem;
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                border: 1px solid rgba(255,255,255,0.1);
            " onclick="event.stopPropagation()">
                <h3 style="color: var(--primary-color); margin-bottom: 1rem;">
                    ${healthCheckData.severity === 'critical' ? '🚨' : '⚠️'} 
                    Rekomendasi Tindakan
                </h3>
                <p style="color: var(--text-dim); margin-bottom: 1.5rem;">
                    <strong>${kandangName}</strong> - ${healthCheckData.alertMessage}
                </p>
                
                <div style="background: rgba(244,67,54,0.1); border-left: 3px solid #F44336; padding: 1rem; margin-bottom: 1.5rem; border-radius: 4px;">
                    <strong style="color: #F44336;">Problem:</strong> ${healthCheckData.alertTitle}<br>
                    <small style="color: var(--text-dim);">Usia ${healthCheckData.ageInDays} hari | Produksi ${Math.round(healthCheckData.actualRate * 100)}%</small>
                </div>
                
                <h4 style="color:white; margin-bottom: 1rem;">Yang Harus Dilakukan:</h4>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
        `;
        
        healthCheckData.recommendations.forEach(recId => {
            const rec = recommendations[recId];
            if (rec) {
                html += `
                <div style="
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 1rem;
                    border-left: 3px solid var(--primary-color);
                ">
                    <div style="display: flex; gap: 0.75rem; align-items: start;">
                        <span style="font-size: 1.5rem;">${rec.icon}</span>
                        <div style="flex: 1;">
                            <strong style="color: white;">${rec.title}</strong><br>
                            <small style="color: var(--text-dim);">${rec.desc}</small>
                            ${rec.action ? `<br><button onclick="${rec.action}" style="
                                margin-top: 0.5rem;
                                background: var(--primary-color);
                                color: white;
                                border: none;
                                padding: 0.3rem 0.8rem;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 0.85rem;
                            ">Buka Form</button>` : ''}
                        </div>
                    </div>
                </div>
                `;
            }
        });
        
        html += `
                </div>
                <div style="margin-top: 1.5rem; text-align: right;">
                    <button onclick="this.closest('[style*=fixed]').remove()" style="
                        background: var(--secondary-color);
                        color: white;
                        border: none;
                        padding: 0.6rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Tutup</button>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }
}

window.EstimasiProduksiManager = EstimasiProduksiManager;
//✓ 420 = Baik (hijau #66BB6A)
//⚠ 25 = Retak (orange #FF9800)
//✗ 5 = Pecah (merah #F44336)