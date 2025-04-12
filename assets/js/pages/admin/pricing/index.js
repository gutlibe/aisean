import { Page } from "../../../core/page.js";

/**
 * PricingAdminPage - Manage subscription pricing plans
 * 
 * This page allows administrators to configure pricing for subscription plans
 * which will be displayed on the public pricing and upgrade pages.
 */
export class PricingAdminPage extends Page {
  constructor() {
    super();
    
    // Basic configuration
    this.showMenuIcon = true;
    this.showBackArrow = true;
    
    // Database configuration
    this.requiresDatabase = true;
    this.loadingTimeout = 20000;
    this.maxRetries = 2;
    this.retryDelay = 1000;
    
    // Initialize state
    this.pricingData = null;
    this.isEditing = false;
    this.currentEditId = null;
    this.listeners = [];
    this.isSaving = false; // Add flag to track saving state
    this.realtimeListenerActive = false; // Flag to track if realtime listener is already active
    
    // CSS files to load
    this.cssFiles = [
      "pages/admin/pricing/index.css",
    ];
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} str - The string to escape
   * @returns {string} - The escaped string
   */
  escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Return the page title shown in the header
   */
  getTitle() {
    return 'Subscription Pricing Management';
  }

  /**
   * Return the icon to display next to the page title
   */
  getHeaderIcon() {
    return 'fas fa-tags';
  }

  /**
   * Return header action buttons
   */
  getActions() {
    return `
      <button class="btn btn-primary" id="addPlanBtn">
        <i class="fas fa-plus"></i> Add Plan
      </button>
    `;
  }

  /**
   * Return skeleton template HTML shown during loading
   */
  getSkeletonTemplate() {
    return `
      <div class="prc-container">
        <div class="prc-header skeleton-pulse"></div>
        <div class="prc-controls skeleton-pulse"></div>
        <div class="prc-table-container">
          <div class="prc-table-header skeleton-pulse"></div>
          <div class="prc-table-row skeleton-pulse"></div>
          <div class="prc-table-row skeleton-pulse"></div>
          <div class="prc-table-row skeleton-pulse"></div>
        </div>
        <div class="prc-form-container skeleton-pulse"></div>
      </div>
    `;
  }

  /**
   * Load data from Realtime Database
   */
  async loadDatabaseContent() {
    try {
      const firebase = window.app.getLibrary('firebase');
      
      // Create a reference to the pricing data in Realtime Database
      const pricingRef = firebase.ref(firebase.database, 'settings/pricing');
      
      // Get the data once
      const snapshot = await firebase.get(pricingRef);
      
      if (snapshot.exists()) {
        // Convert the data to an array for easier manipulation
        const pricingData = snapshot.val();
        this.pricingData = this.convertToArray(pricingData);
      } else {
        // Initialize with empty array if no data exists
        this.pricingData = [];
      }
      
      return true;
    } catch (error) {
      console.error('Error loading pricing data:', error);
      window.app.showToast('Failed to load pricing data', 'error');
      throw new Error('DATABASE_ERROR');
    }
  }

  /**
   * Convert pricing data object to array
   */
  convertToArray(pricingData) {
    if (!pricingData) return [];
    
    // If it's already an array, return it
    if (Array.isArray(pricingData)) return pricingData;
    
    // Convert object to array
    return Object.keys(pricingData).map(key => ({
      id: key,
      ...pricingData[key]
    }));
  }

  /**
   * Return the main page content HTML
   */
  async getContent() {
    return `
      <div class="prc-container">
        <div class="prc-header">
          <h2>Subscription Pricing Management</h2>
          <p>Configure pricing plans for your subscription offerings</p>
        </div>
        
        <div class="prc-controls">
          <div class="prc-search">
            <input type="text" id="searchPlans" placeholder="Search plans..." class="prc-search-input">
            <i class="fas fa-search prc-search-icon"></i>
          </div>
          <div class="prc-filter">
            <select id="statusFilter" class="prc-filter-select">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        
        <div class="prc-table-container">
          ${this.renderPricingTable()}
        </div>
        
        <div id="pricingFormContainer" class="prc-form-container" style="display: none;">
          ${this.renderPricingForm()}
        </div>
      </div>
    `;
  }

