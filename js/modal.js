/**
 * modal.js
 * Premium Confirmation Dialog component
 */

class ConfirmModal {
    constructor() {
        this.overlay = null;
        this.resolvePromise = null;
        this._init();
    }

    _init() {
        // Create modal DOM structure once
        if (document.getElementById('custom-confirm-modal')) return;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'custom-confirm-modal';
        modalDiv.className = 'modal confirm-modal';
        modalDiv.innerHTML = `
            <div class="modal-content glass-panel">
                <div class="confirm-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3 class="confirm-title" id="confirm-title">Konfirmasi</h3>
                <p class="confirm-text" id="confirm-msg">Apakah anda yakin?</p>
                <div class="confirm-actions">
                    <button class="btn btn-secondary" id="confirm-cancel">Batal</button>
                    <button class="btn btn-danger" id="confirm-ok">Ya, Lanjutkan</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        this.overlay = modalDiv;
        
        // Bind events
        document.getElementById('confirm-cancel').addEventListener('click', () => this._close(false));
        document.getElementById('confirm-ok').addEventListener('click', () => this._close(true));
        
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this._close(false);
        });
    }

    show(message, title = 'Konfirmasi', type = 'danger') {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            
            document.getElementById('confirm-title').innerText = title;
            document.getElementById('confirm-msg').innerText = message;
            
            const okBtn = document.getElementById('confirm-ok');
            if (type === 'danger') {
                okBtn.className = 'btn btn-danger';
                okBtn.innerText = 'Hapus';
                document.querySelector('.confirm-icon').innerHTML = '<i class="fas fa-trash-alt"></i>';
                document.querySelector('.confirm-icon').style.color = 'var(--danger-color)';
            } else {
                okBtn.className = 'btn btn-primary';
                okBtn.innerText = 'Ya, Simpan';
                document.querySelector('.confirm-icon').innerHTML = '<i class="fas fa-question-circle"></i>';
                document.querySelector('.confirm-icon').style.color = 'var(--primary-color)';
            }

            this.overlay.classList.add('open');
        });
    }

    _close(result) {
        this.overlay.classList.remove('open');
        if (this.resolvePromise) {
            this.resolvePromise(result);
            this.resolvePromise = null;
        }
    }
}

// Export global instance
window.Confirm = new ConfirmModal();
