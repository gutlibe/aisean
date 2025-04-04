export class FootballEventManager {
  constructor(page) {
    this.page = page
    this.eventListeners = []
    this.scrollHandler = null
  }

  // Helper method to safely add event listeners with tracking
  addEventListenerWithTracking(element, eventType, handler) {
    if (!element) return null

    // Create a reference we can use to remove later
    const boundHandler = handler.bind(this.page)
    element.addEventListener(eventType, boundHandler)

    // Track this listener so we can clean it up later
    this.eventListeners.push({ element, eventType, handler: boundHandler })

    return boundHandler
  }

  // Helper method to remove all tracked event listeners
  removeAllEventListeners() {
    this.eventListeners.forEach(({ element, eventType, handler }) => {
      if (element) {
        element.removeEventListener(eventType, handler)
      }
    })

    // Clear the array
    this.eventListeners = []

    // Remove scroll event listener specifically
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler)
      this.scrollHandler = null
    }
  }

  setupTabListeners(page) {
    const container = page.container

    container.querySelectorAll(".spt-tab").forEach((tab) => {
      this.addEventListenerWithTracking(tab, "click", function () {
        const newTabId = tab.dataset.tabId

        // Skip if we're already on this tab
        if (this.currentTab === newTabId) return

        // Update the UI immediately
        this.container.querySelectorAll(".spt-tab").forEach((t) => {
          t.classList.remove("spt-tab-active")
        })
        tab.classList.add("spt-tab-active")

        // Cancel any pending operations from current tab
        const currentTabId = this.currentTab
        this.loadingTabs.delete(currentTabId)

        // Update the current tab
        this.currentTab = newTabId

        // Reset scroll position to top before refreshing content
        window.scrollTo({
          top: 0,
          behavior: "auto",
        })

        // Always force a fresh load when switching tabs
        this.lastVisible = null
        this.hasMore = true
        this.predictions = []

        // Refresh content for the new tab
        this.refresh()
      })
    })
  }

  setupLoadMoreButton(page) {
    const container = page.container
    const loadMoreBtn = container.querySelector("#load-more-btn")

    if (loadMoreBtn) {
      this.addEventListenerWithTracking(loadMoreBtn, "click", page.loadMore)
    }
  }

  setupScrollToTopButton(page) {
    const container = page.container
    const scrollToTopBtn = container.querySelector("#scroll-to-top-btn")

    if (scrollToTopBtn) {
      this.addEventListenerWithTracking(scrollToTopBtn, "click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        })
      })
    }
  }

  setupUpgradeButton(page) {
  const container = page.container
  const upgradeButton = container.querySelector("#upgrade-button")

  if (upgradeButton) {
    this.addEventListenerWithTracking(upgradeButton, "click", () => {
      // Check if user is a Pro user and navigate accordingly
      const isPro = page.userType === 'Pro'
      
      // Navigate to the appropriate page based on user type
      if (isPro) {
        window.app.navigateTo("/premium")
      } else {
        window.app.navigateTo("/pricing")
      }
    })
  }
}
}

