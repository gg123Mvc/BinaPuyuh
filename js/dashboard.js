/**
 * dashboard.js
 * Handles UI interactions (Sidebar, etc) and Main Dashboard Stats
 */

document.addEventListener('DOMContentLoaded', () => {
    Auth.check(); // Redirect if not logged in
    
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
        const sb = window.supabaseClient;
        if (!sb) return;

        // Fetch Real Data via Supabase
        const { data: kandangs, error: kError } = await sb.from('kandang').select('jumlah_puyuh');
        const { data: pembelian, error: pError } = await sb.from('pembelian').select('harga_total, tanggal');
        
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

        const elPuyuh = document.getElementById('dash-total-puyuh');
        const elTelur = document.getElementById('dash-total-telur');
        const elExp = document.getElementById('dash-expenses');

        if(elPuyuh) elPuyuh.innerText = totalPuyuh;
        if(elTelur) elTelur.innerText = Math.floor(totalPuyuh * 0.8); // Estimate
        if(elExp) elExp.innerText = formatCurrency(totalExp);
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

// Expose to window
window.SidebarManager = SidebarManager;
window.DashboardManager = DashboardManager;
