class DebugManager {
    static async runCheck() {
        console.log('Running System Check...');
        const sb = window.supabaseClient;
        
        let report = "--- SYSTEM CHECK REPORT ---\n";
        
        // 1. Check Connection & Kandang
        try {
            const { count, error } = await sb.from('kandang').select('*', { count: 'exact', head: true });
            if (error) {
                report += `[FAIL] Kandang Table: ${error.message}\n`;
                if(error.code === '42501') report += "-> PENYEBAB: Izin Ditolak (RLS Policy). Jalankan SQL Script!\n";
                else if(error.code === '42P01') report += "-> PENYEBAB: Tabel 'kandang' tidak ditemukan in DB.\n";
            } else {
                report += `[OK] Kandang Table Connect (Rows: ${count})\n`;
            }
        } catch (e) {
            report += `[CRITICAL] Connection Failed: ${e.message}\n`;
        }

        // 2. Check Admins
        try {
            const { count, error } = await sb.from('admins').select('*', { count: 'exact', head: true });
            if (error) {
                 report += `[FAIL] Admins Table: ${error.message}\n`;
            } else {
                 report += `[OK] Admins Table (Rows: ${count})\n`;
            }
        } catch (e) { report += `[FAIL] Admin Check: ${e.message}\n`; }

        // 3. Check Inkubator
        try {
            const { count, error } = await sb.from('inkubator').select('*', { count: 'exact', head: true });
            if (error) {
                 report += `[FAIL] Inkubator Table: ${error.message}\n`;
            } else {
                 report += `[OK] Inkubator Table (Rows: ${count})\n`;
            }
        } catch (e) { report += `[FAIL] Inkubator Check: ${e.message}\n`; }

        alert(report);
    }
}

window.DebugManager = DebugManager;

// Auto-run on load if requested via URL param ?debug=true
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('debug') === 'true') {
    setTimeout(DebugManager.runCheck, 2000);
}
