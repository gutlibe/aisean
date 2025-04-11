// Import the base Page class
import { Page } from "../../../core/page.js"
import { setupApiSection } from "./utils/api.js"
import { setupDatabaseSection } from "./utils/database.js"
import { setupUIComponents } from "./utils/ui.js"
import { setupEventListeners } from "./utils/events.js"

/**
 * Panel Page - Combines API fetching and database functionality
 */
export class PanelPage extends Page {
  constructor() {
    super() // Always call the parent constructor

    // ===== BASIC CONFIGURATION =====
    this.showMenuIcon = true
    this.showBackArrow = true
    this.requiresDatabase = true

    // ===== AUTHENTICATION SETTINGS =====
    this.requiresAuth = true
    this.authorizedUserTypes = ["Admin", "Agent", "pro"]

    // ===== LOADING CONFIGURATION =====
    this.loadingTimeout = 30000 // 30 seconds
    this.maxRetries = 2
    this.retryDelay = 1000

    // ===== STATE MANAGEMENT =====
    this.state = {
      apiKey: localStorage.getItem("footballApiKey") || "",
      selectedDate: this.formatDateForInput(new Date()),
      federation: "",
      predictions: null,
      isLoading: false,
      error: null,
      uploadDate: this.formatDateForInput(new Date()),
      uploadProgress: 0,
      uploadStatus: null,
      queryDate: this.formatDateForInput(new Date()),
      queryStartTime: "",
      queryEndTime: "",
      queryCompetition: "",
      queryStatus: "",
      queryResults: [],
      queryStats: {
        total: 0,
        won: 0,
        lost: 0,
        pending: 0,
        postponed: 0,
      },
      selectedMatches: [],
      activeTab: "fetch", // 'fetch', 'database', or 'free'
      searchMatchId: "",
      freePredictions: [],
      freeSelectedMatches: [],
      lastUpdated: null,
    }

    // Create a modal manager
    this.modalManager = this.createModalManager()
    this.cssFiles = [
      "pages/admin/panel/index.css",
    ]
  }

  /**
   * Create modal manager
   */
  createModalManager() {
    return {
      showModal: (html) => {
        try {
          // Try to use the app's modal manager first
          if (window.app && typeof window.app.getModalManager === "function") {
            return window.app.getModalManager().showModal(html)
          }

          // Fallback to our custom implementation
          const overlay = document.createElement("div")
          overlay.className = "pnl-modal-overlay"

          const modal = document.createElement("div")
          modal.className = "pnl-modal"
          modal.innerHTML = html

          overlay.appendChild(modal)
          document.body.appendChild(overlay)

          return modal
        } catch (error) {
          console.error("Error showing modal:", error)
          // Fallback implementation
          const overlay = document.createElement("div")
          overlay.className = "pnl-modal-overlay"

          const modal = document.createElement("div")
          modal.className = "pnl-modal"
          modal.innerHTML = html

          overlay.appendChild(modal)
          document.body.appendChild(overlay)

          return modal
        }
      },
      closeModal: () => {
        try {
          // Try to use the app's modal manager first
          if (window.app && typeof window.app.getModalManager === "function") {
            return window.app.getModalManager().closeModal()
          }

          // Fallback to our custom implementation
          const overlays = document.querySelectorAll(".pnl-modal-overlay")
          overlays.forEach((overlay) => {
            document.body.removeChild(overlay)
          })
        } catch (error) {
          console.error("Error closing modal:", error)
          // Fallback implementation
          const overlays = document.querySelectorAll(".pnl-modal-overlay")
          overlays.forEach((overlay) => {
            try {
              document.body.removeChild(overlay)
            } catch (e) {
              console.error("Error removing overlay:", e)
            }
          })
        }
      },
    }
  }

  /**
   * Return the page title shown in the header
   */
  getTitle() {
    return "Predictions Panel"
  }

  /**
   * Return the icon class to display next to the page title
   */
  getHeaderIcon() {
    return "fas fa-chart-bar"
  }

  /**
   * Return HTML for the page header action buttons
   */
  getActions() {
    return `
      <button class="btn btn-icon" id="pnl-refresh-btn">
        <i class="fas fa-sync-alt"></i>
      </button>
    `
  }

