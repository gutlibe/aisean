// Import the base Page class
import { Page } from '../../core/page.js';

/**
 * ExamplePage - Template for creating new pages
 * 
 * This template demonstrates all available features and customization options
 * for pages in the application. Each section includes explanatory comments.
 */
export class ExamplePage extends Page {
    constructor() {
        super(); // Always call the parent constructor
        
        // ===== BASIC CONFIGURATION =====
        
        // Controls whether to show menu hamburger icon in header
        this.showMenuIcon = true;
        
        // Controls whether to show back arrow in header
        this.showBackArrow = true;
        
        // Set to true if this page needs to fetch data from the database
        // This will trigger loadDatabaseContent() method during rendering
        this.requiresDatabase = true;
        
        // ===== AUTHENTICATION SETTINGS =====
        
        // Set to true if users must be logged in to view this page
        // If false, page will be public but can still check auth state
        this.requiresAuth = true;
        
        // Restrict page to specific user types (empty array = no restrictions)
        // Common values might include: 'Admin', 'Agent', 'User', etc.
        this.authorizedUserTypes = ['Admin', 'Agent'];
        
        // ===== LOADING CONFIGURATION =====
        
        // Maximum time (in milliseconds) to wait for data loading
        // After this time, DATABASE_TIMEOUT error will be triggered
        this.loadingTimeout = 30000; // 30 seconds
        
        // Maximum number of retry attempts when errors occur
        this.maxRetries = 2;
        
        // Delay between retry attempts (milliseconds)
        this.retryDelay = 1000;
    }

    /**
     * Return the page title shown in the header
     * This appears in the <h1> element of the page header
     */
    getTitle() {
        return 'Example Page Title';
    }

    /**
     * Return the icon class to display next to the page title
     * Uses Font Awesome classes (e.g., 'fas fa-user')
     * Return null for no icon
     */
    getHeaderIcon() {
        return 'fas fa-chart-bar';
    }

    /**
     * Return HTML for the page header action buttons
     * These appear in the top right section of the header
     */
    getActions() {
        return `
            <button class="btn btn-icon" id="refreshBtn">
                <i class="fas fa-sync-alt"></i>
            </button>
            <button class="btn btn-primary" id="newItemBtn">
                <i class="fas fa-plus"></i> New Item
            </button>
        `;
    }
    
    Usage Examples
Here's how subclasses can now implement actions:
Option 1: Override getActions() (recommended for new code)

getActions() {
  return `<button class="btn btn-primary" id="newItemBtn">New Item</button>`;
}

setupCustomActionListeners() {
  const newItemBtn = this.container.querySelector("#newItemBtn");
  if (newItemBtn) {
    newItemBtn.addEventListener("click", this.handleNewItemClick);
  }
}


    /**
     * Return skeleton template HTML shown during initial loading
     * This provides a loading placeholder while data is being fetched
     */
    getSkeletonTemplate() {
        return `
            <div class="skeleton-container">
                <div class="skeleton-item pulse"></div>
                <div class="skeleton-row">
                    <div class="skeleton-cell pulse"></div>
                    <div class="skeleton-cell pulse"></div>
                </div>
                <div class="skeleton-row">
                    <div class="skeleton-cell pulse"></div>
                    <div class="skeleton-cell pulse"></div>
                </div>
            </div>
        `;
    }

