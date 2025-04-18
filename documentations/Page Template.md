
# Page Template Documentation

## Overview

This document provides a comprehensive guide for creating new pages in the application using the vanilla JavaScript architecture. Pages are created by extending the base `Page` class and implementing specific methods to define content, behavior, and appearance.

The application now uses a **multi-render approach** that separates the rendering process into distinct phases for better performance and user experience.

## File Structure and Import

Pages should be organized in the project structure according to their access level and functionality:

```
/pages
  /public         // Public-facing pages
    /freenode     // Free content pages
    /football     // Premium content pages
    /experts      // Expert content pages
    ...
  /admin          // Admin-only pages
    /dashboard    // Admin dashboard
    /panel        // Admin panel
    /users        // User management
    ...
```

Import the base Page class using the correct path:

```javascript
// Import the base Page class
import { Page } from '../../../core/page.js';

/**
 * YourPageName - Brief description of your page
 */
export class YourPageName extends Page {
    // Page implementation
}



1. `Page Template.md` - A comprehensive documentation file explaining how to create pages in the application using the vanilla JavaScript architecture. It details the page lifecycle, required methods, CSS management, database interactions, and more.
2. `router.js` - A router implementation that handles navigation between pages, including caching, loading indicators, and error handling.
3. `css-manager.js` - A class that manages CSS loading and unloading for different pages and components.
4. `page.js` - The base Page class that all pages extend from. It handles the page lifecycle, rendering, authentication, and more.
5. `profile-page.js` - An example implementation of a profile page that extends the base Page class.


The documentation mentions that the architecture has changed from a single render approach to a multi-render approach, and the user wants me to analyze these changes and update the documentation accordingly. The main changes appear to be in how pages are rendered, with a new approach that separates the rendering process into multiple phases (structure rendering, content rendering, etc.).

I'll need to update the Page Template documentation to reflect these changes and provide a clear guide on how to create pages using the new multi-render approach.
`</Thinking>`

### Updated Page Template Documentation

After analyzing the code files you've provided, I can see that the architecture has evolved from a single render approach to a multi-render implementation. Let me update the documentation to reflect these changes and provide a clear guide for creating pages that work with the new architecture.

```markdown project="Page Template Documentation" file="Page-Template-Updated.md"
...
```

## Basic Page Structure

Every page must extend the base `Page` class and implement required methods:

```javascript
import { Page } from '../../../core/page.js';

/**
 * ExamplePage - Template for creating new pages
 * 
 * This template demonstrates all available features and customization options
 * for pages in the application.
 */
export class ExamplePage extends Page {
    constructor() {
        super(); // Always call the parent constructor
        
        // Basic configuration
        this.showMenuIcon = true;
        this.showBackArrow = false;
        
        // Database configuration
        this.requiresDatabase = true;
        this.loadingTimeout = 30000; // 30 seconds
        this.maxRetries = 2;
        this.retryDelay = 1000;
        
        // CSS configuration
        this.cssFiles = [
            "pages/example/index.css",
            "components/card.css"
        ];
    }
    
