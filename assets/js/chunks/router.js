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
        const initialPath = window.location.pathname + window.location.search
        this.handleInitialRoute(initialPath)
      })
    } else {
      const initialPath = window.location.pathname + window.location.search
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
    const pathname = this.extractPathname(path)

    if (!this.moduleCache.has(pathname)) {
      try {
        const routeInfo = routeManager.getRouteInfo(pathname)
        if (routeInfo && routeInfo.moduleLoader) {
          const module = await routeInfo.moduleLoader()
          this.moduleCache.set(pathname, module)
        }
      } catch (error) {
        console.warn(`Failed to cache module for path ${pathname}:`, error)
      }
    }
    return this.moduleCache.get(pathname)
  }

  cachePageInstance(path, pageInstance) {
    const pathname = this.extractPathname(path)

    const existingPage = this.pageCache.get(pathname)
    if (existingPage && typeof existingPage.destroy === "function" && existingPage !== pageInstance) {
      try {
        existingPage.destroy()
      } catch (error) {
        console.error("Error destroying existing page instance:", error)
      }
    }

    this.pageCache.set(pathname, pageInstance)
  }

  getCachedPageInstance(path) {
    const pathname = this.extractPathname(path)
    return this.pageCache.get(pathname)
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
      const pathname = this.extractPathname(path)

      if (pathname.includes("index.html")) {
        const newPath = this.defaultPath + this.extractQueryString(path)
        window.history.replaceState({}, "", newPath)
        path = newPath
      }

      // Only use preloaded homepage if we're actually on the homepage
      const isHomePage = pathname === "/" || pathname === ""
      if (window.app?.preloadedHomePage && isHomePage) {
        // Use the preloaded homepage
        const contentContainer = document.getElementById("page-content")
        if (contentContainer && window.app.preloadedHomePage) {
          contentContainer.innerHTML = ""
          window.app.preloadedHomePage.container = contentContainer
          await window.app.preloadedHomePage.finalizeRender()
          this.currentPage = window.app.preloadedHomePage
          this.currentPath = "/"
          this.updateMenuState("/")
          this.isNavigating = false
          this.hideNavigationIndicator()
          return
        }
      }

      // For non-homepage routes or if preloaded homepage isn't available
      if (routeManager.isValidRoute(pathname)) {
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
      const path = window.location.pathname + window.location.search
      const pathname = this.extractPathname(path)

      if (path === this.currentPath && !isInitial && window.location.href === window.history.state?.url) {
        this.isNavigating = false
        this.hideNavigationIndicator()
        return
      }

      const routeExists = routeManager.isValidRoute(pathname)
      const targetPath = routeExists ? pathname : "/404"

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
          this.updateMenuState(pathname)
          this.isNavigating = false
          this.hideNavigationIndicator()
          return
        } catch (error) {
          console.error("Error using cached page:", error)
        }
      }

      const contentContainer = document.getElementById("page-content")
      if (contentContainer && !contentContainer.querySelector(".skeleton-container")) {
        const targetPage = await this.cacheModule(modulePath)
        if (targetPage) {
          const PageClass = Object.values(targetPage)[0]
          const tempPage = new PageClass()
          contentContainer.innerHTML = tempPage.getSkeletonTemplate()
        }
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
        await window.app.cssManager.loadPageStyle(this.extractPathname(path))
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

      this.updateMenuState(this.extractPathname(path))
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

    // Preserve existing query parameters if not included in the new path
    if (!path.includes("?") && window.location.search) {
      path = `${path}${window.location.search}`
    }

    const currentUrl = window.location.pathname + window.location.search + window.location.hash
    if (path === currentUrl) return

    this.isNavigating = true
    this.showNavigationIndicator()

    const pathname = this.extractPathname(path)
    const routeExists = routeManager.isValidRoute(pathname)
    const targetPath = routeExists ? pathname : "/404"

    const routeInfo = routeManager.getRouteInfo(targetPath)
    const modulePath = routeInfo && routeInfo.isNestedRoute ? routeInfo.path : targetPath

    const contentContainer = document.getElementById("page-content")
    if (contentContainer && !contentContainer.querySelector(".skeleton-container")) {
      this.cacheModule(modulePath)
        .then((module) => {
          if (module) {
            const PageClass = Object.values(module)[0]
            const tempPage = new PageClass()
            contentContainer.innerHTML = tempPage.getSkeletonTemplate()
          }
        })
        .catch((err) => console.warn("Failed to show skeleton:", err))
    }

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

  extractPathname(path) {
    if (!path) return "/"
    const questionMarkIndex = path.indexOf("?")
    return questionMarkIndex >= 0 ? path.substring(0, questionMarkIndex) : path
  }

  extractQueryString(path) {
    if (!path) return ""
    const questionMarkIndex = path.indexOf("?")
    return questionMarkIndex >= 0 ? path.substring(questionMarkIndex) : ""
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
