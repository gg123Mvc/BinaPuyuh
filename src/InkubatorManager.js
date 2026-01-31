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
        
        // Get kandang distribution
        let distribution = null;
        if (status === 'menetas') {
            distribution = this.getKandangDistribution();
            
            if (!distribution || distribution.length === 0) {
                alert('Silakan pilih minimal satu kandang untuk puyuh yang menetas!');
                return;
            }

            // Validate total if manual mode
            const mode = document.querySelector('input[name="ink_dist_mode"]:checked')?.value;
            if (mode === 'manual') {
                const totalManual = distribution.reduce((sum, d) => sum + d.quantity, 0);
                if (totalManual === 0) {
                    alert('Total jumlah puyuh tidak boleh 0. Silakan isi jumlah di setiap kandang.');
                    return;
                }
                if (totalManual !== count) {
                    if (!confirm(`Total input manual (${totalManual}) tidak sama dengan jumlah telur (${count}). Lanjutkan dengan ${totalManual} ekor?`)) {
                        return;
                    }
                }
            }
        }
        
        // Calc estimasi (auto +17 days for puyuh)
        const d = new Date(date);
        d.setDate(d.getDate() + 17);
        const estimasi = d.toISOString().split('T')[0];

        // Calculate actual egg count if status is gagal
        let actualEggCount = count;
        let failedCount = null;
        
        if (status === 'gagal') {
            failedCount = parseInt(document.getElementById('ink_jumlah_gagal').value) || count;
            actualEggCount = count - failedCount; // Remaining eggs = total - failed
            
            if (actualEggCount < 0) {
                alert('Jumlah telur gagal tidak boleh lebih dari total telur!');
                return;
            }
        }

        const payload = {
            tanggal_masuk: date,
            jumlah_telur: actualEggCount, // Store remaining eggs, not original count
            sumber: source,
            status: status,
            created_by: Auth.getCurrentName(),
            estimasi_menetas: estimasi,
            kandang_id: null,
            jumlah_gagal: failedCount
        };

        let error;
        let isNewHatch = false;
        
        try {
            if (id) {
                // Check if status changed to menetas
                const { data: oldData } = await sb.from('inkubator').select('status').eq('id', id).single();
                isNewHatch = oldData && oldData.status !== 'menetas' && status === 'menetas';
                
                const { error: err } = await sb.from('inkubator').update(payload).eq('id', id);
                error = err;
            } else {
                isNewHatch = status === 'menetas';
                const { error: err } = await sb.from('inkubator').insert(payload);
                error = err;
            }
            
            // If status is menetas and distribution exists, update kandangs
            if (!error && isNewHatch && distribution) {
                for (const dist of distribution) {
                    // Get current kandang data
                    const { data: kandang } = await sb.from('kandang').select('jumlah_puyuh, nama_kandang').eq('id', dist.kandang_id).single();
                    
                    if (kandang) {
                        const newTotal = (kandang.jumlah_puyuh || 0) + dist.quantity;
                        
                        // Update kandang
                        await sb.from('kandang').update({ jumlah_puyuh: newTotal }).eq('id', dist.kandang_id);
                        
                        // Create population history record
                        await sb.from('riwayat_populasi').insert({
                            kandang_id: dist.kandang_id,
                            jenis_perubahan: 'Masuk',
                            jumlah: dist.quantity,
                            keterangan: `Menetas dari Inkubator (${dist.quantity} ekor)`,
                            created_by: Auth.getCurrentName()
                        });
                    }
                }
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
            
            if (isNewHatch && distribution) {
                const summary = distribution.map(d => `${d.quantity} ekor`).join(', ');
                alert(`Data tersimpan! Puyuh didistribusikan ke ${distribution.length} kandang: ${summary}`);
            } else {
                alert('Data Inkubator tersimpan!');
            }
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
            
            if (data.status === 'gagal' && data.jumlah_gagal) {
                document.getElementById('ink_jumlah_gagal').value = data.jumlah_gagal;
            }
            
            if (data.kandang_id) {
                document.getElementById('ink_kandang').value = data.kandang_id;
            }
            
            this.toggleKandangSelector(); // Show/hide kandang selector
            document.getElementById('inkubatorModal').classList.add('open');
        }
    }

    static async delete(id) {
        if(confirm('Hapus data inkubasi ini?')) {
            const { error } = await window.supabaseClient.from('inkubator').delete().eq('id', id);
            if (!error) this.renderTable();
        }
    }

    static calcEstimation() {
        const dateStr = document.getElementById('ink_date').value;
        if (!dateStr) return;
        
        const d = new Date(dateStr);
        d.setDate(d.getDate() + 17);
        document.getElementById('ink_estimation').value = d.toISOString().split('T')[0];
    }

    static toggleKandangSelector() {
        const status = document.getElementById('ink_status').value;
        const kandangGroup = document.getElementById('ink_kandang_group');
        const gagalGroup = document.getElementById('ink_gagal_group');
        
        if (status === 'menetas') {
            kandangGroup.style.display = 'block';
            gagalGroup.style.display = 'none';
            this.loadKandangOptions(); // Load kandang options when shown
        } else if (status === 'gagal') {
            kandangGroup.style.display = 'none';
            gagalGroup.style.display = 'block';
            // Clear kandang selections
            document.querySelectorAll('.kandang-checkbox').forEach(cb => cb.checked = false);
            document.querySelectorAll('.kandang-qty-input').forEach(input => input.value = '');
        } else {
            kandangGroup.style.display = 'none';
            gagalGroup.style.display = 'none';
            // Clear selections
            document.querySelectorAll('.kandang-checkbox').forEach(cb => cb.checked = false);
            document.querySelectorAll('.kandang-qty-input').forEach(input => input.value = '');
        }
    }

    static async loadKandangOptions() {
        const sb = window.supabaseClient;
        if (!sb) return;
        
        const { data: kandangs } = await sb.from('kandang').select('id, nama_kandang, jumlah_puyuh, kapasitas').order('nama_kandang');
        const listContainer = document.getElementById('ink_kandang_list');
        
        if (!kandangs || kandangs.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-dim); margin: 1rem;">Belum ada kandang.</p>';
            return;
        }

        const mode = document.querySelector('input[name="ink_dist_mode"]:checked')?.value || 'auto';
        
        listContainer.innerHTML = '';
        kandangs.forEach(k => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 0.5rem;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `kand_${k.id}`;
            checkbox.value = k.id;
            checkbox.className = 'kandang-checkbox';
            checkbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer;';
            
            const label = document.createElement('label');
            label.htmlFor = `kand_${k.id}`;
            label.style.cssText = 'flex: 1; cursor: pointer; color: var(--text-secondary);';
            label.innerHTML = `<strong>${k.nama_kandang}</strong> <span style="color: var(--text-dim); font-size: 0.85rem;">(${k.jumlah_puyuh || 0}/${k.kapasitas})</span>`;
            
            // Manual input (hidden by default)
            const manualInput = document.createElement('input');
            manualInput.type = 'number';
            manualInput.id = `qty_${k.id}`;
            manualInput.className = 'form-input kandang-qty-input';
            manualInput.min = 0;
            manualInput.placeholder = '0';
            manualInput.style.cssText = `width: 80px; padding: 0.4rem; display: ${mode === 'manual' ? 'block' : 'none'};`;
            
            item.appendChild(checkbox);
            item.appendChild(label);
            item.appendChild(manualInput);
            listContainer.appendChild(item);
        });
    }

    static toggleDistributionMode() {
        const mode = document.querySelector('input[name="ink_dist_mode"]:checked')?.value;
        const qtyInputs = document.querySelectorAll('.kandang-qty-input');
        const helper = document.getElementById('ink_kandang_helper');
        
        if (mode === 'manual') {
            qtyInputs.forEach(input => input.style.display = 'block');
            helper.textContent = 'Pilih kandang dan masukkan jumlah untuk masing-masing.';
        } else {
            qtyInputs.forEach(input => {
                input.style.display = 'none';
                input.value = '';
            });
            helper.textContent = 'Pilih satu atau lebih kandang. Puyuh akan dibagi rata.';
        }
    }

    static getKandangDistribution() {
        const mode = document.querySelector('input[name="ink_dist_mode"]:checked')?.value;
        const selectedCheckboxes = Array.from(document.querySelectorAll('.kandang-checkbox:checked'));
        
        if (selectedCheckboxes.length === 0) {
            return null;
        }

        const distribution = [];
        const totalCount = parseInt(document.getElementById('ink_count').value) || 0;

        if (mode === 'auto') {
            // Auto distribute evenly
            const perKandang = Math.floor(totalCount / selectedCheckboxes.length);
            let remainder = totalCount % selectedCheckboxes.length;

            selectedCheckboxes.forEach((checkbox, index) => {
                const kandangId = checkbox.value;
                let qty = perKandang;
                
                // Distribute remainder to first N kandangs
                if (remainder > 0) {
                    qty++;
                    remainder--;
                }
                
                distribution.push({ kandang_id: kandangId, quantity: qty });
            });
        } else {
            // Manual input
            selectedCheckboxes.forEach(checkbox => {
                const kandangId = checkbox.value;
                const qtyInput = document.getElementById(`qty_${kandangId}`);
                const qty = parseInt(qtyInput?.value) || 0;
                
                if (qty > 0) {
                    distribution.push({ kandang_id: kandangId, quantity: qty });
                }
            });
        }

        return distribution;
    }

    static openModal() {
        document.getElementById('inkubatorForm').reset();
        document.getElementById('ink_id').value = '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('ink_date').value = today;
        this.calcEstimation(); // Auto calc for today
        this.toggleKandangSelector(); // Hide kandang selector by default
        document.getElementById('inkubatorModal').classList.add('open');
    }

    static closeModal() {
        document.getElementById('inkubatorModal').classList.remove('open');
    }
}

window.InkubatorManager = InkubatorManager;