    // Required methods will be covered in the following sections
}
```

> **Note:** Authorization settings like `authorizedUserTypes` and `unauthorizedRedirectPath` are now managed in the `routes.js` file, not in individual pages.



## Multi-Render Page Lifecycle

The updated architecture uses a multi-render approach with the following lifecycle phases:

1. **Initialization**: Constructor sets up configuration
2. **CSS Loading**: Page-specific CSS is loaded before DOM changes
3. **Authentication**: User auth state is verified
4. **Prepare Render**: Prepares header and skeleton templates
5. **Structure Rendering**: Page header and skeleton template are rendered
6. **Database Loading**: If `requiresDatabase` is true, data is loaded
7. **Content Rendering**: Main content replaces the skeleton template
8. **Event Binding**: Event listeners are set up
9. **Cleanup**: Resources are released when navigating away


### Key Lifecycle Methods

The multi-render approach introduces two main phases:

1. **`prepareRender()`**: Prepares the page for rendering (loads CSS, verifies auth, prepares templates)
2. **`finalizeRender()`**: Renders the prepared templates and loads content


These methods are called by the router and should not be overridden in most cases. Instead, implement the required methods described below.

## Required Methods

### getTitle()

Returns the page title shown in the header.

```javascript
getTitle() {
    return 'Example Page Title';
}
```

### getHeaderIcon()

Returns the icon class to display next to the page title.

```javascript
getHeaderIcon() {
    return 'fas fa-chart-bar';
}
```

### getSkeletonTemplate()

Returns HTML for the loading placeholder shown while data is being fetched. The skeleton template should mirror the structure of the final content to prevent layout shifts when content loads.

```javascript
getSkeletonTemplate() {
    return `
        <div class="exp-container">
            <div class="exp-header skeleton-pulse"></div>
            <div class="exp-content">
                <div class="exp-card skeleton-pulse"></div>
                <div class="exp-card skeleton-pulse"></div>
            </div>
            <div class="exp-footer skeleton-pulse"></div>
        </div>
    `;
}
```

### getContent()

Returns the main page content HTML. This is called after data is loaded.

```javascript
async getContent() {
    // For simple pages, you can just return HTML directly
    if (!this.items || this.items.length === 0) {
        return `
            <div class="exp-empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No items found</h3>
                <p>Create your first item to get started.</p>
                <button class="btn btn-primary" id="createFirstItem">
                    Create Item
                </button>
            </div>
        `;
    }
    
    // For more complex pages, build HTML based on loaded data
    const itemsHtml = this.items.map(item => `
        <div class="exp-item-card" data-id="${item.id}">
            <h3>${this.escapeHtml(item.title)}</h3>
            <p>${this.escapeHtml(item.description)}</p>
            <div class="exp-item-actions">
                <button class="btn btn-text edit-item">Edit</button>
                <button class="btn btn-danger delete-item">Delete</button>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="exp-container">
            <div class="exp-header">
                <h2>Your Items</h2>
            </div>
            <div class="exp-content">
                ${itemsHtml}
            </div>
            <div class="exp-footer">
                <p>Total items: ${this.items.length}</p>
            </div>
        </div>
    `;
}
```

## Header Actions

### getActions()

Returns HTML for action buttons in the page header. These should be tailored to the specific needs of your page.

```javascript
getActions() {
    return `
        <button class="btn btn-primary" id="newItemBtn">
            <i class="fas fa-plus"></i> New Item
        </button>
    `;
}
```

### setupCustomActionListeners()

Sets up event listeners for custom action buttons. This is the recommended approach for handling action button clicks.

```javascript
setupCustomActionListeners() {
    const newItemBtn = this.container.querySelector('#newItemBtn');
    if (newItemBtn) {
        newItemBtn.addEventListener('click', () => this.showCreateItemModal());
    }
}
```

## Event Handling

### afterStructureRender()

Called after the page structure (header and skeleton) is rendered. Use for setting up structure-level event listeners.

```javascript
async afterStructureRender() {
    // Always call parent method first
    await super.afterStructureRender();
    
    // Additional structure-level setup
    window.addEventListener('resize', this.handleResize);
}
```

### afterContentRender()

Called after the main content is rendered. Use for setting up content-level event listeners.

```javascript
async afterContentRender() {
    // Setup for content elements
    const createFirstItem = this.container.querySelector('#createFirstItem');
    if (createFirstItem) {
        createFirstItem.addEventListener('click', () => this.showCreateItemModal());
    }
    
    // Setup for dynamically generated elements
    const editButtons = this.container.querySelectorAll('.edit-item');
    editButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = e.target.closest('.exp-item-card').dataset.id;
            this.editItem(itemId);
        });
    });
}
```

## CSS Management

### CSS Naming Conventions

To ensure uniqueness and prevent style conflicts, use a prefix for all class names in your page's CSS. The prefix should be related to your page name:

```css
/* For a user management page, use usr- prefix */
.usr-container { ... }
.usr-user-card { ... }
.usr-action-button { ... }

