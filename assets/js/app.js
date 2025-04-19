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
    this.homePagePreloadPromise = null
    this.homePageReady = false
    this.currentPath = window.location.pathname

    this.createAppStructure()
    this.startPreloadingHomePage()

    this.init().catch((error) => {
      console.error("Initialization error:", error)
      toastManager.show("Something went wrong while starting the application. Please try refreshing the page.", "error")
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
    mainContent.innerHTML = `<div class="content-wrap"><div id="page-content"></div></div>`

    const overlay = document.createElement("div")
    overlay.className = "overlay"

    layoutDiv.appendChild(navMenu)
    layoutDiv.appendChild(mainContent)
    layoutDiv.appendChild(overlay)
    document.body.appendChild(layoutDiv)
  }

  async startPreloadingHomePage() {
    // Only preload homepage if we're actually on the homepage
    const isHomePage = this.currentPath === "/" || this.currentPath === ""

    this.homePagePreloadPromise = new Promise(async (resolve) => {
      try {
        await this.injectCSS()

        // If we're on the homepage, preload it
        if (isHomePage) {
          const homePath = "/"
          if (this.cssManager) {
            await this.cssManager.loadPageStyle(homePath)
          }

          const routeInfo = routeManager.getRouteInfo(homePath)
          if (routeInfo && routeInfo.moduleLoader) {
            const module = await routeInfo.moduleLoader()

            if (module) {
              const PageClass = Object.values(module)[0]
              const homePage = new PageClass()

              this.preloadedHomePage = homePage
              await homePage.prepareRender()

              this.homePageReady = true
              resolve(true)
            }
          }
        } else {
          // If we're not on the homepage, don't preload it
          resolve(false)
        }
      } catch (error) {
        console.warn("Home page preloading error:", error)
        resolve(false)
      }
    })
  }

  async injectCSS() {
    try {
      this.cssManager = new CSSManager()
      await this.cssManager.initialize()
      this.cssInjected = true
      return true
    } catch (error) {
      console.error("CSS injection error:", error)
      return false
    }
  }

  async addCoreStyle(styleName) {
    if (this.cssManager) {
      return this.cssManager.addCoreStyle(styleName)
    }
    return Promise.resolve(false)
  }

  async hideSplashScreen() {
    if (!this.splashScreen) return

    const layout = document.querySelector(".layout")
    if (!layout) return

    try {
      await this.homePagePreloadPromise

      // Only use preloaded homepage if we're actually on the homepage
      const isHomePage = this.currentPath === "/" || this.currentPath === ""
      const pageContent = document.getElementById("page-content")

      if (pageContent && this.homePageReady && this.preloadedHomePage && isHomePage) {
        pageContent.innerHTML = ""
        this.preloadedHomePage.container = pageContent
        await this.preloadedHomePage.finalizeRender()

        if (this.router) {
          this.router.currentPage = this.preloadedHomePage
          this.router.currentPath = "/"
          this.router.cachePageInstance("/", this.preloadedHomePage)
          this.router.updateMenuState("/")
        }
      }

      layout.style.visibility = "visible"

      this.splashScreen.classList.add("hide")
      setTimeout(() => {
        this.splashScreen.remove()
        this.splashScreen = null
      }, 500)
    } catch (error) {
      console.error("Error during splash screen transition:", error)
      layout.style.visibility = "visible"
      this.splashScreen.classList.add("hide")
      setTimeout(() => {
        this.splashScreen.remove()
        this.splashScreen = null
      }, 500)
    }
  }

  async init() {
    try {
      window.app = this

      this.libraryLoader = await LibraryLoader.initialize()
      this.setupLibraryLoaderMethods()

      this.authManager = await AuthManager.initialize()

      await this.initializeThemeManager()
      await this.initializeMenuManager()
      await this.initializeRouter()
      await Promise.all([this.initializeMaintenanceManager(), this.initializeSubscriptionManager()])

      this.setupGlobalMethods()

      await this.hideSplashScreen()
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
        throw error
      }
    }
    window.app.getLibrary = (libraryKey) => {
      try {
        return this.libraryLoader.getLibrary(libraryKey)
      } catch (error) {
        console.error("Library access error:", error)
        throw error
      }
    }
    window.app.addLibrary = (key, config) => {
      try {
        this.libraryLoader.addLibraryConfig(key, config)
      } catch (error) {
        console.error("Library configuration error:", error)
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
    }
  }

  async initializeMenuManager() {
    this.menuManager = new MenuManager()
    if (this.themeManager) {
      this.menuManager.setThemeManager(this.themeManager)
    }
    await this.menuManager.initialize()
  }

  async initializeMaintenanceManager() {
    this.maintenanceManager = new MaintenanceManager()
    await this.maintenanceManager.initialize(this.router, this.menuManager)
  }

  async initializeSubscriptionManager() {
    try {
      this.subscriptionManager = await SubscriptionManager.initialize()
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
      
      // If the route is not valid, directly navigate to the 404 page
      if (!isValid) {
        const notFoundPath = "/404"
        
        // Update browser URL to the 404 page
        window.history.pushState({ url: notFoundPath }, "", notFoundPath)
        
        if (this.router) {
          this.router.showNavigationIndicator()
        }
        
        if (this.cssManager) {
          try {
            await this.cssManager.loadPageStyle(notFoundPath)
          } catch (cssError) {
            console.error(`App: Failed to load CSS for ${notFoundPath}:`, cssError)
          }
        }
        
        if (this.router) {
          // Use the router's loadNotFoundPage method directly
          await this.router.loadNotFoundPage()
          this.isNavigating = false
          clearTimeout(this.navigationTimeout)
          return
        }
      }
      
      // For valid routes, continue with normal navigation
      if (this.router) {
        this.router.showNavigationIndicator()
      }

      if (this.cssManager) {
        try {
          await this.cssManager.loadPageStyle(path)
        } catch (cssError) {
          console.error(`App: Failed to load CSS for ${path}:`, cssError)
        }
      }

      if (this.router) {
        this.router.navigateTo(path)
      } else {
        toastManager.show("Navigation system is unavailable", "error")
        console.error("App: Router not available for navigation!")
      }
    } catch (error) {
      console.error(`App: Unhandled error during navigateTo('${path}'):`, error)
      toastManager.show(`Unable to navigate to ${path}. An unexpected error occurred.`, "error")
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
}

document.addEventListener("DOMContentLoaded", () => {
  window.appInstance = new App()
})

export default App
