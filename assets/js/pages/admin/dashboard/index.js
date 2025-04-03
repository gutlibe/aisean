import { Page } from '../../../core/page.js';

/**
 * DashboardPage - Admin dashboard with user statistics and quick links
 */
export class DashboardPage extends Page {
    constructor() {
        super();
        
        // Basic configuration
        this.showMenuIcon = true;
        this.showBackArrow = false;
        
        // Authentication settings
        this.requiresAuth = true;
        this.authorizedUserTypes = ['Admin'];
        
        // Database configuration
        this.requiresDatabase = true;
        this.loadingTimeout = 20000;
        this.maxRetries = 2;
        this.retryDelay = 1000;
        
        // Dashboard quick links configuration
        this.quickLinks = [
            {
                title: "User Management",
                icon: "fas fa-users",
                description: "Manage users, roles, and permissions",
                route: "/admin/users",
                color: "var(--primary)"
            },
            {
                title: "AI Panel",
                icon: "fas fa-chart-line",
                description: "View AI analysis panel",
                route: "/admin/panel",
                color: "var(--success)"
            },
            {
                title: "Expert Predictions",
                icon: "fas fa-file-alt",
                description: "Manage experts content and resources",
                route: "/admin/experts",
                color: "var(--warning)"
            },
            {
                title: "System Settings",
                icon: "fas fa-cogs",
                description: "Configure application settings",
                route: "/admin/settings",
                color: "var(--primary-hover)"
            },
            {
                title: "Subscription Plans",
                icon: "fas fa-credit-card",
                description: "Manage subscription tiers and pricing",
                route: "/admin/subscriptions",
                color: "var(--danger)"
            },
            {
                title: "Help & Support",
                icon: "fas fa-headset",
                description: "Support tickets and user assistance",
                route: "/admin/support",
                color: "var(--success)"
            }
        ];
        this.cssFiles = [
      "pages/admin/dashboard/index.css",
    ]
    }

    /**
     * Return the page title shown in the header
     */
    getTitle() {
        return 'Admin Dashboard';
    }

    /**
     * Return the icon to display next to the page title
     */
    getHeaderIcon() {
        return 'fas fa-tachometer-alt';
    }

    /**
     * Return header action buttons
     */
    getActions() {
        return `
            <button class="btn btn-icon dsb-refresh-btn" id="refreshBtn" title="Refresh Dashboard">
                <i class="fas fa-sync-alt"></i>
            </button>
        `;
    }

    /**
     * Return skeleton template HTML shown during loading
     */
    getSkeletonTemplate() {
        return `
            <div class="dsb-container">
                <div class="dsb-stats-grid">
                    <div class="dsb-stat-card pulse"></div>
                    <div class="dsb-stat-card pulse"></div>
                    <div class="dsb-stat-card pulse"></div>
                </div>
                <div class="dsb-section-title pulse"></div>
                <div class="dsb-quick-links">
                    <div class="dsb-link-card pulse"></div>
                    <div class="dsb-link-card pulse"></div>
                    <div class="dsb-link-card pulse"></div>
                    <div class="dsb-link-card pulse"></div>
                </div>
            </div>
        `;
    }

    /**
     * Load data from database
     */
    async loadDatabaseContent() {
        try {
            const firebase = window.app.getLibrary('firebase');
            
            // Get users collection
            const usersCollection = firebase.collection(firebase.firestore, 'users');
            
            // Get all users
            const usersQuery = firebase.query(usersCollection);
            const usersSnapshot = await firebase.getDocs(usersQuery);
            
            // Process user data and count by type
            this.users = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Calculate stats
            this.totalUsers = this.users.length;
            
            // Count users by type
            this.userCountByType = {
                Admin: 0,
                Pro: 0,
                Member: 0
            };
            
            this.users.forEach(user => {
                const userType = user.userType || 'Member';
                if (this.userCountByType[userType] !== undefined) {
                    this.userCountByType[userType]++;
                } else {
                    this.userCountByType[userType] = 1;
                }
            });
            
            // Count active vs inactive users
            this.activeUsers = this.users.filter(user => user.status === 'active').length;
            
            return true;
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw new Error('DASHBOARD_DATA_ERROR');
        }
    }

    /**
     * Return the main page content HTML
     */
    async getContent() {
        // Create stats cards HTML
        const statsHtml = `
            <div class="dsb-stats-grid">
                <div class="dsb-stat-card dsb-stat-total">
                    <div class="dsb-stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="dsb-stat-content">
                        <h3>${this.totalUsers}</h3>
                        <p>Total Users</p>
                    </div>
                </div>
                <div class="dsb-stat-card dsb-stat-admin">
                    <div class="dsb-stat-icon">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <div class="dsb-stat-content">
                        <h3>${this.userCountByType.Admin}</h3>
                        <p>Admin Users</p>
                    </div>
                </div>
                <div class="dsb-stat-card dsb-stat-pro">
                    <div class="dsb-stat-icon">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="dsb-stat-content">
                        <h3>${this.userCountByType.Pro}</h3>
                        <p>Pro Users</p>
                    </div>
                </div>
                <div class="dsb-stat-card dsb-stat-active">
                    <div class="dsb-stat-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="dsb-stat-content">
                        <h3>${this.activeUsers}</h3>
                        <p>Active Users</p>
                    </div>
                </div>
            </div>
        `;

        // Create quick links HTML from config
        const quickLinksHtml = this.quickLinks.map(link => `
            <div class="dsb-link-card" data-route="${link.route}">
                <div class="dsb-link-icon" style="color: ${link.color}">
                    <i class="${link.icon}"></i>
                </div>
                <div class="dsb-link-content">
                    <h3>${link.title}</h3>
                    <p>${link.description}</p>
                </div>
                <div class="dsb-link-arrow">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `).join('');

        return `
            <div class="dsb-container">
                <div class="dsb-welcome-section">
                    <h2>Welcome back, Admin</h2>
                    <p>Here's an overview of your platform</p>
                </div>
                
                <div class="dsb-section">
                    <h3 class="dsb-section-title">User Statistics</h3>
                    ${statsHtml}
                </div>
                
                <div class="dsb-section">
                    <h3 class="dsb-section-title">Quick Actions</h3>
                    <div class="dsb-quick-links">
                        ${quickLinksHtml}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Set up structure-level event listeners
     */
    async afterStructureRender() {
        await super.afterStructureRender();
        
        const refreshBtn = this.container.querySelector('#refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    /**
     * Set up content-level event listeners
     */
    async afterContentRender() {
        // Set up quick link navigation
        const linkCards = this.container.querySelectorAll('.dsb-link-card');
        linkCards.forEach(card => {
            card.addEventListener('click', () => {
                const route = card.dataset.route;
                if (route) {
                    window.app.navigateTo(route);
                }
            });
        });
    }

    /**
     * Refresh the dashboard data
     */
    refresh() {
        this.currentRenderAttempt = 0;
        this.render();
    }
}