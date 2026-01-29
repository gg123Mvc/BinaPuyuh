class KandangDetailManager {
    // Show the Detail Modal with Timeline
    static async show(kandangId) {
        const sb = window.supabaseClient;
        
        // 1. Fetch Kandang Info
        const { data: kandang, error } = await sb.from('kandang').select('*').eq('id', kandangId).single();
        if (error || !kandang) {
            alert('Data kandang tidak ditemukan!');
            return;
        }

        // 2. Set Modal Title
        document.getElementById('kandangDetailTitle').innerText = `Detail: ${kandang.name}`;
        document.getElementById('detail_kandang_id').value = kandang.id;

        // 3. Render Timeline
        await this.renderTimeline(kandangId);

        // 4. Show Modal
        document.getElementById('kandangDetailModal').classList.add('open');
    }

    static async renderTimeline(kandangId) {
        const sb = window.supabaseClient;
        const container = document.getElementById('activityTimeline');
        container.innerHTML = '<p class="text-center">Memuat data...</p>';

        const { data: logs, error } = await sb
            .from('kandang_logs')
            .select('*')
            .eq('kandang_id', kandangId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            container.innerHTML = '<p class="text-center text-danger">Gagal memuat log.</p>';
            return;
        }

        if (logs.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Belum ada aktivitas tercatat.</p>';
            return;
        }

        let html = '<div class="timeline">';
        logs.forEach(log => {
            const date = new Date(log.created_at).toLocaleString('id-ID');
            let icon = 'fa-circle';
            let color = 'gray';

            // Determine Color & Icon based on activity
            switch(log.activity_type) {
                case 'MASUK': 
                case 'POPULASI_MASUK':
                    icon = 'fa-plus-circle'; color = '#10B981'; break; // Green
                case 'KELUAR':
                case 'KEMATIAN':
                case 'JUAL':
                case 'AFKIR':
                    icon = 'fa-minus-circle'; color = '#EF4444'; break; // Red
                case 'PAKAN':
                    icon = 'fa-utensils'; color = '#3B82F6'; break; // Blue
                case 'OBAT':
                    icon = 'fa-first-aid'; color = '#F59E0B'; break; // Orange
                default: 
                    icon = 'fa-info-circle'; color = '#6B7280';
            }

            html += `
            <div class="timeline-item" style="border-left: 2px solid ${color}; padding-left: 1rem; margin-bottom: 1rem; position: relative;">
                <div style="position: absolute; left: -9px; top: 0; background: #1a1a1a; color: ${color};">
                    <i class="fas ${icon}"></i>
                </div>
                <div style="font-size: 0.85rem; color: #aaa;">${date} <span style="float:right;">${log.admin_name || '-'}</span></div>
                <div style="font-weight: bold; margin-top: 4px;">${log.activity_type}</div>
                <div>${log.quantity > 0 ? log.quantity + ' ' + (log.unit || '') : ''}</div>
                ${log.notes ? `<div style="font-style: italic; color: #888; font-size: 0.9rem;">"${log.notes}"</div>` : ''}
            </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    static closeModal() {
        document.getElementById('kandangDetailModal').classList.remove('open');
    }

    // Helper to log activity from other managers
    static async addActivity(payload) {
        const sb = window.supabaseClient;
        // payload: { kandang_id, activity_type, quantity, unit, notes }
        
        const finalPayload = {
            ...payload,
            admin_name: Auth.getCurrentName(),
            created_at: new Date().toISOString()
        };

        const { error } = await sb.from('kandang_logs').insert(finalPayload);
        if (error) {
            console.error('Failed to log activity:', error);
        } else {
            console.log('Activity logged:', finalPayload.activity_type);
        }
    }
}

window.KandangDetailManager = KandangDetailManager;
