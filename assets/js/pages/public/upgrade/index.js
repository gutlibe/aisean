import { Page } from "../../../core/page.js"
import paymentProcessor from "./utils/payment-processor.js"

export class UpgradePage extends Page {
  constructor() {
    super()
    this.showMenuIcon = false
    this.showBackArrow = true
    this.requiresDatabase = true
    this.requiresAuth = true
    this.authorizedUserTypes = []
    this.activeTab = 1 // Default to monthly tab
    this.isProcessing = false
    this.firebase = null
    this.currentUser = null
    this.userSubscription = null
    this.userData = null
    this.pricingData = null // Add this to store pricing data
    
    this.cssFiles = [
        "pages/public/upgrade/index.css",
    ]
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

  getTitle() {
    return "Upgrade to Premium"
  }

  getHeaderIcon() {
    return "fas fa-crown"
  }

  getActions() {
    return ``
  }

  getSkeletonTemplate() {
    return `
      <div class="upg-container">
        <div class="upg-tabs-container skeleton-pulse"></div>
        <div class="upg-content-container">
          <div class="upg-card skeleton-pulse"></div>
        </div>
      </div>
    `
  }

  async loadDatabaseContent() {
    // Initialize Firebase
    try {
      // Get Firebase instance from window.app
      if (!window.app) {
        throw new Error("App instance not available")
      }

      this.firebase = window.app.getLibrary("firebase")

      if (!this.firebase) {
        throw new Error("Firebase instance not available")
      }

      // Get current authenticated user
      const authManager = window.app.getAuthManager()
      if (!authManager) {
        throw new Error("Auth manager not available")
      }

      this.currentUser = authManager.getCurrentUser()

      if (!this.currentUser) {
        if (window.app.showToast) {
          window.app.showToast("You must be logged in to access this page", "error")
        }

        // Redirect to login page
        if (window.app.navigateTo) {
          window.app.navigateTo("/login")
        }
        return false
      }

      // Fetch user data from Firestore
      try {
        const userDoc = await this.firebase.getDoc(
          this.firebase.doc(this.firebase.firestore, `users/${this.currentUser.uid}`),
        )

        if (userDoc.exists()) {
          this.userData = {
            id: userDoc.id,
            ...userDoc.data(),
          }
        } else {
          throw new Error("User profile not found")
        }
      } catch (error) {
        console.error("Error loading user data:", error)
        if (window.app.showToast) {
          window.app.showToast("Error loading user profile. Please try again.", "error")
        }
        return false
      }

      // Load pricing data from Realtime Database
      try {
        // Create a reference to the pricing data in Realtime Database
        const pricingRef = this.firebase.ref(this.firebase.database, 'settings/pricing');
        
        // Get the data once
        const snapshot = await this.firebase.get(pricingRef);
        
        if (snapshot.exists()) {
          // Convert the data to an array for easier manipulation
          const pricingData = snapshot.val();
          this.pricingData = this.convertToArray(pricingData);
        } else {
          // Initialize with default values if no data exists
          this.pricingData = [
            {
              id: 'monthly',
              name: 'Monthly Premium',
              duration: 30,
              price: 29.99,
              active: true,
              features: [
                'Premium football predictions every day when matches are available',
                'Expert analysis and insights for each prediction',
                'Access to all upcoming premium features'
              ]
            },
            {
              id: 'quarterly',
              name: 'Quarterly Premium',
              duration: 90,
              price: 85,
              active: true,
              features: [
                'Premium football predictions every day when matches are available',
                'Expert analysis and insights for each prediction',
                'Access to all upcoming premium features',
                'Priority customer support'
              ]
            }
          ];
        }
      } catch (error) {
        console.error("Error loading pricing data:", error);
        // Fallback to default values if there's an error
        this.pricingData = [
          {
            id: 'monthly',
            name: 'Monthly Premium',
            duration: 30,
            price: 29.99,
            active: true,
            features: [
              'Premium football predictions every day when matches are available',
              'Expert analysis and insights for each prediction',
              'Access to all upcoming premium features'
            ]
          },
          {
            id: 'quarterly',
            name: 'Quarterly Premium',
            duration: 90,
            price: 85,
            active: true,
            features: [
              'Premium football predictions every day when matches are available',
              'Expert analysis and insights for each prediction',
              'Access to all upcoming premium features',
              'Priority customer support'
            ]
          }
        ];
      }

      // Initialize payment processor
      const initResult = await paymentProcessor.initialize(this.firebase, this.currentUser); // AWAIT HERE

      if (!initResult) {
        throw new Error("Failed to initialize payment processor")
      }

      // Check if user already has an active subscription
      try {
        this.userSubscription = await paymentProcessor.verifySubscription()
      } catch (error) {
        console.warn("Error checking subscription status:", error)
        // Continue loading the page even if subscription check fails
      }
    } catch (error) {
      console.error("Error initializing upgrade page:", error)
      if (window.app && window.app.showToast) {
        window.app.showToast("Error loading page resources. Please try again.", "error")
      }
      return false
    }

    // Parse URL query parameters to determine active tab
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get("tab")
    const planParam = urlParams.get("plan")

    if (tabParam === "1" || tabParam === "2") {
      this.activeTab = Number.parseInt(tabParam)
    } else if (planParam) {
      // If a specific plan is requested, find it and set the appropriate tab
      const plan = this.pricingData.find(p => p.id === planParam);
      if (plan) {
        this.activeTab = plan.duration <= 30 ? 1 : 2;
      }
    }

    // Simulate loading delay for skeleton animation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 600)
    })
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
   * Get monthly plan from pricing data
   */
  getMonthlyPlan() {
    if (!this.pricingData || !Array.isArray(this.pricingData)) {
      return null;
    }
    
    // Find a plan with duration around 30 days (28-31 days)
    return this.pricingData.find(plan => 
      plan.active && plan.duration >= 28 && plan.duration <= 31
    );
  }

