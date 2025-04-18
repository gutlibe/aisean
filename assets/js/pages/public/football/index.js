import { Page } from "../../../core/page.js"
import { FootballDataManager } from "./utils/data-manager.js"
import { FootballUIManager } from "./utils/ui-manager.js"
import { FootballEventManager } from "./utils/event-manager.js"
import { FootballCacheManager } from "./utils/cache-manager.js"

export class FootballPage extends Page {
  constructor() {
    super()
    this.showMenuIcon = true
    this.showBackArrow = true
    this.requiresDatabase = true
    this.requiresAuth = true
    this.authorizedUserTypes = ['Admin', 'Pro']
    this.showProfileAvatar = true
    this.showUpgradeButton = false;

    // Initialize managers
    this.dataManager = new FootballDataManager(this)
    this.uiManager = new FootballUIManager(this)
    this.eventManager = new FootballEventManager(this)
    this.cacheManager = new FootballCacheManager()

    // Core state
    this.dates = this.dataManager.generateDateTabs()
    this.currentTab = this.findTodayTab()
    this.predictions = []
    this.lastVisible = null
    this.limit = 18
    this.hasMore = true
    this.isLoading = false
    this.showSkeletonOnCachedData = true
    this.skeletonTimeout = null
    this.initialPageLoad = true
    this.lastRefreshedTab = null
    this.loadingTabs = new Set()
    this.activeTabRequests = new Map()
    this.cssFiles = [
      "pages/public/premium/index.css",
    ]
  }

  getTitle() {
    return "Premium"
  }

  getHeaderIcon() {
    return ""
  }

  getActions() {
        return `
            <button class="btn btn-primary" id="expertsBtn">
                Experts
            </button>
        `;
    }
    
    setupCustomActionListeners() {
        const expertsBtn = this.container.querySelector("#expertsBtn");
        if (expertsBtn) {
            expertsBtn.addEventListener("click", () => {
                window.app.navigateTo('/experts');
            });
        }
    }

  findTodayTab() {
    const todayTab = this.dates.find((tab) => tab.type === "today")
    return todayTab ? todayTab.id : "today"
  }

  getSkeletonTemplate() {
    return this.uiManager.getSkeletonTemplate(this.dates)
  }

  getLoadingSkeletonCards(count = 3) {
    return this.uiManager.getLoadingSkeletonCards(count)
  }

