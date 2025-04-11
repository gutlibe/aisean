export class FootballUIManager {
  constructor(page) {
    this.page = page
  }

  getSkeletonTemplate(dates) {
    return `
      <div class="spt-page">
        <div class="spt-tabs-container">
          <div class="spt-tabs-scroll">
            ${dates
              .map(
                (tab) =>
                  `<div class="spt-tab ${tab.type === "today" ? "spt-tab-active spt-tab-today" : ""} spt-tab-${tab.type}">
                    <span class="spt-tab-label">${tab.label}</span>
                    ${tab.type === "today" ? '<span class="spt-tab-indicator"></span>' : ""}
                  </div>`,
              )
              .join("")}
          </div>
        </div>
        <div class="spt-content">
          <div class="spt-grid">
            ${this.getLoadingSkeletonCards(6)}
          </div>
        </div>
      </div>`
  }

  getLoadingSkeletonCards(count = 3) {
    const createSkeletonCard = () => `
      <div class="spt-prediction-card skeleton-card">
        <div class="skeleton-header"></div>
        <div class="skeleton-match">
          <div class="skeleton-teams"></div>
          <div class="skeleton-score"></div>
          <div class="skeleton-status"></div>
        </div>
        <div class="skeleton-outcomes"></div>
      </div>`

    return Array(count)
      .fill("")
      .map(() => createSkeletonCard())
      .join("")
  }

  getMainContent(dates, currentTab, predictions, hasMore) {
    const tabsHtml = this.renderTabs(dates, currentTab)
    const predictionsHtml = this.renderPredictionCards(predictions)

    return `
      <div class="spt-page">
        ${tabsHtml}
        <div class="spt-content">
          <div class="spt-grid" id="predictions-grid">${predictionsHtml}</div>
          
          <div id="action-buttons-container" class="load-more-container" style="display: ${hasMore ? "flex" : "none"};">
            <div class="action-buttons-container">
              <button id="load-more-btn" class="load-more-btn"><i class="fas fa-arrow-down"></i> Load More</button>
              <button id="scroll-to-top-btn" class="scroll-top-btn"><i class="fas fa-arrow-up"></i> Top</button>
            </div>
          </div>
          
          <div id="no-more-results" class="no-more-results" style="display: ${!hasMore && predictions.length > 0 ? "block" : "none"};">
            No more predictions available
          </div>
          <div id="no-results" class="no-more-results" style="display: ${!hasMore && predictions.length === 0 ? "block" : "none"};">
            No predictions available for this date
          </div>
        </div>
      </div>`
  }

  renderTabs(dates, currentTab) {
    return `
      <div class="spt-tabs-container">
        <div class="spt-tabs-scroll">
          ${dates
            .map(
              (tab) =>
                `<div class="spt-tab ${tab.id === currentTab ? "spt-tab-active" : ""} ${tab.type === "today" ? "spt-tab-today" : ""}" data-tab-id="${tab.id}">
                  <span class="spt-tab-label">${tab.label}</span>
                  ${tab.type === "today" ? '<span class="spt-tab-indicator"></span>' : ""}
                </div>`,
            )
            .join("")}
        </div>
      </div>`
  }

  renderPredictionCards(predictions) {
    if (!predictions || predictions.length === 0) {
      return ""
    }

    return predictions.map((prediction) => this.renderSinglePredictionCard(prediction)).join("")
  }

  renderSinglePredictionCard(prediction) {
    const {
      home_team,
      away_team,
      competition_name,
      prediction: appPrediction,
      predictionType,
      odds,
      status,
      start_date,
      id,
      score,
    } = prediction

    const startTime = new Date(start_date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })

    const truncateTeamName = (name, maxLength = 18) =>
      name.length > maxLength ? name.substring(0, maxLength) + "..." : name

    const truncatedHomeTeam = truncateTeamName(home_team)
    const truncatedAwayTeam = truncateTeamName(away_team)

    const getOutcomeClass = (outcome) => {
  let classes = "spt-outcome-odds"
  if (appPrediction === outcome) classes += " spt-prediction"
  if (status === "won" && appPrediction === outcome) classes += " spt-outcome-winner"
  if (status === "pending" && appPrediction === outcome) classes += " spt-prediction-pending"
  if (status === "lost" && appPrediction === outcome) classes += " spt-prediction-lost"
  return classes
}

    const scoreDisplay = score ? `<div class="spt-score">FT: ${score}</div>` : ""

    const defaultOdds = { 1: "-", X: "-", 2: "-", "1X": "-", 12: "-", X2: "-" }
    const safeOdds = odds || defaultOdds

    let outcomeDisplay

    if (predictionType === "doubleChance") {
      outcomeDisplay = `
        <div class="spt-outcomes">
          <div class="spt-outcome">
            <span class="spt-outcome-label">1X</span>
            <span class="${getOutcomeClass("1X")}">${safeOdds["1X"] || "-"}</span>
          </div>
          <div class="spt-outcome">
            <span class="spt-outcome-label">12</span>
            <span class="${getOutcomeClass("12")}">${safeOdds["12"] || "-"}</span>
          </div>
          <div class="spt-outcome">
            <span class="spt-outcome-label">X2</span>
            <span class="${getOutcomeClass("X2")}">${safeOdds["X2"] || "-"}</span>
          </div>
        </div>`
    } else {
      outcomeDisplay = `
        <div class="spt-outcomes">
          <div class="spt-outcome">
            <span class="spt-outcome-label">1</span>
            <span class="${getOutcomeClass("1")}">${safeOdds["1"] || "-"}</span>
          </div>
          <div class="spt-outcome">
            <span class="spt-outcome-label">X</span>
            <span class="${getOutcomeClass("X")}">${safeOdds["X"] || "-"}</span>
          </div>
          <div class="spt-outcome">
            <span class="spt-outcome-label">2</span>
            <span class="${getOutcomeClass("2")}">${safeOdds["2"] || "-"}</span>
          </div>
        </div>`
    }

    return `
      <div class="spt-prediction-card" data-prediction-id="${id}">
        <div class="spt-card-header">
          <div class="spt-league">
            <span class="spt-league-name">${competition_name}</span>
          </div>
        </div>
        <div class="spt-match">
          <div class="spt-teams-container">
            <span class="spt-team-name home">${truncatedHomeTeam}</span>
            <span class="spt-vs">vs</span>
            <span class="spt-team-name away">${truncatedAwayTeam}</span>
          </div>
          ${scoreDisplay}
          <div class="spt-status">${startTime} - ${status.charAt(0).toUpperCase() + status.slice(1)}</div>
        </div>
        ${outcomeDisplay}
      </div>`
  }

  scrollToCurrentTab(container) {
    const tabsContainer = container.querySelector(".spt-tabs-scroll")
    if (!tabsContainer) return

    const activeTab = container.querySelector(".spt-tab-active")
    if (!activeTab) return

    setTimeout(() => {
      const containerWidth = tabsContainer.offsetWidth
      const tabLeft = activeTab.offsetLeft
      const tabWidth = activeTab.offsetWidth

      const scrollPosition = tabLeft - containerWidth / 2 + tabWidth / 2

      tabsContainer.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: "smooth",
      })
    }, 100)
  }

  updateLoadMoreUI(container, predictions, hasMore, eventManager) {
    const actionButtonsContainer = container.querySelector("#action-buttons-container")
    const loadMoreBtn = container.querySelector("#load-more-btn")
    const scrollToTopBtn = container.querySelector("#scroll-to-top-btn")
    const noMoreResults = container.querySelector("#no-more-results")
    const noResults = container.querySelector("#no-results")

    // First handle no results case
    if (predictions.length === 0) {
      if (actionButtonsContainer) actionButtonsContainer.style.display = "none"
      if (noMoreResults) noMoreResults.style.display = "none"
      if (noResults) noResults.style.display = "block"
      return
    }

    // Handle has more results case
    if (hasMore) {
      if (actionButtonsContainer) actionButtonsContainer.style.display = "flex"
      if (loadMoreBtn) loadMoreBtn.style.display = "flex"
      if (noMoreResults) noMoreResults.style.display = "none"
      if (noResults) noResults.style.display = "none"
    } else {
      // No more results but we have some predictions
      if (noMoreResults) noMoreResults.style.display = "block"

      // Even when there are no more results to load, we still want to show the scroll
      // to top button if the page is scrollable
      const isScrollable = document.body.scrollHeight > window.innerHeight

      if (actionButtonsContainer) {
        if (isScrollable) {
          actionButtonsContainer.style.display = "flex"
          // Hide the "Load More" button but keep the "Scroll to Top" button
          if (loadMoreBtn) loadMoreBtn.style.display = "none"
          if (scrollToTopBtn) scrollToTopBtn.style.display = "flex"
        } else {
          actionButtonsContainer.style.display = "none"
        }
      }
    }

    // Show/hide scroll to top button based on scrollability
    if (scrollToTopBtn) {
      const isScrollable = document.body.scrollHeight > window.innerHeight
      const hasScrolled = window.scrollY > 300 // Only show after scrolling down a bit
      scrollToTopBtn.style.display = isScrollable && hasScrolled ? "flex" : "none"
    }

    // Also update on scroll to handle dynamic content height changes
    const handleScroll = () => {
      if (scrollToTopBtn) {
        const isScrollable = document.body.scrollHeight > window.innerHeight
        const hasScrolled = window.scrollY > 300 // Only show after scrolling down a bit
        scrollToTopBtn.style.display = isScrollable && hasScrolled ? "flex" : "none"
      }
    }

    // Add scroll event listener with cleanup tracking
    window.removeEventListener("scroll", eventManager.scrollHandler)
    eventManager.scrollHandler = handleScroll
    window.addEventListener("scroll", eventManager.scrollHandler)
    eventManager.eventListeners.push({ element: window, eventType: "scroll", handler: eventManager.scrollHandler })

    // Initial check
    handleScroll()
  }
}

