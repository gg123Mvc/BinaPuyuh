class InkubatorManager {
    static async renderTable() {
        const sb = window.supabaseClient;
        if (!sb) return;

        // Clear existing interval if any to prevent leaks
        if (this.timerInterval) clearInterval(this.timerInterval);

        console.log('Fetching Inkubator data...');
        const { data: list, error } = await sb.from('inkubator').select('*').order('tanggal_masuk', { ascending: false });
        
        if (error) {
            console.error('Inkubator Error:', error);
            return;
        }

        this.data = list;
        const tbody = document.getElementById('inkubatorTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (list.length === 0) {
             tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Belum ada data.</td></tr>';
        }

        list.forEach(item => {
            const tr = document.createElement('tr');
            
            let badgeClass = 'background: #E5E7EB; color: #374151; padding: 4px 8px; border-radius: 4px;';
            if(item.status === 'inkubasi') badgeClass = 'background: #FEF3C7; color: #D97706; padding: 4px 8px; border-radius: 4px;';
            if(item.status === 'menetas') badgeClass = 'background: #D1FAE5; color: #059669; padding: 4px 8px; border-radius: 4px;';
            if(item.status === 'gagal') badgeClass = 'background: #FEE2E2; color: #DC2626; padding: 4px 8px; border-radius: 4px;';

            // Calculate Target Date (Masuk + 17 Days)
            const enterDate = new Date(item.tanggal_masuk);
            const targetDate = new Date(enterDate);
            targetDate.setDate(enterDate.getDate() + 17);
            // reset time to end of that day or specific time? Let's assume end of day 17 or same time.
            // Since we only have date, let's target 00:00 of the 18th day (end of 17th) or just 17th.
            // Simplified: Target is 00:00 of date+17.

            const targetIso = targetDate.toISOString(); 

            // Timer Cell
            let timerHtml = '-';
            if (item.status === 'inkubasi') {
                timerHtml = `<span class="countdown-timer" data-target="${targetIso}" style="font-family:monospace; font-weight:bold; color: #2563EB;">Loading...</span>`;
            } else {
                timerHtml = `<small class="text-muted">Selesai</small>`;
            }

            tr.innerHTML = `
                <td>${item.tanggal_masuk}</td>
                <td>${item.jumlah_telur} Butir</td>
                <td>${item.sumber}</td>
                <td>${timerHtml}</td>
                <td><span style="${badgeClass}">${(item.status || '-').toUpperCase()}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="InkubatorManager.edit(${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="InkubatorManager.delete(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Start Timer
        this.startTimer();
    }

    static startTimer() {
        const updateTick = () => {
            const now = new Date().getTime();
            document.querySelectorAll('.countdown-timer').forEach(el => {
                const target = new Date(el.dataset.target).getTime();
                const diff = target - now;

                if (diff < 0) {
                    el.innerHTML = '<span style="color:red; animation: blink 1s infinite;">Waktunya Menetas!</span>';
                    return;
                }

                // Calc Time
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                el.innerText = `${days}h ${hours}j ${minutes}m ${seconds}s`;
            });
        };

        updateTick(); // Run once immediately
        this.timerInterval = setInterval(updateTick, 1000);
    }

    static exportData() {
        if (!this.data) return alert('Data belum dimuat.');
        const headers = ['tanggal_masuk', 'jumlah_telur', 'sumber', 'status', 'estimasi_menetas'];
        ExportManager.toCSV('Laporan_Inkubasi', headers, this.data);
    }

    static async save() {
        const sb = window.supabaseClient;
        const id = document.getElementById('ink_id').value;
        const date = document.getElementById('ink_date').value;
        const count = parseInt(document.getElementById('ink_count').value);
        const source = document.getElementById('ink_source').value;
        const status = document.getElementById('ink_status').value;
        
        // Calc estimasi (auto +17 days for puyuh)
        const d = new Date(date);
        d.setDate(d.getDate() + 17);
        const estimasi = d.toISOString().split('T')[0];

        const payload = {
            tanggal_masuk: date,
            jumlah_telur: count,
            sumber: source,
            status: status,
            created_by: Auth.getCurrentName(),
            estimasi_menetas: estimasi
        };

        let error;
        try {
            if (id) {
                const { error: err } = await sb.from('inkubator').update(payload).eq('id', id);
                error = err;
            } else {
                const { error: err } = await sb.from('inkubator').insert(payload);
                error = err;
            }
        } catch (e) {
             alert('Error: ' + e.message);
             return;
        }

        if (error) {
            alert('Error: ' + error.message);
        } else {
            this.closeModal();
            this.renderTable();
            alert('Data Inkubator tersimpan!');
        }
    }

    static async edit(id) {
        const sb = window.supabaseClient;
        const { data } = await sb.from('inkubator').select('*').eq('id', id).single();
        if (data) {
            document.getElementById('ink_id').value = data.id;
            document.getElementById('ink_date').value = data.tanggal_masuk;
            document.getElementById('ink_count').value = data.jumlah_telur;
            document.getElementById('ink_source').value = data.sumber;
            document.getElementById('ink_status').value = data.status;
            
            document.getElementById('inkubatorModal').classList.add('open');
        }
    }

    static async delete(id) {
        if(confirm('Hapus data inkubasi ini?')) { // Fallback if custom confirm fails
            const { error } = await window.supabaseClient.from('inkubator').delete().eq('id', id);
            if (!error) this.renderTable();
        }
    }

    static calcEstimation() {
        const dateStr = document.getElementById('ink_date').value;
        if (!dateStr) return;
        
        const d = new Date(dateStr);
        d.setDate(d.getDate() + 17);
        // Format to DD/MM/YYYY or YYYY-MM-DD
        // const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        // document.getElementById('ink_estimation').value = d.toLocaleDateString('id-ID', options);
        document.getElementById('ink_estimation').value = d.toISOString().split('T')[0];
    }

    static openModal() {
        document.getElementById('inkubatorForm').reset();
        document.getElementById('ink_id').value = '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('ink_date').value = today;
        this.calcEstimation(); // Auto calc for today
        document.getElementById('inkubatorModal').classList.add('open');
    }

    static closeModal() {
        document.getElementById('inkubatorModal').classList.remove('open');
    }
}

window.InkubatorManager = InkubatorManager;