  /**
   * Get quarterly plan from pricing data
   */
  getQuarterlyPlan() {
    if (!this.pricingData || !Array.isArray(this.pricingData)) {
      return null;
    }
    
    // Find a plan with duration around 90 days (85-95 days)
    return this.pricingData.find(plan => 
      plan.active && plan.duration >= 85 && plan.duration <= 95
    );
  }

  /**
   * Calculate savings amount for a plan
   * @param {Object} plan - The plan object
   * @returns {number} - The amount saved compared to monthly equivalent
   */
  calculateSavings(plan) {
    if (!plan || plan.duration <= 30) return 0;
    
    // Find the monthly plan
    const monthlyPlan = this.getMonthlyPlan();
    
    if (!monthlyPlan) return 0;
    
    // Calculate equivalent monthly cost
    const monthsCount = plan.duration / 30;
    const equivalentMonthlyTotal = monthlyPlan.price * monthsCount;
    
    // Calculate savings
    return Math.round(equivalentMonthlyTotal - plan.price);
  }

  async getContent() {
    // If user already has an active subscription, show subscription info instead
    if (this.userSubscription && this.userSubscription.isActive) {
      return this.getActiveSubscriptionContent()
    }

    return `
      <div class="upg-container">
        <div class="upg-tabs-container">
          <div class="upg-tabs">
            <div class="upg-tab ${this.activeTab === 1 ? "upg-tab-active" : ""}" data-tab="1">
              <i class="fas fa-calendar-alt"></i>
              <span>Monthly</span>
            </div>
            <div class="upg-tab ${this.activeTab === 2 ? "upg-tab-active" : ""}" data-tab="2">
              <i class="fas fa-calendar-check"></i>
              <span>Quarterly</span>
            </div>
          </div>
        </div>
        
        <div class="upg-content-container">
          <div class="upg-tab-content ${this.activeTab === 1 ? "upg-content-active" : ""}" id="tab-content-1">
            ${this.getMonthlyContent()}
          </div>
          <div class="upg-tab-content ${this.activeTab === 2 ? "upg-content-active" : ""}" id="tab-content-2">
            ${this.getQuarterlyContent()}
          </div>
        </div>
      </div>
    `
  }

