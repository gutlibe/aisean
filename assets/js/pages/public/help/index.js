import { Page } from "../../../core/page.js"

/**
 * HelpPage - Help and support page for AIsean application
 */
export class HelpPage extends Page {
  constructor() {
    super()

    // Basic configuration
    this.showMenuIcon = true
    this.showBackArrow = false

    // Database configuration
    this.requiresDatabase = true
    this.loadingTimeout = 20000 // 20 seconds
    this.maxRetries = 2
    this.retryDelay = 1000

    // Telegram bot configuration (will be loaded from database)
    this.botToken = null
    this.chatId = null

    // CSS files to load
    this.cssFiles = ["pages/public/help/index.css"]
  }

  /**
   * Return the page title shown in the header
   */
  getTitle() {
    return "Help & Support"
  }

  /**
   * Return the icon to display next to the page title
   */
  getHeaderIcon() {
    return "fas fa-question-circle"
  }

  /**
   * Return skeleton template HTML shown during loading
   * This provides a better loading experience with placeholders
   */
  getSkeletonTemplate() {
    return `
            <div class="hp-container">
                <div class="hp-section">
                    <h2 class="hp-section-title skeleton-pulse"></h2>
                    
                    <div class="hp-accordion">
                        <div class="hp-accordion-item skeleton-pulse"></div>
                        <div class="hp-accordion-item skeleton-pulse"></div>
                        <div class="hp-accordion-item skeleton-pulse"></div>
                    </div>
                </div>
                
                <div class="hp-section">
                    <h2 class="hp-section-title skeleton-pulse"></h2>
                    <p class="hp-section-description skeleton-pulse"></p>
                    
                    <form class="hp-form">
                        <div class="hp-form-group skeleton-pulse"></div>
                        <div class="hp-form-group skeleton-pulse"></div>
                        <div class="hp-form-group skeleton-pulse"></div>
                        <div class="hp-form-group skeleton-pulse"></div>
                        <div class="skeleton-pulse" style="height: 40px; width: 150px; margin-top: 20px;"></div>
                    </form>
                </div>
                
                <div class="hp-section">
                    <h2 class="hp-section-title skeleton-pulse"></h2>
                    <div class="hp-contact-info">
                        <div class="hp-contact-item skeleton-pulse"></div>
                        <div class="hp-contact-item skeleton-pulse"></div>
                    </div>
                </div>
            </div>
        `
  }

  /**
   * Load data from database
   * This method is called during the render lifecycle if requiresDatabase is true
   */
  async loadDatabaseContent() {
    try {
      const firebase = window.app.getLibrary("firebase")
      const db = firebase.getDatabase()
      const configRef = firebase.ref(db, "configs")
      const snapshot = await firebase.get(configRef)

      if (snapshot.exists()) {
        const config = snapshot.val()
        // Access telegram configuration correctly based on the database structure
        if (config.telegram) {
          this.botToken = config.telegram.bot_token || null
          this.chatId = config.telegram.chat_id || null
        } else {
          console.warn("Telegram configuration not found in Firebase Realtime Database")
        }
      } else {
        console.warn("No config found in Firebase Realtime Database at /configs")
      }
      return true
    } catch (error) {
      console.error("Error fetching config from Firebase:", error)
      window.app.showToast("Failed to load help configuration.", "error")
      return false
    }
  }

