import AuthManager from "./chunks/auth.js"
import Router from "./chunks/router.js"
import ThemeManager from "./chunks/theme-manager.js"
import MenuManager from "./chunks/menu-manager.js"
import MaintenanceManager from "./chunks/maintenance.js"
import toastManager from "./chunks/toast-manager.js"
import LibraryLoader from "./chunks/library-loader.js"
import CSSManager from "./chunks/css-manager.js"
import routeManager from "./main/routes.js"
import SubscriptionManager from "./chunks/subscription-manager.js"

class App {
  constructor() {
    this.themeManager = null
    this.router = null
    this.menuManager = null
    this.authManager = null
    this.maintenanceManager = null
    this.libraryLoader = null
    this.cssManager = null
    this.themeSwitcher = null
    this.splashScreen = null
    this.cssInjected = false
    this.isUnderMaintenance = false
    this.maintenanceRef = null
    this.subscriptionManager = null
    this.isNavigating = false
    this.navigationTimeout = null

    this.createAppStructure()

    this.init()
      .catch((error) => {
        console.error("Initialization error:", error)
        toastManager.show(
          "Something went wrong while starting the application. Please try refreshing the page.",
          "error",
        )
      })
      .finally(() => {
        this.hideSplashScreen()
      })
  }

  createAppStructure() {
    this.splashScreen = document.createElement("div")
    this.splashScreen.className = "splash-screen"
    this.splashScreen.innerHTML = `
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
        `
    document.body.appendChild(this.splashScreen)

    const layoutDiv = document.createElement("div")
    layoutDiv.className = "layout"
    layoutDiv.style.visibility = "hidden"

    const navMenu = document.createElement("nav")
    navMenu.className = "menu"

    const mainContent = document.createElement("main")
    mainContent.className = "main-content"
    mainContent.innerHTML = `
        <div class="content-wrap">
            <div id="page-content">
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
            </div>
        </div>
    `

    const overlay = document.createElement("div")
    overlay.className = "overlay"

    layoutDiv.appendChild(navMenu)
    layoutDiv.appendChild(mainContent)
    layoutDiv.appendChild(overlay)
    document.body.appendChild(layoutDiv)
  }

  async injectCSS() {
    try {
      this.cssManager = new CSSManager()
      await this.cssManager.initialize()
      this.cssInjected = true
      return true
    } catch (error) {
      console.error("CSS injection error:", error)
      toastManager.show("Some visual elements may not display correctly.", "error")
      return false
    }
  }

  async addCoreStyle(styleName) {
    if (this.cssManager) {
      return this.cssManager.addCoreStyle(styleName)
    }
    return Promise.resolve(false)
  }

