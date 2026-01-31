/**
 * dashboard.js
 * Handles UI interactions (Sidebar, etc) and Main Dashboard Stats
 */

document.addEventListener('DOMContentLoaded', () => {
    Auth.check(); // Redirect if not logged in
    
    // Display Admin Name
    const nameEl = document.getElementById('adminName');
    if (nameEl) nameEl.innerText = Auth.getCurrentName();

    // UI Init
    SidebarManager.init();
    
    // Async Data Init - Only for the main dashboard view
    (async () => {
        if (document.getElementById('dash-total-puyuh')) {
            if(window.DashboardManager) await DashboardManager.init();
        }
    })();
});

const SidebarManager = {
    init() {
        const navContainer = document.querySelector('.nav-links');
        if (!navContainer) return;

        navContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (!item || !item.dataset.target) return;

            e.preventDefault();
            
            // Console log for debug (will be hidden unless devtools open)
            console.log('Sidebar Click:', item.dataset.target);

            // Active State
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Show Section
            const targetId = item.dataset.target;
            document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
            
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');
            
            // Safely Refresh data - Wrapped in try-catch
            try {
                if (targetId === 'pakan' && window.PakanManager) PakanManager.renderTable();
                else if (targetId === 'populasi' && window.PopulasiManager) PopulasiManager.renderTable();
                else if (targetId === 'admin' && window.AdminManager) AdminManager.renderTable();
                else if (targetId === 'pembelian' && window.PembelianManager) PembelianManager.renderTable();
                else if (targetId === 'inkubator' && window.InkubatorManager) InkubatorManager.renderTable();
                else if (targetId === 'settings' && window.SettingsManager) SettingsManager.init();
                else if (targetId === 'logs' && window.LogManager) LogManager.renderTable();
            } catch (err) {
                console.error('Error loading section:', err);
            }

            // Mobile specific: close sidebar after click
            if (window.innerWidth <= 768) {
                const sb = document.getElementById('sidebar');
                if(sb) sb.classList.remove('open');
            }
        });

        // Mobile Toggle
        const toggleBtn = document.getElementById('toggleSidebar');
        const closeBtn = document.getElementById('closeSidebar');
        const sidebar = document.getElementById('sidebar');

        if (toggleBtn) {
            // CSS handles display now (.mobile-visible)
            toggleBtn.addEventListener('click', () => sidebar.classList.add('open'));
        }
        if (closeBtn) closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));

        // Resize listener removed as CSS handles it
    }
};

