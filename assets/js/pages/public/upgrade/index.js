import { Page } from "../../core/page.js"
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
    this.userData = null // Add this line to store user data
    this.cssFiles = [
        "pages/public/upgrade/index.css",
    ]
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

    if (tabParam === "1" || tabParam === "2") {
      this.activeTab = Number.parseInt(tabParam)
    }

    // Simulate loading delay for skeleton animation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 600)
    })
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
    return `
      <div class="upg-card">
        <div class="upg-card-header">
          <h2 class="upg-card-title">Monthly Premium Subscription</h2>
          <div class="upg-price-tag">
            <span class="upg-currency">₵</span>
            <span class="upg-amount">29.99</span>
            <span class="upg-period">/month</span>
          </div>
        </div>
        
        <div class="upg-card-body">
          <div class="upg-section">
            <h3 class="upg-section-title">
              <i class="fas fa-check-circle"></i> What You'll Get
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
                <span>Access to all upcoming premium features</span>
              </li>
            </ul>
          </div>
          
          <div class="upg-section upg-agreement-section">
            <h3 class="upg-section-title">
              <i class="fas fa-file-signature"></i> Subscription Agreement
            </h3>
            <div class="upg-agreement">
              <p>By subscribing to our premium service, you agree to the following terms:</p>
              <ul>
                <li>Your subscription will be active for 30 days from the date of purchase</li>
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
          <button id="pay-monthly" class="upg-pay-btn" disabled>
            Pay ₵29.99 Now
          </button>
        </div>
      </div>
    `
  }

  getQuarterlyContent() {
    return `
      <div class="upg-card">
        <div class="upg-card-header">
          <div class="upg-best-value">Best Value</div>
          <h2 class="upg-card-title">Quarterly Premium Subscription</h2>
          <div class="upg-price-tag">
            <span class="upg-currency">₵</span>
            <span class="upg-amount">85</span>
            <span class="upg-period">/3 months</span>
          </div>
          <div class="upg-savings">Save ₵30 compared to monthly plan</div>
        </div>
        
        <div class="upg-card-body">
          <div class="upg-section">
            <h3 class="upg-section-title">
              <i class="fas fa-check-circle"></i> What You'll Get
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
                <span>Access to all upcoming premium features</span>
              </li>
              <li>
                <i class="fas fa-headset"></i>
                <span>Priority customer support</span>
              </li>
            </ul>
          </div>
          
          <div class="upg-section upg-agreement-section">
            <h3 class="upg-section-title">
              <i class="fas fa-file-signature"></i> Subscription Agreement
            </h3>
            <div class="upg-agreement">
              <p>By subscribing to our premium service, you agree to the following terms:</p>
              <ul>
                <li>Your subscription will be active for 90 days from the date of purchase</li>
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
          <button id="pay-quarterly" class="upg-pay-btn" disabled>
            Pay ₵85 Now
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

    if (tabParam === "1" || tabParam === "2") {
      this.activeTab = Number.parseInt(tabParam)
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
      monthlyButton.addEventListener("click", () => this.handlePayment("monthly", 29.99))
    }

    if (quarterlyButton) {
      quarterlyButton.addEventListener("click", () => this.handlePayment("quarterly", 85))
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

  async handlePayment(plan, amount) {
    if (this.isProcessing) return

    this.isProcessing = true

    // Get the button
    const buttonId = `pay-${plan}`
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
        window.app.showToast(`Initializing payment for ${plan} subscription...`, "info")
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
        plan: plan,
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