  hideSplashScreen() {
    if (this.splashScreen) {
      const layout = document.querySelector(".layout")
      if (layout) {
        const pageContent = document.getElementById("page-content")
        if (pageContent && !pageContent.querySelector(".skeleton-container")) {
          pageContent.innerHTML = `
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

        layout.style.visibility = "visible"
      }

      setTimeout(() => {
        this.splashScreen.classList.add("hide")
        setTimeout(() => {
          this.splashScreen.remove()
          this.splashScreen = null
        }, 500)
      }, 50)
    }
  }

  async init() {
    try {
      window.app = this

      await this.injectCSS()

      this.libraryLoader = await LibraryLoader.initialize()
      this.setupLibraryLoaderMethods()

      this.authManager = await AuthManager.initialize()

      const firebase = this.libraryLoader.getLibrary("firebase")
      if (!firebase) {
        console.warn("Firebase library not available during init.")
      }

      await this.initializeThemeManager()

      await this.initializeMenuManager()

      await this.initializeRouter()

      await Promise.all([this.initializeMaintenanceManager(), this.initializeSubscriptionManager()])

      this.setupGlobalMethods()

      this.preloadHomePage()

    } catch (error) {
      console.error("App Initialization failed:", error)
      toastManager.show("Unable to start the application. Please check your setup and connection.", "error")
      this.hideSplashScreen()
      const content = document.getElementById("page-content")
      if (content) {
        content.innerHTML = `<div class="critical-error">Application failed to initialize. Please refresh or contact support. Details: ${error.message}</div>`
      }
    }
  }

  setupLibraryLoaderMethods() {
    window.app.loadLibrary = async (libraryKey) => {
      try {
        await this.libraryLoader.loadLibrary(libraryKey)
      } catch (error) {
        console.error("Library loading error:", error)
        toastManager.show(`Unable to load required resources (${libraryKey}). Please refresh.`, "error")
        throw error
      }
    }
    window.app.getLibrary = (libraryKey) => {
      try {
        return this.libraryLoader.getLibrary(libraryKey)
      } catch (error) {
        console.error("Library access error:", error)
        toastManager.show(`Unable to access required resources (${libraryKey})`, "error")
        throw error
      }
    }
    window.app.addLibrary = (key, config) => {
      try {
        this.libraryLoader.addLibraryConfig(key, config)
      } catch (error) {
        console.error("Library configuration error:", error)
        toastManager.show("Unable to update resource configuration", "error")
        throw error
      }
    }
  }

  async initializeThemeManager() {
    this.themeManager = new ThemeManager()
    this.themeManager.applyTheme(this.themeManager.currentTheme)
    this.themeManager.listenToSystemThemeChanges((theme) => {
      this.themeManager.applyTheme(theme)
    })
  }

  async initializeRouter() {
    this.router = new Router()
    const routeInitSuccess = await routeManager.initialize(this.router)
    if (!routeInitSuccess) {
      console.error("Route initialization failed")
      toastManager.show("Some application pages may not be available", "error")
    }
  }

  async initializeMenuManager() {
    this.menuManager = new MenuManager()
    if (this.themeManager) {
      this.menuManager.setThemeManager(this.themeManager)
    }
    const initSuccess = await this.menuManager.initialize()
    if (!initSuccess) {
      console.warn("Menu initialization was not successful")
      toastManager.show("Some navigation features may not work correctly", "warning")
    }
  }

  async initializeMaintenanceManager() {
    this.maintenanceManager = new MaintenanceManager()
    await this.maintenanceManager.initialize(this.router, this.menuManager)
  }

  async initializeSubscriptionManager() {
    try {
      this.subscriptionManager = await SubscriptionManager.initialize()
      console.log("Subscription manager initialized successfully")
      return true
    } catch (error) {
      console.error("Subscription manager initialization failed:", error)
      return false
    }
  }

  setupGlobalMethods() {
    window.app.addCoreStyle = this.addCoreStyle.bind(this)
    window.app.navigateTo = this.navigateTo.bind(this)
    window.app.setMaintenanceMode = this.setMaintenanceMode.bind(this)
    window.app.addPageStyle = this.addPageStyle.bind(this)
    window.app.addComponentStyle = this.addComponentStyle.bind(this)
    window.app.toggleTheme = this.toggleTheme.bind(this)
    window.app.getThemeManager = this.getThemeManager.bind(this)
    window.app.addRoute = this.addRoute.bind(this)
    window.app.getAllRoutes = this.getAllRoutes.bind(this)
    window.app.isValidRoute = this.isValidRoute.bind(this)
    window.app.verifyUserSubscription = this.verifyUserSubscription.bind(this)
    window.app.showToast = (message, type = "success") => {
      toastManager.show(message, type)
    }
    window.app.getAuthManager = this.getAuthManager.bind(this)
    window.app.getLibraryLoader = this.getLibraryLoader.bind(this)
    window.app.setNavigationIndicatorColor = (color) => {
      if (this.router) {
        this.router.setNavigationIndicatorColor(color)
      }
    }
  }

  toggleTheme() {
    if (this.themeManager) {
      const newTheme = this.themeManager.toggleTheme()
      return newTheme
    }
    return null
  }

  getThemeManager() {
    return this.themeManager
  }

  normalizePath(path) {
    if (!path) return "/"
    return path === "/" ? path : path.replace(/\/$/, "")
  }

  async navigateTo(path) {
    if (!path) {
      toastManager.show("Invalid page request (empty path)", "error")
      return
    }

    path = this.normalizePath(path)

    if (path === this.router?.currentPath || path === window.location.pathname) {
      return
    }

    if (this.isNavigating) {
      console.warn(`App: Navigation already in progress. Request for ${path} ignored.`)
      toastManager.show("Navigation in progress...", "info")
      return
    }

    this.isNavigating = true
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout)
    }

    this.navigationTimeout = setTimeout(() => {
      if (this.isNavigating) {
        console.warn("Navigation timeout reached, resetting navigation state")
        this.isNavigating = false
      }
    }, 10000)

    const contentContainer = document.getElementById("page-content")
    if (!contentContainer) {
      console.error("App: Critical error - #page-content container not found!")
      this.isNavigating = false
      clearTimeout(this.navigationTimeout)
      return
    }

    try {
      if (this.maintenanceManager?.getMaintenanceStatus()) {
        this.maintenanceManager.lastAttemptedPath = path
        this.maintenanceManager.showMaintenancePage()
        this.isNavigating = false
        clearTimeout(this.navigationTimeout)
        return
      }

      const isValid = routeManager.isValidRoute(path)
      const targetPath = isValid ? path : routeManager.getFallbackRoute()
      const routeInfo = routeManager.getRouteInfo(targetPath)
      const modulePath = routeInfo && routeInfo.isNestedRoute ? routeInfo.path : targetPath

      if (!isValid) {
        console.warn(`App: Invalid route requested: ${path}. Navigating to fallback: ${targetPath}`)
      }

      if (this.router) {
        this.router.showNavigationIndicator()
      }

      if (this.cssManager) {
        try {
          await this.cssManager.loadPageStyle(targetPath)
        } catch (cssError) {
          console.error(`App: Failed to load CSS for ${targetPath}:`, cssError)
          toastManager.show(`Failed to load styles for ${targetPath}.`, "warning")
        }
      }

      if (this.router) {
        this.router.navigateTo(targetPath)
      } else {
        toastManager.show("Navigation system is unavailable", "error")
        console.error("App: Router not available for navigation!")
        if (this.router) this.router.showError("Navigation failed: Router unavailable.")
      }
    } catch (error) {
      console.error(`App: Unhandled error during navigateTo('${path}'):`, error)
      toastManager.show(`Unable to navigate to ${path}. An unexpected error occurred.`, "error")
      if (this.router) {
        this.router.showError(`Navigation to ${path} failed unexpectedly.`)
      }
    } finally {
      this.isNavigating = false
      clearTimeout(this.navigationTimeout)
    }
  }

  setMaintenanceMode(isEnabled) {
    if (this.maintenanceManager) {
      return this.maintenanceManager.setMaintenanceMode(isEnabled)
    }
    return false
  }

  addPageStyle(path) {
    if (this.cssManager) {
      return this.cssManager.loadPageStyle(path)
    }
    return Promise.resolve(false)
  }

  addComponentStyle(componentName) {
    if (this.cssManager) {
      return this.cssManager.loadComponentStyle(componentName)
    }
    return Promise.resolve(false)
  }

  addRoute(path, moduleLoader, options = {}) {
    return routeManager.addRoute(path, moduleLoader, options)
  }

  getAllRoutes() {
    return routeManager.getAllRoutes()
  }

  isValidRoute(path) {
    return routeManager.isValidRoute(path)
  }

  verifyUserSubscription(requiredLevel) {
    if (this.subscriptionManager) {
      return this.subscriptionManager.verifySubscription(requiredLevel)
    }
    return Promise.resolve({ success: false, error: "Subscription manager not available" })
  }

  getAuthManager() {
    return this.authManager
  }

  getLibraryLoader() {
    return this.libraryLoader
  }

  async preloadHomePage() {
    try {
      const currentPath = window.location.pathname
      const homePath = "/"

      if (currentPath === homePath || currentPath === "" || currentPath === "/index.html") {
        if (this.cssManager) {
          await this.cssManager.loadPageStyle(homePath)
        }

        if (this.router) {
          const routeInfo = routeManager.getRouteInfo(homePath)
          if (routeInfo && routeInfo.moduleLoader) {
            try {
              const modulePromise = routeInfo.moduleLoader()
              modulePromise
                .then((module) => {
                  if (this.router) {
                    this.router.moduleCache.set(homePath, module)
                    console.log("Home page module preloaded successfully")
                  }
                })
                .catch((err) => {
                  console.warn("Home page preloading failed:", err)
                })
            } catch (error) {
              console.warn("Failed to preload home page:", error)
            }
          }
        }
      }
    } catch (error) {
      console.warn("Home page preloading error:", error)
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.appInstance = new App()
})

export default App