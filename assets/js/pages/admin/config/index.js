import { Page } from '../../../core/page.js';

/**
 * AdminConfigPage - Page for administrators to manage bot configurations
 */
export class AdminConfigPage extends Page {
    constructor() {
        super();
        this.showMenuIcon = true;
        this.showBackArrow = true;
        this.requiresAuth = true;
        this.authorizedUserTypes = ['Admin']; // Only Admins can access
        this.requiresDatabase = true; // Need to fetch/save config data

        this.currentConfig = { botToken: '', chatId: '' };
    }

    getTitle() {
        return 'Manage Bot Configuration';
    }

    getHeaderIcon() {
        return 'fas fa-robot'; // Bot icon
    }

    getSkeletonTemplate() {
        return `
            <div class="ad-cfg-skeleton-container">
                <div class="ad-cfg-skeleton-title pulse"></div>
                <div class="ad-cfg-skeleton-form">
                    <div class="ad-cfg-skeleton-label pulse"></div>
                    <div class="ad-cfg-skeleton-input pulse"></div>
                    <div class="ad-cfg-skeleton-label pulse"></div>
                    <div class="ad-cfg-skeleton-input pulse"></div>
                    <div class="ad-cfg-skeleton-button pulse"></div>
                </div>
            </div>
        `;
    }

    async loadDatabaseContent() {
        try {
            const firebase = window.app.getLibrary('firebase');
            const db = firebase.getDatabase(); // Get Realtime Database instance
            const configRef = firebase.ref(db, 'configs');
            const snapshot = await firebase.get(configRef);

            if (snapshot.exists()) {
                this.currentConfig = snapshot.val();
            } else {
                console.warn('Configs node does not exist in Realtime Database. Using defaults.');
                // Optionally create the node here if it's missing
                // await firebase.set(configRef, this.currentConfig);
            }
            return true;
        } catch (error) {
            console.error('Error loading bot config:', error);
            window.app.getToastManager().showToast('Error loading bot configuration.', 'error');
            throw new Error('DATABASE_ERROR');
        }
    }

    async getContent() {
        return `
            <div class="ad-cfg-container">
                <h2 class="ad-cfg-title">
                    <i class="${this.getHeaderIcon()}"></i>
                    ${this.getTitle()}
                </h2>
                <form id="configForm" class="ad-cfg-form">
                    <div class="form-group">
                        <label for="botToken">Telegram Bot Token</label>
                        <input type="text" id="botToken" value="${this.escapeHtml(this.currentConfig.botToken || '')}" placeholder="Enter Telegram Bot Token" required>
                    </div>
                    <div class="form-group">
                        <label for="chatId">Telegram Chat ID</label>
                        <input type="text" id="chatId" value="${this.escapeHtml(this.currentConfig.chatId || '')}" placeholder="Enter Telegram Chat ID" required>
                    </div>
                    <button type="submit" id="saveConfigBtn" class="ad-cfg-save-button">
                        <i class="fas fa-save"></i> Save Configuration
                    </button>
                </form>
            </div>
        `;
    }

    async afterContentRender() {
        const form = this.container.querySelector('#configForm');
        const saveBtn = this.container.querySelector('#saveConfigBtn');

        if (form && saveBtn) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                const botTokenInput = form.querySelector('#botToken');
                const chatIdInput = form.querySelector('#chatId');

                const newConfig = {
                    botToken: botTokenInput.value.trim(),
                    chatId: chatIdInput.value.trim()
                };

                try {
                    const firebase = window.app.getLibrary('firebase');
                    const db = firebase.getDatabase(); // Get Realtime Database instance
                    const configRef = firebase.ref(db, 'configs');
                    
                    await firebase.set(configRef, newConfig);
                    
                    this.currentConfig = newConfig; // Update local state
                    window.app.getToastManager().showToast('Bot configuration updated successfully!', 'success');

                } catch (error) {
                    console.error('Error saving bot config:', error);
                    window.app.getToastManager().showToast('Failed to update bot configuration. Please try again.', 'error');
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Configuration';
                }
            });
        }
    }
}
