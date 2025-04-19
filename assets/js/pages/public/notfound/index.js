import { Page } from "../../../core/page.js";

export class NotFoundPage extends Page {
    constructor() {
        super();
        
        this.showMenuIcon = false;
        this.showBackArrow = false;
        this.requiresDatabase = false;
        
        this.cssFiles = [
            "pages/public/404/index.css",
        ];
        
        this.activeListeners = new Map();
    }
    
    getTitle() {
        return '404 Not Found';
    }
    
    getHeaderIcon() {
        return 'fas fa-map-signs';
    }
    
    getActions() {
        return '';
    }
    
    getSkeletonTemplate() {
        return `
            <div class="notfound-container skeleton-placeholder">
                <div class="skeleton-pulse" style="width: 80%; height: 40px; margin-bottom: 20px;"></div>
                <div class="skeleton-pulse" style="width: 60%; height: 20px; margin-bottom: 40px;"></div>
                <div class="skeleton-pulse" style="width: 100%; height: 150px; margin-bottom: 40px;"></div>
                <div style="display: flex; gap: 10px;">
                     <div class="skeleton-pulse" style="width: 100px; height: 40px;"></div>
                     <div class="skeleton-pulse" style="width: 100px; height: 40px;"></div>
                </div>
            </div>
        `;
    }
    
    async getContent() {
        return `
            <div class="notfound-container">
                <div class="notfound-content">
                    <i class="fas fa-compass notfound-icon"></i>

                    <div class="notfound-illustration">
                        <div class="notfound-path"></div>
                        <div class="notfound-signpost"></div>
                        <div class="notfound-sign-left">404</div>
                        <div class="notfound-sign-right">Home</div>
                        <div class="notfound-character"></div>
                    </div>

                    <h2>Oops! Lost in Space</h2>
                    <p>The page you're looking for seems to have wandered off. It might be missing, moved, or never existed in the first place.</p>

                    <div class="notfound-action-buttons">
                        <button class="btn btn-primary" id="homeButton">
                            <i class="fas fa-home"></i>
                            <span>Home</span>
                        </button>
                        <button class="btn btn-secondary" id="backButton">
                            <i class="fas fa-arrow-left"></i>
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    async afterContentRender() {
        await super.afterContentRender();
        this.setupActionButtons();
    }
    
    setupActionButtons() {
        const homeButton = this.container?.querySelector('#homeButton');
        const backButton = this.container?.querySelector('#backButton');
        
        if (homeButton) {
            const homeClickHandler = (e) => {
                e.preventDefault();
                this.navigateToHome();
            };
            
            const existingHomeListener = this.activeListeners.get(homeButton);
            if (existingHomeListener) {
                homeButton.removeEventListener('click', existingHomeListener);
            }
            
            homeButton.addEventListener('click', homeClickHandler);
            this.activeListeners.set(homeButton, homeClickHandler);
        }
        
        if (backButton) {
            const backClickHandler = (e) => {
                e.preventDefault();
                this.goBack();
            };
            
            const existingBackListener = this.activeListeners.get(backButton);
            if (existingBackListener) {
                backButton.removeEventListener('click', existingBackListener);
            }
            
            backButton.addEventListener('click', backClickHandler);
            this.activeListeners.set(backButton, backClickHandler);
        }
    }
    
    navigateToHome() {
        if (window.app && typeof window.app.navigateTo === 'function') {
            window.app.navigateTo('/');
        } else {
            console.warn('App navigation function not available.');
        }
    }
    
    goBack() {
        window.history.back();
    }
    
    destroy() {
        this.activeListeners.forEach((listener, element) => {
            if (element && typeof element.removeEventListener === 'function') {
                try {
                    element.removeEventListener('click', listener);
                } catch (error) {
                    console.warn('Error removing listener during destroy:', error, element);
                }
            }
        });
        this.activeListeners.clear();
        
        super.destroy();
    }
}