/* For a pricing page, use pcg- prefix */
.pcg-container { ... }
.pcg-price-card { ... }
.pcg-feature-list { ... }
```

### CSS Variables

For consistent design, use the CSS variables provided in the theme.css file:

```css
.exp-container {
    background-color: var(--card-bg);
    color: var(--text);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
}

.exp-header {
    background-color: var(--header-bg);
}

.exp-button {
    background-color: var(--primary);
    color: var(--text-primary);
}

.exp-button:hover {
    background-color: var(--primary-hover);
}

.exp-error {
    color: var(--danger);
}

.exp-success {
    color: var(--success);
}
```

### Responsive Design

Ensure your pages work well on all device sizes:

```css
.exp-container {
    padding: 20px;
}

.exp-content {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .exp-container {
        padding: 10px;
    }
    
    .exp-content {
        grid-template-columns: 1fr;
        gap: 10px;
    }
}
```

### Page CSS Configuration

Pages can specify CSS files to be loaded using the `cssFiles` property:

```javascript
constructor() {
    super();
    
    // CSS files to load for this page
    this.cssFiles = [
        "pages/example/index.css",  // Page-specific CSS
        "components/card.css"       // Component CSS used by this page
    ];
}
```

The CSS manager will:

1. Load these files before rendering the page
2. Prevent Flash of Unstyled Content (FOUC) during page transitions
3. Clean up old page styles when navigating away


## Database Interaction

### loadDatabaseContent()

This method is called during the render lifecycle if `requiresDatabase` is set to `true`. It should load all necessary data from the database and store it as instance properties.

```javascript
async loadDatabaseContent() {
    try {
        // Get Firebase access from the app
        const firebase = window.app.getLibrary('firebase');
        
        // === EXAMPLE: Loading collections ===
        const itemsCollection = firebase.collection(firebase.firestore, 'items');
        
        // === EXAMPLE: Basic queries ===
        const itemsQuery = firebase.query(
            itemsCollection,
            firebase.orderBy('createdAt', 'desc'),
            firebase.limit(50)
        );
        
        // === EXAMPLE: Filtered queries ===
        const userId = this.getUserData()?.uid;
        const userItemsQuery = firebase.query(
            itemsCollection,
            firebase.where('userId', '==', userId),
            firebase.where('status', '==', 'active')
        );
        
        // Execute queries in parallel for better performance
        const [itemsSnapshot, userItemsSnapshot] = await Promise.all([
            firebase.getDocs(itemsQuery),
            firebase.getDocs(userItemsQuery)
        ]);
        
        // Process results and store as instance properties
        this.items = itemsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        this.userItems = userItemsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        return true;
    } catch (error) {
        console.error('Error loading database content:', error);
        throw new Error('DATABASE_ERROR');
    }
}
```

### Firestore Database

Firestore is used for structured data that requires complex queries and transactions.

#### Writing Data to Firestore

```javascript
async createItem(itemData) {
    try {
        const firebase = window.app.getLibrary('firebase');
        const userId = this.getUserData()?.uid;
        
        if (!userId) {
            throw new Error('User not authenticated');
        }
        
        // Prepare the item data
        const newItem = {
            ...itemData,
            userId,
            status: 'active',
            createdAt: firebase.serverTimestamp(),
            updatedAt: firebase.serverTimestamp()
        };
        
        // Add to Firestore
        const itemsCollection = firebase.collection(firebase.firestore, 'items');
        const docRef = await firebase.addDoc(itemsCollection, newItem);
        
        // Show success notification
        window.app.showToast('Item created successfully!', 'success');
        
        return docRef.id;
    } catch (error) {
        console.error('Error creating item:', error);
        window.app.showToast('Failed to create item. Please try again.', 'error');
        return null;
    }
}
```

#### Updating Data in Firestore

```javascript
async updateItem(itemId, updateData) {
    try {
        const firebase = window.app.getLibrary('firebase');
        
        // Update the document
        const itemRef = firebase.doc(firebase.firestore, `items/${itemId}`);
        await firebase.updateDoc(itemRef, {
            ...updateData,
            updatedAt: firebase.serverTimestamp()
        });
        
        window.app.showToast('Item updated successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error updating item:', error);
        window.app.showToast('Failed to update item. Please try again.', 'error');
        return false;
    }
}
```

#### Deleting Data from Firestore

```javascript
async deleteItem(itemId) {
    try {
        const firebase = window.app.getLibrary('firebase');
        
        // Delete the document
        const itemRef = firebase.doc(firebase.firestore, `items/${itemId}`);
        await firebase.deleteDoc(itemRef);
        
        window.app.showToast('Item deleted successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting item:', error);
        window.app.showToast('Failed to delete item. Please try again.', 'error');
        return false;
    }
}
```

### Realtime Database

Realtime Database is used for simple data structures that require real-time synchronization.

#### Reading Data from Realtime Database

```javascript
async loadConfigData() {
    try {
        const firebase = window.app.getLibrary('firebase');
        
        // Create a reference to the desired path
        const configRef = firebase.ref(firebase.database, 'configs');
        
        // Get the data once
        const snapshot = await firebase.get(configRef);
        
        if (snapshot.exists()) {
            // Data exists
            const configData = snapshot.val();
            this.configData = configData;
            return true;
        } else {
            // No data available
            console.log('No config data available');
            return false;
        }
    } catch (error) {
        console.error('Error loading config data:', error);
        window.app.showToast('Failed to load configuration data', 'error');
        return false;
    }
}
```

#### Writing Data to Realtime Database

```javascript
async saveConfigData(configData) {
    try {
        const firebase = window.app.getLibrary('firebase');
        
        // Create a reference to the desired path
        const configRef = firebase.ref(firebase.database, 'configs');
        
        // Set the data
        await firebase.set(configRef, configData);
        
        window.app.showToast('Configuration saved successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error saving config data:', error);
        window.app.showToast('Failed to save configuration data', 'error');
        return false;
    }
}
```

#### Listening for Real-time Updates

```javascript
setupRealtimeListener() {
    const firebase = window.app.getLibrary('firebase');
    
    // Create a reference to the desired path
    const pricingRef = firebase.ref(firebase.database, 'settings/pricing');
    
    // Set up a listener for changes
    this.pricingListener = firebase.onValue(pricingRef, (snapshot) => {
        if (snapshot.exists()) {
            const pricingData = snapshot.val();
            this.updatePricingDisplay(pricingData);
        } else {
            console.log('No pricing data available');
        }
    }, (error) => {
        console.error('Error in pricing listener:', error);
    });
    
    // Store the listener for cleanup
    this.listeners = this.listeners || [];
    this.listeners.push(this.pricingListener);
}

