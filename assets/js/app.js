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

    // Create the app structure first
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
    // Create the splash screen
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

    // Add the splash screen to the body first and ensure it's visible
    document.body.appendChild(this.splashScreen)

    // Create the main layout but keep it hidden initially
    const layoutDiv = document.createElement("div")
    layoutDiv.className = "layout"
    layoutDiv.style.visibility = "hidden" // Hide layout initially

    // Create placeholder for the menu - only create the container, let MenuManager fill it
    const navMenu = document.createElement("nav")
    navMenu.className = "menu"
    // Do NOT set innerHTML here, let MenuManager handle the inner structure

    // Create the main content area
    const mainContent = document.createElement("main")
    mainContent.className = "main-content"
    mainContent.innerHTML = `
            <div class="content-wrap">
                <div id="page-content">
                </div>
            </div>
        `

    // Create the overlay
    const overlay = document.createElement("div")
    overlay.className = "overlay"

    // Append everything to the layout
    layoutDiv.appendChild(navMenu)
    layoutDiv.appendChild(mainContent)
    layoutDiv.appendChild(overlay)

    // Append to body
    document.body.appendChild(layoutDiv)
  }

  async injectCSS() {
    try {
      this.cssManager = new CSSManager()

      // Use the new initialize method which loads core, component,
      // and homepage styles in one go
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
      // Make the layout visible before hiding splash
      const layout = document.querySelector(".layout")
      if (layout) {
        layout.style.visibility = "visible"
      }

      // Add hide class to start the fade-out transition
      this.splashScreen.classList.add("hide")

      // Remove the splash screen after transition
      setTimeout(() => {
        this.splashScreen.remove()
      }, 500)
    }
  }

  async init() {
    try {
      window.app = this

      // Initialize CSS first
      await this.injectCSS()

      // Initialize library loader
      this.libraryLoader = await LibraryLoader.initialize()
      this.setupLibraryLoaderMethods()

      // Initialize authentication
      this.authManager = await AuthManager.initialize()

      // Check for required libraries
      const firebase = this.libraryLoader.getLibrary("firebase")
      if (!firebase) {
        throw new Error("Unable to initialize required services")
      }

      // Initialize theme manager first
      await this.initializeThemeManager()

      // Then initialize menu manager (so it can access theme manager)
      await this.initializeMenuManager()

      // Initialize remaining managers
      await Promise.all([
        this.initializeRouter(),
        this.initializeMaintenanceManager(),
        this.initializeSubscriptionManager(),
      ])

      this.setupGlobalMethods()
    } catch (error) {
      console.error("Initialization error:", error)
      toastManager.show(
        "Unable to start the application. Please check your internet connection and try again.",
        "error",
      )
      throw error
    }
  }

  setupLibraryLoaderMethods() {
    window.app.loadLibrary = async (libraryKey) => {
      try {
        await this.libraryLoader.loadLibrary(libraryKey)
        toastManager.show(`Successfully loaded required resources`, "success")
      } catch (error) {
        console.error("Library loading error:", error)
        toastManager.show("Unable to load required resources. Please refresh the page.", "error")
        throw error
      }
    }

    window.app.getLibrary = (libraryKey) => {
      try {
        return this.libraryLoader.getLibrary(libraryKey)
      } catch (error) {
        console.error("Library access error:", error)
        toastManager.show("Unable to access required resources", "error")
        throw error
      }
    }

    window.app.addLibrary = (key, config) => {
      try {
        this.libraryLoader.addLibraryConfig(key, config)
        toastManager.show("Resource configuration updated successfully", "success")
      } catch (error) {
        console.error("Library configuration error:", error)
        toastManager.show("Unable to update resource configuration", "error")
        throw error
      }
    }
  }

  async initializeThemeManager() {
    this.themeManager = new ThemeManager()

    // Apply the current theme immediately
    this.themeManager.applyTheme(this.themeManager.currentTheme)

    // Setup system theme change listener
    this.themeManager.listenToSystemThemeChanges((theme) => {
      this.themeManager.applyTheme(theme)
    })
  }

  async initializeRouter() {
    this.router = new Router()

    // Use the route manager to register routes
    const routeInitSuccess = await routeManager.initialize(this.router)

    if (!routeInitSuccess) {
      console.error("Route initialization failed")
      toastManager.show("Some application pages may not be available", "error")
    }

    // Only handle routes if not in maintenance mode
    if (!this.maintenanceManager?.getMaintenanceStatus()) {
      // Ensure the homepage CSS is loaded before handling routes
      if (window.location.pathname === "/" || window.location.pathname === "") {
        await this.cssManager.loadPageStyle("/")
      }
      this.router.handleRoute()
    }
  }

  addRoute(path, moduleLoader, metadata = {}) {
    if (this.router && routeManager) {
      return routeManager.addDynamicRoute(path, moduleLoader, metadata, this.router)
    }
    return false
  }

  async initializeMenuManager() {
    this.menuManager = new MenuManager()

    // Connect the theme manager with the menu manager first
    if (this.themeManager) {
      this.menuManager.setThemeManager(this.themeManager)
    }

    // Call initialize method on the menu manager
    // This will create the menu structure and set up event listeners
    const initSuccess = await this.menuManager.initialize()

    if (!initSuccess) {
      console.warn("Menu initialization was not successful")
      // Show a toast with a helpful message
      toastManager.show("Some navigation features may not work correctly", "warning")
    }
  }

  async initializeMaintenanceManager() {
    this.maintenanceManager = new MaintenanceManager()
    await this.maintenanceManager.initialize(this.router, this.menuManager)
  }


  async initializeSubscriptionManager() {
  try {
    // Initialize with 60-minute check interval
    this.subscriptionManager = await SubscriptionManager.initialize(60);
    
    // Verify subscriptions immediately
    const result = await this.subscriptionManager.verifyAllSubscriptions();
    console.log(
      `Initial subscription verification: ${result.totalChecked} pro users checked, ${result.expired} expired subscriptions processed.`,
    );
    
    return true;
  } catch (error) {
    console.error("Subscription manager initialization failed:", error);
    return false;
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

  // Modify the navigateTo method to prevent FOUC
  async navigateTo(path) {
    if (!path) {
      toastManager.show("Invalid page request", "error")
      return
    }

    if (this.maintenanceManager.getMaintenanceStatus()) {
      this.maintenanceManager.lastAttemptedPath = path
      this.maintenanceManager.showMaintenancePage()
      return
    }

    try {
      // Check if route is valid
      if (!routeManager.isValidRoute(path)) {
        console.warn(`Attempting to navigate to unregistered route: ${path}`)
        path = routeManager.getFallbackRoute()
      }

      // Load the CSS for the new page BEFORE cleaning up old CSS
      // This prevents FOUC by ensuring new CSS is ready before content changes
      if (this.cssManager) {
        // Use normalized path to ensure consistent route handling
        const normalizedPath = this.cssManager.normalizeRoute(path)
        await this.cssManager.loadPageStyle(normalizedPath)
      }

      if (this.menuManager) {
        this.menuManager.updateActiveMenuItem(path)
      }

      if (this.router) {
        this.router.navigateTo(path)
      } else {
        toastManager.show("Navigation is currently unavailable", "error")
      }
    } catch (error) {
      console.error("Navigation error:", error)
      toastManager.show("Unable to navigate to the requested page", "error")
    }
  }

  async setMaintenanceMode(isMaintenance) {
    if (this.isUnderMaintenance === isMaintenance) {
      return null
    }

    try {
      const firebase = window.app.getLibrary("firebase")
      await firebase.set(this.maintenanceRef, isMaintenance)
      this.isUnderMaintenance = isMaintenance

      if (isMaintenance) {
        await this.activateMaintenanceMode()
        return null
      } else {
        return this.deactivateMaintenanceMode()
      }
    } catch (error) {
      console.error("Maintenance mode error:", error)
      toastManager.show("Unable to update system maintenance status", "error")
      throw error
    }
  }

  addPageStyle(route, styleName) {
    if (this.cssManager) {
      this.cssManager.addPageStyle(route, styleName)
      return this.cssManager.loadPageStyle(route)
    }
    return Promise.resolve(false)
  }

  addComponentStyle(componentName) {
    if (this.cssManager) {
      return this.cssManager.addComponentStyle(componentName)
    }
    return Promise.resolve(false)
  }

  getAuthManager() {
    if (!this.authManager) {
      toastManager.show("Authentication service is not available", "warning")
      return null
    }
    return this.authManager
  }

  getLibraryLoader() {
    if (!this.libraryLoader) {
      toastManager.show("Resource loading service is not available", "warning")
      return null
    }
    return this.libraryLoader
  }

  // Route management methods that connect to the RouteManager
  addRoute(path) {
    if (this.router && routeManager) {
      return routeManager.addDynamicRoute(path, this.router)
    }
    return false
  }

  getAllRoutes() {
    if (routeManager) {
      return routeManager.getAllRoutes()
    }
    return []
  }

  isValidRoute(path) {
    if (routeManager) {
      return routeManager.isValidRoute(path)
    }
    return false
  }
  
  

  async verifyUserSubscription(uid) {
  if (!this.subscriptionManager) {
    console.warn("Subscription manager is not initialized");
    return false;
  }
  
  return this.subscriptionManager.verifyUserSubscription(uid);
}



  async activateMaintenanceMode() {
    if (this.menuManager) {
      this.menuManager.disable()
    }
    this.maintenanceManager.showMaintenancePage()
  }

  async deactivateMaintenanceMode() {
    if (this.menuManager) {
      this.menuManager.enable()
    }

    const path = this.maintenanceManager.lastAttemptedPath || "/"
    this.maintenanceManager.lastAttemptedPath = null

    return this.navigateTo(path)
  }
}

const app = new App()

export default App

