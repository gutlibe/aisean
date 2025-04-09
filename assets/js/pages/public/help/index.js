import { Page } from "../../../core/page.js"

/**
 * HelpPage - Help and support page for AIsean application
 */
export class HelpPage extends Page {
  TELEGRAM_BOT_TOKEN = "7579270762:AAHAtvBT2VrmuyAy0paYZv02y1nwuxg0hgM"
  TELEGRAM_CHAT_ID = "8070411940"

  constructor() {
    super()

    this.showMenuIcon = true
    this.showBackArrow = false
    this.requiresDatabase = false
    this.requiresAuth = false
    
    this.cssFiles = [
      "pages/public/help/index.css",
    ]
  }

  getTitle() {
    return "Help & Support"
  }

  getHeaderIcon() {
    return "fas fa-question-circle"
  }

  getSkeletonTemplate() {
    return `
            <div class="hp-skeleton-container">
                <div class="hp-skeleton-item pulse"></div>
                <div class="hp-skeleton-item pulse"></div>
                <div class="hp-skeleton-item pulse"></div>
                <div class="hp-skeleton-form pulse"></div>
            </div>
        `
  }

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

  async afterContentRender() {
    const accordionHeaders = this.container.querySelectorAll(".hp-accordion-header")
    accordionHeaders.forEach((header) => {
      header.addEventListener("click", () => this.toggleAccordion(header))
    })

    const feedbackForm = this.container.querySelector("#hp-feedback-form")
    if (feedbackForm) {
      feedbackForm.addEventListener("submit", (e) => this.handleFeedbackSubmit(e))
    }
  }

  toggleAccordion(header) {
    const accordionItem = header.parentElement
    const isOpen = accordionItem.classList.contains("hp-open")

    const allAccordionItems = this.container.querySelectorAll(".hp-accordion-item")
    allAccordionItems.forEach((item) => {
      item.classList.remove("hp-open")
      const icon = item.querySelector(".hp-accordion-header i")
      if (icon) icon.className = "fas fa-chevron-down"
    })

    if (!isOpen) {
      accordionItem.classList.add("hp-open")
      const icon = header.querySelector("i")
      if (icon) icon.className = "fas fa-chevron-up"
    }
  }

  async handleFeedbackSubmit(e) {
    e.preventDefault()

    const nameInput = this.container.querySelector("#feedback-name")
    const emailInput = this.container.querySelector("#feedback-email")
    const typeInput = this.container.querySelector("#feedback-type")
    const messageInput = this.container.querySelector("#feedback-message")

    if (!nameInput.value || !emailInput.value || !typeInput.value || !messageInput.value) {
      window.app.showToast("Please fill in all required fields", "error")
      return
    }

    const feedbackData = {
      name: nameInput.value,
      email: emailInput.value,
      type: typeInput.value,
      message: messageInput.value,
      timestamp: new Date().toISOString(),
      appVersion: window.app.version || "Unknown",
    }

    try {
      const submitBtn = this.container.querySelector(".hp-submit-btn")
      const originalBtnText = submitBtn.innerHTML
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'
      submitBtn.disabled = true

      await this.sendFeedbackToTelegram(feedbackData)

      e.target.reset()

      window.app.showToast("Thank you for your feedback!", "success")

      submitBtn.innerHTML = originalBtnText
      submitBtn.disabled = false
    } catch (error) {
      console.error("Error sending feedback:", error)
      window.app.showToast("Failed to send feedback. Please try again later.", "error")

      const submitBtn = this.container.querySelector(".hp-submit-btn")
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback'
      submitBtn.disabled = false
    }
  }

  async sendFeedbackToTelegram(feedbackData) {
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

    const telegramUrl = `https://api.telegram.org/bot${this.TELEGRAM_BOT_TOKEN}/sendMessage`
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: this.TELEGRAM_CHAT_ID,
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

  destroy() {
    super.destroy()
    this.container = null
  }
}