  /**
   * Render the pricing table
   */
  renderPricingTable() {
    if (!this.pricingData || this.pricingData.length === 0) {
      return `
        <div class="prc-empty-state">
          <i class="fas fa-tags prc-empty-icon"></i>
          <h3>No Pricing Plans Found</h3>
          <p>Create your first pricing plan to get started.</p>
        </div>
      `;
    }

    const tableRows = this.pricingData.map(plan => `
      <tr data-id="${plan.id}">
        <td>
          <div class="prc-plan-name">${this.escapeHtml(plan.name)}</div>
          <div class="prc-plan-id">${plan.id}</div>
        </td>
        <td>
          <div class="prc-plan-duration">${plan.duration} days</div>
        </td>
        <td>
          <div class="prc-plan-price">₵${plan.price.toFixed(2)}</div>
        </td>
        <td>
          <div class="prc-status-badge ${plan.active ? 'prc-status-active' : 'prc-status-inactive'}">
            ${plan.active ? 'Active' : 'Inactive'}
          </div>
        </td>
        <td>
          <div class="prc-actions">
            <button class="prc-btn-edit" data-id="${plan.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="prc-btn-toggle" data-id="${plan.id}" data-active="${plan.active}">
              <i class="fas ${plan.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
            </button>
            <button class="prc-btn-delete" data-id="${plan.id}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <table class="prc-table">
        <thead>
          <tr>
            <th>Plan Name</th>
            <th>Duration</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  }

  /**
   * Render the pricing form
   */
  renderPricingForm() {
    const plan = this.currentEditId ? 
      this.pricingData.find(p => p.id === this.currentEditId) : 
      { name: '', duration: 30, price: 0, active: true, features: [] };
    
    const formTitle = this.isEditing ? 'Edit Pricing Plan' : 'Add New Pricing Plan';
    const submitText = this.isEditing ? 'Update Plan' : 'Create Plan';
    
    return `
      <div class="prc-form">
        <div class="prc-form-header">
          <h3>${formTitle}</h3>
          <button id="closeFormBtn" class="prc-btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="pricingForm">
          <div class="prc-form-group">
            <label for="planName">Plan Name</label>
            <input type="text" id="planName" value="${this.isEditing ? this.escapeHtml(plan.name) : ''}" required>
          </div>
          
          <div class="prc-form-row">
            <div class="prc-form-group">
              <label for="planDuration">Duration (days)</label>
              <input type="number" id="planDuration" value="${plan.duration}" min="1" required>
            </div>
            
            <div class="prc-form-group">
              <label for="planPrice">Price (₵)</label>
              <input type="number" id="planPrice" value="${plan.price}" min="0" step="0.01" required>
            </div>
          </div>
          
          <div class="prc-form-group">
            <label for="planActive">Status</label>
            <select id="planActive">
              <option value="true" ${plan.active ? 'selected' : ''}>Active</option>
              <option value="false" ${!plan.active ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          
          <div class="prc-form-group">
            <label>Features (one per line)</label>
            <textarea id="planFeatures" rows="4">${this.isEditing ? plan.features.join('\n') : ''}</textarea>
          </div>
          
          <div class="prc-form-actions">
            <button type="button" id="cancelFormBtn" class="prc-btn-secondary">Cancel</button>
            <button type="submit" id="submitFormBtn" class="prc-btn-primary">${submitText}</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Set up custom action listeners
   */
  setupCustomActionListeners() {
    const addPlanBtn = this.container.querySelector('#addPlanBtn');
    if (addPlanBtn) {
      addPlanBtn.addEventListener('click', () => this.showAddPlanForm());
    }
  }

  /**
   * Set up content-level event listeners
   */
  async afterContentRender() {
    // Set up search functionality
    const searchInput = this.container.querySelector('#searchPlans');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.filterPlans();
      }, 300));
    }
    
