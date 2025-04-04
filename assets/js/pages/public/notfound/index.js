import { Page } from "../../../core/page.js"
/**
 * NotFoundPage - 404 Error Page
 * 
 * This page is shown when a user navigates to a route that doesn't exist.
 * It provides an engaging error message with a creative illustration
 * and buttons to navigate back or to the home page.
 */
export class NotFoundPage extends Page {
    constructor() {
        super(); // Always call the parent constructor
        
        // ===== BASIC CONFIGURATION =====
        
        // Hide menu hamburger icon in header for this error page
        this.showMenuIcon = false;
        
        // Hide back arrow in header for this error page
        this.showBackArrow = false;
        
        // This page doesn't need to fetch data from the database
        this.requiresDatabase = false;
        
        // ===== AUTHENTICATION SETTINGS =====
        
        // Users don't need to be logged in to view this page
        this.requiresAuth = false;
        
        // No user type restrictions for this page
        this.authorizedUserTypes = [];
        
        // Register this page in the global app object
        if (!window.app) {
            window.app = {};
        }
        if (!window.app.pages) {
            window.app.pages = {};
        }
        window.app.pages.notfound = this;
        
        // Track active event listeners for proper cleanup
        this.activeListeners = new Map();
        
        this.cssFiles = [
      "pages/public/404/index.css",
    ];
    }

    /**
     * Return the page title shown in the header
     */
    getTitle() {
        return '404 Not Found';
    }

    /**
     * Return the icon class to display next to the page title
     */
    getHeaderIcon() {
        return 'fas fa-map-signs';
    }

    /**
     * Return HTML for the page header action buttons
     * No actions needed for error page
     */
    getActions() {
        return '';
    }

    /**
     * Return the main page content HTML with enhanced visual elements
     * and responsive text for buttons
     */
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

    /**
     * Called after content is fully rendered
     */
    async afterContentRender() {
        // Call parent method first as recommended in documentation
        await super.afterContentRender();
        
        // Setup action buttons
        this.setupActionButtons();
        
        // Add resize handler for responsive text
        this.handleResponsiveDisplay();
        window.addEventListener('resize', this.handleResponsiveDisplay.bind(this));
        this.activeListeners.set(window, this.handleResponsiveDisplay.bind(this));
    }
    
    /**
     * Handle responsive text display for buttons based on screen size
     */
    handleResponsiveDisplay() {
        // No need to implement complex logic here as we're using CSS media queries
        // This method is mainly a placeholder if additional JS-based responsive 
        // adjustments are needed in the future
    }

    /**
     * Setup event listeners for the action buttons
     */
    setupActionButtons() {
        const homeButton = this.container.querySelector('#homeButton');
        const backButton = this.container.querySelector('#backButton');
        
        if (homeButton) {
            const homeClickHandler = (e) => {
                e.preventDefault();
                this.navigateToHome();
            };
            
            // Remove existing listener if present
            const existingHomeListener = this.activeListeners.get(homeButton);
            if (existingHomeListener) {
                homeButton.removeEventListener('click', existingHomeListener);
            }
            
            // Add new listener
            homeButton.addEventListener('click', homeClickHandler);
            this.activeListeners.set(homeButton, homeClickHandler);
        }
        
        if (backButton) {
            const backClickHandler = (e) => {
                e.preventDefault();
                this.goBack();
            };
            
            // Remove existing listener if present
            const existingBackListener = this.activeListeners.get(backButton);
            if (existingBackListener) {
                backButton.removeEventListener('click', existingBackListener);
            }
            
            // Add new listener
            backButton.addEventListener('click', backClickHandler);
            this.activeListeners.set(backButton, backClickHandler);
        }
    }

    /**
     * Navigate to home page
     */
    navigateToHome() {
        if (window.app && typeof window.app.navigateTo === 'function') {
            window.app.navigateTo('/');
        }
    }
    
    /**
     * Go back to previous page
     */
    goBack() {
        window.history.back();
    }

    /**
     * Clean up resources when navigating away from page
     */
    destroy() {
        // Call parent destroy method first as required
        super.destroy();
        
        // Clean up event listeners
        this.activeListeners.forEach((listener, element) => {
            if (element) {
                if (element === window) {
                    window.removeEventListener('resize', listener);
                } else {
                    element.removeEventListener('click', listener);
                }
            }
        });
        this.activeListeners.clear();
        
        // Remove global reference
        if (window.app?.pages?.notfound === this) {
            delete window.app.pages.notfound;
        }
        
        // Clear container reference
        this.container = null;
    }
}