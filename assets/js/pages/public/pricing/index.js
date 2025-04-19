import { Page } from "../../../core/page.js"

export class PricingPage extends Page {
  constructor() {
    super()
    this.showMenuIcon = true
    this.showBackArrow = true
    this.requiresDatabase = true
    this.requiresAuth = false
    this.authorizedUserTypes = []
    this.isButtonDisabled = false
    this.pricingData = null
    this.firebase = null

    this.cssFiles = ["pages/public/pricing/index.css"]

    // Bind methods to preserve 'this' context
    this.handleSubscription = this.handleSubscription.bind(this)
    this.toggleFAQ = this.toggleFAQ.bind(this)
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
    return "Premium Pricing"
  }

  getHeaderIcon() {
    return "fas fa-crown"
  }

  getActions() {
    return ``
  }

  getSkeletonTemplate() {
    return `
      <div class="pcg-container">
        <div class="pcg-header skeleton-pulse"></div>
        <div class="pcg-cards-container">
          ${this.getSkeletonCard()}
          ${this.getSkeletonCard()}
        </div>
      </div>
    `
  }

  getSkeletonCard() {
    return `
      <div class="pcg-card skeleton-card">
        <div class="pcg-card-header skeleton-pulse"></div>
        <div class="pcg-price skeleton-pulse"></div>
        <div class="pcg-features">
          <div class="pcg-feature skeleton-pulse"></div>
          <div class="pcg-feature skeleton-pulse"></div>
          <div class="pcg-feature skeleton-pulse"></div>
          <div class="pcg-feature skeleton-pulse"></div>
        </div>
        <div class="pcg-button-container skeleton-pulse"></div>
      </div>
    `
  }