// Don't forget to remove listeners when the page is destroyed
destroy() {
    super.destroy();
    
    // Clean up listeners
    if (this.listeners) {
        this.listeners.forEach(listener => {
            if (typeof listener === 'function') {
                listener();
            }
        });
        this.listeners = [];
    }
}
```

## Toast Notifications

Use toast notifications to provide feedback to users:

```javascript
// Show a success toast
window.app.showToast('Operation completed successfully!', 'success');

// Show an error toast
window.app.showToast('An error occurred. Please try again.', 'error');

// Show a warning toast
window.app.showToast('This action cannot be undone.', 'warning');

// Show an info toast
window.app.showToast('Your session will expire in 5 minutes.', 'info');

// Show a toast with custom duration (in milliseconds)
window.app.showToast('This will disappear in 10 seconds.', 'info', 10000);

// Show a toast with a title
window.app.showToast('Your profile has been updated.', 'success', 3000, 'Profile Update');
```

## Error Handling

The page system includes built-in error handling:

1. **Network Errors**: Automatically retried based on `maxRetries`
2. **Database Errors**: Shown with appropriate messages
3. **Authentication Errors**: Redirect to login or unauthorized page
4. **Timeout Errors**: Shown when operations take too long


You can also implement custom error handling:

```javascript
try {
    // Risky operation
    await this.performComplexOperation();
} catch (error) {
    console.error('Operation failed:', error);
    
    // Show user-friendly message
    window.app.showToast('Unable to complete operation. Please try again.', 'error');
    
    // Optionally provide recovery options
    this.showRecoveryOptions();
}
```

## Resource Cleanup

Always clean up resources when the page is destroyed:

```javascript
destroy() {
    // Always call parent method first
    super.destroy();
    
    // Clean up custom event listeners
    window.removeEventListener('resize', this.handleResize);
    
    // Unsubscribe from real-time listeners
    if (this.unsubscribeFunction) {
        this.unsubscribeFunction();
        this.unsubscribeFunction = null;
    }
    
    // Clear references to DOM elements
    this.customElements = null;
}
```

## Performance Optimization

### Minimize DOM Operations

```javascript
// BAD: Multiple DOM operations
items.forEach(item => {
    const element = document.createElement('div');
    element.textContent = item.name;
    container.appendChild(element);
});

