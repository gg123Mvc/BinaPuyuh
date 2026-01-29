/**
 * CmsManager.js
 * Handles Announcements (Pengumuman)
 */
class CmsManager {
    static async render() {
        const container = document.getElementById('announcement-container');
        if (!container) return;

        const sb = window.supabaseClient;
        const { data, error } = await sb
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error || !data) return; // Silent fail

        if (data.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        container.innerHTML = `<h3><i class="fas fa-bullhorn" style="color:var(--warning)"></i> Pengumuman</h3>`;
        
        data.forEach(item => {
            const el = document.createElement('div');
            el.style.background = 'rgba(255,255,255,0.05)';
            el.style.padding = '1rem';
            el.style.borderRadius = '8px';
            el.style.marginBottom = '1rem';
            el.style.borderLeft = '4px solid var(--warning)';
            
            el.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <h4 style="margin:0; color:white;">${item.title}</h4>
                    <span style="font-size:0.8rem; color:gray;">${new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <p style="margin-top:0.5rem; color: #ddd;">${item.content}</p>
                <button class="btn btn-sm btn-outline" style="margin-top:0.5rem; font-size:0.75rem;" onclick="CmsManager.delete(${item.id})">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            `;
            container.appendChild(el);
        });
    }

    static async add() {
        const title = prompt("Judul Pengumuman:");
        if (!title) return;
        const content = prompt("Isi Pengumuman:");
        if (!content) return;

        const sb = window.supabaseClient;
        const { error } = await sb.from('announcements').insert({
            title, content
        });

        if (error) alert('Gagal: ' + error.message);
        else {
            LogManager.log('CMS', 'Menambah pengumuman: ' + title);
            this.render();
        }
    }

    static async delete(id) {
        if(!confirm('Hapus pengumuman ini?')) return;
        
        const sb = window.supabaseClient;
        await sb.from('announcements').delete().eq('id', id);
        this.render();
    }
}

window.CmsManager = CmsManager;
