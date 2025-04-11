/**
 * Event-related functionality for the Panel page
 */

// Setup all event listeners
export function setupEventListeners(page) {
  // Handle window resize events
  window.addEventListener("resize", () => handleResize(page))

  // Handle theme changes
  document.addEventListener("themechange", () => handleThemeChange(page))

  // Setup free tab events
  setupFreeTab(page)

  // Setup error handling for navigation interruptions
  handleNavigationInterruptions()
}

/**
 * Handle window resize events
 */
function handleResize(page) {
  // Adjust table container heights
  const tableContainers = page.container.querySelectorAll(".pnl-table-container")
  tableContainers.forEach((container) => {
    const viewportHeight = window.innerHeight
    const containerTop = container.getBoundingClientRect().top
    const maxHeight = viewportHeight - containerTop - 50 // 50px buffer
    container.style.maxHeight = `${Math.max(300, maxHeight)}px`
  })
}

/**
 * Handle theme changes
 */
function handleThemeChange(page) {
  // Update progress bars based on theme
  const progressBars = page.container.querySelectorAll(".pnl-progress-bar")
  const isDarkTheme = document.documentElement.getAttribute("data-theme")?.includes("dark")

  progressBars.forEach((bar) => {
    bar.classList.toggle("pnl-dark", isDarkTheme)
  })
}

/**
 * Handle navigation interruptions
 */
function handleNavigationInterruptions() {
  // Handle navigation errors
  window.addEventListener("error", (event) => {
    if (event?.error?.message === "NAVIGATION_INTERRUPTED") {
      event.preventDefault()
      return true
    }
  })

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    if (event?.reason?.message === "NAVIGATION_INTERRUPTED") {
      event.preventDefault()
      return true
    }
  })
}

/**
 * Setup free tab event listeners
 */
function setupFreeTab(page) {
  // Date input
  setupInputListener(page, "#pnl-free-date", "change", (e) => {
    page.state.queryDate = e.target.value
  })

  // Match ID search
  setupInputListener(page, "#pnl-match-id", "input", (e) => {
    page.state.searchMatchId = e.target.value.trim()
  })

  // Button event listeners
  setupButtonListeners(page, {
    "#pnl-search-match": () => searchMatchById(page),
    "#pnl-load-pro": () => loadProPredictions(page),
    "#pnl-load-free": () => loadFreePredictions(page),
    "#pnl-add-to-free": () => showAddToFreeConfirmation(page),
    "#pnl-update-results": () => updateProResults(page),
    "#pnl-update-free-results": () => updateFreeResults(page),
    "#pnl-remove-from-free": () => showRemoveFromFreeConfirmation(page),
  })

  // Checkbox listeners
  setupCheckboxListeners(page)
}

/**
 * Setup input event listener with error handling
 */
function setupInputListener(page, selector, event, handler) {
  const element = page.container.querySelector(selector)
  if (element) {
    element.addEventListener(event, handler)
  }
}

/**
 * Setup multiple button event listeners
 */
function setupButtonListeners(page, buttonMap) {
  Object.entries(buttonMap).forEach(([selector, handler]) => {
    const button = page.container.querySelector(selector)
    if (button) {
      button.addEventListener("click", handler)
    }
  })
}

// Export the setupCheckboxListeners function so it can be used elsewhere
export function setupCheckboxListeners(page) {
  // Pro predictions select all
  setupSelectAllCheckbox(page, "#pnl-select-all-pro", ".pnl-match-checkbox", "selectedMatches", [
    "#pnl-add-to-free",
    "#pnl-update-results",
  ])

  // Free predictions select all
  setupSelectAllCheckbox(page, "#pnl-select-all-free", ".pnl-free-match-checkbox", "freeSelectedMatches", [
    "#pnl-remove-from-free",
    "#pnl-update-free-results",
  ])

  // Individual pro match checkboxes
  setupIndividualCheckboxes(page, ".pnl-match-checkbox", "selectedMatches", "#pnl-select-all-pro", [
    "#pnl-add-to-free",
    "#pnl-update-results",
  ])

  // Individual free match checkboxes
  setupIndividualCheckboxes(page, ".pnl-free-match-checkbox", "freeSelectedMatches", "#pnl-select-all-free", [
    "#pnl-remove-from-free",
    "#pnl-update-free-results",
  ])
}

