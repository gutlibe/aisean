import { Page } from '../../../core/page.js';

/**
 * AdminPricingPage - Page for administrators to manage subscription pricing
 */
export class AdminPricingPage extends Page {
    constructor() {
        super();
        this.showMenuIcon = true;
        this.showBackArrow = true;
        this.requiresAuth = true;
        this.authorizedUserTypes = ['Admin']; // Only Admins can access
        this.requiresDatabase = true; // Need to fetch/save pricing data

        this.currentPricing = { monthly: 0, yearly: 0 };
    }

    getTitle() {
        return 'Manage Subscription Pricing';
    }

    getHeaderIcon() {
        return 'fas fa-tags'; // Pricing/tags icon
    }

    getSkeletonTemplate() {
        return `
            <div class="ad-prc-skeleton-container">
                <div class="ad-prc-skeleton-title pulse"></div>
                <div class="ad-prc-skeleton-form">
                    <div class="ad-prc-skeleton-label pulse"></div>
                    <div class="ad-prc-skeleton-input pulse"></div>
                    <div class="ad-prc-skeleton-label pulse"></div>
                    <div class="ad-prc-skeleton-input pulse"></div>
                    <div class="ad-prc-skeleton-button pulse"></div>
                </div>
            </div>
        `;
    }

    async loadDatabaseContent() {
        try {
            const firebase = window.app.getLibrary('firebase');
            const pricingDocRef = firebase.doc(firebase.firestore, 'settings/pricing');
            const pricingDocSnap = await firebase.getDoc(pricingDocRef);

            if (pricingDocSnap.exists()) {
                this.currentPricing = pricingDocSnap.data();
            } else {
                console.warn('Pricing document does not exist in settings/pricing. Using defaults.');
                // Optionally create the doc here if it's missing
                // await firebase.setDoc(pricingDocRef, this.currentPricing); 
            }
            return true;
        } catch (error) {
            console.error('Error loading pricing:', error);
            window.app.getToastManager().showToast('Error loading pricing data.', 'error');
            throw new Error('DATABASE_ERROR');
        }
    }

    async getContent() {
        return `
            <div class="ad-prc-container">
                <h2 class="ad-prc-title">
                    <i class="${this.getHeaderIcon()}"></i>
                    ${this.getTitle()}
                </h2>
                <form id="pricingForm" class="ad-prc-form">
                    <div class="form-group">
                        <label for="monthlyPrice">Monthly Price ($)</label>
                        <input type="number" id="monthlyPrice" min="0" step="0.01" value="${this.currentPricing.monthly || 0}" required>
                    </div>
                    <div class="form-group">
                        <label for="yearlyPrice">Yearly Price ($)</label>
                        <input type="number" id="yearlyPrice" min="0" step="0.01" value="${this.currentPricing.yearly || 0}" required>
                    </div>
                    <button type="submit" id="savePricingBtn" class="ad-prc-save-button">
                        <i class="fas fa-save"></i> Save Prices
                    </button>
                </form>
            </div>
        `;
    }

    async afterContentRender() {
        const form = this.container.querySelector('#pricingForm');
        const saveBtn = this.container.querySelector('#savePricingBtn');

        if (form && saveBtn) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                const monthlyPriceInput = form.querySelector('#monthlyPrice');
                const yearlyPriceInput = form.querySelector('#yearlyPrice');

                const newPricing = {
                    monthly: parseFloat(monthlyPriceInput.value) || 0,
                    yearly: parseFloat(yearlyPriceInput.value) || 0
                };

                try {
                    const firebase = window.app.getLibrary('firebase');
                    const pricingDocRef = firebase.doc(firebase.firestore, 'settings/pricing');
                    
                    // Use setDoc with merge: true to update or create
                    await firebase.setDoc(pricingDocRef, newPricing, { merge: true }); 
                    
                    this.currentPricing = newPricing; // Update local state
                    window.app.getToastManager().showToast('Pricing updated successfully!', 'success');

                } catch (error) {
                    console.error('Error saving pricing:', error);
                    window.app.getToastManager().showToast('Failed to update pricing. Please try again.', 'error');
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Prices';
                }
            });
        }
    }
}