  /**
   * Return skeleton template HTML shown during initial loading
   */
  getSkeletonTemplate() {
    return `
      <div class="pnl-skeleton-container">
        <div class="pnl-skeleton-tabs">
          <div class="pnl-skeleton-tab pulse"></div>
          <div class="pnl-skeleton-tab pulse"></div>
        </div>
        <div class="pnl-skeleton-card pulse"></div>
        <div class="pnl-skeleton-card pulse"></div>
      </div>
    `
  }

  /**
   * Asynchronously load data from database
   */
  async loadDatabaseContent() {
    try {
      // Get Firebase access from the app
      const firebase = window.app.getLibrary("firebase")
      return true
    } catch (error) {
      console.error("Error initializing database connection:", error)
      throw new Error("DATABASE_ERROR")
    }
  }

  /**
   * Return the main page content HTML
   */
  async getContent() {
    return `
      <div class="pnl-container">
        <!-- Tabs Navigation -->
        <div class="pnl-tabs">
          <button class="pnl-tab ${this.state.activeTab === "fetch" ? "pnl-active" : ""}" data-tab="fetch">
            <i class="fas fa-cloud-download-alt"></i> Fetch Predictions
          </button>
          <button class="pnl-tab ${this.state.activeTab === "database" ? "pnl-active" : ""}" data-tab="database">
            <i class="fas fa-database"></i> Pro Predictions
          </button>
          <button class="pnl-tab ${this.state.activeTab === "free" ? "pnl-active" : ""}" data-tab="free">
            <i class="fas fa-users"></i> Free Predictions
          </button>
        </div>
        
        <!-- Tab Content -->
        <div class="pnl-tab-content">
          <!-- Fetch Predictions Tab -->
          <div class="pnl-tab-pane ${this.state.activeTab === "fetch" ? "pnl-active" : ""}" id="pnl-fetch-tab">
            ${this.renderFetchTab()}
          </div>
          
          <!-- Database Management Tab -->
          <div class="pnl-tab-pane ${this.state.activeTab === "database" ? "pnl-active" : ""}" id="pnl-database-tab">
            ${this.renderDatabaseTab()}
          </div>
          
          <!-- Free Predictions Tab -->
          <div class="pnl-tab-pane ${this.state.activeTab === "free" ? "pnl-active" : ""}" id="pnl-free-tab">
            ${this.renderFreeTab()}
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render the Fetch Predictions tab content
   */
  renderFetchTab() {
    return `
      <div class="pnl-card">
        <div class="pnl-card-header">
          <h3 class="pnl-card-title">Fetch Football Predictions</h3>
        </div>
        <div class="pnl-card-body">
          <div class="pnl-form-group">
            <label for="pnl-api-key" class="pnl-label">API Key</label>
            <input type="text" id="pnl-api-key" class="pnl-input" 
              value="${this.escapeHtml(this.state.apiKey)}" 
              placeholder="Enter your RapidAPI key">
          </div>
          
          <div class="pnl-form-row">
            <div class="pnl-form-group">
              <label for="pnl-date" class="pnl-label">Select Date</label>
              <div class="pnl-date-control">
                <button class="pnl-date-nav-btn" id="pnl-prev-day">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <input type="date" id="pnl-date" class="pnl-input" 
                  value="${this.state.selectedDate}">
                <button class="pnl-date-nav-btn" id="pnl-next-day">
                  <i class="fas fa-chevron-right"></i>
                </button>
                <button class="pnl-date-nav-btn" id="pnl-today">
                  <i class="fas fa-calendar-day"></i>
                </button>
              </div>
            </div>
            
            <div class="pnl-form-group">
              <label for="pnl-federation" class="pnl-label">Federation (Optional)</label>
              <select id="pnl-federation" class="pnl-select">
                <option value="">All Federations</option>
                <option value="UEFA" ${this.state.federation === "UEFA" ? "selected" : ""}>UEFA - Europe</option>
                <option value="CONMEBOL" ${this.state.federation === "CONMEBOL" ? "selected" : ""}>CONMEBOL - South America</option>
                <option value="AFC" ${this.state.federation === "AFC" ? "selected" : ""}>AFC - Asia</option>
                <option value="CAF" ${this.state.federation === "CAF" ? "selected" : ""}>CAF - Africa</option>
                <option value="CONCACAF" ${this.state.federation === "CONCACAF" ? "selected" : ""}>CONCACAF - North & Central America</option>
                <option value="OFC" ${this.state.federation === "OFC" ? "selected" : ""}>OFC - Oceania</option>
                <option value="FIFA" ${this.state.federation === "FIFA" ? "selected" : ""}>FIFA - Global</option>
                <option value="NON-FIFA" ${this.state.federation === "NON-FIFA" ? "selected" : ""}>NON-FIFA - Unofficial/Regional</option>
              </select>
            </div>
          </div>
          
          <div class="pnl-form-actions">
            <button id="pnl-fetch-btn" class="pnl-btn pnl-btn-primary">
              <i class="fas fa-download"></i> Fetch Predictions
            </button>
          </div>
          
          ${
            this.state.isLoading
              ? `
              <div class="pnl-progress-container">
                <div class="pnl-progress">
                  <div class="pnl-progress-bar pnl-progress-indeterminate"></div>
                </div>
                <p class="pnl-progress-text">Fetching predictions...</p>
              </div>
            `
              : ""
          }
          
          ${
            this.state.error
              ? `
              <div class="pnl-error-message">
                <i class="fas fa-exclamation-circle"></i> ${this.escapeHtml(this.state.error)}
              </div>
            `
              : ""
          }
        </div>
      </div>
      
      ${this.renderPredictionStats()}
      
      ${this.renderPredictionsTable()}
    `
  }

  /**
   * Render prediction statistics
   */
  renderPredictionStats() {
    if (!this.state.predictions) return ""

    const predictions = this.state.predictions.data || []
    const homeWins = predictions.filter((p) => p.prediction === "1").length
    const awayWins = predictions.filter((p) => p.prediction === "2").length
    const draws = predictions.filter((p) => p.prediction === "X").length
    const homeDraws = predictions.filter((p) => p.prediction === "1X").length
    const awayDraws = predictions.filter((p) => p.prediction === "X2").length
    const homeAways = predictions.filter((p) => p.prediction === "12").length

    const pending = predictions.filter((p) => p.status === "pending").length
    const won = predictions.filter((p) => p.status === "won").length
    const lost = predictions.filter((p) => p.status === "lost").length
    const postponed = predictions.filter((p) => p.status === "postponed").length

    return `
      <div class="pnl-stats-grid">
        <div class="pnl-stat-card">
          <div class="pnl-stat-value">${predictions.length}</div>
          <div class="pnl-stat-label">Total Predictions</div>
          <div class="pnl-stat-date">For: ${this.formatDateForDisplay(this.state.selectedDate)}</div>
          <div class="pnl-stat-updated">Last updated: ${this.formatDateTime(this.state.predictions.last_update_at || new Date())}</div>
        </div>
        <div class="pnl-stat-card">
          <div class="pnl-stat-value">${homeWins}</div>
          <div class="pnl-stat-label">Home Win (1)</div>
        </div>
        <div class="pnl-stat-card">
          <div class="pnl-stat-value">${awayWins}</div>
          <div class="pnl-stat-label">Away Win (2)</div>
        </div>
        <div class="pnl-stat-card">
          <div class="pnl-stat-value">${draws}</div>
          <div class="pnl-stat-label">Draw (X)</div>
        </div>
        <div class="pnl-stat-card">
          <div class="pnl-stat-value">${homeDraws + awayDraws + homeAways}</div>
          <div class="pnl-stat-label">Double Chance</div>
        </div>
        <div class="pnl-stat-card pnl-stat-pending">
          <div class="pnl-stat-value">${pending}</div>
          <div class="pnl-stat-label">Pending</div>
        </div>
        <div class="pnl-stat-card pnl-stat-won">
          <div class="pnl-stat-value">${won}</div>
          <div class="pnl-stat-label">Won</div>
        </div>
        <div class="pnl-stat-card pnl-stat-lost">
          <div class="pnl-stat-value">${lost}</div>
          <div class="pnl-stat-label">Lost</div>
        </div>
        <div class="pnl-stat-card pnl-stat-postponed">
          <div class="pnl-stat-value">${postponed}</div>
          <div class="pnl-stat-label">Postponed</div>
        </div>
      </div>
    `
  }

  /**
   * Format match status into HTML
   */
  formatStatus(status) {
    if (!status) return "-"

    const statusLower = status.toLowerCase()
    switch (statusLower) {
      case "won":
        return '<span class="pnl-status pnl-status-won">Won</span>'
      case "lost":
        return '<span class="pnl-status pnl-status-lost">Lost</span>'
      case "pending":
        return '<span class="pnl-status pnl-status-pending">Pending</span>'
      case "postponed":
        return '<span class="pnl-status pnl-status-postponed">Postponed</span>'
      default:
        return `<span class="pnl-status">${this.escapeHtml(status)}</span>`
    }
  }

  /**
   * Render predictions table
   */
  renderPredictionsTable() {
    if (!this.state.predictions) return ""

    const predictions = this.state.predictions.data || []

    // Add upload progress indicator if uploading
    const uploadProgressHtml =
      this.state.isLoading && this.state.uploadProgress > 0
        ? `
        <div class="pnl-upload-progress">
          <div class="pnl-upload-progress-text">Uploading predictions: ${this.state.uploadProgress}%</div>
          <div class="pnl-upload-progress-bar-container">
            <div class="pnl-upload-progress-bar" style="width: ${this.state.uploadProgress}%"></div>
          </div>
        </div>
      `
        : ""

    return `
      <div class="pnl-card">
        <div class="pnl-card-header">
          <h3 class="pnl-card-title">Prediction Results</h3>
          <div class="pnl-card-actions">
            <button id="pnl-download-json" class="pnl-btn pnl-btn-success">
              <i class="fas fa-file-download"></i> Download JSON
            </button>
            <button id="pnl-upload-db" class="pnl-btn pnl-btn-primary">
              <i class="fas fa-upload"></i> Upload to Database
            </button>
          </div>
        </div>
        <div class="pnl-card-body">
          ${uploadProgressHtml}
          <div class="pnl-table-container">
            <table class="pnl-table" id="pnl-predictions-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date & Time</th>
                  <th>Home Team</th>
                  <th>Away Team</th>
                  <th>Competition</th>
                  <th>Prediction</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${predictions
                  .map(
                    (prediction) => `
                    <tr>
                      <td>${prediction.id}</td>
                      <td>${this.formatDateTime(prediction.start_date)}</td>
                      <td>${this.escapeHtml(prediction.home_team)}</td>
                      <td>${this.escapeHtml(prediction.away_team)}</td>
                      <td>${this.escapeHtml(prediction.competition_name)}</td>
                      <td>${this.formatPrediction(prediction.prediction)}</td>
                      <td>${this.formatStatus(prediction.status)}</td>
                    </tr>
                  `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render the Database Management tab content
   */
  renderDatabaseTab() {
    return `
      <div class="pnl-card">
        <div class="pnl-card-header">
          <h3 class="pnl-card-title">Query Predictions</h3>
        </div>
        <div class="pnl-card-body">
          <div class="pnl-form-row">
            <div class="pnl-form-group">
              <label for="pnl-query-date" class="pnl-label">Date</label>
              <input type="date" id="pnl-query-date" class="pnl-input" 
                value="${this.state.queryDate}">
            </div>
            
            <div class="pnl-form-group">
              <label for="pnl-start-time" class="pnl-label">Start Time (optional)</label>
              <input type="time" id="pnl-start-time" class="pnl-input" 
                value="${this.state.queryStartTime}">
            </div>
            
            <div class="pnl-form-group">
              <label for="pnl-end-time" class="pnl-label">End Time (optional)</label>
              <input type="time" id="pnl-end-time" class="pnl-input" 
                value="${this.state.queryEndTime}">
            </div>
          </div>
          
          <div class="pnl-form-row">
            <div class="pnl-form-group">
              <label for="pnl-competition" class="pnl-label">Competition (optional)</label>
              <input type="text" id="pnl-competition" class="pnl-input" 
                value="${this.escapeHtml(this.state.queryCompetition)}" 
                placeholder="Enter competition name">
            </div>
            
            <div class="pnl-form-group">
              <label for="pnl-status" class="pnl-label">Prediction Status</label>
              <select id="pnl-status" class="pnl-select">
                <option value="">All</option>
                <option value="won" ${this.state.queryStatus === "won" ? "selected" : ""}>Won</option>
                <option value="lost" ${this.state.queryStatus === "lost" ? "selected" : ""}>Lost</option>
                <option value="postponed" ${this.state.queryStatus === "postponed" ? "selected" : ""}>Postponed</option>
                <option value="pending" ${this.state.queryStatus === "pending" ? "selected" : ""}>Pending</option>
              </select>
            </div>
          </div>
          
          <div class="pnl-form-actions">
            <button id="pnl-query-btn" class="pnl-btn pnl-btn-primary">
              <i class="fas fa-search"></i> Query Predictions
            </button>
          </div>
        </div>
      </div>
      
      ${this.renderQueryStats()}
      
      ${this.renderQueryResultsTable()}
    `
  }

  /**
   * Render query statistics
   */
  renderQueryStats() {
    if (this.state.queryResults.length === 0) return ""

    const { total, won, lost, pending, postponed } = this.state.queryStats

    return `
      <div class="pnl-stats-grid">
        <div class="pnl-stat-card">
          <div class="pnl-stat-value">${total}</div>
          <div class="pnl-stat-label">Total Matches</div>
          <div class="pnl-stat-date">For: ${this.formatDateForDisplay(this.state.queryDate)}</div>
        </div>
        <div class="pnl-stat-card pnl-stat-won">
          <div class="pnl-stat-value">${won}</div>
          <div class="pnl-stat-label">Won</div>
        </div>
        <div class="pnl-stat-card pnl-stat-lost">
          <div class="pnl-stat-value">${lost}</div>
          <div class="pnl-stat-label">Lost</div>
        </div>
        <div class="pnl-stat-card pnl-stat-pending">
          <div class="pnl-stat-value">${pending + postponed}</div>
          <div class="pnl-stat-label">Pending/Postponed</div>
        </div>
      </div>
    `
  }

  /**
   * Render query results table
   */
  renderQueryResultsTable() {
    if (this.state.queryResults.length === 0) return ""

    return `
      <div class="pnl-card">
        <div class="pnl-card-header">
          <h3 class="pnl-card-title">Query Results</h3>
          <div class="pnl-card-actions">
          <button id="pnl-download-query" class="pnl-btn pnl-btn-success">
            <i class="fas fa-file-download"></i> Download Results
          </button>
          <button id="pnl-add-to-free" class="pnl-btn pnl-btn-primary" ${this.state.selectedMatches.length === 0 ? "disabled" : ""}>
            <i class="fas fa-plus"></i> Add to Free
          </button>
          <button id="pnl-delete-selected" class="pnl-btn pnl-btn-danger" disabled>
            <i class="fas fa-trash-alt"></i> Delete Selected
          </button>
        </div>
        </div>
        <div class="pnl-card-body">
          <div class="pnl-table-container">
            <table class="pnl-table" id="pnl-query-table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" id="pnl-select-all" class="pnl-checkbox">
                  </th>
                  <th>ID</th>
                  <th>Date & Time</th>
                  <th>Home Team</th>
                  <th>Away Team</th>
                  <th>Competition</th>
                  <th>Prediction</th>
                  <th>Status</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                ${this.state.queryResults
                  .map(
                    (match) => `
                    <tr>
                      <td>
                        <input type="checkbox" class="pnl-match-checkbox" 
                          data-id="${match.id}" ${this.state.selectedMatches.includes(match.id) ? "checked" : ""}>
                      </td>
                      <td>${match.id}</td>
                      <td>${match.startDate} ${match.startTime}</td>
                      <td>${this.escapeHtml(match.home_team)}</td>
                      <td>${this.escapeHtml(match.away_team)}</td>
                      <td>${this.escapeHtml(match.competition_name)}</td>
                      <td>${this.formatPrediction(match.marketData?.classic?.prediction || "")}</td>
                      <td>${this.formatStatus(match.status)}</td>
                      <td>${match.result || "-"}</td>
                    </tr>
                  `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render the Free Predictions tab
   */
  renderFreeTab() {
    return `
    <div class="pnl-card">
      <div class="pnl-card-header">
        <h3 class="pnl-card-title">Manage Free Predictions</h3>
      </div>
      <div class="pnl-card-body">
        <div class="pnl-form-row">
          <div class="pnl-form-group">
            <label for="pnl-free-date" class="pnl-label">Date</label>
            <input type="date" id="pnl-free-date" class="pnl-input" 
              value="${this.state.queryDate}">
          </div>
          
          <div class="pnl-form-group">
            <label for="pnl-match-id" class="pnl-label">Match ID (optional)</label>
            <div class="pnl-search-control">
              <input type="text" id="pnl-match-id" class="pnl-input" 
                value="${this.escapeHtml(this.state.searchMatchId)}" 
                placeholder="Enter match ID">
              <button id="pnl-search-match" class="pnl-btn pnl-btn-primary">
                <i class="fas fa-search"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div class="pnl-form-actions">
          <button id="pnl-load-free" class="pnl-btn pnl-btn-success">
            <i class="fas fa-users"></i> Load Free Predictions
          </button>
          <button id="pnl-update-free-results" class="pnl-btn pnl-btn-warning">
            <i class="fas fa-sync-alt"></i> Sync Results from Pro
          </button>
        </div>
      </div>
    </div>
    
    ${this.renderFreePredictionsTable()}
  `
  }

  /**
   * Update only the Pro table
   */
  updateProTable() {
    const proTable = this.container.querySelector("#pnl-pro-table")
    if (proTable) {
      proTable.closest(".pnl-card-body").innerHTML = this.renderProPredictionsTable()
      // Use the setupIndividualCheckboxes function directly instead of setupMatchCheckboxes
      const checkboxes = this.container.querySelectorAll(".pnl-match-checkbox")
      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const id = checkbox.dataset.id
          if (checkbox.checked && !this.state.selectedMatches.includes(id)) {
            this.state.selectedMatches.push(id)
          } else if (!checkbox.checked) {
            this.state.selectedMatches = this.state.selectedMatches.filter((matchId) => matchId !== id)
          }

          // Update button states
          const addToFreeBtn = this.container.querySelector("#pnl-add-to-free")
          const updateResultsBtn = this.container.querySelector("#pnl-update-results")
          if (addToFreeBtn) addToFreeBtn.disabled = this.state.selectedMatches.length === 0
          if (updateResultsBtn) updateResultsBtn.disabled = this.state.selectedMatches.length === 0
        })
      })
    }
  }

  /**
   * Update only the Free table
   */
  updateFreeTable() {
    const freeTable = this.container.querySelector("#pnl-free-table")
    if (freeTable) {
      freeTable.closest(".pnl-card-body").innerHTML = this.renderFreePredictionsTable()
      // Use inline checkbox setup instead of relying on external function
      const checkboxes = this.container.querySelectorAll(".pnl-free-match-checkbox")
      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const id = checkbox.dataset.id
          if (checkbox.checked && !this.state.freeSelectedMatches.includes(id)) {
            this.state.freeSelectedMatches.push(id)
          } else if (!checkbox.checked) {
            this.state.freeSelectedMatches = this.state.freeSelectedMatches.filter((matchId) => matchId !== id)
          }

          // Update button states
          const removeFromFreeBtn = this.container.querySelector("#pnl-remove-from-free")
          const updateFreeResultsBtn = this.container.querySelector("#pnl-update-free-results")
          if (removeFromFreeBtn) removeFromFreeBtn.disabled = this.state.freeSelectedMatches.length === 0
          if (updateFreeResultsBtn) updateFreeResultsBtn.disabled = this.state.freeSelectedMatches.length === 0
        })
      })
    }
  }

  /**
   * Optimized refresh for query results
   */
  refreshQueryResults() {
    const querySection = this.container.querySelector("#pnl-database-tab")
    if (querySection) {
      querySection.innerHTML = this.renderDatabaseTab()
      setupDatabaseSection(this)
    }
  }

  /**
   * Render Pro predictions table
   */
  renderProPredictionsTable() {
    if (this.state.queryResults.length === 0) return ""

    return `
    <div class="pnl-table-container">
      <table class="pnl-table" id="pnl-pro-table">
        <thead>
          <tr>
            <th>
              <input type="checkbox" id="pnl-select-all-pro" class="pnl-checkbox">
            </th>
            <th>ID</th>
            <th>Date & Time</th>
            <th>Home Team</th>
            <th>Away Team</th>
            <th>Competition</th>
            <th>Prediction</th>
            <th>Status</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${this.state.queryResults
            .map(
              (match) => `
              <tr>
                <td>
                  <input type="checkbox" class="pnl-match-checkbox" 
                    data-id="${match.id || match.docId}" ${this.state.selectedMatches.includes(match.id || match.docId) ? "checked" : ""}>
                </td>
                <td>${match.id || match.docId}</td>
                <td>${match.startDate || ""} ${match.startTime || ""}</td>
                <td class="pnl-nowrap">${this.escapeHtml(match.home_team)}</td>
                <td class="pnl-nowrap">${this.escapeHtml(match.away_team)}</td>
                <td class="pnl-nowrap">${this.escapeHtml(match.competition_name)}</td>
                <td>${this.formatPrediction(match.marketData?.classic?.prediction || "")}</td>
                <td>${this.formatStatus(match.status)}</td>
                <td>${match.result || "-"}</td>
              </tr>
            `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
  }

  /**
   * Render Free predictions table
   */
  renderFreePredictionsTable() {
    if (this.state.freePredictions.length === 0) return ""

    return `
      <div class="pnl-card">
        <div class="pnl-card-header">
          <h3 class="pnl-card-title">Free Predictions</h3>
          <div class="pnl-card-actions">
            <button id="pnl-remove-from-free" class="pnl-btn pnl-btn-danger" ${this.state.freeSelectedMatches.length === 0 ? "disabled" : ""}>
              <i class="fas fa-trash-alt"></i> Remove Selected
            </button>
            <button id="pnl-update-free-results" class="pnl-btn pnl-btn-warning">
              <i class="fas fa-sync-alt"></i> Update Results
            </button>
          </div>
        </div>
        <div class="pnl-card-body">
          <div class="pnl-table-container">
            <table class="pnl-table" id="pnl-free-table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" id="pnl-select-all-free" class="pnl-checkbox">
                  </th>
                  <th>ID</th>
                  <th>Date & Time</th>
                  <th>Home Team</th>
                  <th>Away Team</th>
                  <th>Competition</th>
                  <th>Prediction</th>
                  <th>Odds</th>
                  <th>Status</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                ${this.state.freePredictions
                  .map(
                    (match) => `
                    <tr>
                      <td>
                        <input type="checkbox" class="pnl-free-match-checkbox" 
                          data-id="${match.id}" ${this.state.freeSelectedMatches.includes(match.id) ? "checked" : ""}>
                      </td>
                      <td>${match.id}</td>
                      <td>${match.startDate} ${match.startTime}</td>
                      <td class="pnl-nowrap">${this.escapeHtml(match.home_team)}</td>
                      <td class="pnl-nowrap">${this.escapeHtml(match.away_team)}</td>
                      <td class="pnl-nowrap">${this.escapeHtml(match.competition_name)}</td>
                      <td>${this.formatPrediction(match.marketData?.classic?.prediction || "")}</td>
                      <td>${this.formatOdds(match.marketData?.classic?.odds || {})}</td>
                      <td>${this.formatStatus(match.status)}</td>
                      <td>${match.result || "-"}</td>
                    </tr>
                  `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Called after structure is rendered but before content
   */
  async afterStructureRender() {
    // Always call parent method first
    await super.afterStructureRender()

    // Setup for structure-level elements
    const refreshBtn = this.container.querySelector("#pnl-refresh-btn")
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refresh())
    }
  }

  /**
   * Called after content is fully rendered
   */
  async afterContentRender() {
    try {
      // Setup tab switching
      const tabs = this.container.querySelectorAll(".pnl-tab")
      tabs.forEach((tab) => {
        tab.addEventListener("click", (e) => {
          const tabName = e.currentTarget.dataset.tab
          this.switchTab(tabName)
        })
      })

      // Setup API section
      setupApiSection(this)

      // Setup Database section
      setupDatabaseSection(this)

      // Setup UI components
      setupUIComponents(this)

      // Setup event listeners
      setupEventListeners(this)
    } catch (error) {
      console.error("Error in afterContentRender:", error)
      this.state.error = `Error initializing UI: ${error.message}`
      this.refresh()
    }
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    try {
      // Store previous tab for potential cleanup
      const previousTab = this.state.activeTab

      // Set new active tab
      this.state.activeTab = tabName

      // Update tab buttons
      const tabs = this.container.querySelectorAll(".pnl-tab")
      tabs.forEach((tab) => {
        if (tab.dataset.tab === tabName) {
          tab.classList.add("pnl-active")
        } else {
          tab.classList.remove("pnl-active")
        }
      })

      // Update tab panes
      const tabPanes = this.container.querySelectorAll(".pnl-tab-pane")
      tabPanes.forEach((pane) => {
        if (pane.id === `pnl-${tabName}-tab`) {
          pane.classList.add("pnl-active")
        } else {
          pane.classList.remove("pnl-active")
        }
      })

      // When switching to the free tab, ensure free predictions are loaded
      if (tabName === "free" && previousTab !== "free" && this.state.freePredictions.length === 0) {
        const loadFreeBtn = this.container.querySelector("#pnl-load-free")
        if (loadFreeBtn) {
          setTimeout(() => {
            loadFreeBtn.click()
          }, 100)
        }
      }
    } catch (error) {
      console.error("Error switching tabs:", error)
      window.app.showToast("Error switching tabs", "error")
    }
  }

  /**
   * Format date for input fields
   */
  formatDateForInput(date) {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  /**
   * Format date for display
   */
  formatDateForDisplay(dateString) {
    const date = new Date(dateString)
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    return date.toLocaleDateString(undefined, options)
  }

  /**
   * Format date and time from ISO string
   */
  formatDateTime(isoString) {
    if (!isoString) return "N/A"
    try {
      const date = new Date(isoString)
      const dateStr = date.toLocaleDateString()
      const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      return `${dateStr} ${timeStr}`
    } catch (error) {
      console.warn("Error formatting datetime:", error)
      return isoString || "N/A"
    }
  }

  /**
   * Format prediction display
   */
  formatPrediction(prediction) {
    if (!prediction) return "-"

    switch (prediction) {
      case "1":
        return '<span class="pnl-prediction pnl-home-win">Home Win (1)</span>'
      case "2":
        return '<span class="pnl-prediction pnl-away-win">Away Win (2)</span>'
      case "X":
        return '<span class="pnl-prediction pnl-draw">Draw (X)</span>'
      case "1X":
        return '<span class="pnl-prediction pnl-home-draw">Home/Draw (1X)</span>'
      case "X2":
        return '<span class="pnl-prediction pnl-away-draw">Draw/Away (X2)</span>'
      case "12":
        return '<span class="pnl-prediction pnl-home-away">Home/Away (12)</span>'
      default:
        return prediction || "-"
    }
  }

  /**
   * Format odds into HTML
   */
  formatOdds(odds) {
    if (!odds || typeof odds !== "object" || Object.keys(odds).length === 0) return "-"

    try {
      // Safely map odds values, checking for null/undefined values
      const prediction = Object.keys(odds)
        .map((key) => {
          const value = odds[key]
          return `${key}: ${value != null && typeof value.toFixed === "function" ? value.toFixed(2) : "-"}`
        })
        .join(", ")

      // Safely get the first odds value
      const firstValue = Object.values(odds)[0]
      const formattedValue =
        firstValue != null && typeof firstValue.toFixed === "function" ? firstValue.toFixed(2) : "-"

      return `<span class="pnl-odds" title="${prediction}">${formattedValue}</span>`
    } catch (error) {
      console.warn("Error formatting odds:", error)
      return "-"
    }
  }

  /**
   * Helper method to safely escape HTML content
   */
  escapeHtml(unsafe) {
    if (!unsafe) return ""
    try {
      return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
    } catch (error) {
      console.warn("Error escaping HTML:", error)
      return ""
    }
  }

  /**
   * Refresh the page
   */
  refresh() {
    try {
      // Save current state to localStorage to avoid loss during navigation
      const stateToSave = { ...this.state }
      delete stateToSave.predictions // Don't save large prediction data
      localStorage.setItem("panelState", JSON.stringify(stateToSave))

      this.currentRenderAttempt = 0
      this.render()
    } catch (error) {
      console.error("Error refreshing page:", error)
      // Try to redraw just the content without a full re-render
      this.getContent().then((content) => {
        if (this.container) {
          this.container.innerHTML = content
          this.afterContentRender()
        }
      })
    }
  }

  /**
   * Get the modal manager
   */
  getModalManager() {
    return this.modalManager
  }

  /**
   * Clean up resources when navigating away from page
   */
  destroy() {
    try {
      // Remove event listeners to prevent memory leaks
      window.removeEventListener("resize", () => {})
      document.removeEventListener("themechange", () => {})

      // Always call parent method first to handle base cleanup
      super.destroy()

      // Clear references to DOM elements
      this.container = null
    } catch (error) {
      console.error("Error destroying page:", error)
    }
  }
}


