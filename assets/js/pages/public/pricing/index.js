import { Page } from "../../../core/page.js";

export class PricingPage extends Page {
  constructor() {
    super();
    this.showMenuIcon = false;
    this.showBackArrow = true;
    this.requiresDatabase = true;
    this.requiresAuth = false;
    this.authorizedUserTypes = [];
    this.isButtonDisabled = false;
    this.pricingData = null;
    
    this.cssFiles = [
      "pages/public/pricing/index.css",
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
  
  getTitle() {
    return "Premium Pricing";
  }
  
  getHeaderIcon() {
    return "fas fa-crown";
  }
  
  getActions() {
    return ``;
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
    `;
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
    `;
  }
  
  /**
   * Load pricing data from Realtime Database
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
        // Initialize with default values if no data exists
        this.pricingData = [
        {
          id: 'monthly',
          name: 'Monthly Premium',
          duration: 30,
          price: 50,
          active: true,
          features: [
            'All Premium Predictions',
            'Expert Analysis & Tips',
            'Access to Upcoming Features'
          ]
        },
        {
          id: 'quarterly',
          name: 'Quarterly Premium',
          duration: 90,
          price: 120,
          active: true,
          features: [
            'All Premium Predictions',
            'Expert Analysis & Tips',
            'Access to Upcoming Features',
            'Priority Customer Support'
          ]
        }];
      }
      
      return true;
    } catch (error) {
      console.error('Error loading pricing data:', error);
      // Fallback to default values if there's an error
      this.pricingData = [
      {
        id: 'monthly',
        name: 'Monthly Premium',
        duration: 30,
        price: 50,
        active: true,
        features: [
          'All Premium Predictions',
          'Expert Analysis & Tips',
          'Access to Upcoming Features'
        ]
      },
      {
        id: 'quarterly',
        name: 'Quarterly Premium',
        duration: 90,
        price: 120,
        active: true,
        features: [
          'All Premium Predictions',
          'Expert Analysis & Tips',
          'Access to Upcoming Features',
          'Priority Customer Support'
        ]
      }];
      return true; // Return true to continue rendering with fallback data
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
   * Get active plans sorted by price
   */
  getActivePlans() {
    if (!this.pricingData || !Array.isArray(this.pricingData)) {
      return [];
    }
    
    // Filter active plans and sort by price
    return this.pricingData
      .filter(plan => plan.active)
      .sort((a, b) => a.price - b.price);
  }
  
  /**
   * Calculate savings amount for a plan
   * @param {Object} plan - The plan object
   * @returns {number} - The amount saved compared to monthly equivalent
   */
  calculateSavings(plan) {
    if (!plan || plan.duration <= 30) return 0;
    
    // Find the monthly plan
    const monthlyPlan = this.pricingData.find(p =>
      p.active && p.duration <= 30 && p.duration >= 28
    );
    
    if (!monthlyPlan) return 0;
    
    // Calculate equivalent monthly cost
    const monthsCount = plan.duration / 30;
    const equivalentMonthlyTotal = monthlyPlan.price * monthsCount;
    
    // Calculate savings
    return Math.round(equivalentMonthlyTotal - plan.price);
  }
  
  async getContent() {
    const activePlans = this.getActivePlans();
    
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
      `;
    }
    
    // Generate pricing cards HTML
    const pricingCardsHtml = activePlans.map(plan => this.renderPricingCard(plan)).join('');
    
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
    `;
  }
  
  /**
   * Render a pricing card for a plan
   * @param {Object} plan - The plan object
   * @returns {string} - HTML for the pricing card
   */
  renderPricingCard(plan) {
    if (!plan) return '';
    
    const buttonState = this.isButtonDisabled ? "disabled" : "";
    const isQuarterly = plan.duration >= 90;
    const savingsAmount = this.calculateSavings(plan);
    
    // Determine if this is the featured plan (the one with the longest duration)
    const isFeatured = plan === this.getActivePlans().reduce((a, b) =>
      a.duration > b.duration ? a : b, { duration: 0 });
    
    // Generate features HTML
    const featuresHtml = (plan.features || []).map(feature => `
      <div class="pcg-feature">
        <i class="fas fa-check-circle"></i>
        <span>${this.escapeHtml(feature)}</span>
      </div>
    `).join('');
    
    // Format price period text
    let periodText = '/month';
    if (plan.duration >= 90 && plan.duration < 180) {
      periodText = '/3 months';
    } else if (plan.duration >= 180 && plan.duration < 365) {
      periodText = '/6 months';
    } else if (plan.duration >= 365) {
      periodText = '/year';
    }
    
    return `
      <div class="pcg-card ${isFeatured ? 'pcg-featured' : ''}">
        ${isFeatured ? '<div class="pcg-popular-tag">Best Value</div>' : ''}
        <div class="pcg-card-header">
          <div class="pcg-plan-name">${this.escapeHtml(plan.name)}</div>
          <div class="pcg-plan-duration">${plan.duration} Days Access</div>
        </div>
        <div class="pcg-price">
          <span class="pcg-currency">₵</span>
          <span class="pcg-amount">${plan.price}</span>
          <span class="pcg-period">${periodText}</span>
        </div>
        ${savingsAmount > 0 ? `<div class="pcg-savings">Save ₵${savingsAmount}</div>` : ''}
        <div class="pcg-features">
          ${featuresHtml}
        </div>
        <div class="pcg-button-container">
          <button id="subscribe-${plan.id}" class="pcg-subscribe-btn" ${buttonState} data-plan="${plan.id}">
            Subscribe Now
          </button>
        </div>
      </div>
    `;
  }
  
  async afterContentRender() {
    // Set up event listeners for subscription buttons
    const subscribeButtons = this.container.querySelectorAll(".pcg-subscribe-btn");
    subscribeButtons.forEach(button => {
      button.addEventListener("click", (e) => {
        const planId = e.currentTarget.dataset.plan;
        this.handleSubscription(planId);
      });
    });
    
    // Set up FAQ toggles
    const faqQuestions = this.container.querySelectorAll(".pcg-faq-question");
    faqQuestions.forEach((question) => {
      question.addEventListener("click", () => {
        const faqId = question.getAttribute("data-faq");
        const answer = this.container.querySelector(`#faq-${faqId}`);
        
        if (answer) {
          answer.classList.toggle("pcg-faq-answer-open");
          question.classList.toggle("pcg-faq-question-open");
        }
      });
    });
  }
  
  handleSubscription(planId) {
    // Find the plan in our data
    const plan = this.pricingData.find(p => p.id === planId);
    if (!plan) {
      console.error(`Plan with ID ${planId} not found`);
      return;
    }
    
    // Get the button that was clicked
    const button = this.container.querySelector(`#subscribe-${planId}`);
    
    if (button) {
      // Disable all buttons to prevent multiple clicks
      this.toggleButtonState(true);
      
      // Replace button text with spinner
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      
      // Show toast notification
      if (window.app && window.app.showToast) {
        window.app.showToast(`Processing ${plan.name} subscription...`, "info");
      }
      
      // Determine the redirect URL based on the plan
      // For backward compatibility, use tab=1 for monthly and tab=2 for quarterly/longer plans
      const tabId = plan.duration <= 30 ? "1" : "2";
      const redirectUrl = `/upgrade?tab=${tabId}&plan=${planId}`;
      
      // Wait 1.5 seconds before redirecting (reduced from 3 seconds for better UX)
      setTimeout(() => {
        // Navigate to subscription processing page
        if (window.app && window.app.navigateTo) {
          window.app.navigateTo(redirectUrl);
        } else {
          console.error("Navigation function not available");
          
          // Restore button state if navigation fails
          button.innerHTML = originalText;
          this.toggleButtonState(false);
        }
      }, 1500);
    }
  }
  
  toggleButtonState(disabled) {
    this.isButtonDisabled = disabled;
    
    const subscribeButtons = this.container.querySelectorAll(".pcg-subscribe-btn");
    subscribeButtons.forEach(button => {
      button.disabled = disabled;
    });
  }
}