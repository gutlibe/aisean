import { Page } from "../../../core/page.js"
import paymentProcessor from "./utils/payment-processor.js"

export class UpgradePage extends Page {
  constructor() {
    super()
    this.showMenuIcon = false
    this.showBackArrow = true
    this.requiresDatabase = true

    this.activeTab = 1
    this.isProcessing = false
    this.firebase = null
    this.currentUser = null
    this.userSubscription = null
    this.userData = null
    this.pricingData = null
    this.listeners = []

    this.cssFiles = ["pages/public/upgrade/index.css"]

    // Bind methods to preserve 'this' context across renders
    this.handlePayment = this.handlePayment.bind(this)
    this.switchTab = this.switchTab.bind(this)
  }

  escapeHtml(str) {
    if (!str || typeof str !== "string") return ""
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
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
    try {
      console.log("Starting loadDatabaseContent")
      if (!window.app) {
        throw new Error("App instance not available")
      }

      this.firebase = window.app.getLibrary("firebase")

      if (!this.firebase) {
        throw new Error("Firebase instance not available")
      }

      const authManager = window.app.getAuthManager()
      if (!authManager) {
        throw new Error("Auth manager not available")
      }

      this.currentUser = authManager.getCurrentUser()

      if (!this.currentUser) {
        if (window.app.showToast) {
          window.app.showToast("You must be logged in to access this page", "error")
        }

        if (window.app.navigateTo) {
          window.app.navigateTo("/login")
        }
        return false
      }

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

      try {
        const pricingRef = this.firebase.ref(this.firebase.database, "settings/pricing")
        const snapshot = await this.firebase.get(pricingRef)

        if (snapshot.exists()) {
          const pricingData = snapshot.val()
          this.pricingData = this.convertToArray(pricingData)
          console.log("Loaded pricing data:", this.pricingData)
        } else {
          this.pricingData = [
            {
              id: "monthly",
              name: "Monthly Premium",
              duration: 30,
              price: 29.99,
              active: true,
              features: [
                "Premium football predictions every day when matches are available",
                "Expert analysis and insights for each prediction",
                "Access to all upcoming premium features",
              ],
            },
            {
              id: "quarterly",
              name: "Quarterly Premium",
              duration: 90,
              price: 85,
              active: true,
              features: [
                "Premium football predictions every day when matches are available",
                "Expert analysis and insights for each prediction",
                "Access to all upcoming premium features",
                "Priority customer support",
              ],
            },
          ]
          console.log("Using default pricing data:", this.pricingData)
        }
      } catch (error) {
        console.error("Error loading pricing data:", error)
        this.pricingData = [
          {
            id: "monthly",
            name: "Monthly Premium",
            duration: 30,
            price: 29.99,
            active: true,
            features: [
              "Premium football predictions every day when matches are available",
              "Expert analysis and insights for each prediction",
              "Access to all upcoming premium features",
            ],
          },
          {
            id: "quarterly",
            name: "Quarterly Premium",
            duration: 90,
            price: 85,
            active: true,
            features: [
              "Premium football predictions every day when matches are available",
              "Expert analysis and insights for each prediction",
              "Access to all upcoming premium features",
              "Priority customer support",
            ],
          },
        ]
        console.log("Using fallback pricing data due to error:", this.pricingData)
      }

      const initResult = await paymentProcessor.initialize(this.firebase, this.currentUser)

      if (!initResult) {
        throw new Error("Failed to initialize payment processor")
      }

      try {
        this.userSubscription = await paymentProcessor.verifySubscription()
      } catch (error) {
        console.warn("Error checking subscription status:", error)
      }
    } catch (error) {
      console.error("Error initializing upgrade page:", error)
      if (window.app && window.app.showToast) {
        window.app.showToast("Error loading page resources. Please try again.", "error")
      }
      return false
    }

    this.parseUrlParameters()
    console.log("Completed loadDatabaseContent")

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 600)
    })
  }

  parseUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get("tab")
    const planParam = urlParams.get("plan")

    if (tabParam === "1" || tabParam === "2") {
      this.activeTab = Number.parseInt(tabParam)
    } else if (planParam) {
      const plan = this.pricingData?.find((p) => p.id === planParam)
      if (plan) {
        this.activeTab = plan.duration <= 30 ? 1 : 2
      }
    }
  }

  convertToArray(pricingData) {
    if (!pricingData) return []
    if (Array.isArray(pricingData)) return pricingData

    // Convert object to array, preserving the original keys as 'id'
    return Object.keys(pricingData).map((key) => ({
      id: key,
      ...pricingData[key],
    }))
  }

  getMonthlyPlan() {
    if (!this.pricingData || !Array.isArray(this.pricingData)) {
      return null
    }
    // Find a plan with duration around 30 days and active status
    return this.pricingData.find((plan) => plan.active && plan.duration >= 28 && plan.duration <= 31)
  }

  getQuarterlyPlan() {
    if (!this.pricingData || !Array.isArray(this.pricingData)) {
      return null
    }
    // Find a plan with duration around 90 days and active status
    return this.pricingData.find((plan) => plan.active && plan.duration >= 85 && plan.duration <= 95)
  }

  calculateSavings(plan) {
    if (!plan || plan.duration <= 30) return 0
    const monthlyPlan = this.getMonthlyPlan()
    if (!monthlyPlan) return 0
    const monthsCount = plan.duration / 30
    const equivalentMonthlyTotal = monthlyPlan.price * monthsCount
    return Math.round(equivalentMonthlyTotal - plan.price)
  }

  async getContent() {
    console.log("Starting getContent, userSubscription:", this.userSubscription)
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
    const monthlyPlan = this.getMonthlyPlan()
    console.log("Monthly plan:", monthlyPlan)

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
      `
    }

    const featuresHtml = (monthlyPlan.features || [])
      .map(
        (feature) => `
      <li>
        <i class="fas fa-check-circle"></i>
        <span>${this.escapeHtml(feature)}</span>
      </li>
    `,
      )
      .join("")

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
          <button id="pay-${monthlyPlan.id}" class="upg-pay-btn monthly-pay-btn" disabled data-plan="${monthlyPlan.id}" data-price="${monthlyPlan.price.toFixed(2)}">
            Pay ₵${monthlyPlan.price.toFixed(2)} Now
          </button>
        </div>
      </div>
    `
  }

  getQuarterlyContent() {
    const quarterlyPlan = this.getQuarterlyPlan()
    console.log("Quarterly plan:", quarterlyPlan)

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
      `
    }

    const savingsAmount = this.calculateSavings(quarterlyPlan)

    const featuresHtml = (quarterlyPlan.features || [])
      .map(
        (feature) => `
      <li>
        <i class="fas fa-check-circle"></i>
        <span>${this.escapeHtml(feature)}</span>
      </li>
    `,
      )
      .join("")

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
          ${savingsAmount > 0 ? `<div class="upg-savings">Save ₵${savingsAmount} compared to monthly plan</div>` : ""}
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
          <button id="pay-${quarterlyPlan.id}" class="upg-pay-btn quarterly-pay-btn" disabled data-plan="${quarterlyPlan.id}" data-price="${quarterlyPlan.price.toFixed(2)}">
            Pay ₵${quarterlyPlan.price.toFixed(2)} Now
          </button>
        </div>
      </div>
    `
  }

  async afterStructureRender() {
    console.log("afterStructureRender called")
    await super.afterStructureRender()
    this.parseUrlParameters()
  }

  async afterContentRender() {
    console.log("afterContentRender called")

    if (this.userSubscription && this.userSubscription.isActive) {
      console.log("Setting up premium button for active subscription")
      const premiumButton = this.container.querySelector("#go-to-premium")
      if (premiumButton) {
        premiumButton.addEventListener("click", () => {
          console.log("Premium button clicked")
          if (window.app && window.app.navigateTo) {
            window.app.navigateTo("/premium")
          }
        })
      }
      return
    }

    // Set up tab switching
    console.log("Setting up tab switching")
    const tabs = this.container.querySelectorAll(".upg-tab")
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        console.log("Tab clicked:", e.currentTarget.getAttribute("data-tab"))
        const tabId = e.currentTarget.getAttribute("data-tab")
        this.switchTab(tabId)
      })
    })

    // Set up agreement checkboxes and payment buttons
    this.setupPaymentButtons()
  }

  setupPaymentButtons() {
    console.log("Setting up payment buttons and checkboxes")

    // Get the monthly and quarterly plans
    const monthlyPlan = this.getMonthlyPlan()
    const quarterlyPlan = this.getQuarterlyPlan()

    // Set up monthly plan elements if available
    if (monthlyPlan) {
      const monthlyCheckbox = this.container.querySelector("#agreement-monthly")
      const monthlyButton = this.container.querySelector(`.monthly-pay-btn`)

      console.log("Monthly plan ID:", monthlyPlan.id)
      console.log("Monthly checkbox:", monthlyCheckbox ? "Found" : "Not found")
      console.log("Monthly button:", monthlyButton ? "Found" : "Not found")

      if (monthlyCheckbox && monthlyButton) {
        // Remove existing listeners to prevent duplicates
        const newMonthlyCheckbox = monthlyCheckbox.cloneNode(true)
        monthlyCheckbox.parentNode.replaceChild(newMonthlyCheckbox, monthlyCheckbox)

        const newMonthlyButton = monthlyButton.cloneNode(true)
        monthlyButton.parentNode.replaceChild(newMonthlyButton, monthlyButton)

        // Add new listeners
        newMonthlyCheckbox.addEventListener("change", (e) => {
          console.log("Monthly checkbox changed:", e.target.checked)
          newMonthlyButton.disabled = !e.target.checked
        })

        newMonthlyButton.addEventListener("click", () => {
          console.log("Monthly payment button clicked")
          const planId = newMonthlyButton.getAttribute("data-plan")
          const price = Number.parseFloat(newMonthlyButton.getAttribute("data-price"))
          console.log("Plan ID:", planId, "Price:", price)
          this.handlePayment(planId, price)
        })
      }
    }

    // Set up quarterly plan elements if available
    if (quarterlyPlan) {
      const quarterlyCheckbox = this.container.querySelector("#agreement-quarterly")
      const quarterlyButton = this.container.querySelector(`.quarterly-pay-btn`)

      console.log("Quarterly plan ID:", quarterlyPlan.id)
      console.log("Quarterly checkbox:", quarterlyCheckbox ? "Found" : "Not found")
      console.log("Quarterly button:", quarterlyButton ? "Found" : "Not found")

      if (quarterlyCheckbox && quarterlyButton) {
        // Remove existing listeners to prevent duplicates
        const newQuarterlyCheckbox = quarterlyCheckbox.cloneNode(true)
        quarterlyCheckbox.parentNode.replaceChild(newQuarterlyCheckbox, quarterlyCheckbox)

        const newQuarterlyButton = quarterlyButton.cloneNode(true)
        quarterlyButton.parentNode.replaceChild(newQuarterlyButton, quarterlyButton)

        // Add new listeners
        newQuarterlyCheckbox.addEventListener("change", (e) => {
          console.log("Quarterly checkbox changed:", e.target.checked)
          newQuarterlyButton.disabled = !e.target.checked
        })

        newQuarterlyButton.addEventListener("click", () => {
          console.log("Quarterly payment button clicked")
          const planId = newQuarterlyButton.getAttribute("data-plan")
          const price = Number.parseFloat(newQuarterlyButton.getAttribute("data-price"))
          console.log("Plan ID:", planId, "Price:", price)
          this.handlePayment(planId, price)
        })
      }
    }
  }

  switchTab(tabId) {
    console.log("switchTab called with tabId:", tabId)
    const url = new URL(window.location)
    url.searchParams.set("tab", tabId)
    window.history.pushState({}, "", url)

    this.activeTab = Number.parseInt(tabId)

    const tabs = this.container.querySelectorAll(".upg-tab")
    tabs.forEach((tab) => {
      if (tab.getAttribute("data-tab") === tabId) {
        tab.classList.add("upg-tab-active")
      } else {
        tab.classList.remove("upg-tab-active")
      }
    })

    const contents = this.container.querySelectorAll(".upg-tab-content")
    contents.forEach((content) => {
      if (content.id === `tab-content-${tabId}`) {
        content.classList.add("upg-content-active")
      } else {
        content.classList.remove("upg-content-active")
      }
    })

    // Re-attach event listeners after tab switch
    setTimeout(() => {
      this.setupPaymentButtons()
    }, 100)
  }

  async handlePayment(planId, amount) {
    console.log("handlePayment called with planId:", planId, "amount:", amount)
    if (this.isProcessing) {
      console.log("Payment already processing, ignoring request")
      return
    }

    const plan = this.pricingData.find((p) => p.id === planId)
    if (!plan) {
      console.error(`Plan with ID ${planId} not found in pricing data:`, this.pricingData)
      if (window.app && window.app.showToast) {
        window.app.showToast("Error: Selected plan not found", "error")
      }
      return
    }

    this.isProcessing = true

    // Find the button by class and data-plan attribute
    const isMonthly = plan.duration <= 31
    const buttonSelector = isMonthly ? ".monthly-pay-btn" : ".quarterly-pay-btn"
    console.log("Looking for button with selector:", buttonSelector)

    const button = this.container.querySelector(buttonSelector)

    if (!button) {
      console.error(`Button with selector ${buttonSelector} not found`)
      this.isProcessing = false
      return
    }

    const originalText = button.textContent

    try {
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'
      button.disabled = true

      if (window.app && window.app.showToast) {
        window.app.showToast(`Initializing payment for ${plan.name}...`, "info")
      }

      if (!this.currentUser || !this.currentUser.uid || !this.userData) {
        throw new Error("User information is not available. Please log out and log in again.")
      }

      const userEmail = this.userData.email

      if (!userEmail) {
        throw new Error("User email not found. Please update your profile.")
      }

      const paymentDetails = {
        plan: planId,
        amount: amount,
        email: userEmail,
      }

      console.log("Initiating payment with details:", paymentDetails)
      const paymentResult = await paymentProcessor.initiatePayment(paymentDetails, {
        onSuccess: (response) => {
          console.log("Payment success callback:", response)
          if (window.app && window.app.showToast) {
            window.app.showToast("Payment successful! Your account has been upgraded.", "success")
          }
        },
        onError: (error) => {
          console.error("Payment error callback:", error)
          if (window.app && window.app.showToast) {
            window.app.showToast("Payment failed: " + error.message, "error")
          }
        },
        onClose: () => {
          console.log("Payment window closed callback")
          if (window.app && window.app.showToast) {
            window.app.showToast("Payment window closed", "info")
          }
        },
      })

      console.log("Payment result:", paymentResult)
      if (paymentResult.status === "success") {
        if (window.app && window.app.navigateTo) {
          window.app.navigateTo("/premium")
        }
      } else if (paymentResult.status === "closed") {
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
      if (button) {
        button.innerHTML = originalText
        button.disabled = false
      }

      this.isProcessing = false
    }
  }

  destroy() {
    console.log("destroy called")
    super.destroy()

    // Clean up event listeners
    const elements = [
      { id: "#go-to-premium", event: "click" },
      { selector: ".upg-tab", event: "click" },
      { id: "#agreement-monthly", event: "change" },
      { id: "#agreement-quarterly", event: "change" },
      { selector: ".monthly-pay-btn", event: "click" },
      { selector: ".quarterly-pay-btn", event: "click" },
    ]

    elements.forEach((item) => {
      if (item.id) {
        const element = this.container?.querySelector(item.id)
        if (element) {
          element.replaceWith(element.cloneNode(true))
        }
      } else if (item.selector) {
        const elements = this.container?.querySelectorAll(item.selector)
        if (elements) {
          elements.forEach((el) => {
            el.replaceWith(el.cloneNode(true))
          })
        }
      }
    })

    // Clear references
    this.container = null
    this.firebase = null
    this.currentUser = null
    this.userData = null
    this.pricingData = null
    this.userSubscription = null
    this.listeners = []
  }
}
