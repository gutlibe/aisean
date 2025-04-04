import { AuthManager } from "./utils/pg-auth.js"

export class Page {
  constructor() {
    // Basic configuration
    this.container = document.getElementById("page-content")
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

  // HTML Template for global loader
  _globalLoaderTemplate() {
    return `
    <div class="global-loader">
      <div class="loader">
        <div class="shimmer-container">
          <h1 class="shimmer-text">AIsean</h1>
          <div class="shimmer-effect"></div>
        </div>
        <p class="loader-tagline">Loading your experience...</p>
        <div class="progress-circles">
          <div class="progress-circle"></div>
          <div class="progress-circle"></div>
          <div class="progress-circle"></div>
        </div>
      </div>
    </div>
  `
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
      ? `<button class="btn btn-primary retry" onclick="this.closest('.page-content').dispatchEvent(new CustomEvent('retryRender'))">Try Again</button>`
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

  showGlobalLoader() {
    this.hideGlobalLoader()
    if (!this.container.querySelector(".global-loader")) {
      this.container.insertAdjacentHTML("beforeend", this._globalLoaderTemplate())
    }
  }

  hideGlobalLoader() {
    const loader = this.container.querySelector(".global-loader")
    if (loader) {
      loader.remove()
    }
  }

  showRetryPrompt(message) {
    this.hideRetryPrompt()
    const loader = this.container.querySelector(".global-loader")
    if (loader) {
      loader.insertAdjacentHTML("beforeend", this._errorWithRetryTemplate(message))
      const retryButton = loader.querySelector(".retry-now")
      if (retryButton) {
        retryButton.addEventListener("click", () => {
          this.currentRenderAttempt = 0
          this.render()
        })
      }
    }
  }

  hideRetryPrompt() {
    const retryPrompt = this.container.querySelector(".temporary-error")
    if (retryPrompt) {
      retryPrompt.remove()
    }
  }

  // Modify the render method to prevent FOUC during page transitions
  async render() {
    const renderTimestamp = Date.now()
    this.latestRenderTimestamp = renderTimestamp

    if (this.navigationAbortController) {
      this.navigationAbortController.abort()
    }
    this.navigationAbortController = new AbortController()
    const signal = this.navigationAbortController.signal

    this.loadingState = "initial"
    this.showGlobalLoader()
    this.hideRetryPrompt()
    if (this.temporaryErrorMessage) {
      this.showRetryPrompt(this.temporaryErrorMessage)
      this.temporaryErrorMessage = null
    }

    try {
      if (signal.aborted) throw new Error("NAVIGATION_INTERRUPTED")

      // Load page-specific CSS first BEFORE modifying the DOM
      // This prevents FOUC by ensuring CSS is ready before content changes
      await this.loadPageCSS()

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
          console.log("Redirecting to login due to AUTH_ERROR")
          window.location.replace("/login")
          throw new Error("AUTH_ERROR")
        } else if (authResult.error === "UNAUTHORIZED") {
          console.log("Redirecting to unauthorized path due to UNAUTHORIZED")
          // Use the router's method to get the appropriate redirect path
          const redirectPath = window.app.router.getUnauthorizedRedirectPath()
          window.app.navigateTo(redirectPath)
          throw new Error("UNAUTHORIZED")
        }
        throw new Error(authResult.error || "AUTH_ERROR")
      }

      if (signal.aborted) throw new Error("NAVIGATION_INTERRUPTED")

      const header = this.getPageHeader()
      const skeleton = this.getSkeletonTemplate()

      if (!signal.aborted) {
        // Create a temporary container for the new content
        const tempContainer = document.createElement("div")
        tempContainer.innerHTML = header + `<div id="page-content-wrapper">${skeleton || ""}</div>`

        // Only replace the container content when everything is ready
        this.container.innerHTML = tempContainer.innerHTML
        await this.afterStructureRender()
        this.loadingState = "structure"
      }

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
          if (signal.aborted) throw new Error("NAVIGATION_INTERRUPTED")
          throw error.message?.includes("timeout") ? new Error("DATABASE_TIMEOUT") : new Error("DATABASE_ERROR")
        }
      }

      if (signal.aborted) throw new Error("NAVIGATION_INTERRUPTED")

