/**
 * modal.js
 * Premium Dialog System (Alerts & Confirmations)
 */

class ModalSystem {
    constructor() {
        this.overlay = null;
        this.resolvePromise = null;
        this._init();
    }

    _init() {
        if (document.getElementById('custom-modal-system')) return;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'custom-modal-system';
        modalDiv.className = 'modal custom-modal-overlay';
        modalDiv.innerHTML = `
            <div class="modal-content glass-panel animate-pop">
                <div class="modal-icon-wrapper" id="modal-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <h3 class="modal-title" id="modal-title">Title</h3>
                <div class="modal-body" id="modal-msg">Message body goes here</div>
                <div class="modal-actions" id="modal-actions">
                    <!-- Buttons injected dynamically -->
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
        this.overlay = modalDiv;
        
        // Close on background click (optional, maybe safe to disable for critical confirms)
        // this.overlay.addEventListener('click', (e) => {
        //     if (e.target === this.overlay) this._close(null);
        // });
    }

    /**
     * Show a Confirmation Dialog
     * @param {string} message 
     * @param {string} title 
     * @param {string} type 'danger' | 'success' | 'warning'
     * @param {string} confirmText 
     * @returns {Promise<boolean>}
     */
    confirm(message, title = 'Konfirmasi', type = 'warning', confirmText = 'Ya, Lanjutkan') {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            
            this._setupContent(title, message, type);
            
            // Buttons
            const actionsDiv = document.getElementById('modal-actions');
            actionsDiv.innerHTML = `
                <button class="btn btn-secondary modal-btn-cancel">Batal</button>
                <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'} modal-btn-confirm">${confirmText}</button>
            `;

            // Bind Events
            actionsDiv.querySelector('.modal-btn-cancel').onclick = () => this._close(false);
            actionsDiv.querySelector('.modal-btn-confirm').onclick = () => this._close(true);

            this._showModal();
        });
    }

    /**
     * Show an Alert Dialog
     * @param {string} message 
     * @param {string} title 
     * @param {string} type 'success' | 'error' | 'info'
     * @returns {Promise<void>}
     */
    alert(message, title = 'Info', type = 'info') {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;

            // Map standard types to UI types
            let uiType = 'primary';
            if (type === 'error') uiType = 'danger';
            if (type === 'success') uiType = 'success'; // Ensure CSS has .btn-success or use primary

            this._setupContent(title, message, uiType);

            // Buttons
            const actionsDiv = document.getElementById('modal-actions');
            actionsDiv.innerHTML = `
                <button class="btn btn-${uiType === 'success' ? 'primary' : uiType} modal-btn-ok" style="min-width: 100px;">OK</button>
            `;

            actionsDiv.querySelector('.modal-btn-ok').onclick = () => this._close(true);

            this._showModal();
        });
    }

    _setupContent(title, message, type) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-msg').innerHTML = message.replace(/\n/g, '<br>');

        const iconEl = document.getElementById('modal-icon');
        iconEl.className = 'modal-icon-wrapper fade-in';
        
        // Icon Logic
        if (type === 'danger') {
            iconEl.innerHTML = '<i class="fas fa-trash-alt"></i>';
            iconEl.style.color = '#EF5350';
            iconEl.style.background = 'rgba(239, 83, 80, 0.1)';
        } else if (type === 'warning') {
            iconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            iconEl.style.color = '#F57C00';
            iconEl.style.background = 'rgba(245, 124, 0, 0.1)';
        } else if (type === 'success' || type === 'primary') {
            iconEl.innerHTML = '<i class="fas fa-check-circle"></i>';
            iconEl.style.color = '#66BB6A';
            iconEl.style.background = 'rgba(102, 187, 106, 0.1)';
        } else {
            iconEl.innerHTML = '<i class="fas fa-info-circle"></i>';
            iconEl.style.color = '#42A5F5';
            iconEl.style.background = 'rgba(66, 165, 245, 0.1)';
        }
    }

    _showModal() {
        this.overlay.classList.add('open');
        // Add slightly delayed animation class if needed, or rely on CSS transitions
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
window.Modal = new ModalSystem();
// Backwards compatibility if needed, or alias
window.Confirm = { 
    show: (msg, title, type) => window.Modal.confirm(msg, title, type) 
};
