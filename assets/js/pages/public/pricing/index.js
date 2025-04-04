import { Page } from "../../../core/page.js"

export class PricingPage extends Page {
  constructor() {
    super()
    this.showMenuIcon = false
    this.showBackArrow = true
    this.requiresDatabase = false
    this.requiresAuth = false
    this.authorizedUserTypes = []
    this.isButtonDisabled = false
    
    this.cssFiles = [
        "pages/public/pricing/index.css",
    ]
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
    // Simulate loading delay for skeleton animation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 800)
    })
  }

  async getContent() {
    return `
      <div class="pcg-container">
        <div class="pcg-header">
          <h2 class="pcg-title">Unlock Premium Football Predictions</h2>
          <p class="pcg-subtitle">Get access to expert predictions and boost your winning chances</p>
        </div>

        <div class="pcg-cards-container">
          ${this.renderMonthlyCard()}
          ${this.renderQuarterlyCard()}
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

  renderMonthlyCard() {
    const buttonState = this.isButtonDisabled ? "disabled" : ""

    return `
      <div class="pcg-card">
        <div class="pcg-card-header">
          <div class="pcg-plan-name">Monthly Premium</div>
          <div class="pcg-plan-duration">30 Days Access</div>
        </div>
        <div class="pcg-price">
          <span class="pcg-currency">₵</span>
          <span class="pcg-amount">50</span>
          <span class="pcg-period">/month</span>
        </div>
        <div class="pcg-features">
          <div class="pcg-feature">
            <i class="fas fa-check-circle"></i>
            <span>All Premium Predictions</span>
          </div>
          <div class="pcg-feature">
            <i class="fas fa-check-circle"></i>
            <span>Expert Analysis & Tips</span>
          </div>
          <div class="pcg-feature">
            <i class="fas fa-check-circle"></i>
            <span>Access to Upcoming Features</span>
          </div>
        </div>
        <div class="pcg-button-container">
          <button id="subscribe-monthly" class="pcg-subscribe-btn" ${buttonState}>
            Subscribe Now
          </button>
        </div>
      </div>
    `
  }

  renderQuarterlyCard() {
    const buttonState = this.isButtonDisabled ? "disabled" : ""
    const savingsAmount = 30 // 150 - 120 = 30 cedis saved

    return `
      <div class="pcg-card pcg-featured">
        <div class="pcg-popular-tag">Best Value</div>
        <div class="pcg-card-header">
          <div class="pcg-plan-name">Quarterly Premium</div>
          <div class="pcg-plan-duration">90 Days Access</div>
        </div>
        <div class="pcg-price">
          <span class="pcg-currency">₵</span>
          <span class="pcg-amount">120</span>
          <span class="pcg-period">/3 months</span>
        </div>
        <div class="pcg-savings">Save ₵${savingsAmount}</div>
        <div class="pcg-features">
          <div class="pcg-feature">
            <i class="fas fa-check-circle"></i>
            <span>All Premium Predictions</span>
          </div>
          <div class="pcg-feature">
            <i class="fas fa-check-circle"></i>
            <span>Expert Analysis & Tips</span>
          </div>
          <div class="pcg-feature">
            <i class="fas fa-check-circle"></i>
            <span>Access to Upcoming Features</span>
          </div>
          <div class="pcg-feature">
            <i class="fas fa-check-circle"></i>
            <span>Priority Customer Support</span>
          </div>
        </div>
        <div class="pcg-button-container">
          <button id="subscribe-quarterly" class="pcg-subscribe-btn" ${buttonState}>
            Subscribe Now
          </button>
        </div>
      </div>
    `
  }

  async afterContentRender() {
    // Set up event listeners for subscription buttons
    const monthlyBtn = this.container.querySelector("#subscribe-monthly")
    const quarterlyBtn = this.container.querySelector("#subscribe-quarterly")

    if (monthlyBtn) {
      monthlyBtn.addEventListener("click", () => this.handleSubscription("monthly"))
    }

    if (quarterlyBtn) {
      quarterlyBtn.addEventListener("click", () => this.handleSubscription("quarterly"))
    }

    // Set up FAQ toggles
    const faqQuestions = this.container.querySelectorAll(".pcg-faq-question")
    faqQuestions.forEach((question) => {
      question.addEventListener("click", () => {
        const faqId = question.getAttribute("data-faq")
        const answer = this.container.querySelector(`#faq-${faqId}`)

        if (answer) {
          answer.classList.toggle("pcg-faq-answer-open")
          question.classList.toggle("pcg-faq-question-open")
        }
      })
    })
  }

  handleSubscription(plan) {
    // Get the button that was clicked
    const buttonId = `subscribe-${plan}`
    const button = this.container.querySelector(`#${buttonId}`)

    if (button) {
      // Disable both buttons to prevent multiple clicks
      this.toggleButtonState(true)

      // Replace button text with spinner
      const originalText = button.innerHTML
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'

      // Show toast notification
      if (window.app && window.app.showToast) {
        window.app.showToast(`Processing ${plan} subscription...`, "info")
      }

      // Determine the redirect URL based on the plan
      const tabId = plan === "monthly" ? "1" : "2"
      const redirectUrl = `/upgrade?tab=${tabId}`

      // Wait 3 seconds before redirecting
      setTimeout(() => {
        // Navigate to subscription processing page
        if (window.app && window.app.navigateTo) {
          window.app.navigateTo(redirectUrl)
        } else {
          console.error("Navigation function not available")

          // Restore button state if navigation fails
          button.innerHTML = originalText
          this.toggleButtonState(false)
        }
      }, 3000)
    }
  }

  toggleButtonState(disabled) {
    this.isButtonDisabled = disabled

    const monthlyBtn = this.container.querySelector("#subscribe-monthly")
    const quarterlyBtn = this.container.querySelector("#subscribe-quarterly")

    if (monthlyBtn) {
      monthlyBtn.disabled = disabled
    }

    if (quarterlyBtn) {
      quarterlyBtn.disabled = disabled
    }
  }
}