      const contentWrapper = this.container.querySelector("#page-content-wrapper")
      if (contentWrapper) {
        this.loadingState = "content"
        const content = await this.getContent()
        if (!signal.aborted) {
          // Create a temporary element to hold the new content
          const tempElement = document.createElement("div")
          tempElement.innerHTML = content

          // Replace content in a single operation to prevent FOUC
          contentWrapper.innerHTML = tempElement.innerHTML
        }
      }

      if (!signal.aborted) {
        await this.afterContentRender()
      }

      this.clearLoadingTimer()
      this.loadingState = "complete"
      this.hideGlobalLoader()
      this.currentRenderAttempt = 0
    } catch (error) {
      console.error("Render error:", error)
      if (this.latestRenderTimestamp === renderTimestamp) {
        await this.handleRenderError(error)
      }
    }
  }

  async handleRenderError(error) {
    this.clearLoadingTimer()

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
    this.hideGlobalLoader()

    if (!["AUTH_ERROR", "UNAUTHORIZED"].includes(errorType)) {
      const canRetry = ["NETWORK_ERROR", "DATABASE_ERROR", "DATABASE_TIMEOUT"].includes(errorType)
      this.container.innerHTML = this._errorTemplate(errorType, canRetry)

      if (canRetry) {
        const retryHandler = () => {
          this.currentRenderAttempt = 0
          this.render()
          this.container.removeEventListener("retryRender", retryHandler)
        }
        this.container.addEventListener("retryRender", retryHandler)
      }
    }
  }

  startLoadingTimer() {
    this.clearLoadingTimer()
    this.loadingTimer = setTimeout(() => {
      if (this.loadingState !== "complete" && this.loadingState !== "error") {
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

  // Update header actions and toggle title classes without using :has()
  updateHeaderActions() {
    const actionsContainer = this.container.querySelector(".page-actions")
    if (!actionsContainer) return
    actionsContainer.innerHTML = ""
    let actionsAdded = 0

    let customActionsHtml = ""
    if (this.constructor.prototype.getActions !== Page.prototype.getActions && typeof this.getActions === "function") {
      customActionsHtml = this.getActions()
      if (customActionsHtml) {
        actionsContainer.insertAdjacentHTML("beforeend", customActionsHtml)
        actionsAdded += customActionsHtml.trim() ? 1 : 0
      }
    }

    if (
      this.constructor.prototype.getActions === Page.prototype.getActions &&
      typeof this.getAdditionalActions === "function"
    ) {
      const additionalHtml = this.getAdditionalActions()
      if (additionalHtml) {
        actionsContainer.insertAdjacentHTML("beforeend", additionalHtml)
        actionsAdded += additionalHtml.trim() ? 1 : 0
      }
    }

    if (this.authData?.user) {
      if (this.showUpgradeButton) {
        const buttonHtml = this.getUpgradeButton()
        if (buttonHtml) {
          actionsContainer.insertAdjacentHTML("beforeend", buttonHtml)
          actionsAdded++
        }
      }
      if (this.showProfileAvatar === true && this.authData.username) {
        const avatarHtml = this._profileAvatarTemplate(this.authData.username)
        const profileContainer = document.createElement("div")
        profileContainer.className = "profile-container"
        profileContainer.innerHTML = avatarHtml
        actionsContainer.appendChild(profileContainer)
        actionsAdded++
      }
    } else {
      if (!this.requiresAuth) {
        const loginHtml = this.getLoginButton()
        if (loginHtml) {
          actionsContainer.insertAdjacentHTML("beforeend", loginHtml)
          actionsAdded++
        }
      }
    }

    actionsContainer.style.display = actionsAdded > 0 ? "" : "none"
    this.updateTitleTruncation(actionsAdded)
    this.setupHeaderActionListeners()
  }

  // Toggle title classes based on the presence of header actions
  updateTitleTruncation(actionsCount) {
    const pageTitle = this.container.querySelector(".page-title")
    if (!pageTitle) return
    const titleLength = pageTitle.textContent?.trim().length || 0
    const isLongTitle = titleLength > 30

    if (actionsCount > 0) {
      pageTitle.classList.add("with-actions")
      if (isLongTitle) {
        pageTitle.classList.add("long-title")
      } else {
        pageTitle.classList.remove("long-title")
      }
    } else {
      pageTitle.classList.remove("with-actions", "long-title")
    }
  }

  setupHeaderActionListeners() {
    this.loginButton = this.container.querySelector("#loginBtn")
    if (this.loginButton) {
      this.loginButton.removeEventListener("click", this.handleLoginClick)
      this.loginButton.addEventListener("click", this.handleLoginClick)
    }
    this.upgradeButton = this.container.querySelector("#upgradeBtn")
    if (this.upgradeButton) {
      this.upgradeButton.removeEventListener("click", this.handleUpgradeClick)
      this.upgradeButton.addEventListener("click", this.handleUpgradeClick)
    }
    this.premiumButton = this.container.querySelector("#premiumBtn")
    if (this.premiumButton) {
      this.premiumButton.removeEventListener("click", this.handlePremiumClick)
      this.premiumButton.addEventListener("click", this.handlePremiumClick)
    }
    const profileAvatar = this.container.querySelector(".profile-avatar")
    if (profileAvatar) {
      profileAvatar.removeEventListener("click", this.handleProfileClick)
      profileAvatar.addEventListener("click", this.handleProfileClick)
    }
    this.setupCustomActionListeners()
  }

  // Placeholder for subclasses to set up custom action listeners
  setupCustomActionListeners() {
    // To be implemented by subclasses if needed
  }

  async afterStructureRender() {
    const header = this.container.querySelector(".page-header-content")
    if (header) {
      this.handleHeaderClick = (e) => {
        const menuToggle = e.target.closest(".menu-toggle")
        const backArrow = e.target.closest(".back-arrow")
        if (menuToggle && window.app?.menuManager) {
          window.app.menuManager.toggleMenu()
        } else if (backArrow && window.app?.router) {
          window.app.router.goBack()
        }
      }
      header.addEventListener("click", this.handleHeaderClick)
    }
    this.updateHeaderActions()
    this.authListener = this.authManager.setupAuthListener((userData) => {
      if (userData !== this.authData) {
        this.authData = userData
        this.updateHeaderActions()
      }
    })
    // Register resize event listener for dynamic updates
    window.addEventListener("resize", this.handleResize)
  }

  async afterContentRender() {
    // To be implemented by subclasses if needed
  }

  async afterRender() {
    // This is now split between afterStructureRender and afterContentRender
  }

  getSkeletonTemplate() {
    return ""
  }

  async getContent() {
    return "<div>Page Content</div>"
  }

  async loadDatabaseContent() {
    return Promise.resolve()
  }

  getTitle() {
    return this.pageTitle || "Untitled Page"
  }

  getHeaderIcon() {
    return this.headerIcon || ""
  }

  getUserData() {
    return this.authManager.getUserData()
  }

  getUserType() {
    return this.authManager.getUserType()
  }

  getUserName() {
    return this.authManager.getUserName()
  }

  isUserAuthorized() {
    return this.authManager.isUserAuthorized()
  }

  destroy() {
    this.clearLoadingTimer()
    const header = this.container.querySelector(".page-header-content")
    if (header && this.handleHeaderClick) {
      header.removeEventListener("click", this.handleHeaderClick)
    }
    if (this.loginButton) {
      this.loginButton.removeEventListener("click", this.handleLoginClick)
    }
    if (this.upgradeButton) {
      this.upgradeButton.removeEventListener("click", this.handleUpgradeClick)
    }
    if (this.premiumButton) {
      this.premiumButton.removeEventListener("click", this.handlePremiumClick)
    }
    const profileAvatar = this.container.querySelector(".profile-avatar")
    if (profileAvatar) {
      profileAvatar.removeEventListener("click", this.handleProfileClick)
    }
    if (this.authListener) {
      this.authListener()
      this.authListener = null
    }
    if (this.databaseLoadPromise && typeof this.databaseLoadPromise.cancel === "function") {
      this.databaseLoadPromise.cancel()
    }
    if (this.navigationAbortController) {
      this.navigationAbortController.abort()
    }
    // Remove resize event listener
    window.removeEventListener("resize", this.handleResize)
    this.hideGlobalLoader()
  }
}

