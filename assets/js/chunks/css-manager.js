// css-manager.js
class CSSManager {
  constructor() {
    this.loadedStyles = new Set()
    this.activePageStyles = new Set() // Track styles for current page
    this.cssConfig = {
      core: ["theme", "loader", "base", "page", "menu"],
      components: [],
      pages: {},
    }
    // Track initialization state
    this.initialized = false
  }

  async loadCSS(path, pageSpecific = false) {
    // If the path doesn't end with .css, add it
    if (!path.endsWith(".css")) {
      path = `${path}.css`
    }

    // Check if already loaded
    if (this.loadedStyles.has(path)) {
      // If it's a page-specific style, add it to active page styles
      if (pageSpecific) {
        this.activePageStyles.add(path)
      }
      return true
    }

    try {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load CSS: ${response.status} ${response.statusText}`)
      }

      const cssText = await response.text()
      const styleElement = document.createElement("style")
      styleElement.type = "text/css"
      styleElement.setAttribute("data-source", path)

      // Mark page-specific styles for easier cleanup
      if (pageSpecific) {
        styleElement.setAttribute("data-page-specific", "true")
        this.activePageStyles.add(path)
      }

      if (styleElement.styleSheet) {
        styleElement.styleSheet.cssText = cssText
      } else {
        styleElement.appendChild(document.createTextNode(cssText))
      }

      document.head.appendChild(styleElement)
      this.loadedStyles.add(path)
      return true
    } catch (error) {
      console.error(`Error loading CSS file ${path}:`, error)
      return false
    }
  }

  async loadCoreStyles() {
    const loadPromises = this.cssConfig.core.map((style) => this.loadCSS(`/assets/css/${style}.css`))
    return Promise.all(loadPromises)
  }

  async loadComponentStyles() {
    const loadPromises = this.cssConfig.components.map((component) =>
      this.loadCSS(`/assets/css/components/${component}.css`),
    )
    return Promise.all(loadPromises)
  }

  async loadPageStyle(route) {
    // Don't clean up previous page styles immediately
    // We'll keep them until the new styles are loaded

    // Default to home page style if no route is provided
    const path = route || "/"

    // Ensure we're working with a clean path
    const cleanPath = this.normalizeRoute(path)

    const pageStyle = this.cssConfig.pages[cleanPath]
    if (pageStyle) {
      // Load the new page's CSS first
      const success = await this.loadCSS(`/assets/css/pages/${pageStyle}.css`, true) // Mark as page-specific

      // Only after successfully loading the new CSS, clean up the old styles
      if (success) {
        this.cleanupOldPageStyles(cleanPath)
      }

      return success
    }
    return false
  }

  // New method to clean up old page styles while preserving current page styles
  cleanupOldPageStyles(currentPath) {
    const pageStyles = document.querySelectorAll('style[data-page-specific="true"]')
    const currentPageStylePath = `/assets/css/pages/${this.cssConfig.pages[currentPath]}.css`

    pageStyles.forEach((style) => {
      const path = style.getAttribute("data-source")
      // Only remove styles that aren't for the current page
      if (path && path !== currentPageStylePath) {
        this.loadedStyles.delete(path)
        this.activePageStyles.delete(path)
        style.remove()
      }
    })
  }

  // Keep the original cleanupPageStyles method for when we need to clean everything
  cleanupPageStyles() {
    // Remove all page-specific styles from DOM
    const pageStyles = document.querySelectorAll('style[data-page-specific="true"]')
    pageStyles.forEach((style) => {
      const path = style.getAttribute("data-source")
      if (path) {
        this.loadedStyles.delete(path)
        this.activePageStyles.delete(path)
      }
      style.remove()
    })
  }

  // Ensures consistent route format
  normalizeRoute(route) {
    if (!route) return "/"

    // Handle hash-based routing
    if (route.includes("#")) {
      route = route.split("#")[1] || "/"
    }

    // Remove any query parameters
    if (route.includes("?")) {
      route = route.split("?")[0]
    }

    // Ensure route starts with /
    if (!route.startsWith("/")) {
      route = "/" + route
    }

    return route
  }

  // Load initial page CSS based on current URL
  async loadInitialPageStyle() {
    const currentPath = window.location.pathname || "/"
    return this.loadPageStyle(currentPath)
  }

  async initialize() {
    if (this.initialized) return

    try {
      // Load core and component styles
      await this.loadCoreStyles()
      await this.loadComponentStyles()

      // Pre-load the home page style (most important one)
      await this.loadPageStyle("/")

      // Also load the current page style if different from home
      const currentPath = window.location.pathname
      if (currentPath !== "/" && currentPath !== "") {
        await this.loadPageStyle(currentPath)
      }

      this.initialized = true
    } catch (error) {
      console.error("Failed to initialize CSS Manager:", error)
    }
  }

  addPageStyle(route, styleName) {
    this.cssConfig.pages[route] = styleName
  }

  addComponentStyle(componentName) {
    if (!this.cssConfig.components.includes(componentName)) {
      this.cssConfig.components.push(componentName)
      return this.loadCSS(`/assets/css/components/${componentName}.css`)
    }
    return Promise.resolve(true)
  }

  addCoreStyle(styleName) {
    if (!this.cssConfig.core.includes(styleName)) {
      this.cssConfig.core.push(styleName)
      return this.loadCSS(`/assets/css/${styleName}.css`)
    }
    return Promise.resolve(true)
  }

  removeStyle(path) {
    const styleElement = document.querySelector(`style[data-source="${path}"]`)
    if (styleElement) {
      styleElement.remove()
      this.loadedStyles.delete(path)
      this.activePageStyles.delete(path)
    }
  }
}

export default CSSManager