  getActiveSubscriptionContent() {
    const endDate = new Date(this.userSubscription.endDate)
    const formattedEndDate = endDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    return `
      <div class="upg-container">
        <div class="upg-card">
          <div class="upg-card-header">
            <h2 class="upg-card-title">Active Premium Subscription</h2>
            <div class="upg-active-subscription-badge">
              <i class="fas fa-check-circle"></i> Active
            </div>
          </div>
          
          <div class="upg-card-body">
            <div class="upg-section">
              <h3 class="upg-section-title">
                <i class="fas fa-info-circle"></i> Subscription Details
              </h3>
              <div class="upg-subscription-details">
                <div class="upg-detail-item">
                  <span class="upg-detail-label">Plan:</span>
                  <span class="upg-detail-value">${this.userSubscription.plan === "monthly" ? "Monthly" : "Quarterly"} Premium</span>
                </div>
                <div class="upg-detail-item">
                  <span class="upg-detail-label">Status:</span>
                  <span class="upg-detail-value upg-status-active">Active</span>
                </div>
                <div class="upg-detail-item">
                  <span class="upg-detail-label">Expires on:</span>
                  <span class="upg-detail-value">${formattedEndDate}</span>
                </div>
                <div class="upg-detail-item">
                  <span class="upg-detail-label">Days remaining:</span>
                  <span class="upg-detail-value">${this.userSubscription.daysRemaining} days</span>
                </div>
              </div>
            </div>
            
            <div class="upg-section">
              <h3 class="upg-section-title">
                <i class="fas fa-check-circle"></i> Your Premium Benefits
              </h3>
              <ul class="upg-benefits-list">
                <li>
                  <i class="fas fa-futbol"></i>
                  <span>Premium football predictions every day when matches are available</span>
                </li>
                <li>
                  <i class="fas fa-chart-line"></i>
                  <span>Expert analysis and insights for each prediction</span>
                </li>
                <li>
                  <i class="fas fa-star"></i>
                  <span>Access to all premium features</span>
                </li>
                ${
                  this.userSubscription.plan === "quarterly"
                    ? `
                <li>
                  <i class="fas fa-headset"></i>
                  <span>Priority customer support</span>
                </li>`
                    : ""
                }
              </ul>
            </div>
          </div>
          
          <div class="upg-card-footer">
            <button id="go-to-premium" class="upg-pay-btn">
              View Premium Content
            </button>
          </div>
        </div>
      </div>
    `
  }