  async loadDatabaseContent() {
    const dateKey = this.currentTab

    // Don't start a new request if one is already in progress for this tab
    if (this.loadingTabs.has(dateKey)) {
      return false
    }

    // Check cache for initial load
    if (this.cacheManager.hasCache(dateKey) && !this.lastVisible && this.initialPageLoad) {
      const cachedData = this.cacheManager.getCachedData(dateKey)

      // Set values from cache for initial loads
      this.predictions = cachedData.predictions
      this.lastVisible = cachedData.lastVisible
      this.hasMore = cachedData.hasMore
      this.cacheManager.setUsedCacheData(true)

      if (this.showSkeletonOnCachedData) {
        return new Promise((resolve) => {
          this.skeletonTimeout = setTimeout(() => {
            resolve(true)
          }, 300)
        })
      }

      return true
    }

    // Mark this tab as loading
    this.loadingTabs.add(dateKey)
    this.isLoading = true

    try {
      const firebase = window.app.getLibrary("firebase")
      const selectedDate = this.getSelectedDate()
      const formattedDate = this.dataManager.formatDateForApi(selectedDate)

      const predictionsRef = firebase.collection(
        firebase.firestore,
        "predictions_pro",
        "football",
        "dates",
        formattedDate,
        "matches",
      )

      // Create a query with the right limit
      let predictionsQuery = firebase.query(predictionsRef, firebase.limit(this.limit))

      // Add pagination if we're loading more
      if (this.lastVisible) {
        predictionsQuery = firebase.query(
          predictionsRef,
          firebase.startAfter(this.lastVisible),
          firebase.limit(this.limit),
        )
      }

      const predictionsSnapshot = await firebase.getDocs(predictionsQuery)

      // Only continue if we're still on the same tab
      if (this.currentTab !== dateKey) {
        return false
      }

      // Update lastVisible for pagination
      if (predictionsSnapshot.docs.length > 0) {
        this.lastVisible = predictionsSnapshot.docs[predictionsSnapshot.docs.length - 1]
      } else {
        this.hasMore = false
      }

      // Has more only if we got exactly the limit number of documents
      this.hasMore = predictionsSnapshot.docs.length === this.limit

      const newPredictions = predictionsSnapshot.docs.map((doc) => {
        const docData = doc.data()
        const matchInfo = docData.matchInfo
        return this.dataManager.processPredictionData(matchInfo)
      })

      // Append new predictions to existing ones when loading more
      if (this.lastVisible && this.predictions.length > 0 && this.currentTab === dateKey) {
        this.predictions = [...this.predictions, ...newPredictions]
      } else {
        // Replace predictions on initial load
        this.predictions = newPredictions
      }

      // Cache the data on first load or when replacing all data
      if (!this.lastVisible || newPredictions.length === this.predictions.length) {
        this.cacheManager.setCache(dateKey, {
          predictions: this.predictions,
          lastVisible: this.lastVisible,
          hasMore: this.hasMore,
        })
      }

      // After the first page load, we'll always load from DB
      this.initialPageLoad = false

      return true
    } catch (error) {
      console.error("Database error:", error)
      throw new Error("DATABASE_ERROR")
    } finally {
      // Remove this tab from loading tabs
      this.loadingTabs.delete(dateKey)
      this.isLoading = false
    }
  }

  scheduleCacheRefresh() {
    this.cacheManager.scheduleCacheRefresh(() => this.refreshFromServer())
  }

  async refreshFromServer() {
    // Don't refresh if we didn't use cache or we're no longer on the page
    if (!this.cacheManager.getUsedCacheData() || !this.container) return

    // Reset flag
    this.cacheManager.setUsedCacheData(false)

    // Store current predictions to compare later
    const previousPredictions = [...this.predictions]

    // Reset pagination state but keep current tab
    this.lastVisible = null
    this.hasMore = true

    try {
      // Make a fresh request to the server
      await this.loadDatabaseContent()

      // Check if data has changed
      const hasDataChanged = JSON.stringify(previousPredictions) !== JSON.stringify(this.predictions)

      // Only update UI if data has changed
      if (hasDataChanged) {
        // Update the DOM with new predictions
        const predictionsGrid = this.container.querySelector("#predictions-grid")
        if (predictionsGrid) {
          predictionsGrid.innerHTML = this.uiManager.renderPredictionCards(this.predictions)
        }

        // Show toast notification about the update
        window.app.showToast(
          "Predictions data has been refreshed with the latest information.",
          "info", 
          3000
        )
      }

      // Update other UI elements based on hasMore flag
      this.updateLoadMoreUI()
    } catch (error) {
      console.error("Failed to refresh data:", error)
      // Don't show error to user to avoid confusion, since they already have some data
    }
  }

  updateLoadMoreUI() {
    this.uiManager.updateLoadMoreUI(this.container, this.predictions, this.hasMore, this.eventManager)
  }

  getSelectedDate() {
    const selectedTab = this.dates.find((tab) => tab.id === this.currentTab)
    return selectedTab ? selectedTab.date : new Date()
  }

  async getContent() {
    return this.uiManager.getMainContent(this.dates, this.currentTab, this.predictions, this.hasMore)
  }

  async afterContentRender() {
    // Clean up existing event listeners before adding new ones
    this.eventManager.removeAllEventListeners()

    // Set up tab event listeners
    this.eventManager.setupTabListeners(this)

    // Scroll to current tab
    this.uiManager.scrollToCurrentTab(this.container)

    // Set up action buttons
    this.eventManager.setupLoadMoreButton(this)
    this.eventManager.setupScrollToTopButton(this)

    // Update the load more UI after initial render
    this.updateLoadMoreUI()
  }

