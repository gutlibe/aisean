export class UI {
  constructor(page) {
    this.page = page
  }

  getSkeletonTemplate() {
    return `
      <div class="exp-skeleton-container">
        <div class="exp-date-picker-skeleton pulse"></div>
        <div class="exp-table-skeleton pulse"></div>
      </div>
    `
  }

  getContent() {
    const datePicker = this.renderDatePicker()
    let matchesContent = this.renderMatchesContent()

    return `
      <div class="exp-page-container">
        ${datePicker}
        ${matchesContent}
      </div>
    `
  }

  renderDatePicker() {
    return `
      <div class="exp-date-picker">
        <button class="exp-date-nav" id="prevDate">
          <i class="fas fa-chevron-left"></i>
        </button>
        <div class="exp-date-display">
          <input type="date" id="dateSelector" value="${this.page.formattedDate}">
          <span class="exp-date-label">${this.page.formatDateForDisplay(this.page.formattedDate)}</span>
        </div>
        <button class="exp-date-nav" id="nextDate">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `
  }

  renderMatchesContent() {
    if (this.page.matches.length === 0) {
      return this.renderEmptyState()
    } else {
      return this.renderMatchesTable()
    }
  }

  renderEmptyState() {
    return `
      <div class="exp-empty-state">
        <i class="fas fa-futbol"></i>
        <h3>No predictions for this date</h3>
        <p>Add your first match prediction to get started.</p>
        <button class="btn btn-primary exp-add-btn" id="emptyStateAddBtn">
          <i class="fas fa-plus"></i> Add Match
        </button>
      </div>
    `
  }

  renderMatchesTable() {
    return `
      <div class="exp-table-container">
        <table class="exp-matches-table">
          <thead>
            <tr>
              <th>Match</th>
              <th>Time</th>
              <th>Status</th>
              <th>Result</th>
              <th>1X2</th>
              <th>Double Chance</th>
              <th>Both Score</th>
              <th>Goals</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.page.matches.map((match) => this.renderMatchRow(match)).join("")}
          </tbody>
        </table>
      </div>
    `
  }

  renderMatchRow(match) {
    const { matchInfo, marketData } = match

    const classicCell = this.formatMarketCell(marketData?.classic)
    const doubleChanceCell = this.formatMarketCell(marketData?.doubleChance)
    const ggCell = this.formatGGCell(marketData?.gg)
    const goalsCell = this.formatGoalsCell(marketData?.goals)

    const resultCell = matchInfo.result
      ? `<span class="exp-match-result">${matchInfo.result}</span>`
      : '<span class="exp-no-result">-</span>'

    return `
      <tr data-id="${match.id}">
        <td class="exp-match-teams">
          <div class="exp-team-names">
            <span class="exp-home-team">${this.page.escapeHtml(matchInfo.home_team)}</span>
            <span class="exp-vs">vs</span>
            <span class="exp-away-team">${this.page.escapeHtml(matchInfo.away_team)}</span>
          </div>
        </td>
        <td>${this.page.formatTime(matchInfo.start_time)}</td>
        <td>
          <span class="exp-status ${matchInfo.status === "postponed" ? "exp-postponed" : ""}">
            ${matchInfo.status || "scheduled"}
          </span>
        </td>
        <td>${resultCell}</td>
        <td>${classicCell}</td>
        <td>${doubleChanceCell}</td>
        <td>${ggCell}</td>
        <td>${goalsCell}</td>
        <td class="exp-actions">
          <button class="btn btn-icon exp-edit-btn" data-id="${match.id}" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-icon exp-delete-btn" data-id="${match.id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `
  }

  formatMarketCell(marketData) {
    if (!marketData) return '<span class="exp-no-data">-</span>'

    return `
      <div class="exp-market-cell ${this.getStatusClass(marketData.status)}">
        <div class="exp-prediction-value">${marketData.prediction || "-"}</div>
        <div class="exp-odd-value">${marketData.odd || "-"}</div>
        <div class="exp-status-badge">${marketData.status || "pending"}</div>
      </div>
    `
  }

  formatGGCell(ggData) {
    if (!ggData) return '<span class="exp-no-data">-</span>'

    const ggValue = ggData.prediction === true ? "Yes" : "No"

    return `
      <div class="exp-market-cell ${this.getStatusClass(ggData.status)}">
        <div class="exp-prediction-value">${ggValue}</div>
        <div class="exp-odd-value">${ggData.odd || "-"}</div>
        <div class="exp-status-badge">${ggData.status || "pending"}</div>
      </div>
    `
  }

  formatGoalsCell(goalsData) {
    if (!goalsData) return '<span class="exp-no-data">-</span>'

    return `
      <div class="exp-market-cell ${this.getStatusClass(goalsData.status)}">
        <div class="exp-prediction-value">${goalsData.type || ""} ${goalsData.prediction || "-"}</div>
        <div class="exp-odd-value">${goalsData.odd || "-"}</div>
        <div class="exp-status-badge">${goalsData.status || "pending"}</div>
      </div>
    `
  }

  getStatusClass(status) {
    if (!status || status === "pending") return "exp-status-pending"
    if (status === "won") return "exp-status-won"
    if (status === "lost") return "exp-status-lost"
    if (status === "postponed") return "exp-status-postponed"
    return ""
  }

  showAddMatchModal() {
    const modalHtml = this.getMatchModalHtml()

    const modalOverlay = document.createElement("div")
    modalOverlay.className = "exp-modal-overlay"

    const modalContainer = document.createElement("div")
    modalContainer.className = "exp-modal"
    modalContainer.innerHTML = modalHtml

    modalOverlay.appendChild(modalContainer)
    document.body.appendChild(modalOverlay)

    this.setupMarketToggles(modalContainer)

    const cancelBtn = modalContainer.querySelector("#cancelMatchBtn")
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay)
    })

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        document.body.removeChild(modalOverlay)
      }
    })

    const form = modalContainer.querySelector("#matchForm")
    form.addEventListener("submit", async (e) => {
      e.preventDefault()

      const saveBtn = form.querySelector("#saveMatchBtn")
      this.setButtonLoading(saveBtn, true)

      const matchData = this.collectFormData(form)

      try {
        if (this.page.editingMatchId) {
          await this.page.updateMatch(this.page.editingMatchId, matchData)
          this.page.editingMatchId = null
        } else {
          await this.page.saveNewMatch(matchData)
        }
        document.body.removeChild(modalOverlay)
      } catch (error) {
        console.error("Error saving match:", error)
      } finally {
        this.setButtonLoading(saveBtn, false)
      }
    })
  }

  getMatchModalHtml() {
    return `
      <div class="modal-content exp-match-modal">
        <h2>Add Match Prediction</h2>
        <form id="matchForm">
          <div class="exp-form-section">
            <h3>Match Information</h3>
            
            <div class="exp-form-row">
              <div class="form-group">
                <label for="homeTeam">Home Team *</label>
                <input type="text" id="homeTeam" required>
              </div>
              
              <div class="form-group">
                <label for="awayTeam">Away Team *</label>
                <input type="text" id="awayTeam" required>
              </div>
            </div>
            
            <div class="exp-form-row">
              <div class="form-group">
                <label for="startTime">Start Time *</label>
                <input type="time" id="startTime" required>
              </div>
              
              <div class="form-group">
                <label for="matchStatus">Match Status</label>
                <select id="matchStatus">
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="postponed">Postponed</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="matchResult">Result (if known)</label>
              <input type="text" id="matchResult" placeholder="e.g. 2-1">
            </div>
          </div>
          
          <div class="exp-form-section">
            <h3>Market Predictions</h3>
            
            <!-- Classic (1X2) prediction -->
            <div class="exp-market-form">
              <div class="exp-market-header">
                <label class="exp-checkbox">
                  <input type="checkbox" id="classicEnabled" class="exp-market-toggle">
                  <span>1X2 Prediction</span>
                </label>
              </div>
              
              <div class="exp-market-inputs" id="classicInputs" style="display: none;">
                <div class="exp-form-row">
                  <div class="form-group">
                    <label for="classicPrediction">Prediction</label>
                    <select id="classicPrediction">
                      <option value="1">1 (Home Win)</option>
                      <option value="X">X (Draw)</option>
                      <option value="2">2 (Away Win)</option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label for="classicOdd">Odd</label>
                    <input type="number" id="classicOdd" min="1" step="0.01">
                  </div>
                  
                  <div class="form-group">
                    <label for="classicStatus">Status</label>
                    <select id="classicStatus">
                      <option value="pending">Pending</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="postponed">Postponed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Double Chance prediction -->
            <div class="exp-market-form">
              <div class="exp-market-header">
                <label class="exp-checkbox">
                  <input type="checkbox" id="doubleChanceEnabled" class="exp-market-toggle">
                  <span>Double Chance Prediction</span>
                </label>
              </div>
              
              <div class="exp-market-inputs" id="doubleChanceInputs" style="display: none;">
                <div class="exp-form-row">
                  <div class="form-group">
                    <label for="doubleChancePrediction">Prediction</label>
                    <select id="doubleChancePrediction">
                      <option value="1X">1X (Home Win or Draw)</option>
                      <option value="12">12 (Home or Away Win)</option>
                      <option value="X2">X2 (Draw or Away Win)</option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label for="doubleChanceOdd">Odd</label>
                    <input type="number" id="doubleChanceOdd" min="1" step="0.01">
                  </div>
                  
                  <div class="form-group">
                    <label for="doubleChanceStatus">Status</label>
                    <select id="doubleChanceStatus">
                      <option value="pending">Pending</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="postponed">Postponed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Both Teams to Score (GG) prediction -->
            <div class="exp-market-form">
              <div class="exp-market-header">
                <label class="exp-checkbox">
                  <input type="checkbox" id="ggEnabled" class="exp-market-toggle">
                  <span>Both Teams to Score</span>
                </label>
              </div>
              
              <div class="exp-market-inputs" id="ggInputs" style="display: none;">
                <div class="exp-form-row">
                  <div class="form-group">
                    <label for="ggPrediction">Prediction</label>
                    <select id="ggPrediction">
                      <option value="true">Yes (Both Score)</option>
                      <option value="false">No (Not Both Score)</option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label for="ggOdd">Odd</label>
                    <input type="number" id="ggOdd" min="1" step="0.01">
                  </div>
                  
                  <div class="form-group">
                    <label for="ggStatus">Status</label>
                    <select id="ggStatus">
                      <option value="pending">Pending</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="postponed">Postponed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Goals prediction -->
            <div class="exp-market-form">
              <div class="exp-market-header">
                <label class="exp-checkbox">
                  <input type="checkbox" id="goalsEnabled" class="exp-market-toggle">
                  <span>Goals Prediction</span>
                </label>
              </div>
              
              <div class="exp-market-inputs" id="goalsInputs" style="display: none;">
                <div class="exp-form-row">
                  <div class="form-group">
                    <label for="goalsType">Type</label>
                    <select id="goalsType">
                      <option value="over">Over</option>
                      <option value="under">Under</option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label for="goalsPrediction">Value</label>
                    <select id="goalsPrediction">
                      <option value="0.5">0.5</option>
                      <option value="1.5">1.5</option>
                      <option value="2.5" selected>2.5</option>
                      <option value="3.5">3.5</option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label for="goalsOdd">Odd</label>
                    <input type="number" id="goalsOdd" min="1" step="0.01">
                  </div>
                  
                  <div class="form-group">
                    <label for="goalsStatus">Status</label>
                    <select id="goalsStatus">
                      <option value="pending">Pending</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="postponed">Postponed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-text" id="cancelMatchBtn">Cancel</button>
            <button type="submit" class="btn btn-primary exp-add-btn" id="saveMatchBtn">Save Prediction</button>
          </div>
        </form>
      </div>
    `
  }

  setupMarketToggles(container) {
    const toggles = container.querySelectorAll(".exp-market-toggle")
    toggles.forEach((toggle) => {
      const marketId = toggle.id.replace("Enabled", "")
      const inputsDiv = container.querySelector(`#${marketId}Inputs`)

      inputsDiv.style.display = toggle.checked ? "block" : "none"

      toggle.addEventListener("change", () => {
        inputsDiv.style.display = toggle.checked ? "block" : "none"
      })
    })
  }

  collectFormData(form) {
    const matchInfo = {
      home_team: form.querySelector("#homeTeam").value,
      away_team: form.querySelector("#awayTeam").value,
      start_time: form.querySelector("#startTime").value,
      status: form.querySelector("#matchStatus").value,
    }

    const result = form.querySelector("#matchResult").value
    if (result) {
      matchInfo.result = result
    }

    const marketData = {}

    if (form.querySelector("#classicEnabled").checked) {
      marketData.classic = {
        prediction: form.querySelector("#classicPrediction").value,
        odd: Number.parseFloat(form.querySelector("#classicOdd").value) || null,
        status: form.querySelector("#classicStatus").value,
      }
    }

    if (form.querySelector("#doubleChanceEnabled").checked) {
      marketData.doubleChance = {
        prediction: form.querySelector("#doubleChancePrediction").value,
        odd: Number.parseFloat(form.querySelector("#doubleChanceOdd").value) || null,
        status: form.querySelector("#doubleChanceStatus").value,
      }
    }

    if (form.querySelector("#ggEnabled").checked) {
      marketData.gg = {
        prediction: form.querySelector("#ggPrediction").value === "true",
        odd: Number.parseFloat(form.querySelector("#ggOdd").value) || null,
        status: form.querySelector("#ggStatus").value,
      }
    }

    if (form.querySelector("#goalsEnabled").checked) {
      marketData.goals = {
        type: form.querySelector("#goalsType").value,
        prediction: Number.parseFloat(form.querySelector("#goalsPrediction").value),
        odd: Number.parseFloat(form.querySelector("#goalsOdd").value) || null,
        status: form.querySelector("#goalsStatus").value,
      }
    }

    return {
      matchInfo,
      marketData: Object.keys(marketData).length > 0 ? marketData : null,
    }
  }

  populateEditForm(match) {
    const modal = document.querySelector(".exp-modal")
    if (!modal) return

    const { matchInfo, marketData } = match

    modal.querySelector("#homeTeam").value = matchInfo.home_team || ""
    modal.querySelector("#awayTeam").value = matchInfo.away_team || ""
    modal.querySelector("#startTime").value = matchInfo.start_time || ""
    modal.querySelector("#matchStatus").value = matchInfo.status || "scheduled"
    modal.querySelector("#matchResult").value = matchInfo.result || ""

    if (marketData) {
      if (marketData.classic) {
        modal.querySelector("#classicEnabled").checked = true
        modal.querySelector("#classicPrediction").value = marketData.classic.prediction || "1"
        modal.querySelector("#classicOdd").value = marketData.classic.odd || ""
        modal.querySelector("#classicStatus").value = marketData.classic.status || "pending"
        modal.querySelector("#classicInputs").style.display = "block"
      }

      if (marketData.doubleChance) {
        modal.querySelector("#doubleChanceEnabled").checked = true
        modal.querySelector("#doubleChancePrediction").value = marketData.doubleChance.prediction || "1X"
        modal.querySelector("#doubleChanceOdd").value = marketData.doubleChance.odd || ""
        modal.querySelector("#doubleChanceStatus").value = marketData.doubleChance.status || "pending"
        modal.querySelector("#doubleChanceInputs").style.display = "block"
      }

      if (marketData.gg) {
        modal.querySelector("#ggEnabled").checked = true
        modal.querySelector("#ggPrediction").value = marketData.gg.prediction.toString()
        modal.querySelector("#ggOdd").value = marketData.gg.odd || ""
        modal.querySelector("#ggStatus").value = marketData.gg.status || "pending"
        modal.querySelector("#ggInputs").style.display = "block"
      }

      if (marketData.goals) {
        modal.querySelector("#goalsEnabled").checked = true
        modal.querySelector("#goalsType").value = marketData.goals.type || "over"
        modal.querySelector("#goalsPrediction").value = marketData.goals.prediction.toString()
        modal.querySelector("#goalsOdd").value = marketData.goals.odd || ""
        modal.querySelector("#goalsStatus").value = marketData.goals.status || "pending"
        modal.querySelector("#goalsInputs").style.display = "block"
      }
    }
  }

  showDeleteConfirmation(matchId) {
    const match = this.page.matches.find((m) => m.id === matchId)
    if (!match) return

    const modalOverlay = document.createElement("div")
    modalOverlay.className = "exp-modal-overlay"

    const modalContainer = document.createElement("div")
    modalContainer.className = "exp-modal exp-confirm-modal"

    const homeTeam = match.matchInfo.home_team
    const awayTeam = match.matchInfo.away_team

    modalContainer.innerHTML = `
      <div class="modal-content">
        <h2>Delete Prediction</h2>
        <p>Are you sure you want to delete the prediction for ${homeTeam} vs ${awayTeam}?</p>
        <div class="form-actions">
          <button type="button" class="btn btn-text" id="cancelDeleteBtn">Cancel</button>
          <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
        </div>
      </div>
    `

    modalOverlay.appendChild(modalContainer)
    document.body.appendChild(modalOverlay)

    const cancelBtn = modalContainer.querySelector("#cancelDeleteBtn")
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(modalOverlay)
    })

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        document.body.removeChild(modalOverlay)
      }
    })

    const confirmBtn = modalContainer.querySelector("#confirmDeleteBtn")
    confirmBtn.addEventListener("click", async () => {
      this.setButtonLoading(confirmBtn, true)
      await this.page.deleteMatch(matchId)
      this.setButtonLoading(confirmBtn, false)
      document.body.removeChild(modalOverlay)
    })
  }

  setButtonLoading(button, isLoading) {
    if (isLoading) {
      const originalText = button.innerHTML
      button.setAttribute("data-original-text", originalText)
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'
      button.disabled = true
    } else {
      const originalText = button.getAttribute("data-original-text")
      if (originalText) {
        button.innerHTML = originalText
      }
      button.disabled = false
    }
  }
}

// Test the UI module
console.log("UI module loaded successfully");