  getMonthlyContent() {
    const monthlyPlan = this.getMonthlyPlan();
    
    // If no monthly plan is found, show a message
    if (!monthlyPlan) {
      return `
        <div class="upg-card">
          <div class="upg-card-header">
            <h2 class="upg-card-title">Monthly Premium Subscription</h2>
          </div>
          <div class="upg-card-body">
            <div class="upg-empty-state">
              <i class="fas fa-exclamation-circle"></i>
              <p>Monthly subscription plan is currently unavailable. Please check back later or try the quarterly plan.</p>
            </div>
          </div>
        </div>
      `;
    }
    
    // Generate features HTML
    const featuresHtml = (monthlyPlan.features || []).map(feature => `
      <li>
        <i class="fas fa-check-circle"></i>
        <span>${this.escapeHtml(feature)}</span>
      </li>
    `).join('');
    
    return `
      <div class="upg-card">
        <div class="upg-card-header">
          <h2 class="upg-card-title">${this.escapeHtml(monthlyPlan.name)}</h2>
          <div class="upg-price-tag">
            <span class="upg-currency">₵</span>
            <span class="upg-amount">${monthlyPlan.price.toFixed(2)}</span>
            <span class="upg-period">/month</span>
          </div>
        </div>
        
        <div class="upg-card-body">
          <div class="upg-section">
            <h3 class="upg-section-title">
              <i class="fas fa-check-circle"></i> What You'll Get
            </h3>
            <ul class="upg-benefits-list">
              ${featuresHtml}
            </ul>
          </div>
          
          <div class="upg-section upg-agreement-section">
            <h3 class="upg-section-title">
              <i class="fas fa-file-signature"></i> Subscription Agreement
            </h3>
            <div class="upg-agreement">
              <p>By subscribing to our premium service, you agree to the following terms:</p>
              <ul>
                <li>Your subscription will be active for ${monthlyPlan.duration} days from the date of purchase</li>
                <li>Predictions are provided daily when matches are available</li>
                <li>There is <strong>no refund policy</strong> after subscribing</li>
                <li>While our predictions have a high success rate, results may vary and winning is not guaranteed for every prediction</li>
              </ul>
              <div class="upg-agreement-checkbox">
                <label class="upg-custom-checkbox">
                  <input type="checkbox" id="agreement-monthly">
                  <span class="upg-checkmark"></span>
                  <span class="upg-checkbox-label">I agree to the terms and conditions</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="upg-section">
            <h3 class="upg-section-title">
              <i class="fas fa-credit-card"></i> Payment Method
            </h3>
            <div class="upg-payment-methods">
              <div class="upg-payment-method">
                <div class="upg-payment-logo">
                  <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="upg-payment-info">
                  <h4>Paystack</h4>
                  <p>Secure payment processing</p>
                  <small>Mobile Money available for Ghana users</small>
                  <small>Credit/Debit cards available for international users</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="upg-card-footer">
          <button id="pay-monthly" class="upg-pay-btn" disabled data-plan="${monthlyPlan.id}" data-price="${monthlyPlan.price.toFixed(2)}">
            Pay ₵${monthlyPlan.price.toFixed(2)} Now
          </button>
        </div>
      </div>
    `
  }