  async loadDatabaseContent() {
    try {
      console.log("Starting loadDatabaseContent for pricing page")
      if (!window.app) {
        throw new Error("App instance not available")
      }

      this.firebase = window.app.getLibrary("firebase")

      if (!this.firebase) {
        throw new Error("Firebase instance not available")
      }

      // Create a reference to the pricing data in Realtime Database
      const pricingRef = this.firebase.ref(this.firebase.database, "settings/pricing")

      // Get the data once
      const snapshot = await this.firebase.get(pricingRef)

      if (snapshot.exists()) {
        // Convert the data to an array for easier manipulation
        const pricingData = snapshot.val()
        this.pricingData = this.convertToArray(pricingData)
        console.log("Loaded pricing data:", this.pricingData)
      } else {
        // Initialize with default values if no data exists
        this.pricingData = [
          {
            id: "monthly",
            name: "Monthly Premium",
            duration: 30,
            price: 50,
            active: true,
            features: ["All Premium Predictions", "Expert Analysis & Tips", "Access to Upcoming Features"],
          },
          {
            id: "quarterly",
            name: "Quarterly Premium",
            duration: 90,
            price: 120,
            active: true,
            features: [
              "All Premium Predictions",
              "Expert Analysis & Tips",
              "Access to Upcoming Features",
              "Priority Customer Support",
            ],
          },
        ]
        console.log("Using default pricing data:", this.pricingData)
      }

      console.log("Completed loadDatabaseContent for pricing page")
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true)
        }, 600)
      })
    } catch (error) {
      console.error("Error loading pricing data:", error)
      // Fallback to default values if there's an error
      this.pricingData = [
        {
          id: "monthly",
          name: "Monthly Premium",
          duration: 30,
          price: 50,
          active: true,
          features: ["All Premium Predictions", "Expert Analysis & Tips", "Access to Upcoming Features"],
        },
        {
          id: "quarterly",
          name: "Quarterly Premium",
          duration: 90,
          price: 120,
          active: true,
          features: [
            "All Premium Predictions",
            "Expert Analysis & Tips",
            "Access to Upcoming Features",
            "Priority Customer Support",
          ],
        },
      ]
      console.log("Using fallback pricing data due to error:", this.pricingData)
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true)
        }, 600)
      })
    }
  }

  convertToArray(pricingData) {
    if (!pricingData) return []

    // If it's already an array, return it
    if (Array.isArray(pricingData)) return pricingData

    // Convert object to array, preserving the original keys as 'id'
    return Object.keys(pricingData).map((key) => ({
      id: key,
      ...pricingData[key],
    }))
  }

  getActivePlans() {
    if (!this.pricingData || !Array.isArray(this.pricingData)) {
      return []
    }

    // Filter active plans and sort by price
    return this.pricingData.filter((plan) => plan.active).sort((a, b) => a.price - b.price)
  }

  calculateSavings(plan) {
    if (!plan || plan.duration <= 30) return 0

    // Find the monthly plan
    const monthlyPlan = this.pricingData.find((p) => p.active && p.duration <= 30 && p.duration >= 28)

    if (!monthlyPlan) return 0

    // Calculate equivalent monthly cost
    const monthsCount = plan.duration / 30
    const equivalentMonthlyTotal = monthlyPlan.price * monthsCount

    // Calculate savings
    return Math.round(equivalentMonthlyTotal - plan.price)
  }

  async getContent() {
    console.log("Starting getContent for pricing page")
    const activePlans = this.getActivePlans()

    // If no active plans, show a message
    if (activePlans.length === 0) {
      return `
        <div class="pcg-container">
          <div class="pcg-header">
            <h2 class="pcg-title">Premium Pricing</h2>
            <p class="pcg-subtitle">Our pricing plans are currently being updated. Please check back soon.</p>
          </div>
          <div class="pcg-empty-state">
            <i class="fas fa-clock"></i>
            <p>Pricing information will be available shortly.</p>
          </div>
        </div>
      `
    }

    // Generate pricing cards HTML
    const pricingCardsHtml = activePlans.map((plan) => this.renderPricingCard(plan)).join("")

    return `
      <div class="pcg-container">
        <div class="pcg-header">
          <h2 class="pcg-title">Unlock Premium Football Predictions</h2>
          <p class="pcg-subtitle">Get access to expert predictions and boost your winning chances</p>
        </div>

        <div class="pcg-cards-container">
          ${pricingCardsHtml}
        </div>

        <div class="pcg-benefits">
          <h3 class="pcg-benefits-title">Why Choose Our Premium Service?</h3>
          <div class="pcg-benefits-grid">
            <div class="pcg-benefit-item">
              <div class="pcg-benefit-icon"><i class="fas fa-chart-line"></i></div>
              <h4>Data-Driven Analysis</h4>
              <p>Our AI analyzes thousands of matches to provide accurate predictions</p>
            </div>
            <div class="pcg-benefit-item">
              <div class="pcg-benefit-icon"><i class="fas fa-bolt"></i></div>
              <h4>Real-Time Updates</h4>
              <p>Get instant updates and notifications for the best betting opportunities</p>
            </div>
            <div class="pcg-benefit-item">
              <div class="pcg-benefit-icon"><i class="fas fa-trophy"></i></div>
              <h4>Proven Success Rate</h4>
              <p>Our predictions have a consistently high accuracy rate</p>
            </div>
            <div class="pcg-benefit-item">
              <div class="pcg-benefit-icon"><i class="fas fa-lock"></i></div>
              <h4>Exclusive Content</h4>
              <p>Access premium insights and analysis not available to free users</p>
            </div>
          </div>
        </div>

        <div class="pcg-faq">
          <h3 class="pcg-faq-title">Frequently Asked Questions</h3>
          <div class="pcg-faq-item">
            <div class="pcg-faq-question" data-faq="1">
              <span>How accurate are the premium predictions?</span>
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="pcg-faq-answer" id="faq-1">
              Our premium predictions have a success rate of over 75%, based on historical data and advanced AI algorithms.
            </div>
          </div>
          <div class="pcg-faq-item">
            <div class="pcg-faq-question" data-faq="2">
              <span>Can I cancel my subscription anytime?</span>
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="pcg-faq-answer" id="faq-2">
              Yes, you can cancel your subscription at any time. Your access will remain active until the end of your current billing period.
            </div>
          </div>
          <div class="pcg-faq-item">
            <div class="pcg-faq-question" data-faq="3">
              <span>How do I access premium predictions after subscribing?</span>
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="pcg-faq-answer" id="faq-3">
              After subscribing, premium predictions will be automatically unlocked in your account. You'll see a "Premium" badge next to exclusive predictions.
            </div>
          </div>
        </div>
      </div>
    `
  }

  renderPricingCard(plan) {
    if (!plan) return ""

    const isQuarterly = plan.duration >= 90
    const savingsAmount = this.calculateSavings(plan)

    // Determine if this is the featured plan (the one with the longest duration)
    const isFeatured =
      plan === this.getActivePlans().reduce((a, b) => (a.duration > b.duration ? a : b), { duration: 0 })

    // Generate features HTML
    const featuresHtml = (plan.features || [])
      .map(
        (feature) => `
      <div class="pcg-feature">
        <i class="fas fa-check-circle"></i>
        <span>${this.escapeHtml(feature)}</span>
      </div>
    `,
      )
      .join("")

    // Format price period text
    let periodText = "/month"
    if (plan.duration >= 90 && plan.duration < 180) {
      periodText = "/3 months"
    } else if (plan.duration >= 180 && plan.duration < 365) {
      periodText = "/6 months"
    } else if (plan.duration >= 365) {
      periodText = "/year"
    }

    return `
      <div class="pcg-card ${isFeatured ? "pcg-featured" : ""}">
        ${isFeatured ? '<div class="pcg-popular-tag">Best Value</div>' : ""}
        <div class="pcg-card-header">
          <div class="pcg-plan-name">${this.escapeHtml(plan.name)}</div>
          <div class="pcg-plan-duration">${plan.duration} Days Access</div>
        </div>
        <div class="pcg-price">
          <span class="pcg-currency">₵</span>
          <span class="pcg-amount">${plan.price}</span>
          <span class="pcg-period">${periodText}</span>
        </div>
        ${savingsAmount > 0 ? `<div class="pcg-savings">Save ₵${savingsAmount}</div>` : ""}
        <div class="pcg-features">
          ${featuresHtml}
        </div>
        <div class="pcg-button-container">
          <button class="pcg-subscribe-btn" data-plan="${plan.id}">
            Subscribe Now
          </button>
        </div>
      </div>
    `
  }

  async afterStructureRender() {
    console.log("afterStructureRender called for pricing page")
    await super.afterStructureRender()
  }

  async afterContentRender() {
    console.log("afterContentRender called for pricing page")
    this.setupEventListeners()
  }

  setupEventListeners() {
    console.log("Setting up event listeners for pricing page")

    // Set up event listeners for subscription buttons
    const subscribeButtons = this.container.querySelectorAll(".pcg-subscribe-btn")
    console.log(`Found ${subscribeButtons.length} subscribe buttons`)

    subscribeButtons.forEach((button) => {
      // Remove existing listeners to prevent duplicates
      const newButton = button.cloneNode(true)
      button.parentNode.replaceChild(newButton, button)

      newButton.addEventListener("click", (e) => {
        console.log("Subscribe button clicked:", e.currentTarget.dataset.plan)
        const planId = e.currentTarget.dataset.plan
        this.handleSubscription(planId, newButton)
      })
    })

    // Set up FAQ toggles
    const faqQuestions = this.container.querySelectorAll(".pcg-faq-question")
    console.log(`Found ${faqQuestions.length} FAQ questions`)

    faqQuestions.forEach((question) => {
      // Remove existing listeners to prevent duplicates
      const newQuestion = question.cloneNode(true)
      question.parentNode.replaceChild(newQuestion, question)

      newQuestion.addEventListener("click", () => {
        const faqId = newQuestion.getAttribute("data-faq")
        console.log("FAQ question clicked:", faqId)
        this.toggleFAQ(faqId, newQuestion)
      })
    })
  }

  toggleFAQ(faqId, questionElement) {
    const answer = this.container.querySelector(`#faq-${faqId}`)

    if (answer) {
      answer.classList.toggle("pcg-faq-answer-open")
      questionElement.classList.toggle("pcg-faq-question-open")
    }
  }

  handleSubscription(planId, buttonElement) {
    console.log("handleSubscription called with planId:", planId)

    // Find the plan in our data
    const plan = this.pricingData.find((p) => p.id === planId)
    if (!plan) {
      console.error(`Plan with ID ${planId} not found in pricing data:`, this.pricingData)
      if (window.app && window.app.showToast) {
        window.app.showToast("Error: Selected plan not found", "error")
      }
      return
    }

    // Disable the clicked button to prevent multiple clicks
    if (buttonElement) {
      // Store original text and disable button
      const originalText = buttonElement.innerHTML
      buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'
      buttonElement.disabled = true

      // Also disable all other buttons
      this.toggleAllButtons(true)

      // Show toast notification with shorter duration (1.5s)
      if (window.app && window.app.showToast) {
        window.app.showToast(`Processing ${plan.name} subscription...`, "info", 1500)
      }

      // Determine the redirect URL based on the plan
      const tabId = plan.duration <= 30 ? "1" : "2"
      const redirectUrl = `/upgrade?tab=${tabId}&plan=${planId}`

      // Wait 1.5 seconds before redirecting for better UX
      setTimeout(() => {
        // Navigate to subscription processing page
        if (window.app && window.app.navigateTo) {
          console.log("Navigating to:", redirectUrl)
          window.app.navigateTo(redirectUrl)
        } else {
          console.error("Navigation function not available")

          // Restore button state if navigation fails
          buttonElement.innerHTML = originalText
          buttonElement.disabled = false
          this.toggleAllButtons(false)

          if (window.app && window.app.showToast) {
            window.app.showToast("Navigation error. Please try again.", "error")
          }
        }
      }, 1500)
    }
  }

  toggleAllButtons(disabled) {
    const subscribeButtons = this.container.querySelectorAll(".pcg-subscribe-btn")
    subscribeButtons.forEach((button) => {
      button.disabled = disabled
    })
  }

  destroy() {
    console.log("destroy called for pricing page")
    super.destroy()

    // Clean up event listeners
    const elements = [
      { selector: ".pcg-subscribe-btn", event: "click" },
      { selector: ".pcg-faq-question", event: "click" },
    ]

    elements.forEach((item) => {
      if (item.selector) {
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
    this.pricingData = null
  }
}
