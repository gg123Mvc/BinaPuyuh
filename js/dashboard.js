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
