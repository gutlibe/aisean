import { AuthManager } from "./utils/pg-auth.js"

export class Page {
  constructor() {
    // Basic configuration
    this.container = null // Initialize as null, will be set during render
    this.showMenuIcon = true
    this.showBackArrow = false
    this.requiresDatabase = false

    // CSS configuration
    this.cssFiles = [] // Array of CSS files to load for this page
    this.baseCssPath = "/assets/css/" // Base path for CSS files

    // Auth related settings
    this.requiresAuth = false
    this.authorizedUserTypes = [] // e.g. ['Admin', 'Agent']
    this.unauthorizedRedirectPath = null // Custom path to redirect unauthorized users
    this.loginButton = null
    this.profileAvatar = null
    this.showProfileAvatar = false
    this.showUpgradeButton = false
    this.upgradeButton = null
    this.premiumButton = null
    this.authListener = null
    this.authData = null

    // Initialize AuthManager
    this.authManager = new AuthManager(this)

    // Loading states
    this.loadingState = "initial" // initial -> auth -> structure -> content -> complete
    this.loadingTimeout = 30000
    this.loadingTimer = null
    this.databaseLoadPromise = null

    // Configuration options
    this.maxRetries = 2
    this.retryDelay = 1000
    this.currentRenderAttempt = 0
    this.latestRenderTimestamp = 0
    this.temporaryErrorMessage = null

    // Navigation
    this.navigationAbortController = null
    this.preparedHeader = null
    this.preparedSkeleton = null

    // Bind methods to ensure proper 'this' context
    this.handleLoginClick = this.handleLoginClick.bind(this)
    this.handleUpgradeClick = this.handleUpgradeClick.bind(this)
    this.handlePremiumClick = this.handlePremiumClick.bind(this)
    this.handleProfileClick = this.handleProfileClick.bind(this)

    // Bind and debounce resize handler
    this.handleResize = this.debounce(this.onResize.bind(this), 200)
  }

  // Method to load CSS for this page
  async loadPageCSS() {
    if (!window.app?.cssManager) {
      console.warn("CSS Manager not available, skipping CSS loading")
      return false
    }

    const cssManager = window.app.cssManager
    const promises = []

    // Load all CSS files specified for this page
    if (this.cssFiles && this.cssFiles.length > 0) {
      for (const cssFile of this.cssFiles) {
        // Handle absolute paths (starting with /)
        if (cssFile.startsWith("/")) {
          promises.push(cssManager.loadCSS(cssFile))
        }
        // Handle relative paths
        else {
          promises.push(cssManager.loadCSS(`${this.baseCssPath}${cssFile}`))
        }
      }
    }

    try {
      await Promise.all(promises)
      return true
    } catch (error) {
      console.error("Failed to load page CSS:", error)
      return false
    }
  }

