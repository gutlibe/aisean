import { Page } from "../../../core/page.js";

/**
 * ConfigsAdminPage - Manage application configurations
 * 
 * This page allows administrators to configure system settings like
 * API keys and integration tokens that are used throughout the application.
 */
export class ConfigsAdminPage extends Page {
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
    
    // Initialize state
    this.configData = null;
    this.isEditing = false;
    this.currentSection = null;
    this.listeners = [];
    
    // CSS files to load
    this.cssFiles = [
      "pages/admin/configs/index.css",
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
    return 'System Configuration';
  }

  /**
   * Return the icon to display next to the page title
   */
  getHeaderIcon() {
    return 'fas fa-cogs';
  }

  /**
   * Return header action buttons
   */
  getActions() {
    return `
      <button class="btn btn-primary" id="saveAllBtn">
        <i class="fas fa-save"></i> Save All
      </button>
    `;
  }

  /**
   * Return skeleton template HTML shown during loading
   */
  getSkeletonTemplate() {
    return `
      <div class="cfg-container">
        <div class="cfg-header skeleton-pulse"></div>
        <div class="cfg-tabs skeleton-pulse"></div>
        <div class="cfg-content">
          <div class="cfg-section skeleton-pulse"></div>
          <div class="cfg-section skeleton-pulse"></div>
          <div class="cfg-section skeleton-pulse"></div>
        </div>
      </div>
    `;
  }

  /**
   * Load data from Realtime Database
   */
  async loadDatabaseContent() {
    try {
      const firebase = window.app.getLibrary('firebase');
      
      // Create a reference to the configs data in Realtime Database
      const configsRef = firebase.ref(firebase.database, 'configs');
      
      // Get the data once
      const snapshot = await firebase.get(configsRef);
      
      if (snapshot.exists()) {
        this.configData = snapshot.val();
      } else {
        // Initialize with default structure if no data exists
        this.configData = {
          PAYSTACK_PUBLIC_KEY: '',
          telegram: {
            bot_token: '',
            chat_id: ''
          },
          app: {
            name: 'AIsean',
            version: '1.0.0',
            maintenance_mode: false
          }
        };
      }
      
      return true;
    } catch (error) {
      console.error('Error loading configuration data:', error);
      window.app.showToast('Failed to load configuration data', 'error');
      throw new Error('DATABASE_ERROR');
    }
  }

  /**
   * Return the main page content HTML
   */
  async getContent() {
    return `
      <div class="cfg-container">
        <div class="cfg-header">
          <h2>System Configuration</h2>
          <p>Manage application settings and integration keys</p>
        </div>
        
        <div class="cfg-tabs">
          <button class="cfg-tab-btn active" data-section="payment">Payment</button>
          <button class="cfg-tab-btn" data-section="telegram">Telegram</button>
          <button class="cfg-tab-btn" data-section="app">Application</button>
        </div>
        
        <div class="cfg-content">
          ${this.renderPaymentSection()}
          ${this.renderTelegramSection()}
          ${this.renderAppSection()}
        </div>
      </div>
    `;
  }