  /**
   * Return the main page content HTML
   * This is called after data is loaded
   */
  async getContent() {
    return `
            <div class="hp-container">
                <div class="hp-section">
                    <h2 class="hp-section-title">Frequently Asked Questions</h2>
                    
                    <div class="hp-accordion">
                        <div class="hp-accordion-item">
                            <div class="hp-accordion-header" data-accordion="subscription">
                                <h3>Subscription & Account Issues</h3>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="hp-accordion-content" id="subscription-content">
                                <div class="hp-faq-item">
                                    <h4>How do I upgrade to a Pro subscription?</h4>
                                    <p>To upgrade to a Pro subscription, go to your profile page and click on "Upgrade to Pro". You'll be guided through the payment process to unlock premium features.</p>
                                </div>
                                <div class="hp-faq-item">
                                    <h4>What are the benefits of a Pro subscription?</h4>
                                    <p>Pro subscribers get access to more predictions, early access to new features, and premium insights from our AI and expert analysts.</p>
                                </div>
                                <div class="hp-faq-item">
                                    <h4>How do I reset my password?</h4>
                                    <p>Click on "Forgot Password" on the login screen. You'll receive an email with instructions to reset your password.</p>
                                </div>
                                <div class="hp-faq-item">
                                    <h4>How do I cancel my subscription?</h4>
                                    <p>Go to your profile page, select "Subscription Settings", and click on "Cancel Subscription". Your subscription will remain active until the end of your current billing period.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="hp-accordion-item">
                            <div class="hp-accordion-header" data-accordion="technical">
                                <h3>Technical Issues</h3>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="hp-accordion-content" id="technical-content">
                                <div class="hp-faq-item">
                                    <h4>The app is not loading properly. What should I do?</h4>
                                    <p>Try these steps:</p>
                                    <ol>
                                        <li>Refresh the page</li>
                                        <li>Clear your browser cache</li>
                                        <li>Try using a different browser</li>
                                        <li>Check your internet connection</li>
                                    </ol>
                                </div>
                                <div class="hp-faq-item">
                                    <h4>Predictions are not showing up. What's wrong?</h4>
                                    <p>This could be due to:</p>
                                    <ul>
                                        <li>Your subscription may have expired</li>
                                        <li>There might be a temporary service issue</li>
                                        <li>The predictions for the requested matches are not ready yet</li>
                                    </ul>
                                    <p>If the issue persists, please contact our support team.</p>
                                </div>
                                <div class="hp-faq-item">
                                    <h4>How do I update the app?</h4>
                                    <p>AIsean is a web application that updates automatically. Simply refresh the page to get the latest version.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="hp-accordion-item">
                            <div class="hp-accordion-header" data-accordion="features">
                                <h3>App Features</h3>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="hp-accordion-content" id="features-content">
                                <div class="hp-faq-item">
                                    <h4>How accurate are the predictions?</h4>
                                    <p>Our predictions combine AI algorithms with expert analysis to provide the most accurate predictions possible. However, football is unpredictable by nature, and we cannot guarantee results.</p>
                                </div>
                                <div class="hp-faq-item">
                                    <h4>How often are predictions updated?</h4>
                                    <p>Predictions are updated daily, with additional updates before major matches to account for team news and other factors.</p>
                                </div>
                                <div class="hp-faq-item">
                                    <h4>Can I get predictions for specific leagues?</h4>
                                    <p>Yes, you can filter predictions by league. Pro subscribers have access to more leagues and competitions.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="hp-section">
                    <h2 class="hp-section-title">Send Us Feedback</h2>
                    <p class="hp-section-description">Have a suggestion or found an issue? Let us know!</p>
                    
                    <form id="hp-feedback-form" class="hp-form">
                        <div class="hp-form-group">
                            <label for="feedback-name">Your Name</label>
                            <input type="text" id="feedback-name" placeholder="Enter your name" required>
                        </div>
                        
                        <div class="hp-form-group">
                            <label for="feedback-email">Email Address</label>
                            <input type="email" id="feedback-email" placeholder="Enter your email" required>
                        </div>
                        
                        <div class="hp-form-group">
                            <label for="feedback-type">Feedback Type</label>
                            <select id="feedback-type" required>
                                <option value="">Select a type</option>
                                <option value="bug">Bug Report</option>
                                <option value="feature">Feature Request</option>
                                <option value="suggestion">Suggestion</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="hp-form-group">
                            <label for="feedback-message">Your Message</label>
                            <textarea id="feedback-message" rows="5" placeholder="Describe your feedback in detail" required></textarea>
                        </div>
                        
                        <button type="submit" class="hp-submit-btn">
                            <i class="fas fa-paper-plane"></i> Submit Feedback
                        </button>
                    </form>
                </div>
                
                <div class="hp-section">
                    <h2 class="hp-section-title">Contact Us</h2>
                    <div class="hp-contact-info">
                        <div class="hp-contact-item">
                            <i class="fas fa-envelope"></i>
                            <div class="hp-contact-details">
                                <h3>Email Support</h3>
                                <p><a href="mailto:support@aisean.eu.org">support@aisean.eu.org</a></p>
                            </div>
                        </div>
                        <div class="hp-contact-item">
                            <i class="fas fa-clock"></i>
                            <div class="hp-contact-details">
                                <h3>Response Time</h3>
                                <p>We aim to respond within 24 hours on business days.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
  }

  /**
   * Called after the page structure (header and skeleton) is rendered
   * Use for setting up structure-level event listeners
   */
  async afterStructureRender() {
    // Always call parent method first
    await super.afterStructureRender()

    // Additional structure-level setup if needed
    // This runs before content is loaded, so we can set up listeners
    // for elements that are part of the skeleton template
  }

  /**
   * Called after the main content is rendered
   * Use for setting up content-level event listeners
   */
  async afterContentRender() {
    // Set up accordion functionality
    const accordionHeaders = this.container.querySelectorAll(".hp-accordion-header")
    accordionHeaders.forEach((header) => {
      header.addEventListener("click", () => this.toggleAccordion(header))
    })

    // Set up feedback form submission
    const feedbackForm = this.container.querySelector("#hp-feedback-form")
    if (feedbackForm) {
      feedbackForm.addEventListener("submit", (e) => this.handleFeedbackSubmit(e))
    }
  }

  /**
   * Toggle accordion open/closed state
   */
  toggleAccordion(header) {
    const accordionItem = header.parentElement
    const isOpen = accordionItem.classList.contains("hp-open")

    // Close all accordion items
    const allAccordionItems = this.container.querySelectorAll(".hp-accordion-item")
    allAccordionItems.forEach((item) => {
      item.classList.remove("hp-open")
      const icon = item.querySelector(".hp-accordion-header i")
      if (icon) icon.className = "fas fa-chevron-down"
    })

    // Open the clicked item if it was closed
    if (!isOpen) {
      accordionItem.classList.add("hp-open")
      const icon = header.querySelector("i")
      if (icon) icon.className = "fas fa-chevron-up"
    }
  }

  /**
   * Handle feedback form submission
   */
  async handleFeedbackSubmit(e) {
    e.preventDefault()

    // Get form inputs
    const nameInput = this.container.querySelector("#feedback-name")
    const emailInput = this.container.querySelector("#feedback-email")
    const typeInput = this.container.querySelector("#feedback-type")
    const messageInput = this.container.querySelector("#feedback-message")

    // Validate form
    if (!nameInput.value || !emailInput.value || !typeInput.value || !messageInput.value) {
      window.app.showToast("Please fill in all required fields", "error")
      return
    }

    // Prepare feedback data
    const feedbackData = {
      name: nameInput.value,
      email: emailInput.value,
      type: typeInput.value,
      message: messageInput.value,
      timestamp: new Date().toISOString(),
      appVersion: window.app.version || "Unknown",
    }

    try {
      // Update button state to show loading
      const submitBtn = this.container.querySelector(".hp-submit-btn")
      const originalBtnText = submitBtn.innerHTML
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'
      submitBtn.disabled = true

      // Send feedback to Telegram
      await this.sendFeedbackToTelegram(feedbackData)

      // Reset form and show success message
      e.target.reset()
      window.app.showToast("Thank you for your feedback!", "success")

      // Restore button state
      submitBtn.innerHTML = originalBtnText
      submitBtn.disabled = false
    } catch (error) {
      console.error("Error sending feedback:", error)
      window.app.showToast("Failed to send feedback. Please try again later.", "error")

      // Restore button state
      const submitBtn = this.container.querySelector(".hp-submit-btn")
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback'
      submitBtn.disabled = false
    }
  }

  /**
   * Send feedback to Telegram bot
   */
  async sendFeedbackToTelegram(feedbackData) {
    if (!this.botToken || !this.chatId) {
      console.warn("Bot token or Chat ID not configured.")
      window.app.showToast("Bot configuration missing. Feedback can't be sent.", "warning")
      return
    }

    // Format message for Telegram
    const message = `
📬 New Feedback Received

👤 From: ${feedbackData.name}
📧 Email: ${feedbackData.email}
🏷️ Type: ${feedbackData.type}
⏰ Time: ${new Date(feedbackData.timestamp).toLocaleString()}
📱 App Version: ${feedbackData.appVersion}

💬 Message:
${feedbackData.message}
`

    // Send to Telegram API
    const telegramUrl = `https://api.telegram.org/bot${this.botToken}/sendMessage`
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: message,
        parse_mode: "HTML",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Telegram API error: ${errorData.description || "Unknown error"}`)
    }

    return await response.json()
  }

  /**
   * Clean up resources when the page is destroyed
   */
  destroy() {
    // Always call parent method first
    super.destroy()

    // Clean up references
    this.botToken = null
    this.chatId = null
    this.container = null
  }
}
