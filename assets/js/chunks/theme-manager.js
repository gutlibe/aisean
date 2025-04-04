export default class ThemeManager {
  constructor() {
    this.storageKey = 'light-theme-preference';
    this.darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.themes = {
      light: {
        name: 'Light Mode',
        icon: 'fas fa-sun',
        color: '#ffffff',
        type: 'light'
      },
      dark: {
        name: 'Dark Mode',
        icon: 'fas fa-moon',
        color: '#000000',
        type: 'dark'
      },
      blue: {
        name: 'Blue Theme',
        icon: 'fas fa-water',
        color: '#1a73e8',
        type: 'light'
      },
      green: {
        name: 'Green Theme',
        icon: 'fas fa-leaf',
        color: '#0f9d58',
        type: 'light'
      }
    };
    this.currentTheme = this.getInitialTheme();
    this.isDropdownOpen = false;
    this.menuCollapsed = false;
  }

  getInitialTheme() {
    const isDarkMode = this.darkModeMediaQuery.matches;
    
    if (isDarkMode) {
      // Always use dark theme when system is in dark mode
      return 'dark';
    } else {
      // For light mode, check if there's a saved light theme preference
      const savedLightTheme = localStorage.getItem(this.storageKey);
      if (savedLightTheme && this.themes[savedLightTheme] && this.themes[savedLightTheme].type === 'light') {
        return savedLightTheme;
      }
      
      // Default to standard light theme if no saved preference
      return 'light';
    }
  }

  applyTheme(theme) {
    if (!this.themes[theme]) theme = 'light';
    
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    this.updateThemeColorMeta(theme);
    this.updateThemeDropdown();
    
    // Save light theme preference, but only if it's a light theme
    if (this.themes[theme].type === 'light') {
      localStorage.setItem(this.storageKey, theme);
    }
  }

  updateThemeColorMeta(theme) {
    const themeData = this.themes[theme];
    const color = themeData ? themeData.color : '#ffffff';
    
    let metaTag = document.querySelector('meta[name="theme-color"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'theme-color';
      document.head.appendChild(metaTag);
    }
    metaTag.content = color;
  }

  updateThemeDropdown() {
    const dropdownButton = document.querySelector('.theme-dropdown-button');
    if (dropdownButton) {
      const icon = dropdownButton.querySelector('i:first-child');
      const text = dropdownButton.querySelector('span');
      
      if (icon && this.themes[this.currentTheme]) {
        icon.className = this.themes[this.currentTheme].icon;
      }
      
      if (text && this.themes[this.currentTheme]) {
        text.textContent = this.themes[this.currentTheme].name;
      }
      
      // Update active state in dropdown menu
      const themeOptions = document.querySelectorAll('.theme-option');
      themeOptions.forEach(option => {
        const themeAttr = option.getAttribute('data-theme');
        option.classList.toggle('active', themeAttr === this.currentTheme);
      });
    }
  }

  toggleDropdown(event) {
    if (event) {
      event.stopPropagation(); // Prevent event bubbling
    }
    
    this.isDropdownOpen = !this.isDropdownOpen;
    const dropdown = document.querySelector('.theme-dropdown-menu');
    const arrowIcon = document.querySelector('.dropdown-arrow');
    
    if (dropdown) {
      dropdown.classList.toggle('open', this.isDropdownOpen);
      
      // Get button position for smart positioning
      const button = document.querySelector('.theme-dropdown-button');
      const buttonRect = button.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Determine if the button is in the lower half of the viewport
      const isInLowerHalf = buttonRect.bottom > viewportHeight / 2;
      
      // Position dropdown based on menu state and viewport position
      if (this.menuCollapsed) {
        dropdown.style.position = 'fixed';
        dropdown.style.left = '70px'; 
        dropdown.style.width = '180px';
        
        // Adjust vertical positioning to appear upward when in lower half
        if (isInLowerHalf) {
          dropdown.style.bottom = (viewportHeight - buttonRect.top) + 'px';
          dropdown.style.top = 'auto';
        } else {
          dropdown.style.top = buttonRect.top + 'px';
          dropdown.style.bottom = 'auto';
        }
      } else {
        dropdown.style.position = 'absolute';
        dropdown.style.left = '0';
        dropdown.style.width = '100%';
        
        // Standard behavior for expanded menu - show above
        dropdown.style.bottom = '100%';
        dropdown.style.top = 'auto';
      }
    }
    
    if (arrowIcon && !this.menuCollapsed) {
      arrowIcon.style.transform = this.isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)';
    }
  }

  closeDropdown() {
    this.isDropdownOpen = false;
    const dropdown = document.querySelector('.theme-dropdown-menu');
    const arrowIcon = document.querySelector('.dropdown-arrow');
    
    if (dropdown) {
      dropdown.classList.remove('open');
    }
    
    if (arrowIcon) {
      arrowIcon.style.transform = 'rotate(0)';
    }
  }

  setTheme(theme) {
    if (this.themes[theme]) {
      this.applyTheme(theme);
      this.closeDropdown();
      
      // Note: We now only save light theme preferences in applyTheme
    }
  }

  listenToSystemThemeChanges() {
    this.darkModeMediaQuery.addEventListener('change', (e) => {
      if (e.matches) {
        // System switched to dark mode - always use dark theme
        this.applyTheme('dark');
      } else {
        // System switched to light mode - use saved light theme preference
        const savedLightTheme = localStorage.getItem(this.storageKey);
        if (savedLightTheme && this.themes[savedLightTheme] && this.themes[savedLightTheme].type === 'light') {
          this.applyTheme(savedLightTheme);
        } else {
          this.applyTheme('light');
        }
      }
    });
  }
  
  // Handle menu collapse state and adjust the theme dropdown accordingly
  handleMenuCollapseState(isCollapsed) {
    this.menuCollapsed = isCollapsed;
    
    // Close dropdown when menu state changes to avoid positioning issues
    this.closeDropdown();
    
    // Update dropdown button appearance for collapsed state
    const dropdownButton = document.querySelector('.theme-dropdown-button');
    if (dropdownButton) {
      if (isCollapsed) {
        dropdownButton.classList.add('collapsed');
      } else {
        dropdownButton.classList.remove('collapsed');
      }
    }
  }

  // Initialize theme dropdown in the menu
  initThemeDropdown() {
    // Find the menu footer
    const menuFooter = document.querySelector('.menu-footer');
    if (!menuFooter) return;

    // Create dropdown HTML with improved structure
    menuFooter.innerHTML = `
      <div class="theme-dropdown">
        <button class="theme-dropdown-button" aria-label="Change theme">
          <i class="${this.themes[this.currentTheme].icon}"></i>
          <span>${this.themes[this.currentTheme].name}</span>
          <i class="fas fa-chevron-down dropdown-arrow"></i>
        </button>
        <div class="theme-dropdown-menu" aria-hidden="true">
          ${Object.entries(this.themes).map(([key, theme]) => `
            <button class="theme-option ${key === this.currentTheme ? 'active' : ''}" 
                    data-theme="${key}" 
                    aria-label="Switch to ${theme.name}">
              <i class="${theme.icon}"></i>
              <span>${theme.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Set up event listeners
    const dropdownButton = menuFooter.querySelector('.theme-dropdown-button');
    const themeOptions = menuFooter.querySelectorAll('.theme-option');
    
    // Toggle dropdown when button is clicked
    dropdownButton.addEventListener('click', (e) => {
      this.toggleDropdown(e);
    });

    // Handle theme selection
    themeOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        const theme = option.getAttribute('data-theme');
        this.setTheme(theme);
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      // Only close if click is outside the dropdown
      if (!e.target.closest('.theme-dropdown')) {
        this.closeDropdown();
      }
    });
    
    // Initial check of menu state
    const menu = document.querySelector('.menu');
    if (menu) {
      this.menuCollapsed = menu.classList.contains('collapsed');
    }
    
    // Apply initial theme
    this.applyTheme(this.currentTheme);
    
    // Listen for system theme changes
    this.listenToSystemThemeChanges();
  }
}