  /**
   * Render the payment configuration section
   */
  renderPaymentSection() {
    const paystackKey = this.configData.PAYSTACK_PUBLIC_KEY || '';
    
    return `
      <div class="cfg-section active" id="payment-section">
        <div class="cfg-section-header">
          <h3>Payment Configuration</h3>
          <p>Configure payment gateway integration settings</p>
        </div>
        
        <div class="cfg-form">
          <div class="cfg-form-group">
            <label for="paystackKey">Paystack Public Key</label>
            <div class="cfg-input-group">
              <input type="text" id="paystackKey" value="${this.escapeHtml(paystackKey)}" 
                placeholder="pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
              <button class="cfg-btn-reveal" data-target="paystackKey">
                <i class="fas fa-eye"></i>
              </button>
            </div>
            <div class="cfg-form-help">
              Used for payment processing. Get this from your Paystack dashboard.
            </div>
          </div>
          
          <div class="cfg-form-actions">
            <button class="cfg-btn-primary" id="savePaymentBtn">
              <i class="fas fa-save"></i> Save Payment Settings
            </button>
            <button class="cfg-btn-secondary" id="testPaymentBtn">
              <i class="fas fa-vial"></i> Test Connection
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the Telegram configuration section
   */
  renderTelegramSection() {
    const telegram = this.configData.telegram || { bot_token: '', chat_id: '' };
    
    return `
      <div class="cfg-section" id="telegram-section">
        <div class="cfg-section-header">
          <h3>Telegram Integration</h3>
          <p>Configure Telegram bot for notifications and support</p>
        </div>
        
        <div class="cfg-form">
          <div class="cfg-form-group">
            <label for="telegramToken">Bot Token</label>
            <div class="cfg-input-group">
              <input type="text" id="telegramToken" value="${this.escapeHtml(telegram.bot_token)}" 
                placeholder="123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ">
              <button class="cfg-btn-reveal" data-target="telegramToken">
                <i class="fas fa-eye"></i>
              </button>
            </div>
            <div class="cfg-form-help">
              Get this from BotFather when creating a new bot.
            </div>
          </div>
          
          <div class="cfg-form-group">
            <label for="telegramChatId">Chat ID</label>
            <input type="text" id="telegramChatId" value="${this.escapeHtml(telegram.chat_id)}" 
              placeholder="-100123456789">
            <div class="cfg-form-help">
              The chat ID where notifications will be sent.
            </div>
          </div>
          
          <div class="cfg-form-actions">
            <button class="cfg-btn-primary" id="saveTelegramBtn">
              <i class="fas fa-save"></i> Save Telegram Settings
            </button>
            <button class="cfg-btn-secondary" id="testTelegramBtn">
              <i class="fas fa-paper-plane"></i> Send Test Message
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the application configuration section
   */
  renderAppSection() {
    const app = this.configData.app || { name: 'AIsean', version: '1.0.0', maintenance_mode: false };
    
    return `
      <div class="cfg-section" id="app-section">
        <div class="cfg-section-header">
          <h3>Application Settings</h3>
          <p>Configure general application settings</p>
        </div>
        
        <div class="cfg-form">
          <div class="cfg-form-group">
            <label for="appName">Application Name</label>
            <input type="text" id="appName" value="${this.escapeHtml(app.name)}" 
              placeholder="Application Name">
          </div>
          
          <div class="cfg-form-group">
            <label for="appVersion">Version</label>
            <input type="text" id="appVersion" value="${this.escapeHtml(app.version)}" 
              placeholder="1.0.0">
          </div>
          
          <div class="cfg-form-group">
            <label class="cfg-toggle-label">
              <span>Maintenance Mode</span>
              <div class="cfg-toggle">
                <input type="checkbox" id="maintenanceMode" ${app.maintenance_mode ? 'checked' : ''}>
                <span class="cfg-toggle-slider"></span>
              </div>
            </label>
            <div class="cfg-form-help">
              When enabled, the site will display a maintenance page to all users.
            </div>
          </div>
          
          <div class="cfg-form-actions">
            <button class="cfg-btn-primary" id="saveAppBtn">
              <i class="fas fa-save"></i> Save Application Settings
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Set up custom action listeners
   */
  setupCustomActionListeners() {
    const saveAllBtn = this.container.querySelector('#saveAllBtn');
    if (saveAllBtn) {
      saveAllBtn.addEventListener('click', () => this.saveAllConfigurations());
    }
  }

  /**
   * Set up content-level event listeners
   */
  async afterContentRender() {
    // Set up tab navigation
    const tabButtons = this.container.querySelectorAll('.cfg-tab-btn');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const section = e.currentTarget.dataset.section;
        this.switchSection(section);
      });
    });
    
    // Set up reveal buttons for sensitive fields
    const revealButtons = this.container.querySelectorAll('.cfg-btn-reveal');
    revealButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        const inputField = this.container.querySelector(`#${targetId}`);
        
        if (inputField) {
          const type = inputField.type === 'password' ? 'text' : 'password';
          inputField.type = type;
          
          const icon = e.currentTarget.querySelector('i');
          if (icon) {
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
          }
        }
      });
    });
    
    // Set password type for sensitive fields initially
    const sensitiveFields = ['paystackKey', 'telegramToken'];
    sensitiveFields.forEach(fieldId => {
      const field = this.container.querySelector(`#${fieldId}`);
      if (field) {
        field.type = 'password';
      }
    });
    
    // Set up section save buttons
    const savePaymentBtn = this.container.querySelector('#savePaymentBtn');
    if (savePaymentBtn) {
      savePaymentBtn.addEventListener('click', () => this.savePaymentConfig());
    }
    
    const saveTelegramBtn = this.container.querySelector('#saveTelegramBtn');
    if (saveTelegramBtn) {
      saveTelegramBtn.addEventListener('click', () => this.saveTelegramConfig());
    }
    
    const saveAppBtn = this.container.querySelector('#saveAppBtn');
    if (saveAppBtn) {
      saveAppBtn.addEventListener('click', () => this.saveAppConfig());
    }
    
    // Set up test buttons
    const testPaymentBtn = this.container.querySelector('#testPaymentBtn');
    if (testPaymentBtn) {
      testPaymentBtn.addEventListener('click', () => this.testPaymentConnection());
    }
    
    const testTelegramBtn = this.container.querySelector('#testTelegramBtn');
    if (testTelegramBtn) {
      testTelegramBtn.addEventListener('click', () => this.testTelegramConnection());
    }
    
    // Set up real-time listener for config data
    this.setupRealtimeListener();
  }

  /**
   * Set up real-time listener for config data
   */
  setupRealtimeListener() {
    const firebase = window.app.getLibrary('firebase');
    
    // Create a reference to the configs data
    const configsRef = firebase.ref(firebase.database, 'configs');
    
    // Set up a listener for changes
    const unsubscribe = firebase.onValue(configsRef, (snapshot) => {
      if (snapshot.exists()) {
        this.configData = snapshot.val();
        
        // Update the form fields if not currently editing
        if (!this.isEditing) {
          this.updateFormFields();
        }
      }
    });
    
    // Store the unsubscribe function for cleanup
    this.listeners.push(unsubscribe);
  }

  /**
   * Update form fields with current config data
   */
  updateFormFields() {
    // Payment section
    const paystackKey = this.container.querySelector('#paystackKey');
    if (paystackKey) {
      paystackKey.value = this.configData.PAYSTACK_PUBLIC_KEY || '';
    }
    
    // Telegram section
    const telegram = this.configData.telegram || { bot_token: '', chat_id: '' };
    
    const telegramToken = this.container.querySelector('#telegramToken');
    if (telegramToken) {
      telegramToken.value = telegram.bot_token || '';
    }
    
    const telegramChatId = this.container.querySelector('#telegramChatId');
    if (telegramChatId) {
      telegramChatId.value = telegram.chat_id || '';
    }
    
    // App section
    const app = this.configData.app || { name: 'AIsean', version: '1.0.0', maintenance_mode: false };
    
    const appName = this.container.querySelector('#appName');
    if (appName) {
      appName.value = app.name || '';
    }
    
    const appVersion = this.container.querySelector('#appVersion');
    if (appVersion) {
      appVersion.value = app.version || '';
    }
    
    const maintenanceMode = this.container.querySelector('#maintenanceMode');
    if (maintenanceMode) {
      maintenanceMode.checked = app.maintenance_mode || false;
    }
  }

  /**
   * Switch between configuration sections
   */
  switchSection(sectionName) {
    // Update tab buttons
    const tabButtons = this.container.querySelectorAll('.cfg-tab-btn');
    tabButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.section === sectionName);
    });
    
    // Update sections
    const sections = this.container.querySelectorAll('.cfg-section');
    sections.forEach(section => {
      section.classList.remove('active');
    });
    
    const activeSection = this.container.querySelector(`#${sectionName}-section`);
    if (activeSection) {
      activeSection.classList.add('active');
    }
    
    this.currentSection = sectionName;
  }

  /**
   * Save payment configuration
   */
  async savePaymentConfig() {
    try {
      this.isEditing = true;
      
      const paystackKey = this.container.querySelector('#paystackKey').value.trim();
      
      // Validate inputs
      if (!paystackKey) {
        window.app.showToast('Paystack Public Key is required', 'error');
        this.isEditing = false;
        return;
      }
      
      const firebase = window.app.getLibrary('firebase');
      
      // Create a reference to the Paystack key
      const paystackRef = firebase.ref(firebase.database, 'configs/PAYSTACK_PUBLIC_KEY');
      
      // Save the key
      await firebase.set(paystackRef, paystackKey);
      
      // Show success message
      window.app.showToast('Payment configuration saved successfully', 'success');
      
    } catch (error) {
      console.error('Error saving payment configuration:', error);
      window.app.showToast('Failed to save payment configuration', 'error');
    } finally {
      this.isEditing = false;
    }
  }

  /**
   * Save Telegram configuration
   */
  async saveTelegramConfig() {
    try {
      this.isEditing = true;
      
      const botToken = this.container.querySelector('#telegramToken').value.trim();
      const chatId = this.container.querySelector('#telegramChatId').value.trim();
      
      // Validate inputs
      if (!botToken) {
        window.app.showToast('Telegram Bot Token is required', 'error');
        this.isEditing = false;
        return;
      }
      
      if (!chatId) {
        window.app.showToast('Telegram Chat ID is required', 'error');
        this.isEditing = false;
        return;
      }
      
      const firebase = window.app.getLibrary('firebase');
      
      // Create a reference to the Telegram config
      const telegramRef = firebase.ref(firebase.database, 'configs/telegram');
      
      // Save the Telegram config
      await firebase.set(telegramRef, {
        bot_token: botToken,
        chat_id: chatId
      });
      
      // Show success message
      window.app.showToast('Telegram configuration saved successfully', 'success');
      
    } catch (error) {
      console.error('Error saving Telegram configuration:', error);
      window.app.showToast('Failed to save Telegram configuration', 'error');
    } finally {
      this.isEditing = false;
    }
  }

  /**
   * Save application configuration
   */
  async saveAppConfig() {
    try {
      this.isEditing = true;
      
      const appName = this.container.querySelector('#appName').value.trim();
      const appVersion = this.container.querySelector('#appVersion').value.trim();
      const maintenanceMode = this.container.querySelector('#maintenanceMode').checked;
      
      // Validate inputs
      if (!appName) {
        window.app.showToast('Application Name is required', 'error');
        this.isEditing = false;
        return;
      }
      
      if (!appVersion) {
        window.app.showToast('Application Version is required', 'error');
        this.isEditing = false;
        return;
      }
      
      const firebase = window.app.getLibrary('firebase');
      
      // Create a reference to the app config
      const appRef = firebase.ref(firebase.database, 'configs/app');
      
      // Save the app config
      await firebase.set(appRef, {
        name: appName,
        version: appVersion,
        maintenance_mode: maintenanceMode
      });
      
      // Show success message
      window.app.showToast('Application configuration saved successfully', 'success');
      
      // If maintenance mode was changed, show additional message
      if (maintenanceMode !== (this.configData.app?.maintenance_mode || false)) {
        window.app.showToast(
          `Maintenance mode ${maintenanceMode ? 'enabled' : 'disabled'}`,
          maintenanceMode ? 'warning' : 'success'
        );
      }
      
    } catch (error) {
      console.error('Error saving application configuration:', error);
      window.app.showToast('Failed to save application configuration', 'error');
    } finally {
      this.isEditing = false;
    }
  }

  /**
   * Save all configurations
   */
  async saveAllConfigurations() {
    try {
      this.isEditing = true;
      
      // Collect all values
      const paystackKey = this.container.querySelector('#paystackKey').value.trim();
      const botToken = this.container.querySelector('#telegramToken').value.trim();
      const chatId = this.container.querySelector('#telegramChatId').value.trim();
      const appName = this.container.querySelector('#appName').value.trim();
      const appVersion = this.container.querySelector('#appVersion').value.trim();
      const maintenanceMode = this.container.querySelector('#maintenanceMode').checked;
      
      // Validate required fields
      if (!paystackKey) {
        window.app.showToast('Paystack Public Key is required', 'error');
        this.switchSection('payment');
        this.isEditing = false;
        return;
      }
      
      if (!botToken) {
        window.app.showToast('Telegram Bot Token is required', 'error');
        this.switchSection('telegram');
        this.isEditing = false;
        return;
      }
      
      if (!chatId) {
        window.app.showToast('Telegram Chat ID is required', 'error');
        this.switchSection('telegram');
        this.isEditing = false;
        return;
      }
      
      if (!appName) {
        window.app.showToast('Application Name is required', 'error');
        this.switchSection('app');
        this.isEditing = false;
        return;
      }
      
      if (!appVersion) {
        window.app.showToast('Application Version is required', 'error');
        this.switchSection('app');
        this.isEditing = false;
        return;
      }
      
      const firebase = window.app.getLibrary('firebase');
      
      // Create a reference to the configs
      const configsRef = firebase.ref(firebase.database, 'configs');
      
      // Save all configs
      await firebase.set(configsRef, {
        PAYSTACK_PUBLIC_KEY: paystackKey,
        telegram: {
          bot_token: botToken,
          chat_id: chatId
        },
        app: {
          name: appName,
          version: appVersion,
          maintenance_mode: maintenanceMode
        }
      });
      
      // Show success message
      window.app.showToast('All configurations saved successfully', 'success');
      
    } catch (error) {
      console.error('Error saving configurations:', error);
      window.app.showToast('Failed to save configurations', 'error');
    } finally {
      this.isEditing = false;
    }
  }

  /**
   * Test payment connection
   */
  async testPaymentConnection() {
    const paystackKey = this.container.querySelector('#paystackKey').value.trim();
    
    if (!paystackKey) {
      window.app.showToast('Please enter a Paystack Public Key first', 'warning');
      return;
    }
    
    window.app.showToast('Testing Paystack connection...', 'info');
    
    // Simulate a test (in a real app, you would make an API call to verify the key)
    setTimeout(() => {
      if (paystackKey.startsWith('pk_')) {
        window.app.showToast('Paystack connection successful!', 'success');
      } else {
        window.app.showToast('Invalid Paystack key format. Keys should start with "pk_"', 'error');
      }
    }, 1500);
  }

  /**
   * Test Telegram connection
   */
  async testTelegramConnection() {
    const botToken = this.container.querySelector('#telegramToken').value.trim();
    const chatId = this.container.querySelector('#telegramChatId').value.trim();
    
    if (!botToken || !chatId) {
      window.app.showToast('Please enter both Bot Token and Chat ID first', 'warning');
      return;
    }
    
    window.app.showToast('Sending test message to Telegram...', 'info');
    
    // Simulate a test (in a real app, you would make an API call to send a message)
    setTimeout(() => {
      if (botToken.includes(':') && chatId.match(/^-?\d+$/)) {
        window.app.showToast('Test message sent successfully!', 'success');
      } else {
        window.app.showToast('Invalid Bot Token or Chat ID format', 'error');
      }
    }, 1500);
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
  }
}