const DashboardManager = {
    charts: {}, 

    async init() {
        this.initGlobalFilter();
        
        const now = new Date();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        
        const elM = document.getElementById('globalMonth');
        const elY = document.getElementById('globalYear');
        
        if(elM) elM.value = m;
        if(elY) elY.value = y;

        this.applyGlobalFilter();
    },

    initGlobalFilter() {
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const mSelect = document.getElementById('globalMonth');
        const ySelect = document.getElementById('globalYear');
        
        if(!mSelect || !ySelect) return;

        mSelect.innerHTML = months.map((m, i) => 
            `<option value="${String(i+1).padStart(2, '0')}">${m}</option>`
        ).join('');

        const currentYear = new Date().getFullYear();
        let yHtml = '';
        for(let i=0; i<4; i++) {
            const yr = currentYear - i;
            yHtml += `<option value="${yr}">${yr}</option>`;
        }
        ySelect.innerHTML = yHtml;
    },

    async applyGlobalFilter() {
        const m = document.getElementById('globalMonth');
        const y = document.getElementById('globalYear');
        if(!m || !y) return;

        const monthName = m.options[m.selectedIndex].text;
        const yearVal = y.value;
        
        // Update Status Text
        const statusEl = document.getElementById('globalPeriodStatus');
        if(statusEl) statusEl.innerText = `Menampilkan data bulan ${monthName} ${yearVal}`;

        await this.renderGlobalStats(m.value, y.value);
    },

    async renderGlobalStats(month, year) {
        const sb = window.supabaseClient;
        if (!sb) return;

        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`; // YYYY-MM-DD

        console.log(`Global Filter: ${startDate} to ${endDate}`);

        // --- 1. FETCH DATA ---
        // A. Expenses
        const { data: expenses } = await sb.from('pembelian')
            .select('harga_total, tanggal, kategori')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        // B. Production (Telur)
        // Check table name: usually 'produksi_telur' or similar. 
        // Based on app.js: 'produksi_telur'
        const { data: production } = await sb.from('produksi_telur')
            .select('jumlah, tanggal')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);

        // C. Population (Snapshot at end of month)
        // Logic: Get Current - (Changes > EndDate)
        const popSnapshot = await this.calculatePopulationSnapshot(sb, endDate);

        // --- 2. CALCULATE STATS ---

        // Expenses
        let totalExp = 0;
        let expByCategory = {};
        if (expenses) {
            expenses.forEach(p => {
                totalExp += (p.harga_total || 0);
                let cat = p.kategori || 'Lainnya';
                cat = cat.charAt(0).toUpperCase() + cat.slice(1);
                expByCategory[cat] = (expByCategory[cat] || 0) + (p.harga_total || 0);
            });
        }

        // Production
        let totalEggs = 0;
        let eggsByDate = {}; 
        // Init all days
        for(let d=1; d<=lastDay; d++) {
            eggsByDate[`${year}-${month}-${String(d).padStart(2, '0')}`] = 0;
        }

        if (production) {
            production.forEach(p => {
                totalEggs += (p.jumlah || 0);
                if (eggsByDate[p.tanggal] !== undefined) {
                    eggsByDate[p.tanggal] += (p.jumlah || 0);
                }
            });
        }

        // --- 3. UPDATE UI CARDS ---
        const elPuyuh = document.getElementById('dash-total-puyuh');
        const elTelur = document.getElementById('dash-total-telur');
        const elExp = document.getElementById('dash-expenses');
        
        // Update Labels to reflect period?
        // Actually, let's just update values.
        if (elPuyuh) elPuyuh.innerText = popSnapshot.toLocaleString();
        
        // Label for Egg might say "Hari Ini" in HTML, should we change it?
        // Let's find the label sibling and change text if possible or just update value.
        // User asked: "Total telur per bulan". 
        if (elTelur) {
            elTelur.innerText = totalEggs.toLocaleString();
            // Optional: Change label text using DOM traversal if rigorous
            if(elTelur.nextElementSibling) elTelur.nextElementSibling.innerText = "Total Telur (Periode Ini)";
        }
        
        if (elExp) {
            elExp.innerText = formatCurrency(totalExp);
            if(elExp.nextElementSibling) elExp.nextElementSibling.innerText = "Pengeluaran (Periode Ini)";
        }

        // --- 4. RENDER CHARTS ---
        
        // Chart A: Expenses by Category
        this.renderBarChart('expenseCategoryChart', 
            Object.keys(expByCategory), 
            Object.values(expByCategory), 
            'Pengeluaran per Kategori',
            'expenseCategoryEmpty'
        );

        // Chart B: Production Trend (Daily)
        const sortedDates = Object.keys(eggsByDate).sort();
        const dailyEggs = sortedDates.map(d => eggsByDate[d]);
        const dayLabels = sortedDates.map(d => d.split('-')[2]); // 01, 02...

        this.renderLineChart('productionChart', 
            dayLabels, 
            dailyEggs, 
            'Produksi Telur Harian',
            '#2E7D32',
            null // No empty state ID defined for production chart in HTML yet, or reuse existing
        );
        
        // Hide Expense Daily Chart if not used anymore or keep it?
        // User didn't ask for it in point 2.A explicitly (only Bar), but keeping it doesn't hurt.
        // However, to be clean, let's hide it if not populated, or populate it if we want.
        // Let's populate it with Expense Daily Trend for "completeness" 
        // ... (Skipping to save code complexity unless requested)
    },

    async calculatePopulationSnapshot(sb, endDateStr) {
        // 1. Get Current Total
        const { data: currentKandangs } = await sb.from('kandang').select('jumlah_puyuh');
        let currentTotal = currentKandangs ? currentKandangs.reduce((sum, k) => sum + (k.jumlah_puyuh || 0), 0) : 0;
        
        // If EndDate is Today or Future, return Current
        const todayStr = new Date().toISOString().split('T')[0];
        if (endDateStr >= todayStr) return currentTotal;

        // 2. Fetch Logs AFTER EndDate
        // We need to reverse effects.
        // If event was 'Masuk' (Added), we SUBTRACT.
        // If event was 'Mati'/'Jual'/'Afkir' (Removed), we ADD.
        const { data: logs } = await sb.from('riwayat_populasi')
            .select('jenis_perubahan, jumlah')
            .gt('created_at', endDateStr);
        
        if (!logs) return currentTotal;

        let adjustedTotal = currentTotal;
        logs.forEach(log => {
            const qty = log.jumlah || 0;
            if (log.jenis_perubahan === 'Masuk') {
                adjustedTotal -= qty; // Reverse addition
            } else {
                adjustedTotal += qty; // Reverse subtraction
            }
        });

        return adjustedTotal < 0 ? 0 : adjustedTotal; 
    },

    // Chart Helpers
    renderBarChart(canvasId, labels, data, label, emptyId) {
        const ctx = document.getElementById(canvasId);
        const emptyEl = emptyId ? document.getElementById(emptyId) : null;
        if (!ctx) return;

        if (this.charts[canvasId]) this.charts[canvasId].destroy();

        if (data.length === 0 || data.every(v => v === 0)) {
            ctx.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'block';
            if (emptyEl) emptyEl.innerText = "Tidak ada data pada periode ini";
            return;
        }

        ctx.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';

        const bgColors = labels.map((_, i) => `hsl(${i * 60}, 70%, 60%)`);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (c) => formatCurrency(c.raw)
                        }
                    }
                }
            }
        });
    },

    renderLineChart(canvasId, labels, data, label, color, emptyId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        if (this.charts[canvasId]) this.charts[canvasId].destroy();
        
        // Note: For line chart, even if all 0, we usually show the flat line?
        // But if strict "No Data" needed:
        const hasData = data.some(v => v > 0);
         // If generic empty handling needed, add here.
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: color,
                    backgroundColor: color + '20', // transparent hex
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
};

// Expose to window
window.SidebarManager = SidebarManager;
window.DashboardManager = DashboardManager;