// GOOD: Single DOM operation
const elements = items.map(item => `<div>${item.name}</div>`).join('');
container.innerHTML = elements;
```

### Efficient Database Queries

```javascript
// BAD: Multiple separate queries
const userDoc = await firebase.getDoc(userRef);
const itemsSnapshot = await firebase.getDocs(itemsQuery);

// GOOD: Parallel queries
const [userDoc, itemsSnapshot] = await Promise.all([
    firebase.getDoc(userRef),
    firebase.getDocs(itemsQuery)
]);
```

### Debounce Event Handlers

```javascript
constructor() {
    super();
    // Debounce resize handler
    this.handleResize = this.debounce(this.onResize.bind(this), 200);
}

// Debounce utility
debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
```

## Complete Example: Updated Dashboard Page

Here's a complete example of a dashboard page using the multi-render approach:

```javascript
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
                title: "System Settings",
                icon: "fas fa-cogs",
                description: "Configure application settings",
                route: "/admin/settings",
                color: "var(--primary-hover)"
            }
        ];
        
        // CSS files to load
        this.cssFiles = [
            "pages/admin/dashboard/index.css",
        ];
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
            <button class="btn btn-primary" id="exportBtn" title="Export Data">
                <i class="fas fa-download"></i> Export
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
     * Set up custom action listeners
     */
    setupCustomActionListeners() {
        const exportBtn = this.container.querySelector('#exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
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
     * Export dashboard data
     */
    exportData() {
        // Implementation for exporting data
        window.app.showToast('Exporting dashboard data...', 'info');
        
        // Simulate export process
        setTimeout(() => {
            window.app.showToast('Dashboard data exported successfully!', 'success');
        }, 1500);
    }
}
```

## Best Practices

1. **Multi-Render Approach**

1. Use the `prepareRender()` and `finalizeRender()` lifecycle methods correctly
2. Implement `getSkeletonTemplate()` to provide a good loading experience
3. Ensure `getContent()` returns HTML based on loaded data



2. **CSS Naming Conventions**

1. Use prefixes for class names (e.g., `usr-` for users page)
2. Be consistent with naming patterns
3. Use meaningful and descriptive class names



3. **Responsive Design**

1. Test on multiple screen sizes
2. Use CSS Grid or Flexbox for layouts
3. Use media queries for responsive adjustments
4. Consider touch interactions for mobile devices



4. **Error Handling**

1. Always catch errors in async operations
2. Provide user-friendly error messages
3. Use the toast notification system for feedback
4. Implement retry mechanisms for transient errors



5. **Performance**

1. Minimize DOM operations
2. Use efficient database queries
3. Debounce event handlers for frequent events
4. Load only necessary CSS files



6. **Security**

1. Always escape user-generated content with `escapeHtml()`



7. **Cleanup**

1. Always implement the `destroy()` method
2. Remove event listeners when they're no longer needed
3. Unsubscribe from real-time listeners
4. Clear references to DOM elements