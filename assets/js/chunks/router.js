import routeManager from "../main/routes.js"

export default class Router {
  constructor() {
    this.routes = new Map()
    this.currentPath = ""
    this.defaultPath = "/"
    this.isEnabled = true
    this.currentPage = null
    this.defaultUnauthorizedPath = "/404"
    this.isNavigating = false
    this.navigationIndicator = null

    this.moduleCache = new Map()
    this.pageCache = new Map()

    this.boundHandleRoute = this.handleRoute.bind(this)
    this.boundHandleInitialRoute = this.handleInitialRoute.bind(this)

    this.initialize()
  }

  initialize() {
    window.addEventListener("popstate", this.boundHandleRoute)

    window.addEventListener("beforeunload", () => {
      this.clearCaches()
    })

    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", () => {
        const initialPath = window.location.pathname
        this.handleInitialRoute(initialPath)
      })
    } else {
      const initialPath = window.location.pathname
      this.handleInitialRoute(initialPath)
    }

    this.createNavigationIndicator()
  }

  createNavigationIndicator() {
    if (this.navigationIndicator) {
      this.navigationIndicator.remove()
    }

    this.navigationIndicator = document.createElement("div")
    this.navigationIndicator.className = "navigation-indicator"
    this.navigationIndicator.innerHTML = `
      <div class="navigation-indicator-inner">
        <div class="navigation-spinner"></div>
        <span>Loading...</span>
      </div>
    `

    const style = document.createElement("style")
    style.setAttribute("data-navigation-indicator", "true")
    style.textContent = `
      .navigation-indicator {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background-color: rgba(0, 0, 0, 0.05);
        height: 3px;
        overflow: hidden;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .navigation-indicator::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 30%;
        background: linear-gradient(90deg, transparent, var(--navigation-indicator-color, var(--primary, #3498db)), transparent);
        animation: navigation-progress 1.5s ease-in-out infinite;
      }
      
      .navigation-indicator.visible {
        opacity: 1;
      }
      
      @keyframes navigation-progress {
        0% { left: -30%; }
        100% { left: 100%; }
      }
      
      .navigation-indicator-inner {
        display: none;
      }
    `

    document.head.appendChild(style)
    document.body.appendChild(this.navigationIndicator)
  }

  setNavigationIndicatorColor(color) {
    if (!color) return

    document.documentElement.style.setProperty("--navigation-indicator-color", color)

    if (this.navigationIndicator) {
      const existingStyle = document.querySelector("style[data-navigation-indicator]")
      if (existingStyle) {
        existingStyle.textContent = existingStyle.textContent.replace(
          /background: linear-gradient\(90deg, transparent, var\(--primary-color, #3498db\), transparent\)/,
          `background: linear-gradient(90deg, transparent, var(--navigation-indicator-color, ${color}), transparent)`
        )
      }
    }
  }

  showNavigationIndicator() {
    if (this.navigationIndicator) {
      this.navigationIndicator.classList.add("visible")
    }
  }

  hideNavigationIndicator() {
    if (this.navigationIndicator) {
      this.navigationIndicator.classList.remove("visible")
    }
  }

  clearCaches() {
    this.pageCache.forEach((page) => {
      if (page && typeof page.destroy === "function") {
        try {
          page.destroy()
        } catch (error) {
          console.error("Error destroying cached page:", error)
        }
      }
    })

    this.moduleCache.clear()
    this.pageCache.clear()
  }

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

  cachePageInstance(path, pageInstance) {
    const existingPage = this.pageCache.get(path)
    if (existingPage && typeof existingPage.destroy === "function") {
      try {
        existingPage.destroy()
      } catch (error) {
        console.error("Error destroying existing page instance:", error)
      }
    }

    this.pageCache.set(path, pageInstance)
  }

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
      const contentContainer = document.getElementById("page-content")
      const hasContent =
        contentContainer && contentContainer.children.length > 0 && !contentContainer.querySelector(".critical-error")

      if (!hasContent) {
        this.showInitialSkeleton()
      }

      if (path.includes("index.html")) {
        path = this.defaultPath
        window.history.replaceState({}, "", path)
      }

      if (routeManager.isValidRoute(path)) {
        this.currentPath = path
        await this.handleRoute(null, true)
      } else {
        await this.loadNotFoundPage()
      }
    } catch (error) {
      console.error("Initial route handling error:", error)
      this.showError("We encountered an issue while loading the initial page.")
    } finally {
      this.isNavigating = false
      this.hideNavigationIndicator()
    }
  }

  showInitialSkeleton() {
    const contentContainer = document.getElementById("page-content")
    if (!contentContainer) return

    contentContainer.innerHTML = `
      <div class="skeleton-container">
        <div class="skeleton-header pulse"></div>
        <div class="skeleton-content">
          <div class="skeleton-item pulse"></div>
          <div class="skeleton-item pulse"></div>
          <div class="skeleton-item pulse"></div>
          <div class="skeleton-item pulse"></div>
          <div class="skeleton-item pulse"></div>
        </div>
      </div>
    `
  }

  async handleRoute(event = null, isInitial = false) {
    if (!this.isEnabled) {
      this.showMessage("Navigation is temporarily disabled. Please try again in a moment.")
      return
    }

    if (this.isNavigating) {
      console.warn("Navigation already in progress, ignoring new request")
      return
    }

    this.isNavigating = true
    this.showNavigationIndicator()

    try {
      const path = window.location.pathname

      if (path === this.currentPath && !isInitial && window.location.href === window.history.state?.url) {
        this.isNavigating = false
        this.hideNavigationIndicator()
        return
      }

      const routeExists = routeManager.isValidRoute(path)
      const targetPath = routeExists ? path : "/404"

      const routeInfo = routeManager.getRouteInfo(targetPath)

      const modulePath = routeInfo && routeInfo.isNestedRoute ? routeInfo.path : targetPath

      const cachedPage = this.getCachedPageInstance(modulePath)
      if (cachedPage && !isInitial) {
        try {
          await cachedPage.prepareRender()

          if (this.currentPage && this.currentPage !== cachedPage && typeof this.currentPage.destroy === "function") {
            this.currentPage.destroy()
            this.currentPage = null
          }

          this.currentPage = cachedPage
          this.currentPath = path

          cachedPage.fullPath = path

          await cachedPage.finalizeRender()
          this.updateMenuState(path)
          this.isNavigating = false
          this.hideNavigationIndicator()
          return
        } catch (error) {
          console.error("Error using cached page:", error)
        }
      }

      if (isInitial) {
        this.showInitialSkeleton()
      }

      const newPage = await this.prepareNewPage(path, modulePath, routeInfo)

      await this.finishNavigation(newPage, path)
    } catch (error) {
      console.error("Route handling error:", error)
      if (window.location.pathname !== "/404") {
        await this.loadNotFoundPage()
      } else {
        this.showError("We're unable to load the page you requested, even the error page.")
      }
    } finally {
      this.isNavigating = false
      this.hideNavigationIndicator()
    }
  }

  async prepareNewPage(path, modulePath, routeInfo) {
    try {
      let module = this.moduleCache.get(modulePath)
      if (!module) {
        module = await this.cacheModule(modulePath)
      }

      if (!module) {
        throw new Error(`Page module not found for path: ${modulePath}`)
      }

      if (window.app?.cssManager) {
        await window.app.cssManager.loadPageStyle(path)
      }

      const PageClass = Object.values(module)[0]
      const page = new PageClass()

      page.fullPath = path

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

      await page.prepareRender()

      return page
    } catch (error) {
      console.error("Page preparation error:", error)
      throw error
    }
  }

  async finishNavigation(newPage, path) {
    try {
      if (this.currentPage && this.currentPage !== newPage && typeof this.currentPage.destroy === "function") {
        this.currentPage.destroy()
        this.currentPage = null
      }

      this.currentPage = newPage
      this.currentPath = path

      this.cachePageInstance(path, newPage)

      await newPage.finalizeRender()

      this.updateMenuState(path)
    } catch (error) {
      console.error("Navigation finalization error:", error)
      if (window.location.pathname !== "/404") {
        await this.loadNotFoundPage()
      } else {
        this.showError("We're unable to load the page you requested, even the error page.")
      }
    }
  }

  async loadNotFoundPage() {
    try {
      this.showInitialSkeleton()

      if (this.currentPage && typeof this.currentPage.destroy === "function") {
        this.currentPage.destroy()
        this.currentPage = null
      }

      if (window.app?.cssManager) {
        await window.app.cssManager.loadPageStyle("/404")
      }

      const cachedNotFoundPage = this.getCachedPageInstance("/404")
      if (cachedNotFoundPage) {
        this.currentPage = cachedNotFoundPage
        this.currentPath = "/404"
        await cachedNotFoundPage.render()
        this.updateMenuState("/404")
        return
      }

      const notFoundModule = await this.cacheModule("/404")
      if (!notFoundModule) {
        throw new Error("Could not load the 404 page module.")
      }
      const NotFoundPage = Object.values(notFoundModule)[0]
      const notFoundPage = new NotFoundPage()

      this.cachePageInstance("/404", notFoundPage)

      this.currentPage = notFoundPage
      this.currentPath = "/404"

      await notFoundPage.render()
      this.updateMenuState("/404")
    } catch (error) {
      console.error("Error loading 404 page:", error)
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

    if (this.isNavigating) {
      console.warn(`Navigation already in progress. Request for ${path} ignored.`)
      this.showMessage("Navigation in progress, please wait...")
      return
    }

    const currentUrl = window.location.pathname + window.location.search + window.location.hash
    if (path === currentUrl) return

    this.isNavigating = true
    this.showNavigationIndicator()

    const routeExists = routeManager.isValidRoute(path)
    const targetPath = routeExists ? path : "/404"

    const routeInfo = routeManager.getRouteInfo(targetPath)

    const modulePath = routeInfo && routeInfo.isNestedRoute ? routeInfo.path : targetPath

    this.prepareNewPage(path, modulePath, routeInfo)
      .then((newPage) => {
        if (newPage) {
          window.history.pushState({ url: path }, "", path)
          this.finishNavigation(newPage, path).finally(() => {
            this.isNavigating = false
            this.hideNavigationIndicator()
          })
        } else {
          this.isNavigating = false
          this.hideNavigationIndicator()
        }
      })
      .catch((error) => {
        console.error("Navigation preparation error:", error)
        this.showError("We encountered an issue while preparing the page.")
        this.isNavigating = false
        this.hideNavigationIndicator()
      })
  }

  getUnauthorizedRedirectPath() {
    if (this.currentPage && this.currentPage.unauthorizedRedirectPath) {
      return this.currentPage.unauthorizedRedirectPath
    }
    return this.defaultUnauthorizedPath
  }

  showError(message = "An unexpected error occurred. Please try again.") {
    const content = document.getElementById("page-content")
    if (!content) return

    if (this.currentPage && typeof this.currentPage.destroy === "function") {
      this.currentPage.destroy()
      this.currentPage = null
    }
    this.currentPath = null

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
    if (window.app?.showToast) {
      window.app.showToast(message, "info")
      return
    }

    const content = document.getElementById("page-content")
    if (!content) return

    const messageElement = document.createElement("div")
    messageElement.className = "message temp-message"
    messageElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--background-light);
      color: var(--text-color);
      padding: 10px 20px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      opacity: 1;
      transition: opacity 0.5s ease-out;
    `
    messageElement.innerHTML = `<p>${message}</p>`

    document.body.appendChild(messageElement)

    setTimeout(() => {
      messageElement.style.opacity = "0"
      setTimeout(() => {
        messageElement.remove()
      }, 500)
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