/**
 * Setup select all checkbox functionality
 */
function setupSelectAllCheckbox(page, selectAllSelector, checkboxSelector, stateKey, buttonSelectors) {
  const selectAllCheckbox = page.container.querySelector(selectAllSelector)
  if (!selectAllCheckbox) return

  selectAllCheckbox.addEventListener("change", () => {
    const isChecked = selectAllCheckbox.checked
    const checkboxes = page.container.querySelectorAll(checkboxSelector)

    checkboxes.forEach((checkbox) => {
      checkbox.checked = isChecked
      const id = checkbox.dataset.id

      if (isChecked && !page.state[stateKey].includes(id)) {
        page.state[stateKey].push(id)
      } else if (!isChecked) {
        page.state[stateKey] = page.state[stateKey].filter((matchId) => matchId !== id)
      }
    })

    // Update button states
    updateButtonStates(page, buttonSelectors, page.state[stateKey].length > 0)
  })
}

/**
 * Setup individual checkbox functionality
 */
function setupIndividualCheckboxes(page, checkboxSelector, stateKey, selectAllSelector, buttonSelectors) {
  const checkboxes = page.container.querySelectorAll(checkboxSelector)
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.dataset.id

      if (checkbox.checked && !page.state[stateKey].includes(id)) {
        page.state[stateKey].push(id)
      } else if (!checkbox.checked) {
        page.state[stateKey] = page.state[stateKey].filter((matchId) => matchId !== id)
      }

      // Update select all checkbox
      const allCheckboxes = page.container.querySelectorAll(checkboxSelector)
      const allChecked = Array.from(allCheckboxes).every((cb) => cb.checked)
      const selectAllCheckbox = page.container.querySelector(selectAllSelector)

      if (selectAllCheckbox) {
        selectAllCheckbox.checked = allChecked && allCheckboxes.length > 0
      }

      // Update button states
      updateButtonStates(page, buttonSelectors, page.state[stateKey].length > 0)
    })
  })
}

/**
 * Update button states based on selection
 */
function updateButtonStates(page, buttonSelectors, enabled) {
  buttonSelectors.forEach((selector) => {
    const button = page.container.querySelector(selector)
    if (button) {
      button.disabled = !enabled
    }
  })
}

/**
 * Search for a match by ID
 */
async function searchMatchById(page) {
  if (!page.state.searchMatchId) {
    window.app.showToast("Please enter a match ID", "warning")
    return
  }

  setButtonLoading(page, "#pnl-search-match", true)

  try {
    const firebase = window.app.getLibrary("firebase")
    const matchId = page.state.searchMatchId
    const date = page.state.queryDate

    // Search in pro predictions first
    const proDocRef = firebase.doc(firebase.firestore, `predictions_pro/football/dates/${date}/matches/${matchId}`)
    const proDocSnap = await firebase.getDoc(proDocRef)

    if (proDocSnap.exists()) {
      const matchData = proDocSnap.data().matchInfo
      page.state.queryResults = [matchData]
      page.state.selectedMatches = []
      window.app.showToast("Match found in Pro predictions", "success")
    } else {
      // If not found in pro, search in free predictions
      const freeDocRef = firebase.doc(firebase.firestore, `predictions/football/dates/${date}/matches/${matchId}`)
      const freeDocSnap = await firebase.getDoc(freeDocRef)

      if (freeDocSnap.exists()) {
        const matchData = freeDocSnap.data().matchInfo
        page.state.freePredictions = [matchData]
        page.state.freeSelectedMatches = []
        window.app.showToast("Match found in Free predictions", "success")
      } else {
        window.app.showToast("Match not found for the selected date", "error")
        page.state.queryResults = []
        page.state.freePredictions = []
      }
    }
  } catch (error) {
    console.error("Error searching for match:", error)
    window.app.showToast("Error searching for match", "error")
  } finally {
    setButtonLoading(page, "#pnl-search-match", false)
    page.refresh()
  }
}

