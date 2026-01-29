/**
 * SettingsManager.js
 * Handles Admin Profile updates
 */
class SettingsManager {
    static init() {
        const currentUser = Auth.getUser();
        if (!currentUser) return;

        // Pre-fill name
        const nameInput = document.getElementById('set_fullName');
        if (nameInput && currentUser.user_metadata && currentUser.user_metadata.full_name) {
            nameInput.value = currentUser.user_metadata.full_name;
        }
        
        // Set Email (Read-only)
        const emailInput = document.getElementById('set_email');
        if(emailInput) emailInput.value = currentUser.email;
    }

    static async updateProfile() {
        const fullName = document.getElementById('set_fullName').value;
        if (!fullName) return alert('Nama tidak boleh kosong');

        const sb = window.supabaseClient;
        
        try {
            // 1. Update Auth Metadata
            const { data, error } = await sb.auth.updateUser({
                data: { full_name: fullName }
            });

            if (error) throw error;

            // 2. Update Public Table
            const { error: dbError } = await sb.from('admins')
                .update({ full_name: fullName })
                .eq('id', data.user.id);

            if (dbError) throw dbError;

            // Update Session Storage
            let userData = Auth.getUser();
            userData.user_metadata.full_name = fullName;
            sessionStorage.setItem('USER_DATA', JSON.stringify(userData));

            // Update UI
            document.getElementById('adminName').innerText = fullName;
            
            await window.Modal.alert('Profil berhasil diperbarui!', 'Sukses', 'success');
            
        } catch (e) {
            console.error(e);
            await window.Modal.alert('Gagal update profil: ' + e.message, 'Error', 'error');
        }
    }

    static async changePassword() {
        const newPass = document.getElementById('set_newPass').value;
        const confirmPass = document.getElementById('set_confirmPass').value;

        if (!newPass || !confirmPass) {
            return alert('Mohon isi password baru dan konfirmasi');
        }

        if (newPass.length < 6) return alert('Password minimal 6 karakter');
        if (newPass !== confirmPass) return alert('Password tidak cocok');

        const sb = window.supabaseClient;

        try {
            const { error } = await sb.auth.updateUser({
                password: newPass
            });

            if (error) throw error;

            await window.Modal.alert('Password berhasil diubah. Silakan login ulang nanti.', 'Sukses', 'success');
            
            // Clear inputs
            document.getElementById('set_newPass').value = '';
            document.getElementById('set_confirmPass').value = '';

        } catch (e) {
            console.error(e);
            await window.Modal.alert('Gagal ubah password: ' + e.message, 'Error', 'error');
        }
    }
}

window.SettingsManager = SettingsManager;