    /**
     * Asynchronously load data from database
     * Called if requiresDatabase = true
     * Store loaded data as instance properties for later use
     * Subject to loadingTimeout - will trigger error if it takes too long
     */
    async loadDatabaseContent() {
        try {
            // Get Firebase access from the app
            const firebase = window.app.getLibrary('firebase');
            
            // === EXAMPLE: Loading collections ===
            const usersCollection = firebase.collection(firebase.firestore, 'users');
            const itemsCollection = firebase.collection(firebase.firestore, 'items');
            
            // === EXAMPLE: Basic queries ===
            // Get all items
            const itemsQuery = firebase.query(
                itemsCollection,
                firebase.orderBy('createdAt', 'desc'),
                firebase.limit(50)
            );
            
            // === EXAMPLE: Filtered queries ===
            // Get only active items for current user
            const userId = this.getUserData()?.uid;
            const userItemsQuery = firebase.query(
                itemsCollection,
                firebase.where('userId', '==', userId),
                firebase.where('status', '==', 'active'),
                firebase.orderBy('createdAt', 'desc')
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
            
            // === EXAMPLE: Getting a single document ===
            if (userId) {
                const userDoc = await firebase.getDoc(
                    firebase.doc(firebase.firestore, `users/${userId}`)
                );
                
                if (userDoc.exists()) {
                    this.userData = {
                        id: userDoc.id,
                        ...userDoc.data()
                    };
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error loading database content:', error);
            throw new Error('DATABASE_ERROR');
        }
    }

    /**
     * Return the main page content HTML
     * Called after structure is rendered and data is loaded
     * This replaces the skeleton template with actual content
     */
    async getContent() {
        // For simple pages, you can just return HTML directly
        if (!this.items || this.items.length === 0) {
            return `
                <div class="empty-state">
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
            <div class="item-card" data-id="${item.id}">
                <h3>${this.escapeHtml(item.title)}</h3>
                <p>${this.escapeHtml(item.description)}</p>
                <div class="item-actions">
                    <button class="btn btn-text edit-item">Edit</button>
                    <button class="btn btn-danger delete-item">Delete</button>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="page-stats">
                <div class="stat-card">
                    <span class="stat-value">${this.items.length}</span>
                    <span class="stat-label">Total Items</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${this.userItems.length}</span>
                    <span class="stat-label">Your Items</span>
                </div>
            </div>
            
            <div class="items-container">
                ${itemsHtml}
            </div>
        `;
    }

    /**
     * Called after structure is rendered but before content
     * Use for setting up structure-level event listeners
     */
    async afterStructureRender() {
        // Always call parent method first
        await super.afterStructureRender();
        
        // Setup for structure-level elements that exist before content loads
        const refreshBtn = this.container.querySelector('#refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    /**
     * Called after content is fully rendered
     * Use for setting up event listeners on content elements
     */
    async afterContentRender() {
        // Setup for content elements that only exist after content loads
        
        // Example: Setup item creation
        const newItemBtn = this.container.querySelector('#newItemBtn');
        if (newItemBtn) {
            newItemBtn.addEventListener('click', () => this.showCreateItemModal());
        }
        
        const createFirstItem = this.container.querySelector('#createFirstItem');
        if (createFirstItem) {
            createFirstItem.addEventListener('click', () => this.showCreateItemModal());
        }
        
        // Example: Setup item edit/delete actions
        const editButtons = this.container.querySelectorAll('.edit-item');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const itemId = e.target.closest('.item-card').dataset.id;
                this.editItem(itemId);
            });
        });
        
        const deleteButtons = this.container.querySelectorAll('.delete-item');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const itemId = e.target.closest('.item-card').dataset.id;
                this.confirmDeleteItem(itemId);
            });
        });
    }

    /**
     * Helper method to safely escape HTML content
     * Use this to prevent XSS when inserting user-generated content
     */
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Example of a page-specific action method
     */
    refresh() {
        // Reset render attempt counter and re-render the page
        this.currentRenderAttempt = 0;
        this.render();
    }

    /**
     * Example of opening a modal
     */
    showCreateItemModal() {
        const modalHtml = `
            <div class="modal-content">
                <h2>Create New Item</h2>
                <form id="createItemForm">
                    <div class="form-group">
                        <label for="itemTitle">Title</label>
                        <input type="text" id="itemTitle" required>
                    </div>
                    <div class="form-group">
                        <label for="itemDescription">Description</label>
                        <textarea id="itemDescription" rows="4"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-text" id="cancelCreate">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create</button>
                    </div>
                </form>
            </div>
        `;
        
        // Use the app's modal system to show the modal
        const modal = window.app.getModalManager().showModal(modalHtml);
        
        // Set up form submission
        const form = modal.querySelector('#createItemForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createItem({
                title: form.querySelector('#itemTitle').value,
                description: form.querySelector('#itemDescription').value
            });
            window.app.getModalManager().closeModal();
        });
        
        // Set up cancel button
        const cancelBtn = modal.querySelector('#cancelCreate');
        cancelBtn.addEventListener('click', () => {
            window.app.getModalManager().closeModal();
        });
    }

    /**
     * Example of creating an item in the database
     */
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
            window.app.getNotificationManager().showNotification({
                type: 'success',
                message: 'Item created successfully!'
            });
            
            // Refresh the page to show the new item
            this.refresh();
            
            return docRef.id;
        } catch (error) {
            console.error('Error creating item:', error);
            
            // Show error notification
            window.app.getNotificationManager().showNotification({
                type: 'error',
                message: 'Failed to create item. Please try again.'
            });
            
            return null;
        }
    }

    /**
     * Example of editing an item
     */
    editItem(itemId) {
        // Find the item data
        const item = this.items.find(item => item.id === itemId);
        if (!item) return;
        
        // Implementation details would go here...
        console.log(`Editing item: ${itemId}`);
    }

    /**
     * Example of deleting an item with confirmation
     */
    confirmDeleteItem(itemId) {
        // Implementation details would go here...
        console.log(`Confirming deletion of item: ${itemId}`);
    }

    /**
     * Clean up resources when navigating away from page
     * The framework calls this automatically on navigation
     */
    destroy() {
        // Always call parent method first to handle base cleanup
        super.destroy();
        
        // Perform any additional cleanup specific to this page
        // (e.g., unsubscribe from real-time listeners)
        
        if (this.realtimeUnsubscribe) {
            this.realtimeUnsubscribe();
            this.realtimeUnsubscribe = null;
        }
        
        // Clear references to DOM elements
        this.container = null;
    }
}