  getQuarterlyContent() {
    const quarterlyPlan = this.getQuarterlyPlan();
    
    // If no quarterly plan is found, show a message
    if (!quarterlyPlan) {
      return `
        <div class="upg-card">
          <div class="upg-card-header">
            <h2 class="upg-card-title">Quarterly Premium Subscription</h2>
          </div>
          <div class="upg-card-body">
            <div class="upg-empty-state">
              <i class="fas fa-exclamation-circle"></i>
              <p>Quarterly subscription plan is currently unavailable. Please check back later or try the monthly plan.</p>
            </div>
          </div>
        </div>
      `;
    }
    
    // Calculate savings
    const savingsAmount = this.calculateSavings(quarterlyPlan);
    
    // Generate features HTML
    const featuresHtml = (quarterlyPlan.features || []).map(feature => `
      <li>
        <i class="fas fa-check-circle"></i>
        <span>${this.escapeHtml(feature)}</span>
      </li>
    `).join('');
    
    return `
      <div class="upg-card">
        <div class="upg-card-header">
          <div class="upg-best-value">Best Value</div>
          <h2 class="upg-card-title">${this.escapeHtml(quarterlyPlan.name)}</h2>
          <div class="upg-price-tag">
            <span class="upg-currency">₵</span>
            <span class="upg-amount">${quarterlyPlan.price.toFixed(2)}</span>
            <span class="upg-period">/3 months</span>
          </div>
          ${savingsAmount > 0 ? `<div class="upg-savings">Save ₵${savingsAmount} compared to monthly plan</div>` : ''}
        </div>
        
        <div class="upg-card-body">
          <div class="upg-section">
            <h3 class="upg-section-title">
              <i class="fas fa-check-circle"></i> What You'll Get
            </h3>
            <ul class="upg-benefits-list">
              ${featuresHtml}
            </ul>
          </div>
          
          <div class="upg-section upg-agreement-section">
            <h3 class="upg-section-title">
              <i class="fas fa-file-signature"></i> Subscription Agreement
            </h3>
            <div class="upg-agreement">
              <p>By subscribing to our premium service, you agree to the following terms:</p>
              <ul>
                <li>Your subscription will be active for ${quarterlyPlan.duration} days from the date of purchase</li>
                <li>Predictions are provided daily when matches are available</li>
                <li>There is <strong>no refund policy</strong> after subscribing</li>
                <li>While our predictions have a high success rate, results may vary and winning is not guaranteed for every prediction</li>
              </ul>
              <div class="upg-agreement-checkbox">
                <label class="upg-custom-checkbox">
                  <input type="checkbox" id="agreement-quarterly">
                  <span class="upg-checkmark"></span>
                  <span class="upg-checkbox-label">I agree to the terms and conditions</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="upg-section">
            <h3 class="upg-section-title">
              <i class="fas fa-credit-card"></i> Payment Method
            </h3>
            <div class="upg-payment-methods">
              <div class="upg-payment-method">
                <div class="upg-payment-logo">
                  <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="upg-payment-info">
                  <h4>Paystack</h4>
                  <p>Secure payment processing</p>
                  <small>Mobile Money available for Ghana users</small>
                  <small>Credit/Debit cards available for international users</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="upg-card-footer">
          <button id="pay-quarterly" class="upg-pay-btn" disabled data-plan="${quarterlyPlan.id}" data-price="${quarterlyPlan.price.toFixed(2)}">
            Pay ₵${quarterlyPlan.price.toFixed(2)} Now
          </button>
        </div>
      </div>
    `
  }

  async afterRender() {
    // This is called right after the skeleton is rendered
    // We need to check URL parameters here to set the active tab
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get("tab")
    const planParam = urlParams.get("plan")

    if (tabParam === "1" || tabParam === "2") {
      this.activeTab = Number.parseInt(tabParam)
    } else if (planParam) {
      // If a specific plan is requested, find it and set the appropriate tab
      const plan = this.pricingData?.find(p => p.id === planParam);
      if (plan) {
        this.activeTab = plan.duration <= 30 ? 1 : 2;
      }
    }
  }

