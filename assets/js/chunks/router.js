import routeManager from "../main/routes.js"

export default class Router {
  constructor() {
    this.routes = new Map()
    this.currentPath = ""
    this.defaultPath = "/"
    this.isEnabled = true
    this.currentPage = null // Store the current page instance
    this.defaultUnauthorizedPath = "/404" // Default path for unauthorized redirects

    // New cache properties
    this.moduleCache = new Map() // Cache for imported page modules
    this.pageCache = new Map() // Cache for instantiated page instances

    // Bind methods to preserve context
    this.boundHandleRoute = this.handleRoute.bind(this)
    this.boundHandleInitialRoute = this.handleInitialRoute.bind(this)

    // Initialize router
    this.initialize()
  }

  initialize() {
    // Listen for navigation events
    window.addEventListener("popstate", this.boundHandleRoute)

    // Add event listener to clear caches on page reload
    window.addEventListener("beforeunload", () => {
      this.clearCaches()
    })

    // Handle initial route on page load
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", () => {
        const initialPath = window.location.pathname
        this.handleInitialRoute(initialPath)
      })
    } else {
      const initialPath = window.location.pathname
      this.handleInitialRoute(initialPath)
    }
  }

  // Clear all caches
  clearCaches() {
    // Destroy all cached page instances before clearing
    this.pageCache.forEach((page) => {
      if (page && typeof page.destroy === "function") {
        page.destroy()
      }
    })

    this.moduleCache.clear()
    this.pageCache.clear()
  }

  // Cache a module for a specific route
  async cacheModule(path) {
    if (!this.moduleCache.has(path)) {
      try {
        const routeInfo = routeManager.getRouteInfo(path)
        if (routeInfo && routeInfo.moduleLoader) {
          const module = await routeInfo.moduleLoader()
          this.moduleCache.set(path, module)
        }
      } catch (error) {
        console.warn(`Failed to cache module for path ${path}:`, error)
      }
    }
    return this.moduleCache.get(path)
  }

  // Cache a page instance
  cachePageInstance(path, pageInstance) {
    // Destroy any existing cached instance for this path
    const existingPage = this.pageCache.get(path)
    if (existingPage && typeof existingPage.destroy === "function") {
      existingPage.destroy()
    }

    this.pageCache.set(path, pageInstance)
  }

  // Get a cached page instance
  getCachedPageInstance(path) {
    return this.pageCache.get(path)
  }

  addRoute(path, moduleLoader) {
    this.routes.set(path, true)
  }

  disable() {
    this.isEnabled = false
    window.removeEventListener("popstate", this.boundHandleRoute)
  }

  enable() {
    this.isEnabled = true
    window.addEventListener("popstate", this.boundHandleRoute)
    this.handleRoute()
  }

  async handleInitialRoute(path) {
    try {
      // Handle index.html in URL
      if (path.includes("index.html")) {
        path = this.defaultPath
        window.history.replaceState({}, "", path)
      }

      // Check if path is registered
      if (routeManager.isValidRoute(path)) {
        this.currentPath = path
        await this.handleRoute(null, true)
      } else {
        // Load 404 page without redirecting
        await this.loadNotFoundPage()
      }

      // Update menu state
      this.updateMenuState(path)
    } catch (error) {
      this.showError("We encountered an issue while loading the initial page.")
    }
  }

  async handleRoute(event = null, isInitial = false) {
    if (!this.isEnabled) {
      this.showMessage("Navigation is temporarily disabled. Please try again in a moment.")
      return
    }

    try {
      const path = window.location.pathname

      // Don't reload if already on the page (unless it's the initial load)
      if (path === this.currentPath && !isInitial) return

      this.showLoader()

      // Important: Load page-specific CSS BEFORE cleaning up old CSS
      // This prevents FOUC by ensuring new CSS is ready before content changes
      if (window.app?.cssManager) {
        await window.app.cssManager.loadPageStyle(path)
      }

      // Check if the exact route exists or if there's a parent route
      const routeExists = routeManager.isValidRoute(path)
      const targetPath = routeExists ? path : "/404"

      // Get the route info which might be a parent route
      const routeInfo = routeManager.getRouteInfo(targetPath)

      // Determine the actual module path to load
      // If it's a nested route, we'll use the parent path for the module
      const modulePath = routeInfo && routeInfo.isNestedRoute ? routeInfo.path : targetPath

      // Try to get cached page instance first
      const cachedPage = this.getCachedPageInstance(modulePath)
      if (cachedPage && !isInitial) {
        this.currentPage = cachedPage
        this.currentPath = path // Store the full path, not just the module path

        // Set the full path on the page instance so it can be accessed if needed
        cachedPage.fullPath = path

        await cachedPage.render()
        this.updateMenuState(path)
        return
      }

      // Get page module (either from cache or load new)
      let module = this.moduleCache.get(modulePath)
      if (!module) {
        module = await this.cacheModule(modulePath)
      }

      if (!module) {
        throw new Error(`Page module not found for path: ${modulePath}`)
      }

      const PageClass = Object.values(module)[0]

      // If there is an active page, destroy it before creating a new instance
      if (this.currentPage && typeof this.currentPage.destroy === "function") {
        this.currentPage.destroy()
      }

      const page = new PageClass()

      // Store the full path on the page instance
      page.fullPath = path

      // Apply route metadata to page if available
      if (routeInfo) {
        if (routeInfo.requiresAuth !== undefined) {
          page.requiresAuth = routeInfo.requiresAuth
        }
        if (routeInfo.authorizedUserTypes) {
          page.authorizedUserTypes = routeInfo.authorizedUserTypes
        }
        if (routeInfo.unauthorizedRedirectPath) {
          page.unauthorizedRedirectPath = routeInfo.unauthorizedRedirectPath
        }
      }

      this.currentPage = page
      this.currentPath = path // Store the full path

      // Cache the new page instance using the module path
      this.cachePageInstance(modulePath, page)

      await page.render()

      this.updateMenuState(path)
    } catch (error) {
      console.error("Route handling error:", error)
      if (!isInitial) {
        await this.loadNotFoundPage()
      }
    }
  }

  async loadNotFoundPage() {
    try {
      // Clean up current page if exists
      if (this.currentPage && typeof this.currentPage.destroy === "function") {
        this.currentPage.destroy()
      }

      // Ensure CSS is properly cleaned up
      if (window.app?.cssManager) {
        window.app.cssManager.cleanupPageStyles()
      }

      // Check for cached 404 page instance
      const cachedNotFoundPage = this.getCachedPageInstance("/404")
      if (cachedNotFoundPage) {
        this.currentPage = cachedNotFoundPage
        this.currentPath = "/404"

        // Load 404 page CSS
        if (window.app?.cssManager) {
          await window.app.cssManager.loadPageStyle("/404")
        }

        await cachedNotFoundPage.render()
        this.updateMenuState("/404")
        return
      }

      // If no cached page, load and cache the 404 page
      const notFoundModule = await this.cacheModule("/404")
      const NotFoundPage = Object.values(notFoundModule)[0]
      const notFoundPage = new NotFoundPage()

      // Load 404 page CSS
      if (window.app?.cssManager) {
        await window.app.cssManager.loadPageStyle("/404")
      }

      // Cache the new page instance
      this.cachePageInstance("/404", notFoundPage)

      this.currentPage = notFoundPage
      this.currentPath = "/404"

      await notFoundPage.render()
      this.updateMenuState("/404")
    } catch (error) {
      this.showError("We're unable to load the page you requested.")
    }
  }

  updateMenuState(path) {
    if (window.app?.menuManager) {
      window.app.menuManager.updateActiveMenuItem(path)
    }
  }

  navigateTo(path) {
    if (!this.isEnabled) {
      this.showMessage("Navigation is temporarily disabled. Please try again in a moment.")
      return
    }

    if (path === this.currentPath) return
    window.history.pushState({}, "", path)
    this.handleRoute()
  }

  // Get the appropriate unauthorized redirect path
  getUnauthorizedRedirectPath() {
    // First check if current page has a custom redirect path
    if (this.currentPage && this.currentPage.unauthorizedRedirectPath) {
      return this.currentPage.unauthorizedRedirectPath
    }
    // Otherwise use the default
    return this.defaultUnauthorizedPath
  }

  showLoader() {
    const content = document.getElementById("page-content")
    if (!content) return

    if (!content.querySelector(".loader-container")) {
      content.innerHTML = `
                <div class="loader-container">
                    <div class="loader">
                        <div class="loader-spinner"></div>
                    </div>
                </div>
            `
    }
  }

  showError(message = "An unexpected error occurred. Please try again.") {
    const content = document.getElementById("page-content")
    if (!content) return

    content.innerHTML = `
            <div class="error">
                <div class="error-content">
                    <h2>Oops! Something went wrong</h2>
                    <p>${message}</p>
                    <button class="btn" onclick="location.reload()">Refresh Page</button>
                </div>
            </div>
        `
  }

  showMessage(message) {
    const content = document.getElementById("page-content")
    if (!content) return

    const messageElement = document.createElement("div")
    messageElement.className = "message"
    messageElement.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
            </div>
        `

    content.appendChild(messageElement)

    // Remove message after 3 seconds
    setTimeout(() => {
      messageElement.remove()
    }, 3000)
  }

  goBack() {
    if (this.isEnabled) {
      window.history.back()
    }
  }

  isRouterEnabled() {
    return this.isEnabled
  }
}


