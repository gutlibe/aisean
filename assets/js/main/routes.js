/**
 * Application Route Management
 *
 * This file contains all route definitions and route-related utilities
 * for the application. It encapsulates route logic away from the main App class.
 */

class RouteManager {
  constructor() {
    // Enhanced route registry with complete information
    this.routeRegistry = {
      "/": {
        path: "/",
        moduleLoader: () => import("../pages/public/freenode/index.js"),
        title: "Home",
        requiresAuth: false,
      },
      "/premium": {
        path: "/premium",
        moduleLoader: () => import("../pages/public/football/index.js"),
        title: "Premium",
        requiresAuth: true,
        authorizedUserTypes: ["Pro", "Admin"],
        unauthorizedRedirectPath: "/upgrade",
      },
      "/experts": {
        path: "/experts",
        moduleLoader: () => import("../pages/public/experts/index.js"),
        title: "Experts",
        requiresAuth: false,
        authorizedUserTypes: ["Pro", "Admin"],
        unauthorizedRedirectPath: "/upgrade",
      },
      "/pricing": {
        path: "/pricing",
        moduleLoader: () => import("../pages/public/pricing/index.js"),
        title: "Pricing",
        requiresAuth: false,
      },
      "/upgrade": {
        path: "/upgrade",
        moduleLoader: () => import("../pages/public/upgrade/index.js"),
        title: "Upgrade",
        requiresAuth: true,
      },
      "/profile": {
        path: "/profile",
        moduleLoader: () => import("../pages/public/profile/index.js"),
        title: "Profile",
        requiresAuth: true,
      },
      "/help": {
        path: "/help",
        moduleLoader: () => import("../pages/public/help/index.js"),
        title: "Help",
        requiresAuth: false,
      },
      "/404": {
        path: "/404",
        moduleLoader: () => import("../pages/public/notfound/index.js"),
        title: "Not Found",
        requiresAuth: false,
      },
      "/admin": {
        path: "/admin",
        moduleLoader: () => import("../pages/admin/dashboard/index.js"),
        title: "Admin Dashboard",
        requiresAuth: true,
        authorizedUserTypes: ["Admin"],
        //    unauthorizedRedirectPath: "/404",
      },
      "/admin/panel": {
        path: "/admin/panel",
        moduleLoader: () => import("../pages/admin/panel/index.js"),
        title: "AI Panel",
        requiresAuth: true,
        authorizedUserTypes: ["Admin"],
      },
      "/admin/experts": {
        path: "/admin/experts",
        moduleLoader: () => import("../pages/admin/experts/index.js"),
        title: "Manage Experts",
        requiresAuth: true,
        authorizedUserTypes: ["Admin"],
      },
      "/admin/users": {
        path: "/admin/users",
        moduleLoader: () => import("../pages/admin/users/index.js"),
        title: "Manage Users",
        requiresAuth: true,
        authorizedUserTypes: ["Admin"],
      },
      
      "/admin/pricing": {
        path: "/admin/pricing",
        moduleLoader: () => import("../pages/admin/pricing/index.js"),
        title: "Pricing Management",
        requiresAuth: true,
        authorizedUserTypes: ["Admin"],
        unauthorizedRedirectPath: "/404",
      },
      "/admin/configs": {
        path: "/admin/configs",
        moduleLoader: () => import("../pages/admin/configs/index.js"),
        title: "System Configuration",
        requiresAuth: true,
        authorizedUserTypes: ["Admin"],
        unauthorizedRedirectPath: "/404",
      },
      
    };
    
    // Track additional dynamic routes that may be added at runtime
    this.dynamicRoutes = {};
  }
  
