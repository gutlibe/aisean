import { Page } from "../../../core/page.js"

/**
 * ProfilePage - User profile display and management
 *
 * Displays user information from Firestore and provides
 * logout functionality.
 * 
 * This version is updated to work with the multi-render architecture.
 */
export class ProfilePage extends Page {
  constructor() {
    super()
    
    this.showMenuIcon = false
    this.showBackArrow = true
    this.requiresDatabase = true
    this.requiresAuth = true
    this.authorizedUserTypes = [] // Empty array = no restrictions
    
    this.showProfileAvatar = false
    this.loadingTimeout = 15000 // 15 seconds
    this.maxRetries = 2
    this.retryDelay = 1000
    this.isLoggingOut = false
    
    this.cssFiles = [
      "pages/public/profile/index.css",
    ]
  }
  
  getTitle() {
    return "Profile"
  }
  
  getHeaderIcon() {
    return "fas fa-user"
  }
  
  getSkeletonTemplate() {
    return `
            <div class="pfp-skeleton-container">
                <div class="pfp-avatar-skeleton pulse"></div>
                <div class="pfp-info-skeleton">
                    <div class="pfp-name-skeleton pulse"></div>
                    <div class="pfp-email-skeleton pulse"></div>
                    <div class="pfp-details-skeleton">
                        <div class="pfp-detail-item-skeleton pulse"></div>
                        <div class="pfp-detail-item-skeleton pulse"></div>
                        <div class="pfp-detail-item-skeleton pulse"></div>
                    </div>
                </div>
            </div>
        `
  }
  
  async loadDatabaseContent() {
    try {
      const firebase = window.app.getLibrary("firebase")
      const userId = this.getUserData()?.uid
      
      if (!userId) {
        throw new Error("User not authenticated")
      }
      
      const userDoc = await firebase.getDoc(firebase.doc(firebase.firestore, `users/${userId}`))
      
      if (userDoc.exists()) {
        this.userData = {
          id: userDoc.id,
          ...userDoc.data(),
        }
        return true
      } else {
        throw new Error("User profile not found")
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
      throw new Error("DATABASE_ERROR")
    }
  }
  
  getUserTypeDisplay(userType) {
    const typeMap = {
      Member: "Enthusiast",
      Pro: "Professional",
      Admin: "Expert",
      Agent: "Analyst",
    }
    return typeMap[userType] || "Fan"
  }
  
  formatDate(timestamp) {
    if (!timestamp || !timestamp.toDate) return "N/A"
    const date = timestamp.toDate()
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }
  
  async getContent() {
    if (!this.userData) {
      return `
                <div class="pfp-error-container">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Profile Unavailable</h3>
                    <p>We couldn't load your profile information. Please try again.</p>
                    <button class="btn btn-primary" id="pfp-retry-btn">
                        Retry
                    </button>
                </div>
            `
    }
    
    const firstLetter = this.userData.username ? this.userData.username.charAt(0).toUpperCase() : "?"
    
    const statusClass = this.userData.status === "active" ? "pfp-status-active" : "pfp-status-inactive"
    
    const userTypeDisplay = this.getUserTypeDisplay(this.userData.userType)
    const createdAtFormatted = this.formatDate(this.userData.createdAt)
    
    const logoutBtnContent = this.isLoggingOut ?
      '<i class="fas fa-spinner fa-spin"></i> Signing Out...' :
      '<i class="fas fa-sign-out-alt"></i> Log Out'
    
    return `
            <div class="pfp-container">
                <div class="pfp-avatar-section">
                    <div class="pfp-avatar">
                        <span>${firstLetter}</span>
                    </div>
                </div>
                
                <div class="pfp-info-section">
                    <h2 class="pfp-username">${this.escapeHtml(this.userData.username || "User")}</h2>
                    <p class="pfp-email">${this.escapeHtml(this.userData.email || "No email")}</p>
                    
                    <div class="pfp-details">
                        <div class="pfp-detail-item">
                            <span class="pfp-detail-label">Fan Level</span>
                            <span class="pfp-detail-value">${this.escapeHtml(userTypeDisplay)}</span>
                        </div>
                        
                        <div class="pfp-detail-item">
                            <span class="pfp-detail-label">Status</span>
                            <span class="pfp-detail-value ${statusClass}">
                                ${this.escapeHtml(this.userData.status || "Unknown")}
                            </span>
                        </div>
                        
                        <div class="pfp-detail-item">
                            <span class="pfp-detail-label">Joined</span>
                            <span class="pfp-detail-value">${createdAtFormatted}</span>
                        </div>
                    </div>
                </div>
                
                <div class="pfp-actions">
                    <button class="btn btn-primary pfp-logout-btn" id="pfp-logout-btn" ${this.isLoggingOut ? "disabled" : ""}>
                        ${logoutBtnContent}
                    </button>
                </div>
            </div>
        `
  }
  
  async afterContentRender() {
    const logoutBtn = this.container.querySelector("#pfp-logout-btn")
    if (logoutBtn && !this.isLoggingOut) {
      logoutBtn.addEventListener("click", () => this.handleLogout())
    }
    
    const retryBtn = this.container.querySelector("#pfp-retry-btn")
    if (retryBtn) {
      retryBtn.addEventListener("click", () => this.refresh())
    }
  }
  
  async handleLogout() {
    if (this.isLoggingOut) return
    
    try {
      const firebase = window.app.getLibrary("firebase")
      
      // Set logging out state
      this.isLoggingOut = true
      
      // Re-render to show the spinner
      const contentWrapper = this.container.querySelector("#page-content-wrapper")
      if (contentWrapper) {
        const content = await this.getContent()
        contentWrapper.innerHTML = content
        await this.afterContentRender()
      }
      
      // Perform the logout
      await firebase.signOut(firebase.auth)
      
      // Show success notification
      window.app.showToast("You have been logged out successfully", "success")
      
      // Delay for 3 seconds before redirecting for smoother UX
      await new Promise((resolve) => setTimeout(resolve, 3000))
      
      // Redirect to login page using location
      window.location.href = "/login"
    } catch (error) {
      console.error("Logout error:", error)
      
      // Reset logging out state on error
      this.isLoggingOut = false
      
      // Update the content to reflect the error state
      const contentWrapper = this.container.querySelector("#page-content-wrapper")
      if (contentWrapper) {
        const content = await this.getContent()
        contentWrapper.innerHTML = content
        await this.afterContentRender()
      }
      
      // Show error notification
      window.app.showToast("Failed to log out. Please try again.", "error")
    }
  }
  
  escapeHtml(unsafe) {
    if (!unsafe) return ""
    return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }
  
  refresh() {
    this.currentRenderAttempt = 0
    this.render()
  }
  
  destroy() {
    super.destroy()
    this.userData = null
    this.container = null
    this.isLoggingOut = false
  }
}