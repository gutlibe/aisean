class MaintenanceManager {
    constructor() {
        this.isUnderMaintenance = false;
        this.lastAttemptedPath = null;
        this.router = null;
        this.menuManager = null;
        this.maintenanceOverlay = null;
        this.maintenanceRef = null;
        this.setupMaintenanceOverlay();
    }

    async initialize(router, menuManager) {
        this.router = router;
        this.menuManager = menuManager;

        try {
            const firebase = await this.waitForFirebase();
            if (!firebase) {
                throw new Error("Firebase not initialized");
            }

            this.maintenanceRef = firebase.ref(
               firebase.database,
                'systemControls/maintenance/sttus'
            );

            const snapshot = await firebase.get(this.maintenanceRef);
            this.isUnderMaintenance = snapshot.val();

            firebase.onValue(this.maintenanceRef, (snapshot) => {
                const newMaintenanceStatus = snapshot.val();
                if (this.isUnderMaintenance !== newMaintenanceStatus) {
                    this.setMaintenanceMode(newMaintenanceStatus);
                }
            });

            if (this.isUnderMaintenance) {
                await this.activateMaintenanceMode();
            }
        } catch (error) {
            this.isUnderMaintenance = false;
        }

        return this;
    }

    async waitForFirebase() {
        return new Promise(resolve => {
            if (window.app?.getLibrary('firebase')) {
                resolve(window.app.getLibrary('firebase'));
                return;
            }
            
            let attempts = 0;
            const maxAttempts = 50;
            const interval = 100;

            const checkFirebase = setInterval(() => {
                attempts++;
                if (window.app?.getLibrary('firebase')) {
                    clearInterval(checkFirebase);
                    resolve(window.app.getLibrary('firebase'));
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkFirebase);
                    resolve(null);
                }
            }, interval);
        });
    }

    setupMaintenanceOverlay() {
        if (!document.querySelector('.gtlnk-maintenance-overlay')) {
            this.maintenanceOverlay = document.createElement('div');
            this.maintenanceOverlay.className = 'gtlnk-maintenance-overlay';
            
            const contentContainer = document.createElement('div');
            contentContainer.className = 'gtlnk-maintenance-content';
            
            contentContainer.innerHTML = `
                <div class="maintenance-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <h1>System Maintenance</h1>
                <p class="maintenance-message">We're currently performing scheduled maintenance to improve our services.</p>
                <div class="maintenance-details">
                    <div class="maintenance-detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>System upgrades in progress</span>
                    </div>
                    <div class="maintenance-detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Page will refresh automatically when complete</span>
                    </div>
                </div>
            `;
            
            this.maintenanceOverlay.appendChild(contentContainer);
            document.body.appendChild(this.maintenanceOverlay);
        } else {
            this.maintenanceOverlay = document.querySelector('.gtlnk-maintenance-overlay');
        }
        
        this.maintenanceOverlay.style.display = 'none';
    }

    async setMaintenanceMode(isMaintenance) {
        if (this.isUnderMaintenance === isMaintenance) {
            return null;
        }

        try {
            const firebase = await this.waitForFirebase();
             if (!firebase) {
                throw new Error("Firebase not initialized");
            }
            
            await firebase.set(this.maintenanceRef, isMaintenance);
            
            this.isUnderMaintenance = isMaintenance;

            if (isMaintenance) {
                await this.activateMaintenanceMode();
                return null;
            } else {
                return this.deactivateMaintenanceMode();
            }
        } catch (error) {
            throw error;
        }
    }

    async activateMaintenanceMode() {
        this.lastAttemptedPath = window.location.pathname;

        if (this.router) {
            this.router.disable();
        }

        const mainContent = document.querySelector('.gtlnk-main-content');
        const menu = document.querySelector('.gtlnk-menu');
        
        if (mainContent) {
            mainContent.style.display = 'none';
        }
        
        if (menu) {
            menu.style.display = 'none';
        }

        if (this.maintenanceOverlay) {
            this.maintenanceOverlay.style.display = 'flex';
            this.maintenanceOverlay.classList.add('fade-in');
        }

        document.body.classList.add('maintenance-mode');
    }

    deactivateMaintenanceMode() {
        document.body.classList.remove('maintenance-mode');

        if (this.maintenanceOverlay) {
            this.maintenanceOverlay.style.display = 'none';
            this.maintenanceOverlay.classList.remove('fade-in');
        }

        const mainContent = document.querySelector('.gtlnk-main-content');
        const menu = document.querySelector('.gtlnk-menu');
        
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        
        if (menu) {
            menu.style.display = 'block';
        }

        if (this.router) {
            this.router.enable();
        }

        const pathToNavigate = this.lastAttemptedPath || '/';
        this.lastAttemptedPath = null;
        return pathToNavigate;
    }

    getMaintenanceStatus() {
        return this.isUnderMaintenance;
    }

    getLastAttemptedPath() {
        return this.lastAttemptedPath;
    }

    cleanup() {
        this.maintenanceRef = null;
    }
}

export default MaintenanceManager;