/**
 * Load Pro predictions
 */
async function loadProPredictions(page) {
  setButtonLoading(page, "#pnl-load-pro", true)

  try {
    const firebase = window.app.getLibrary("firebase")
    const date = page.state.queryDate

    // Query pro predictions
    const proQuery = firebase.collection(firebase.firestore, `predictions_pro/football/dates/${date}/matches`)
    const proQuerySnapshot = await firebase.getDocs(proQuery)

    if (proQuerySnapshot.empty) {
      page.state.queryResults = []
      window.app.showToast("No Pro predictions found for the selected date", "warning")
    } else {
      const matches = []
      let lastUpdated = null

      proQuerySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.matchInfo) {
          matches.push(data.matchInfo)

          // Track the most recent update timestamp
          const updateTime = new Date(data.matchInfo.last_update_at)
          if (!lastUpdated || updateTime > lastUpdated) {
            lastUpdated = updateTime
          }
        }
      })

      page.state.queryResults = matches
      page.state.lastUpdated = lastUpdated
      page.state.selectedMatches = []

      window.app.showToast(`Loaded ${matches.length} Pro predictions`, "success")
    }
  } catch (error) {
    console.error("Error loading Pro predictions:", error)
    window.app.showToast("Error loading Pro predictions", "error")
  } finally {
    setButtonLoading(page, "#pnl-load-pro", false)
    page.refresh()
  }
}

/**
 * Load Free predictions
 */
async function loadFreePredictions(page) {
  setButtonLoading(page, "#pnl-load-free", true)

  try {
    const firebase = window.app.getLibrary("firebase")
    const date = page.state.queryDate

    // Query free predictions
    const freeQuery = firebase.collection(firebase.firestore, `predictions/football/dates/${date}/matches`)
    const freeQuerySnapshot = await firebase.getDocs(freeQuery)

    if (freeQuerySnapshot.empty) {
      page.state.freePredictions = []
      window.app.showToast("No Free predictions found for the selected date", "warning")
    } else {
      const matches = []

      freeQuerySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.matchInfo) {
          matches.push(data.matchInfo)
        }
      })

      page.state.freePredictions = matches
      page.state.freeSelectedMatches = []

      window.app.showToast(`Loaded ${matches.length} Free predictions`, "success")
    }
  } catch (error) {
    console.error("Error loading Free predictions:", error)
    window.app.showToast("Error loading Free predictions", "error")
  } finally {
    setButtonLoading(page, "#pnl-load-free", false)
    page.refresh()
  }
}

/**
 * Show confirmation dialog for adding to free predictions
 */
function showAddToFreeConfirmation(page) {
  if (page.state.selectedMatches.length === 0) {
    window.app.showToast("No matches selected", "warning")
    return
  }

  const modalHtml = `
    <div class="pnl-modal-content">
      <h2><i class="fas fa-plus-circle pnl-success-icon"></i> Add to Free Predictions</h2>
      <p>Are you sure you want to add ${page.state.selectedMatches.length} selected matches to Free predictions?</p>
      <div class="pnl-modal-actions">
        <button class="pnl-btn pnl-btn-text" id="pnl-cancel-add">Cancel</button>
        <button class="pnl-btn pnl-btn-primary" id="pnl-confirm-add">Add to Free</button>
      </div>
    </div>
  `

  const modal = page.getModalManager().showModal(modalHtml)

  modal.querySelector("#pnl-cancel-add").addEventListener("click", () => {
    page.getModalManager().closeModal()
  })

  modal.querySelector("#pnl-confirm-add").addEventListener("click", () => {
    page.getModalManager().closeModal()
    addSelectedToFree(page)
  })
}