  // Debounce utility function to limit frequency of function calls
  debounce(func, delay) {
    let timeout
    return function (...args) {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(this, args), delay)
    }
  }

  // Called when the window is resized; update header actions
  onResize() {
    this.updateHeaderActions()
  }

  _errorWithRetryTemplate(message) {
    return `
        <div class="temporary-error">
            <p>${message}</p>
            <button class="btn btn-text retry-now">Retry Now</button>
        </div>`
  }

  _errorTemplate(errorType, canRetry = true) {
    const messages = {
      DATABASE_TIMEOUT: "Taking longer than expected to load. Please check your connection.",
      NETWORK_ERROR: "Please check your internet connection.",
      DATABASE_ERROR: "Unable to access required data. Please try again.",
      NAVIGATION_INTERRUPTED: "Navigation was interrupted. Please try again.",
      AUTH_ERROR: "Authentication issue detected. Please log in again.",
      UNAUTHORIZED: "You do not have permission to access this page.",
      UNKNOWN_ERROR: "Something unexpected happened. Please try again.",
    }

    const displayMessage = messages[errorType] || messages.UNKNOWN_ERROR
    const buttonHtml = canRetry
      ? `<button class="btn btn-primary retry" onclick="this.closest('#page-content').dispatchEvent(new CustomEvent('retryRender'))">Try Again</button>`
      : errorType === "UNAUTHORIZED"
        ? `<button class="btn btn-primary go-home" onclick="window.location.href='/'">Go Home</button>`
        : errorType === "AUTH_ERROR"
          ? `<button class="btn btn-primary login" onclick="window.location.href='/login'">Log In</button>`
          : `<button class="btn btn-primary refresh" onclick="location.reload()">Refresh Page</button>`

    return `
        <div class="error-state">
            <i class="fas fa-exclamation-circle"></i>
            <h3>Oops!</h3>
            <p>${displayMessage}</p>
            ${buttonHtml}
        </div>`
  }

  // Generate a gradient color based on user's name
  _generateGradient(username) {
    const hash = username.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    const hue1 = Math.abs(hash % 360)
    const hue2 = (hue1 + 40) % 360
    return `linear-gradient(135deg, hsl(${hue1}, 70%, 60%), hsl(${hue2}, 70%, 50%))`
  }

  // Create profile avatar template
  _profileAvatarTemplate(username) {
    if (!username) return ""
    const firstLetter = username.charAt(0).toUpperCase()
    const gradient = this._generateGradient(username)
    return `
      <div class="profile-avatar" style="background: ${gradient};">
        ${firstLetter}
      </div>
    `
  }

  showRetryPrompt(message) {
    this.hideRetryPrompt()
    // Safely check if container exists before attempting to use it
    if (!this.container) return

    // Try appending to page-content-wrapper first, then container
    const targetElement = this.container.querySelector("#page-content-wrapper") || this.container
    if (targetElement) {
      targetElement.insertAdjacentHTML("beforeend", this._errorWithRetryTemplate(message))
      const retryButton = targetElement.querySelector(".retry-now")
      if (retryButton) {
        retryButton.addEventListener("click", () => {
          this.currentRenderAttempt = 0
          this.render()
        })
      }
    }
  }

  hideRetryPrompt() {
    // Safely check if container exists before attempting to use it
    if (!this.container) return

    const retryPrompt = this.container.querySelector(".temporary-error")
    if (retryPrompt) {
      retryPrompt.remove()
    }
  }

  // Default skeleton template - can be overridden by subclasses
  getSkeletonTemplate() {
    return `
      <div class="skeleton-container">
        <div class="skeleton-header pulse"></div>
        <div class="skeleton-content">
          <div class="skeleton-item pulse"></div>
          <div class="skeleton-item pulse"></div>
          <div class="skeleton-item pulse"></div>
        </div>
      </div>
    `
  }

  // Prepare render method - separates preparation from DOM manipulation
  async prepareRender() {
    const renderTimestamp = Date.now()
    this.latestRenderTimestamp = renderTimestamp

    // Create a new abort controller for this navigation
    if (this.navigationAbortController) {
      this.navigationAbortController.abort("New navigation started")
    }
    this.navigationAbortController = new AbortController()
    const signal = this.navigationAbortController.signal

    this.loadingState = "initial"
    this.temporaryErrorMessage = null

    try {
      if (signal.aborted) throw new Error("NAVIGATION_INTERRUPTED")

      // Load page-specific CSS first
      await this.loadPageCSS()

      // Prepare skeleton immediately so it's ready when needed
      this.preparedSkeleton = this.getSkeletonTemplate()

      this.loadingState = "auth"
      const authResult = await this.authManager.verifyAuth()
      this.authData = authResult.authData

      if (authResult.pending) {
        console.log("Auth still initializing, proceeding with render but will re-verify later")
        setTimeout(() => {
          if (this.latestRenderTimestamp === renderTimestamp) {
            this.authManager.recheckAuth(renderTimestamp)
          }
        }, 2000)
      } else if (!authResult.success) {
        if (authResult.error === "AUTH_ERROR") {
          throw new Error("AUTH_ERROR")
        } else if (authResult.error === "UNAUTHORIZED") {
          throw new Error("UNAUTHORIZED")
        }
        throw new Error(authResult.error || "AUTH_ERROR")
      }

      if (signal.aborted) throw new Error("NAVIGATION_INTERRUPTED")

      // Prepare header after auth check
      this.preparedHeader = this.getPageHeader()

      // Return true to indicate preparation is complete
      return true
    } catch (error) {
      console.error("Prepare render error:", error)
      throw error
    }
  }

  // Finalize render method - handles DOM manipulation
  async finalizeRender() {
    try {
      // Ensure container exists
      this.container = document.getElementById("page-content")
      if (!this.container) {
        throw new Error("Page container not found")
      }

      if (!this.preparedHeader || !this.preparedSkeleton) {
        // If preparation failed or wasn't called, fallback to regular render
        return this.render()
      }

      // Create a temporary container for the new content
      const tempContainer = document.createElement("div")
      // Render header and skeleton immediately using prepared content
      tempContainer.innerHTML =
        this.preparedHeader + `<div id="page-content-wrapper">${this.preparedSkeleton || ""}</div>`

      // Replace the container content
      this.container.innerHTML = tempContainer.innerHTML

      // Now that we have content, we can hide any retry prompts
      this.hideRetryPrompt()

      await this.afterStructureRender()
      this.loadingState = "structure"

      // Continue with database loading if needed
      if (this.requiresDatabase && this.loadDatabaseContent) {
        this.startLoadingTimer()
        try {
          if (!this.authData.firebase?.firestore) {
            console.log("Firebase not ready, waiting before loading database content")
            await new Promise((resolve) => setTimeout(resolve, 500))
            if (!window.app?.getLibrary("firebase")?.firestore) {
              throw new Error("DATABASE_ERROR: Firebase not initialized")
            }
          }
          this.databaseLoadPromise = this.loadDatabaseContent()
          await this.databaseLoadPromise
        } catch (error) {
          console.error("Database load error:", error)
          if (this.navigationAbortController.signal.aborted) throw new Error("NAVIGATION_INTERRUPTED")
          throw error.message?.includes("timeout") ? new Error("DATABASE_TIMEOUT") : new Error("DATABASE_ERROR")
        } finally {
          this.clearLoadingTimer()
        }
      }

      if (this.navigationAbortController.signal.aborted) throw new Error("NAVIGATION_INTERRUPTED")

      // Continue with content rendering
      const contentWrapper = this.container.querySelector("#page-content-wrapper")
      if (contentWrapper) {
        this.loadingState = "content"
        const content = await this.getContent()
        if (!this.navigationAbortController.signal.aborted) {
          // Create a temporary element to hold the new content
          const tempElement = document.createElement("div")
          tempElement.innerHTML = content

          // Replace skeleton/content in the wrapper
          contentWrapper.innerHTML = tempElement.innerHTML
        }
      }

      if (!this.navigationAbortController.signal.aborted) {
        await this.afterContentRender()
      }

      this.loadingState = "complete"
      this.currentRenderAttempt = 0

      // Clear prepared content references
      this.preparedHeader = null
      this.preparedSkeleton = null
    } catch (error) {
      console.error("Finalize render error:", error)
      await this.handleRenderError(error)
    }
  }

  // Legacy render method - now uses the two-phase rendering approach
  async render() {
    try {
      await this.prepareRender()
      await this.finalizeRender()
    } catch (error) {
      console.error("Render error:", error)
      await this.handleRenderError(error)
    }
  }

  async handleRenderError(error) {
    this.clearLoadingTimer()

    // Ensure container exists
    if (!this.container) {
      this.container = document.getElementById("page-content")
      if (!this.container) {
        console.error("Cannot handle render error: page container not found")
        return
      }
    }

    const errorType = !error
      ? "UNKNOWN_ERROR"
      : error.message?.includes("AUTH_ERROR")
        ? "AUTH_ERROR"
        : error.message?.includes("UNAUTHORIZED")
          ? "UNAUTHORIZED"
          : error instanceof TypeError && error.message?.includes("network")
            ? "NETWORK_ERROR"
            : error.message?.includes("timeout")
              ? "DATABASE_TIMEOUT"
              : error.message?.includes("database") || error.message?.includes("DB")
                ? "DATABASE_ERROR"
                : error.message?.includes("interrupted") || error.message?.includes("navigation")
                  ? "NAVIGATION_INTERRUPTED"
                  : "UNKNOWN_ERROR"

    const shouldRetry =
      ["NETWORK_ERROR", "DATABASE_ERROR", "DATABASE_TIMEOUT"].includes(errorType) &&
      this.currentRenderAttempt < this.maxRetries

    if (shouldRetry) {
      this.currentRenderAttempt++
      const messages = {
        NETWORK_ERROR: "Connection issue detected. Retrying...",
        DATABASE_ERROR: "Database connection issue. Retrying...",
        DATABASE_TIMEOUT: "Loading taking longer than expected. Retrying...",
        default: "Temporary issue detected. Retrying...",
      }
      this.temporaryErrorMessage = messages[errorType] || messages.default
      this.showRetryPrompt(this.temporaryErrorMessage)
      await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
      return this.render()
    }

    this.loadingState = "error"

    if (!["AUTH_ERROR", "UNAUTHORIZED"].includes(errorType)) {
      const canRetry = ["NETWORK_ERROR", "DATABASE_ERROR", "DATABASE_TIMEOUT"].includes(errorType)
      // Replace the entire page container content with the error state
      this.container.innerHTML = this._errorTemplate(errorType, canRetry)

      if (canRetry) {
        const retryHandler = () => {
          this.currentRenderAttempt = 0
          this.render()
          this.container.removeEventListener("retryRender", retryHandler)
        }
        this.container.addEventListener("retryRender", retryHandler)
      }
    } else if (errorType === "AUTH_ERROR") {
      console.log("Redirecting to login due to AUTH_ERROR")
      window.location.replace("/login")
    } else if (errorType === "UNAUTHORIZED") {
      console.log("Redirecting to unauthorized path due to UNAUTHORIZED")
      const redirectPath = window.app.router.getUnauthorizedRedirectPath()
      window.app.navigateTo(redirectPath)
    }
  }

  startLoadingTimer() {
    this.clearLoadingTimer()
    this.loadingTimer = setTimeout(() => {
      if (this.loadingState !== "complete" && this.loadingState !== "error") {
        console.warn(`Loading timer expired (${this.loadingTimeout}ms) in state: ${this.loadingState}`)
        this.handleRenderError(new Error("DATABASE_TIMEOUT"))
      }
    }, this.loadingTimeout)
  }

  clearLoadingTimer() {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer)
      this.loadingTimer = null
    }
  }

  getPageHeader() {
    const headerIcon = this.getHeaderIcon()
    const title = this.getTitle()
    let actions = this.getPageActions()

    let headerButtons = ""
    if (this.showMenuIcon) {
      headerButtons += `
            <button class="menu-toggle" aria-label="Toggle menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        `
    }
    if (this.showBackArrow) {
      headerButtons += '<button class="back-arrow"><i class="fas fa-arrow-left"></i></button>'
    }

    let profileContainer = ""
    if (this.showProfileAvatar) {
      profileContainer = '<div class="profile-container" style="display: none;"></div>'
    }

    const loginButton = this.getLoginButton()
    if (loginButton) {
      actions += loginButton
    }

    const hasActions = actions.trim() !== ""
    const titleLength = title.length
    const longTitleClass = titleLength > 30 ? "long-title" : ""
    const actionsClass = hasActions && titleLength > 15 ? "with-actions" : ""
    const titleClass = `page-title ${headerIcon ? "with-icon" : ""} ${actionsClass} ${longTitleClass}`

    return `
        <div class="page-header">
            <div class="page-header-content">
                ${headerButtons}
                <h1 class="${titleClass}" data-title-length="${titleLength}">
                    ${headerIcon ? `<i class="${headerIcon}"></i>` : ""}
                    ${title}
                </h1>
                <div class="page-actions" ${!hasActions && !this.showProfileAvatar ? 'style="display:none;"' : ""}>
                    ${actions}
                    ${profileContainer}
                </div>
            </div>
        </div>`
  }

  getPageActions() {
    let customActions = ""
    if (this.constructor.prototype.getActions !== Page.prototype.getActions && typeof this.getActions === "function") {
      customActions = this.getActions()
    }
    const standardActions = this.getStandardActions()
    return customActions + standardActions
  }

  getStandardActions() {
    let actions = ""
    if (this.showUpgradeButton && this.authData?.user) {
      actions += this.getUpgradeButton()
    }
    if (
      this.constructor.prototype.getActions === Page.prototype.getActions &&
      typeof this.getAdditionalActions === "function"
    ) {
      actions += this.getAdditionalActions()
    }
    return actions
  }

  getActions() {
    return ""
  }

  getUpgradeButton() {
    if (!this.showUpgradeButton || !this.authData?.user) return ""
    const isPro = this.authData.userType === "Pro" || this.authData.userType === "Premium" || this.authData.user?.isPro
    return isPro
      ? `<button class="btn btn-premium" id="premiumBtn" aria-label="Premium Status">Premium</button>`
      : `<button class="btn btn-upgrade" id="upgradeBtn" aria-label="Upgrade to Pro">Upgrade to Pro</button>`
  }

  getLoginButton() {
    if (this.requiresAuth) {
      return ""
    }
    const authManager = window.app?.getAuthManager()
    const currentUser = authManager?.getCurrentUser()
    if (currentUser) return ""
    return `<button class="btn btn-primary" id="loginBtn" aria-label="Login">Login</button>`
  }

  handleLoginClick() {
    window.location.href = "/login"
  }

  handleUpgradeClick() {
    console.log("Upgrade button clicked")
    if (window.app) {
      window.app.navigateTo("/pricing")
    } else {
      window.location.href = "/pricing"
    }
  }

  handlePremiumClick() {
    console.log("Premium button clicked")
    if (window.app) {
      window.app.navigateTo("/premium")
    } else {
      window.location.href = "/premium"
    }
  }

  handleProfileClick() {
    if (window.app) {
      window.app.navigateTo("/profile")
    } else {
      window.location.href = "/profile"
    }
  }

  async refreshPageElements() {
    this.updateHeaderActions()
    await this.afterContentRender()
  }

  updateHeaderActions() {
    if (!this.container) return

    // Update login button
    if (!this.requiresAuth) {
      const loginBtn = this.container.querySelector("#loginBtn")
      if (loginBtn && !this.loginButton) {
        this.loginButton = loginBtn
        this.loginButton.addEventListener("click", this.handleLoginClick)
      }
    }

    // Update upgrade button
    if (this.showUpgradeButton) {
      const upgradeBtn = this.container.querySelector("#upgradeBtn")
      if (upgradeBtn && !this.upgradeButton) {
        this.upgradeButton = upgradeBtn
        this.upgradeButton.addEventListener("click", this.handleUpgradeClick)
      }

      const premiumBtn = this.container.querySelector("#premiumBtn")
      if (premiumBtn && !this.premiumButton) {
        this.premiumButton = premiumBtn
        this.premiumButton.addEventListener("click", this.handlePremiumClick)
      }
    }

    // Update profile avatar
    if (this.showProfileAvatar && this.authData?.user) {
      const profileContainer = this.container.querySelector(".profile-container")
      if (profileContainer) {
        const username = this.authData.user.displayName || this.authData.user.email || "User"
        profileContainer.innerHTML = this._profileAvatarTemplate(username)
        profileContainer.style.display = "flex"
        if (!this.profileAvatar) {
          this.profileAvatar = profileContainer
          this.profileAvatar.addEventListener("click", this.handleProfileClick)
        }
      }
    }

    // Update back arrow
    if (this.showBackArrow) {
      const backArrow = this.container.querySelector(".back-arrow")
      if (backArrow) {
        backArrow.addEventListener("click", () => {
          if (window.app?.router) {
            window.app.router.goBack()
          } else {
            window.history.back()
          }
        })
      }
    }

    // Update menu toggle
    if (this.showMenuIcon) {
      const menuToggle = this.container.querySelector(".menu-toggle")
      if (menuToggle) {
        menuToggle.addEventListener("click", () => {
          if (window.app?.menuManager) {
            window.app.menuManager.toggleMenu()
          }
        })
      }
    }
  }

  getTitle() {
    return "Page"
  }

  getHeaderIcon() {
    return ""
  }

  async getContent() {
    return "<div>Page content not implemented</div>"
  }

  async afterStructureRender() {
    this.updateHeaderActions()
    window.addEventListener("resize", this.handleResize)
  }

  async afterContentRender() {
    // Override in subclasses
  }

  getUserData() {
    return this.authData?.user || null
  }

  destroy() {
    // Clean up event listeners
    window.removeEventListener("resize", this.handleResize)

    // Clean up auth listener
    if (this.authListener) {
      this.authListener()
      this.authListener = null
    }

    // Clean up navigation controller
    if (this.navigationAbortController) {
      this.navigationAbortController.abort()
      this.navigationAbortController = null
    }

    // Clean up timers
    this.clearLoadingTimer()

    // Clean up references
    this.container = null
    this.loginButton = null
    this.upgradeButton = null
    this.premiumButton = null
    this.profileAvatar = null
    this.authData = null
    this.preparedHeader = null
    this.preparedSkeleton = null
  }
}