    // Set up status filter
    const statusFilter = this.container.querySelector('#statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.filterPlans();
      });
    }
    
    // Set up edit buttons
    const editButtons = this.container.querySelectorAll('.prc-btn-edit');
    editButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const planId = e.currentTarget.dataset.id;
        this.showEditPlanForm(planId);
      });
    });
    
    // Set up toggle buttons
    const toggleButtons = this.container.querySelectorAll('.prc-btn-toggle');
    toggleButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const planId = e.currentTarget.dataset.id;
        const isActive = e.currentTarget.dataset.active === 'true';
        this.togglePlanStatus(planId, !isActive, e.currentTarget);
      });
    });
    
    // Set up delete buttons
    const deleteButtons = this.container.querySelectorAll('.prc-btn-delete');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const planId = e.currentTarget.dataset.id;
        this.confirmDeletePlan(planId);
      });
    });
    
    // Set up form event listeners if form is visible
    this.setupFormEventListeners();
    
    // Set up real-time listener for pricing data (only if not already active)
    if (!this.realtimeListenerActive) {
      this.setupRealtimeListener();
    }
  }

  /**
   * Set up form event listeners
   */
  setupFormEventListeners() {
    const formContainer = this.container.querySelector('#pricingFormContainer');
    if (!formContainer || formContainer.style.display === 'none') return;
    
    const closeFormBtn = this.container.querySelector('#closeFormBtn');
    const cancelFormBtn = this.container.querySelector('#cancelFormBtn');
    const pricingForm = this.container.querySelector('#pricingForm');
    
    if (closeFormBtn) {
      closeFormBtn.addEventListener('click', () => this.hideForm());
    }
    
    if (cancelFormBtn) {
      cancelFormBtn.addEventListener('click', () => this.hideForm());
    }
    
    if (pricingForm) {
      pricingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePricingPlan();
      });
    }
  }

  /**
   * Set up real-time listener for pricing data
   */
  setupRealtimeListener() {
    // If listener is already active, don't set up another one
    if (this.realtimeListenerActive) {
      return;
    }
    
    const firebase = window.app.getLibrary('firebase');
    
    // Create a reference to the pricing data
    const pricingRef = firebase.ref(firebase.database, 'settings/pricing');
    
    // Set up a listener for changes
    const unsubscribe = firebase.onValue(pricingRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          // Safely extract data from snapshot
          const pricingData = snapshot.val();
          
          // Update the pricing data in memory
          this.pricingData = this.convertToArray(pricingData);
          
          // Update the table if not currently editing
          if (!this.isEditing) {
            const tableContainer = this.container.querySelector('.prc-table-container');
            if (tableContainer) {
              tableContainer.innerHTML = this.renderPricingTable();
              
              // Set up event listeners for the new table content
              // without recursively calling setupRealtimeListener
              this.setupTableEventListeners();
            }
          }
        } else {
          this.pricingData = [];
          
          // Update the table to show empty state
          const tableContainer = this.container.querySelector('.prc-table-container');
          if (tableContainer) {
            tableContainer.innerHTML = this.renderPricingTable();
          }
        }
      } catch (error) {
        console.error('Error handling pricing data update:', error);
      }
    }, (error) => {
      console.error('Firebase onValue error:', error);
    });
    
    // Store the unsubscribe function for cleanup
    this.listeners.push(unsubscribe);
    
    // Mark the listener as active
    this.realtimeListenerActive = true;
  }
  
  /**
   * Set up event listeners for table elements
   * This is extracted from afterContentRender to avoid recursive calls
   */
  setupTableEventListeners() {
    // Set up edit buttons
    const editButtons = this.container.querySelectorAll('.prc-btn-edit');
    editButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const planId = e.currentTarget.dataset.id;
        this.showEditPlanForm(planId);
      });
    });
    
    // Set up toggle buttons
    const toggleButtons = this.container.querySelectorAll('.prc-btn-toggle');
    toggleButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const planId = e.currentTarget.dataset.id;
        const isActive = e.currentTarget.dataset.active === 'true';
        this.togglePlanStatus(planId, !isActive, e.currentTarget);
      });
    });
    
    // Set up delete buttons
    const deleteButtons = this.container.querySelectorAll('.prc-btn-delete');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const planId = e.currentTarget.dataset.id;
        this.confirmDeletePlan(planId);
      });
    });
  }

  /**
   * Filter plans based on search and status filter
   */
  filterPlans() {
    const searchInput = this.container.querySelector('#searchPlans');
    const statusFilter = this.container.querySelector('#statusFilter');
    
    if (!searchInput || !statusFilter) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    
    const rows = this.container.querySelectorAll('.prc-table tbody tr');
    
    rows.forEach(row => {
      const planName = row.querySelector('.prc-plan-name').textContent.toLowerCase();
      const planId = row.querySelector('.prc-plan-id').textContent.toLowerCase();
      const isActive = row.querySelector('.prc-status-badge').classList.contains('prc-status-active');
      
      const matchesSearch = planName.includes(searchTerm) || planId.includes(searchTerm);
      const matchesStatus = statusValue === 'all' || 
                           (statusValue === 'active' && isActive) || 
                           (statusValue === 'inactive' && !isActive);
      
      row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
  }

  /**
   * Show the form to add a new plan
   */
  showAddPlanForm() {
    this.isEditing = false;
    this.currentEditId = null;
    
    const formContainer = this.container.querySelector('#pricingFormContainer');
    if (formContainer) {
      formContainer.innerHTML = this.renderPricingForm();
      formContainer.style.display = 'block';
      
      // Set up form event listeners
      this.setupFormEventListeners();
      
      // Scroll to form
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Show the form to edit an existing plan
   */
  showEditPlanForm(planId) {
    this.isEditing = true;
    this.currentEditId = planId;
    
    const formContainer = this.container.querySelector('#pricingFormContainer');
    if (formContainer) {
      formContainer.innerHTML = this.renderPricingForm();
      formContainer.style.display = 'block';
      
      // Set up form event listeners
      this.setupFormEventListeners();
      
      // Scroll to form
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Hide the form
   */
  hideForm() {
    const formContainer = this.container.querySelector('#pricingFormContainer');
    if (formContainer) {
      formContainer.style.display = 'none';
      this.isEditing = false;
      this.currentEditId = null;
    }
  }

  /**
   * Set button loading state
   * @param {HTMLElement} button - The button element
   * @param {boolean} isLoading - Whether to show loading state
   * @param {string} originalText - The original button text
   */
  setButtonLoading(button, isLoading, originalText = null) {
    if (!button) return;
    
    if (isLoading) {
      // Store original text if not provided
      if (!originalText) {
        button.dataset.originalText = button.innerHTML;
      }
      
      // Set loading state
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      button.disabled = true;
      button.classList.add('prc-btn-loading');
    } else {
      // Restore original text
      button.innerHTML = originalText || button.dataset.originalText || button.innerHTML;
      button.disabled = false;
      button.classList.remove('prc-btn-loading');
      
      // Clean up stored text
      if (button.dataset.originalText) {
        delete button.dataset.originalText;
      }
    }
  }

  /**
   * Save the pricing plan
   */
  async savePricingPlan() {
    // Prevent multiple submissions
    if (this.isSaving) return;
    
    // Get the submit button
    const submitBtn = this.container.querySelector('#submitFormBtn');
    if (!submitBtn) return;
    
    try {
      this.isSaving = true;
      
      // Set button to loading state
      this.setButtonLoading(submitBtn, true);
      
      const planName = this.container.querySelector('#planName').value.trim();
      const planDuration = parseInt(this.container.querySelector('#planDuration').value, 10);
      const planPrice = parseFloat(this.container.querySelector('#planPrice').value);
      const planActive = this.container.querySelector('#planActive').value === 'true';
      const planFeatures = this.container.querySelector('#planFeatures').value
        .split('\n')
        .map(feature => feature.trim())
        .filter(feature => feature.length > 0);
      
      // Validate inputs
      if (!planName) {
        window.app.showToast('Plan name is required', 'error');
        this.setButtonLoading(submitBtn, false);
        this.isSaving = false;
        return;
      }
      
      if (isNaN(planDuration) || planDuration < 1) {
        window.app.showToast('Duration must be a positive number', 'error');
        this.setButtonLoading(submitBtn, false);
        this.isSaving = false;
        return;
      }
      
      if (isNaN(planPrice) || planPrice < 0) {
        window.app.showToast('Price must be a non-negative number', 'error');
        this.setButtonLoading(submitBtn, false);
        this.isSaving = false;
        return;
      }
      
      // Create plan object
      const plan = {
        name: planName,
        duration: planDuration,
        price: planPrice,
        active: planActive,
        features: planFeatures,
        updatedAt: Date.now()
      };
      
      // Add createdAt for new plans
      if (!this.isEditing) {
        plan.createdAt = Date.now();
      }
      
      const firebase = window.app.getLibrary('firebase');
      
      // Generate a new ID for new plans
      const planId = this.isEditing ? this.currentEditId : `plan_${Date.now()}`;
      
      // Create a reference to the specific plan
      const planRef = firebase.ref(firebase.database, `settings/pricing/${planId}`);
      
      // Save the plan
      await firebase.set(planRef, plan);
      
      // Show success message
      window.app.showToast(
        this.isEditing ? 'Plan updated successfully' : 'Plan created successfully', 
        'success'
      );
      
      // Hide the form
      this.hideForm();
      
    } catch (error) {
      console.error('Error saving pricing plan:', error);
      window.app.showToast('Failed to save pricing plan', 'error');
    } finally {
      // Reset button state
      this.setButtonLoading(submitBtn, false);
      this.isSaving = false;
    }
  }

  /**
   * Toggle plan active status
   */
  async togglePlanStatus(planId, newStatus, button) {
    // Get the button if not provided
    if (!button) {
      button = this.container.querySelector(`.prc-btn-toggle[data-id="${planId}"]`);
    }
    
    try {
      // Set button to loading state
      if (button) {
        this.setButtonLoading(button, true);
      }
      
      const firebase = window.app.getLibrary('firebase');
      
      // Create a reference to the plan's active status
      const statusRef = firebase.ref(firebase.database, `settings/pricing/${planId}/active`);
      
      // Update the status
      await firebase.set(statusRef, newStatus);
      
      // Show success message
      window.app.showToast(
        `Plan ${newStatus ? 'activated' : 'deactivated'} successfully`, 
        'success'
      );
      
    } catch (error) {
      console.error('Error toggling plan status:', error);
      window.app.showToast('Failed to update plan status', 'error');
    } finally {
      // Reset button state
      if (button) {
        const icon = newStatus ? 'fa-toggle-on' : 'fa-toggle-off';
        this.setButtonLoading(button, false, `<i class="fas ${icon}"></i>`);
        
        // Update data attributes
        button.dataset.active = newStatus.toString();
      }
    }
  }

  /**
   * Confirm and delete a plan
   */
  confirmDeletePlan(planId) {
    // Find the plan name
    const plan = this.pricingData.find(p => p.id === planId);
    if (!plan) return;
    
    const planName = plan.name;
    
    // Create confirmation dialog
    const confirmHtml = `
      <div class="prc-confirm-dialog">
        <div class="prc-confirm-header">
          <i class="fas fa-exclamation-triangle prc-confirm-icon"></i>
          <h3>Delete Pricing Plan</h3>
        </div>
        <p>Are you sure you want to delete the pricing plan "${this.escapeHtml(planName)}"?</p>
        <p class="prc-confirm-warning">This action cannot be undone.</p>
        <div class="prc-confirm-actions">
          <button id="cancelDeleteBtn" class="prc-btn-secondary">Cancel</button>
          <button id="confirmDeleteBtn" class="prc-btn-danger">Delete Plan</button>
        </div>
      </div>
    `;
    
    // Create modal container if it doesn't exist
    let modalContainer = document.querySelector('.prc-modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.className = 'prc-modal-container';
      document.body.appendChild(modalContainer);
    }
    
    // Show the confirmation dialog
    modalContainer.innerHTML = confirmHtml;
    modalContainer.style.display = 'flex';
    
    // Set up event listeners
    const cancelBtn = modalContainer.querySelector('#cancelDeleteBtn');
    const confirmBtn = modalContainer.querySelector('#confirmDeleteBtn');
    
    cancelBtn.addEventListener('click', () => {
      modalContainer.style.display = 'none';
    });
    
    confirmBtn.addEventListener('click', () => {
      this.deletePlan(planId, confirmBtn);
      // Don't hide the modal yet, wait for the deletion to complete
    });
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId, button) {
    try {
      // Set button to loading state
      if (button) {
        this.setButtonLoading(button, true);
      }
      
      const firebase = window.app.getLibrary('firebase');
      
      // Create a reference to the plan
      const planRef = firebase.ref(firebase.database, `settings/pricing/${planId}`);
      
      // Delete the plan
      await firebase.remove(planRef);
      
      // Show success message
      window.app.showToast('Plan deleted successfully', 'success');
      
      // Hide the modal
      const modalContainer = document.querySelector('.prc-modal-container');
      if (modalContainer) {
        modalContainer.style.display = 'none';
      }
      
    } catch (error) {
      console.error('Error deleting plan:', error);
      window.app.showToast('Failed to delete plan', 'error');
      
      // Reset button state
      if (button) {
        this.setButtonLoading(button, false);
      }
    }
  }

  /**
   * Clean up resources when the page is destroyed
   */
  destroy() {
    super.destroy();
    
    // Remove real-time listeners
    if (this.listeners && this.listeners.length > 0) {
      this.listeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      this.listeners = [];
    }
    
    // Reset listener active flag
    this.realtimeListenerActive = false;
    
    // Remove modal container if it exists
    const modalContainer = document.querySelector('.prc-modal-container');
    if (modalContainer) {
      modalContainer.remove();
    }
  }
}