// Replace the existing addSelectedToFree function with this improved version
async function addSelectedToFree(page) {
  setButtonLoading(page, "#pnl-add-to-free", true)

  try {
    const firebase = window.app.getLibrary("firebase")
    const date = page.state.queryDate
    const selectedIds = page.state.selectedMatches

    // Get selected matches from pro predictions using a more robust method
    const selectedMatches = []
    for (const id of selectedIds) {
      const match = page.state.queryResults.find((m) => m.id === id || m.docId === id)
      if (match) {
        selectedMatches.push(match)
      }
    }

    if (selectedMatches.length === 0) {
      window.app.showToast("No valid matches found to add", "error")
      return
    }

    // Process in batches for Firestore limits
    const BATCH_SIZE = 100
    let totalAdded = 0

    for (let i = 0; i < selectedMatches.length; i += BATCH_SIZE) {
      const batch = firebase.writeBatch(firebase.firestore)
      const currentBatch = selectedMatches.slice(i, i + BATCH_SIZE)

      currentBatch.forEach((match) => {
        // Use the match ID or docId, whichever is available
        const matchId = match.id || match.docId
        if (!matchId) return

        // Clear pro-specific fields before adding to free
        const cleanMatch = { ...match }
        delete cleanMatch.docId // Remove the docId we added
        delete cleanMatch.proSpecificField // Add any pro-only fields to delete

        const docRef = firebase.doc(firebase.firestore, `predictions/football/dates/${date}/matches/${matchId}`)

        batch.set(docRef, {
          matchInfo: cleanMatch,
          last_updated: firebase.serverTimestamp(),
        })
      })

      await batch.commit()
      totalAdded += currentBatch.length

      // Update progress without full refresh
      page.state.uploadProgress = Math.floor((i / selectedMatches.length) * 100)
      page.updateFreeTable()
    }

    window.app.showToast(`Successfully added ${totalAdded} matches to Free predictions`, "success")

    // Refresh only free predictions
    await loadFreePredictions(page)
    page.state.selectedMatches = []
    page.updateProTable()
  } catch (error) {
    console.error("Error adding to Free predictions:", error)
    window.app.showToast("Error adding to Free predictions: " + error.message, "error")
  } finally {
    setButtonLoading(page, "#pnl-add-to-free", false)
  }
}

/**
 * Update results for Pro predictions
 */
function updateProResults(page) {
  if (page.state.selectedMatches.length === 0) {
    window.app.showToast("No matches selected", "warning")
    return
  }

  if (page.state.selectedMatches.length > 1) {
    window.app.showToast("Please select only one match to update", "warning")
    return
  }

  const matchId = page.state.selectedMatches[0]
  const match = page.state.queryResults.find((m) => m.id === matchId)

  if (!match) {
    window.app.showToast("Selected match not found", "error")
    return
  }

  showUpdateResultModal(page, match, "pro")
}

/**
 * Update results for Free predictions
 */
function updateFreeResults(page) {
  setButtonLoading(page, "#pnl-update-free-results", true)

  try {
    // Get the date
    const date = page.state.queryDate

    // Automatically update all free predictions with data from pro predictions
    syncFreeWithProResults(page, date).then(() => {
      window.app.showToast("Free prediction results updated successfully", "success")
      loadFreePredictions(page)
    })
  } catch (error) {
    console.error("Error updating free results:", error)
    window.app.showToast("Error updating free results", "error")
    setButtonLoading(page, "#pnl-update-free-results", false)
  }
}