  async loadMore() {
    const currentTab = this.currentTab

    if (this.isLoading || !this.hasMore || this.loadingTabs.has(currentTab)) return

    const loadMoreBtn = this.container.querySelector("#load-more-btn")
    const predictionsGrid = this.container.querySelector("#predictions-grid")

    if (loadMoreBtn) {
      loadMoreBtn.disabled = true
      loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...'
    }

    try {
      // Record current prediction count before loading more
      const previousCount = this.predictions.length
      const previousTab = this.currentTab

      // Load more predictions
      await this.loadDatabaseContent()

      // Only update UI if we're still on the same tab
      if (previousTab !== this.currentTab) {
        // We've switched tabs, don't update UI
        return
      }

      // Get the new items count
      const newItemsCount = this.predictions.length - previousCount

      if (predictionsGrid && newItemsCount > 0) {
        // Only render the new predictions that were just loaded
        const newPredictionsHtml = this.predictions
          .slice(previousCount)
          .map((prediction) => this.uiManager.renderSinglePredictionCard(prediction))
          .join("")

        predictionsGrid.innerHTML += newPredictionsHtml
      }

      this.updateLoadMoreUI()

      // Restore button state after successful load
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false
        loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Load More'
      }
    } catch (error) {
      console.error("Load more error:", error)
      
      // Show error toast notification
      window.app.showToast(
        "Failed to fetch more predictions. Please try again later.",
        "error",
        5000
      )

      // Re-enable the button on error
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false
        loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Load More'
      }
    }
  }

  refresh() {
    // Only reset if we've switched tabs
    const previousTab = this.lastRefreshedTab
    this.lastRefreshedTab = this.currentTab

    // Get UI elements
    const predictionsGrid = this.container.querySelector("#predictions-grid")
    const loadMoreBtn = this.container.querySelector("#load-more-btn")
    const noMoreResults = this.container.querySelector("#no-more-results")
    const noResults = this.container.querySelector("#no-results")
    const actionButtonsContainer = this.container.querySelector("#action-buttons-container")

    // Clear loading state on buttons
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false
      loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Load More'
    }

    // Ensure we're at the top of the content
    window.scrollTo({
      top: 0,
      behavior: "auto",
    })

    // Show loading state
    if (predictionsGrid) {
      predictionsGrid.innerHTML = this.getLoadingSkeletonCards(6)
    }

    // Reset UI visibility while loading
    if (actionButtonsContainer) actionButtonsContainer.style.display = "none"
    if (noMoreResults) noMoreResults.style.display = "none"
    if (noResults) noResults.style.display = "none"

    // Load data and update UI
    this.loadDatabaseContent()
      .then((success) => {
        // Only update if we're still on the same tab
        if (this.currentTab !== this.lastRefreshedTab) {
          return
        }

        if (predictionsGrid) {
          predictionsGrid.innerHTML = this.uiManager.renderPredictionCards(this.predictions)
        }

        this.updateLoadMoreUI()
      })
      .catch((error) => {
        console.error("Error loading data:", error)
        if (predictionsGrid) {
          predictionsGrid.innerHTML =
            '<div class="error-message">Failed to load predictions. Please try again later.</div>'
        }
        
        // Show error toast notification
        window.app.showToast(
          "Failed to load predictions data", 
          "error", 
          5000,
          "Loading Error"
        )
      })
  }

  destroy() {
    // Clear all timeouts
    if (this.skeletonTimeout) {
      clearTimeout(this.skeletonTimeout)
      this.skeletonTimeout = null
    }

    this.cacheManager.clearTimeouts()

    // Remove all event listeners
    this.eventManager.removeAllEventListeners()

    // Clear tracking collections
    this.loadingTabs.clear()
    this.activeTabRequests.clear()

    super.destroy()
  }
}