  /**
   * Initialize the RouteManager with a Router instance
   * @param {Router} router - Router instance to register routes with
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(router) {
    if (!router) {
      console.error("Route initialization failed: Router not provided");
      return false;
    }
    
    try {
      // Register all predefined routes
      Object.values(this.routeRegistry).forEach((routeInfo) => {
        router.addRoute(routeInfo.path, routeInfo.moduleLoader);
      });
      
      // Register any dynamic routes that may have been added before initialization
      Object.values(this.dynamicRoutes).forEach((routeInfo) => {
        router.addRoute(routeInfo.path, routeInfo.moduleLoader);
      });
      
      return true;
    } catch (error) {
      console.error("Route initialization error:", error);
      return false;
    }
  }
  
  /**
   * Get all registered routes
   * @returns {Array<string>} Array of all route paths
   */
  getAllRoutes() {
    return [...Object.keys(this.routeRegistry), ...Object.keys(this.dynamicRoutes)];
  }
  
  /**
   * Get route information for a specific path
   * @param {string} path - Route path
   * @returns {Object|null} Route information or null if not found
   */
  getRouteInfo(path) {
    // First check for exact route match
    if (this.routeRegistry[path]) {
      return this.routeRegistry[path];
    }
    
    if (this.dynamicRoutes[path]) {
      return this.dynamicRoutes[path];
    }
    
    // If no exact match, check for parent route match
    const segments = path.split("/").filter((segment) => segment);
    
    // Try progressively shorter paths
    while (segments.length > 0) {
      segments.pop(); // Remove the last segment
      const parentPath = "/" + segments.join("/");
      
      // If we find a parent route, return it
      if (this.routeRegistry[parentPath]) {
        return {
          ...this.routeRegistry[parentPath],
          originalPath: path,
          isNestedRoute: true,
        };
      }
      
      if (this.dynamicRoutes[parentPath]) {
        return {
          ...this.dynamicRoutes[parentPath],
          originalPath: path,
          isNestedRoute: true,
        };
      }
    }
    
    // If we get here, no matching route was found
    return null;
  }
  
  /**
   * Add a new dynamic route at runtime
   * @param {string} path - Route path to add
   * @param {Function} moduleLoader - Function that imports the page module
   * @param {Object} metadata - Additional route metadata
   * @param {Router} router - Router instance to register with
   * @returns {boolean} Success status
   */
  addDynamicRoute(path, moduleLoader, metadata = {}, router) {
    if (!path || typeof path !== "string") {
      console.error("Invalid route path");
      return false;
    }
    
    if (!moduleLoader || typeof moduleLoader !== "function") {
      console.error("Invalid module loader for route:", path);
      return false;
    }
    
    // Don't add duplicates
    if (this.routeRegistry[path] || this.dynamicRoutes[path]) {
      console.warn(`Route ${path} already exists`);
      return false;
    }
    
    // Add to dynamic routes collection
    this.dynamicRoutes[path] = {
      path,
      moduleLoader,
      ...metadata,
    };
    
    // If router is provided, register immediately
    if (router) {
      router.addRoute(path, moduleLoader);
    }
    
    return true;
  }
  
  /**
   * Check if a path is a valid registered route
   * @param {string} path - Path to check
   * @returns {boolean} Whether the path is a valid route
   */
  isValidRoute(path) {
    // First check for exact route match
    if (this.routeRegistry[path] || this.dynamicRoutes[path]) {
      return true;
    }
    
    // If no exact match, check for parent route match
    const segments = path.split("/").filter((segment) => segment);
    
    // Try progressively shorter paths
    while (segments.length > 0) {
      segments.pop(); // Remove the last segment
      const parentPath = "/" + segments.join("/");
      
      // If we find a parent route, return true
      if (this.routeRegistry[parentPath] || this.dynamicRoutes[parentPath]) {
        return true;
      }
    }
    
    // If we get here, no matching route was found
    return false;
  }
  
  /**
   * Get the fallback route for invalid paths
   * @returns {string} Fallback route path
   */
  getFallbackRoute() {
    return "/404";
  }
}

// Create and export a singleton instance
const routeManager = new RouteManager();
export default routeManager;