// Also fix the syncFreeWithProResults function to properly update free predictions
async function syncFreeWithProResults(page, date) {
  const firebase = window.app.getLibrary("firebase")

  try {
    // Get all free predictions
    const freeQuery = firebase.collection(firebase.firestore, `predictions/football/dates/${date}/matches`)
    const freeSnapshot = await firebase.getDocs(freeQuery)

    if (freeSnapshot.empty) {
      window.app.showToast("No free predictions to update", "warning")
      return
    }

    const updates = []
    const batchSize = 100
    let processed = 0

    // Process each free prediction document
    for (const freeDoc of freeSnapshot.docs) {
      // Get the corresponding pro prediction
      const proDocRef = firebase.doc(firebase.firestore, `predictions_pro/football/dates/${date}/matches/${freeDoc.id}`)
      const proDoc = await firebase.getDoc(proDocRef)

      if (proDoc.exists()) {
        const proData = proDoc.data().matchInfo
        updates.push({
          id: freeDoc.id,
          result: proData.result,
          status: proData.status,
          last_update_at: proData.last_update_at,
        })
      }
    }

    // Apply updates in batches
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = firebase.writeBatch(firebase.firestore)
      const batchUpdates = updates.slice(i, i + batchSize)

      batchUpdates.forEach((update) => {
        const docRef = firebase.doc(firebase.firestore, `predictions/football/dates/${date}/matches/${update.id}`)
        batch.update(docRef, {
          "matchInfo.result": update.result,
          "matchInfo.status": update.status,
          "matchInfo.last_update_at": update.last_update_at,
        })
      })

      await batch.commit()
      processed += batchUpdates.length
      page.state.uploadProgress = Math.floor((processed / updates.length) * 100)
      page.updateFreeTable()
    }

    window.app.showToast(`Synced ${processed} match results from Pro`, "success")
    return processed
  } catch (error) {
    console.error("Sync error:", error)
    window.app.showToast("Sync failed: " + error.message, "error")
    throw error
  }
}

/**
 * Show update result modal
 */
function showUpdateResultModal(page, match, type = "pro") {
  const modalHtml = `
    <div class="pnl-modal-content">
      <h2><i class="fas fa-edit pnl-warning-icon"></i> Update Match Result</h2>
      <p>Updating result for: ${match.home_team} vs ${match.away_team}</p>
      
      <div class="pnl-form-group">
        <label for="pnl-match-result" class="pnl-label">Result (e.g., "2-1")</label>
        <input type="text" id="pnl-match-result" class="pnl-input" value="${match.result || ""}" placeholder="e.g., 2-1">
      </div>
      
      <div class="pnl-form-group">
        <label for="pnl-match-status" class="pnl-label">Status</label>
        <select id="pnl-match-status" class="pnl-select">
          <option value="pending" ${match.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="won" ${match.status === "won" ? "selected" : ""}>Won</option>
          <option value="lost" ${match.status === "lost" ? "selected" : ""}>Lost</option>
          <option value="postponed" ${match.status === "postponed" ? "selected" : ""}>Postponed</option>
        </select>
      </div>
      
      <div class="pnl-modal-actions">
        <button class="pnl-btn pnl-btn-text" id="pnl-cancel-update">Cancel</button>
        <button class="pnl-btn pnl-btn-warning" id="pnl-confirm-update">Update</button>
      </div>
    </div>
  `

  const modal = page.getModalManager().showModal(modalHtml)

  modal.querySelector("#pnl-cancel-update").addEventListener("click", () => {
    page.getModalManager().closeModal()
  })

  modal.querySelector("#pnl-confirm-update").addEventListener("click", () => {
    const result = modal.querySelector("#pnl-match-result").value.trim()
    const status = modal.querySelector("#pnl-match-status").value

    page.getModalManager().closeModal()
    updateMatchResult(page, match.id, result, status, type)
  })
}

/**
 * Update match result in database
 */