  async afterContentRender() {
    // If user has active subscription, set up the "View Premium Content" button
    if (this.userSubscription && this.userSubscription.isActive) {
      const premiumButton = this.container.querySelector("#go-to-premium")
      if (premiumButton) {
        premiumButton.addEventListener("click", () => {
          if (window.app && window.app.navigateTo) {
            window.app.navigateTo("/premium")
          }
        })
      }
      return
    }

    // Set up tab switching
    const tabs = this.container.querySelectorAll(".upg-tab")
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabId = tab.getAttribute("data-tab")
        this.switchTab(tabId)
      })
    })

    // Set up agreement checkboxes
    const monthlyCheckbox = this.container.querySelector("#agreement-monthly")
    const quarterlyCheckbox = this.container.querySelector("#agreement-quarterly")
    const monthlyButton = this.container.querySelector("#pay-monthly")
    const quarterlyButton = this.container.querySelector("#pay-quarterly")

    if (monthlyCheckbox && monthlyButton) {
      monthlyCheckbox.addEventListener("change", () => {
        monthlyButton.disabled = !monthlyCheckbox.checked
      })
    }

    if (quarterlyCheckbox && quarterlyButton) {
      quarterlyCheckbox.addEventListener("change", () => {
        quarterlyButton.disabled = !quarterlyCheckbox.checked
      })
    }

    // Set up payment buttons
    if (monthlyButton) {
      monthlyButton.addEventListener("click", () => {
        const planId = monthlyButton.dataset.plan;
        const price = parseFloat(monthlyButton.dataset.price);
        this.handlePayment(planId, price);
      })
    }

    if (quarterlyButton) {
      quarterlyButton.addEventListener("click", () => {
        const planId = quarterlyButton.dataset.plan;
        const price = parseFloat(quarterlyButton.dataset.price);
        this.handlePayment(planId, price);
      })
    }
  }

  switchTab(tabId) {
    // Update URL without reloading the page
    const url = new URL(window.location)
    url.searchParams.set("tab", tabId)
    window.history.pushState({}, "", url)

    // Update active tab
    this.activeTab = Number.parseInt(tabId)

    // Update tab UI
    const tabs = this.container.querySelectorAll(".upg-tab")
    tabs.forEach((tab) => {
      if (tab.getAttribute("data-tab") === tabId) {
        tab.classList.add("upg-tab-active")
      } else {
        tab.classList.remove("upg-tab-active")
      }
    })

    // Update content UI
    const contents = this.container.querySelectorAll(".upg-tab-content")
    contents.forEach((content) => {
      if (content.id === `tab-content-${tabId}`) {
        content.classList.add("upg-content-active")
      } else {
        content.classList.remove("upg-content-active")
      }
    })
  }

  async handlePayment(planId, amount) {
    if (this.isProcessing) return

    // Find the plan in our data
    const plan = this.pricingData.find(p => p.id === planId);
    if (!plan) {
      console.error(`Plan with ID ${planId} not found`);
      if (window.app && window.app.showToast) {
        window.app.showToast("Error: Selected plan not found", "error");
      }
      return;
    }

    this.isProcessing = true

    // Get the button
    const buttonId = `pay-${planId}`
    const button = this.container.querySelector(`#${buttonId}`)

    if (!button) {
      this.isProcessing = false
      return
    }

    let originalText

    try {
      // Update button state
      originalText = button.textContent
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'
      button.disabled = true

      // Show toast notification
      if (window.app && window.app.showToast) {
        window.app.showToast(`Initializing payment for ${plan.name}...`, "info")
      }

      // Ensure we have user information
      if (!this.currentUser || !this.currentUser.uid || !this.userData) {
        throw new Error("User information is not available. Please log out and log in again.")
      }

      // Get user email from userData
      const userEmail = this.userData.email

      if (!userEmail) {
        throw new Error("User email not found. Please update your profile.")
      }

      // Create payment details
      const paymentDetails = {
        plan: planId,
        amount: amount,
        email: userEmail,
      }

      // Process payment through Paystack
      const paymentResult = await paymentProcessor.initiatePayment(paymentDetails, {
        onSuccess: (response) => {
          if (window.app && window.app.showToast) {
            window.app.showToast("Payment successful! Your account has been upgraded.", "success")
          }
        },
        onError: (error) => {
          if (window.app && window.app.showToast) {
            window.app.showToast("Payment failed: " + error.message, "error")
          }
        },
        onClose: () => {
          if (window.app && window.app.showToast) {
            window.app.showToast("Payment window closed", "info")
          }
        },
      })

      // Handle payment response
      if (paymentResult.status === "success") {
        // Payment was successful and subscription has been processed
        // Redirect to premium content or show success message
        if (window.app && window.app.navigateTo) {
          window.app.navigateTo("/premium")
        }
      } else if (paymentResult.status === "closed") {
        // User closed the payment window
        if (window.app && window.app.showToast) {
          window.app.showToast("Payment canceled. You can try again when ready.", "info")
        }
      }
    } catch (error) {
      console.error("Payment error:", error)

      if (window.app && window.app.showToast) {
        window.app.showToast("Error processing payment: " + error.message, "error")
      }
    } finally {
      // Reset button state
      if (button) {
        button.innerHTML = originalText
        button.disabled = false
      }

      this.isProcessing = false
    }
  }
}
