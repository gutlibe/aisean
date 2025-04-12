export default class MenuManager {
  constructor() {
    this.menuSections = [
    {
        title: "Predictions",
        items: [
            {
                path: "/",
                text: "Free",
                icon: "fas fa-futbol",
                requiresAuth: false,
            },
            {
                path: "/premium",
                text: "Premium",
                icon: "fas fa-crown",
                requiresAuth: false,
                badge: { text: "New!", type: "success" },
            },
        ],
    },
    {
        title: "Reports",
        items: [
            {
                path: "#",
                text: "Analytics",
                icon: "fas fa-chart-line",
                requiresAuth: false,
            },
        ],
    },
    {
        title: "Subscriptions",
        items: [
            {
                path: "/pricing",
                text: "Pricing",
                icon: "fas fa-tags",
                requiresAuth: false,
            },
        ],
    },
    {
        title: "Support",
        items: [
            {
                path: "/help",
                text: "Help",
                icon: "fas fa-question-circle",
                requiresAuth: false,
                badge: { text: "New!", type: "warning" },
            },
        ],
    },
];

    // Get DOM elements - these elements should already exist from App.js
    this.menu = document.querySelector(".menu");
    this.overlay = document.querySelector(".overlay");
    this.pageHeaderContent = document.querySelector(".page-header-content");
    this.themeManager = null; // Will be set by App.js

    // Don't auto-initialize in constructor
    // This prevents the menu from appearing before splash screen
    this.menuContainer = null;
    this.initialized = false;
    
    // Store window width to detect actual resize events vs mobile toolbar showing/hiding
    this.lastWindowWidth = window.innerWidth;
    
    // Bind methods to ensure 'this' context is preserved
    this.handleResize = this.handleResize.bind(this);
  }

  // Method to set the theme manager reference
  setThemeManager(themeManager) {
    this.themeManager = themeManager;
    // Initialize the theme dropdown when the theme manager is set
    if (this.themeManager && this.initialized) {
      this.themeManager.initThemeDropdown();
    }
  }

  createMenuStructure() {
    if (!this.menu) {
      console.error("Menu element not found");
      return false;
    }

    this.menu.innerHTML = `
      <div class="menu-header">
        <div class="header-content">
          <div class="menu-brand">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100" width="200" height="70">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#4285f4;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#34a853;stop-opacity:1" />
                </linearGradient>
              </defs>
              
              <!-- Stylized AI network -->
              <path d="M30 50 L70 20 L110 50 L70 80 Z" fill="none" stroke="url(#grad1)" stroke-width="4" />
              <circle cx="30" cy="50" r="6" fill="#4285f4" />
              <circle cx="70" cy="20" r="6" fill="#4285f4" />
              <circle cx="110" cy="50" r="6" fill="#34a853" />
              <circle cx="70" cy="80" r="6" fill="#34a853" />
              
              <!-- Stylized ball -->
              <circle cx="70" cy="50" r="18" fill="none" stroke="url(#grad1)" stroke-width="4" />
              <path d="M55 50 Q70 30 85 50 Q70 70 55 50" fill="none" stroke="url(#grad1)" stroke-width="4" />
              
              <!-- Text -->
              <text x="140" y="65" font-family="Segoe UI" font-size="48" font-weight="bold" fill="url(#grad1)">AIsean</text>
              
              <!-- Underline -->
              <path d="M140 75 L270 75" stroke="url(#grad1)" stroke-width="8" />
            </svg>
          </div>
          
          <button class="menu-collapse">
            <i class="fas fa-chevron-left"></i>
          </button>
        </div>
      </div>
      <div class="menu-items">
      </div>
      <div class="menu-footer">
        <!-- Theme dropdown will be initialized by ThemeManager -->
      </div>
    `;

    // Set up menu collapse button
    this.collapseButton = document.querySelector(".menu-collapse");
    if (this.collapseButton) {
      this.collapseButton.addEventListener("click", () => {
        this.toggleCollapse();
      });
    }

    // Get the menu container
    this.menuContainer = document.querySelector(".menu-items");

    return true;
  }

  // Toggle menu collapse state
  toggleCollapse() {
  this.menu.classList.toggle("collapsed");
  this.updatePageHeaderPosition();

  // Notify ThemeManager about collapse state change
  if (this.themeManager) {
    const isCollapsed = this.menu.classList.contains("collapsed");
    this.themeManager.handleMenuCollapseState(isCollapsed);
  }
}

  // Update the page header position based on current menu state and viewport size
  updatePageHeaderPosition() {
    const pageHeader = document.querySelector(".page-header");
    if (!pageHeader) return;

    const viewportWidth = window.innerWidth;
    
    if (viewportWidth > 1024) {
      // Desktop layout
      if (this.menu.classList.contains("collapsed")) {
        pageHeader.style.left = "70px";
        pageHeader.style.width = "calc(100% - 70px)";
      } else {
        pageHeader.style.left = "250px";
        pageHeader.style.width = "calc(100% - 250px)";
      }
    } else {
      // Mobile/tablet layout
      pageHeader.style.left = "0";
      pageHeader.style.width = "100%";
    }
  }

  // Handle window resize events
  handleResize() {
    // Get current window width
    const currentWidth = window.innerWidth;
    
    // Only process if width actually changes (avoid processing on height changes or mobile toolbar)
    if (currentWidth !== this.lastWindowWidth) {
      // Store new width
      this.lastWindowWidth = currentWidth;
      
      // Handle mobile/desktop transition
      if (currentWidth <= 1024) {
        // Moving to mobile size
        // Close menu if it was open
        if (this.menu.classList.contains("open") && !this.overlay.classList.contains("visible")) {
          this.toggleMenu(false);
        }
      } else {
        // Moving to desktop size
        // Make menu visible but respect collapsed state
        if (!this.menu.classList.contains("open")) {
          this.toggleMenu(true);
        }
        // Make overlay invisible
        this.overlay.classList.remove("visible");
      }
      
      // Update header positioning to match new viewport size and menu state
      this.updatePageHeaderPosition();
    }
  }

  async initialize() {
    try {
      // Ensure menu elements are found in the DOM
      this.menu = document.querySelector(".menu");
      this.overlay = document.querySelector(".overlay");

      if (!this.menu || !this.overlay) {
        console.error("Menu or overlay elements not found");
        return false;
      }

      // Create menu structure if it doesn't exist
      if (!this.menu.querySelector(".menu-header")) {
        const structureCreated = this.createMenuStructure();
        if (!structureCreated) return false;
      }

      // Wait for LibraryLoader to be ready
      const firebase = await this.waitForFirebase();

      // Set up auth state listener
      firebase.auth.onAuthStateChanged((user) => {
        this.renderMenu(!!user);
      });

      // Important: Setup overlay listener
      this.setupOverlayListener();
      
      // Add window resize event listener
      window.removeEventListener('resize', this.handleResize);
      window.addEventListener('resize', this.handleResize);
      
      // Set initial page header position
      this.updatePageHeaderPosition();

      // Initialize theme dropdown if theme manager exists
      if (this.themeManager) {
        this.themeManager.initThemeDropdown();
      }

      // Mark as initialized
      this.initialized = true;

      // Initial render with current auth state
      const user = firebase.auth.currentUser;
      this.renderMenu(!!user);

      return true;
    } catch (error) {
      console.error("Failed to initialize MenuManager:", error);
      // Render public menu items as fallback
      this.renderMenu(false);
      return false;
    }
  }

  async waitForFirebase() {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      if (window.app?.getLibrary("firebase")) {
        return window.app.getLibrary("firebase");
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }
    throw new Error("Firebase library not available");
  }

  setupOverlayListener() {
    if (!this.overlay) {
      console.error("Overlay element not found");
      return;
    }

    // Remove any existing listener to prevent duplicates
    this.overlay.removeEventListener("click", this._overlayClickHandler);

    // Create a named handler so we can remove it if needed
    this._overlayClickHandler = () => {
      this.toggleMenu(false);
    };

    // Add the click listener
    this.overlay.addEventListener("click", this._overlayClickHandler);
  }

  toggleMenu(show = null) {
    if (!this.menu || !this.overlay) {
      console.error("Menu or overlay elements not found");
      return;
    }

    const isOpen = show !== null ? show : !this.menu.classList.contains("open");

    // Toggle menu open class
    this.menu.classList.toggle("open", isOpen);

    // Only toggle overlay on smaller screens
    if (window.innerWidth <= 1024) {
      this.overlay.classList.toggle("visible", isOpen);
    }

    // Update page header position
    this.updatePageHeaderPosition();

    // Close theme dropdown if menu is being closed
    if (!isOpen && this.themeManager) {
      this.themeManager.closeDropdown();
    }

    // For debugging
    console.log(`Menu toggled: ${isOpen ? "open" : "closed"}`);
  }

  renderMenu(isAuthenticated) {
    if (!this.menuContainer) {
      console.error("Menu container element not found");
      return;
    }

    // Clear existing menu items
    this.menuContainer.innerHTML = "";

    // Create sections and menu items
    this.menuSections.forEach((section) => {
      const sectionElement = document.createElement("div");
      sectionElement.className = "menu-section";

      const sectionTitle = document.createElement("h3");
      sectionTitle.className = "menu-section-title";
      sectionTitle.textContent = section.title;
      sectionElement.appendChild(sectionTitle);

      // Filter menu items based on auth state
      const visibleMenuItems = section.items.filter((item) => !item.requiresAuth || isAuthenticated);

      // Create menu items
      visibleMenuItems.forEach((item) => {
        const link = this.createMenuItem(item);
        sectionElement.appendChild(link);
      });

      if (visibleMenuItems.length > 0) {
        this.menuContainer.appendChild(sectionElement);
      }
    });

    this.setupMenuItemListeners();

    // Update active menu item using the current URL path
    this.updateActiveMenuItem(window.location.pathname);

    // If we have a theme manager, update the theme dropdown
    if (this.themeManager) {
      this.themeManager.initThemeDropdown();
    }
  }

  createMenuItem(item) {
    const link = document.createElement("a");
    link.href = item.path;
    link.className = "menu-item";
    link.setAttribute("data-path", item.path);

    const icon = document.createElement("i");
    icon.className = item.icon;

    const span = document.createElement("span");
    span.textContent = item.text;

    link.appendChild(icon);
    link.appendChild(span);

    // Add badge if available
    if (item.badge) {
      const badge = document.createElement("span");
      badge.className = `menu-badge ${item.badge.type || ""}`;
      badge.textContent = item.badge.text;
      link.appendChild(badge);
    }

    return link;
  }

  setupMenuItemListeners() {
    const menuItems = document.querySelectorAll(".menu-item");

    if (menuItems.length === 0) {
      console.warn("No menu items found to attach listeners");
    }

    menuItems.forEach((item) => {
      // Remove existing listeners to prevent duplicates
      item.removeEventListener("click", this._menuItemClickHandler);

      // Store reference to event handler
      this._menuItemClickHandler = (e) => {
  e.preventDefault();
  const path = item.getAttribute("data-path");
  
  // Add this check to block hash navigation
  if (path === "#") return; // Do nothing for hash links

  if (window.app) {
    window.app.navigateTo(path);
  }
  this.updateActiveMenuItem(path);
  if (window.innerWidth <= 1024) {
    this.toggleMenu(false);
  }
};

      // Add click listener
      item.addEventListener("click", this._menuItemClickHandler);
    });
  }

  updateActiveMenuItem(path) {
    if (!path) return;

    document.querySelectorAll(".menu-item").forEach((item) => {
      const itemPath = item.getAttribute("data-path");
      item.classList.toggle("active", itemPath === path);
    });
  }

  // Enable/disable methods for maintenance mode
  disable() {
    if (this.menu) {
      this.menu.classList.add("disabled");
    }
  }

  enable() {
    if (this.menu) {
      this.menu.classList.remove("disabled");
    }
  }
  
  // Clean up when the component is destroyed
  destroy() {
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    if (this.overlay) {
      this.overlay.removeEventListener("click", this._overlayClickHandler);
    }
    
    // Clean up other resources if needed
    this._overlayClickHandler = null;
    this._menuItemClickHandler = null;
  }
}