async function updateMatchResult(page, matchId, result, status, type = "pro") {
  const buttonSelector = type === "pro" ? "#pnl-update-results" : "#pnl-update-free-results"
  setButtonLoading(page, buttonSelector, true)

  try {
    const firebase = window.app.getLibrary("firebase")
    const date = page.state.queryDate
    const timestamp = new Date().toISOString()

    // Update in pro predictions
    const proDocRef = firebase.doc(firebase.firestore, `predictions_pro/football/dates/${date}/matches/${matchId}`)
    const proDocSnapshot = await firebase.getDoc(proDocRef)

    if (proDocSnapshot.exists()) {
      await firebase.updateDoc(proDocRef, {
        "matchInfo.result": result,
        "matchInfo.status": status,
        "matchInfo.last_update_at": timestamp,
      })
    }

    // Update in free predictions
    const freeDocRef = firebase.doc(firebase.firestore, `predictions/football/dates/${date}/matches/${matchId}`)
    const freeDocSnap = await firebase.getDoc(freeDocRef)

    if (freeDocSnap.exists()) {
      await firebase.updateDoc(freeDocRef, {
        "matchInfo.result": result,
        "matchInfo.status": status,
        "matchInfo.last_update_at": timestamp,
      })
    }

    window.app.showToast("Match result updated successfully", "success")

    // Reload data based on which tab we're in
    if (type === "pro") {
      await loadProPredictions(page)
    } else {
      await loadFreePredictions(page)
    }
  } catch (error) {
    console.error("Error updating match result:", error)
    window.app.showToast("Error updating match result", "error")
  } finally {
    setButtonLoading(page, buttonSelector, false)
  }
}

/**
 * Show confirmation dialog for removing from free predictions
 */
function showRemoveFromFreeConfirmation(page) {
  if (page.state.freeSelectedMatches.length === 0) {
    window.app.showToast("No matches selected", "warning")
    return
  }

  const modalHtml = `
    <div class="pnl-modal-content">
      <h2><i class="fas fa-exclamation-triangle pnl-warning-icon"></i> Remove from Free Predictions</h2>
      <p>Are you sure you want to remove ${page.state.freeSelectedMatches.length} selected matches from Free predictions?</p>
      <p class="pnl-modal-warning">This action cannot be undone!</p>
      <div class="pnl-modal-actions">
        <button class="pnl-btn pnl-btn-text" id="pnl-cancel-remove">Cancel</button>
        <button class="pnl-btn pnl-btn-danger" id="pnl-confirm-remove">Remove</button>
      </div>
    </div>
  `

  const modal = page.getModalManager().showModal(modalHtml)

  modal.querySelector("#pnl-cancel-remove").addEventListener("click", () => {
    page.getModalManager().closeModal()
  })

  modal.querySelector("#pnl-confirm-remove").addEventListener("click", () => {
    page.getModalManager().closeModal()
    removeFromFree(page)
  })
}

/**
 * Remove selected predictions from free predictions
 */
async function removeFromFree(page) {
  setButtonLoading(page, "#pnl-remove-from-free", true)

  try {
    const firebase = window.app.getLibrary("firebase")
    const date = page.state.queryDate
    const idsToRemove = page.state.freeSelectedMatches

    // Delete in batches
    const BATCH_SIZE = 100
    let totalRemoved = 0

    for (let i = 0; i < idsToRemove.length; i += BATCH_SIZE) {
      const batch = firebase.writeBatch(firebase.firestore)
      const currentBatch = idsToRemove.slice(i, i + BATCH_SIZE)

      currentBatch.forEach((id) => {
        const docRef = firebase.doc(firebase.firestore, `predictions/football/dates/${date}/matches/${id}`)
        batch.delete(docRef)
      })

      await batch.commit()
      totalRemoved += currentBatch.length
    }

    window.app.showToast(`Successfully removed ${totalRemoved} matches from Free predictions`, "success")

    // Reset selected matches
    page.state.freeSelectedMatches = []

    // Reload free predictions
    await loadFreePredictions(page)
  } catch (error) {
    console.error("Error removing from Free predictions:", error)
    window.app.showToast("Error removing from Free predictions", "error")
  } finally {
    setButtonLoading(page, "#pnl-remove-from-free", false)
  }
}

/**
 * Set button loading state
 */
function setButtonLoading(page, selector, isLoading) {
  const button = page.container.querySelector(selector)
  if (!button) return

  if (isLoading) {
    const originalText = button.innerHTML
    button.setAttribute("data-original-text", originalText)
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading...`
    button.disabled = true
  } else {
    const originalText = button.getAttribute("data-original-text")
    if (originalText) {
      button.innerHTML = originalText
    }
    button.disabled = false
  }
}

