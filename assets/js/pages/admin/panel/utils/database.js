/**
 * Database-related functionality for the Panel page
 */

/**
 * Set up Database section event listeners and functionality
 */
export function setupDatabaseSection(page) {
  // Query form inputs
  setupFormInputs(page)

  // Query button
  setupInputListener(page, "#pnl-query-btn", "click", () => {
    queryPredictions(page)
  })

  // Select all checkbox
  setupSelectAllCheckbox(page)

  // Individual match checkboxes
  setupMatchCheckboxes(page)

  // Delete selected button
  setupInputListener(page, "#pnl-delete-selected", "click", () => {
    if (page.state.selectedMatches.length === 0) {
      window.app.showToast("No matches selected for deletion", "warning")
      return
    }

    showDeleteConfirmation(page)
  })

  // Add to free button
  setupInputListener(page, "#pnl-add-to-free", "click", () => {
    if (page.state.selectedMatches.length === 0) {
      window.app.showToast("No matches selected to add to free predictions", "warning")
      return
    }

    showAddToFreeConfirmation(page)
  })

  // Download query results button
  setupInputListener(page, "#pnl-download-query", "click", () => {
    downloadQueryResults(page)
  })
}

/**
 * Setup form input listeners
 */
function setupFormInputs(page) {
  // Query date input
  setupInputListener(page, "#pnl-query-date", "change", (e) => {
    page.state.queryDate = e.target.value
  })

  // Start time input
  setupInputListener(page, "#pnl-start-time", "change", (e) => {
    page.state.queryStartTime = e.target.value
  })

  // End time input
  setupInputListener(page, "#pnl-end-time", "change", (e) => {
    page.state.queryEndTime = e.target.value
  })

  // Competition input
  setupInputListener(page, "#pnl-competition", "change", (e) => {
    page.state.queryCompetition = e.target.value
  })

  // Status select
  setupInputListener(page, "#pnl-status", "change", (e) => {
    page.state.queryStatus = e.target.value
  })
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
 * Setup select all checkbox
 */
function setupSelectAllCheckbox(page) {
  const selectAllCheckbox = page.container.querySelector("#pnl-select-all")
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", () => {
      const isChecked = selectAllCheckbox.checked
      const checkboxes = page.container.querySelectorAll(".pnl-match-checkbox")

      checkboxes.forEach((checkbox) => {
        checkbox.checked = isChecked
        const id = checkbox.dataset.id

        if (isChecked && !page.state.selectedMatches.includes(id)) {
          page.state.selectedMatches.push(id)
        } else if (!isChecked) {
          page.state.selectedMatches = page.state.selectedMatches.filter((matchId) => matchId !== id)
        }
      })

      // Enable/disable delete button
      const deleteBtn = page.container.querySelector("#pnl-delete-selected")
      if (deleteBtn) {
        deleteBtn.disabled = page.state.selectedMatches.length === 0
      }

      // Enable/disable add to free button
      const addToFreeBtn = page.container.querySelector("#pnl-add-to-free")
      if (addToFreeBtn) {
        addToFreeBtn.disabled = page.state.selectedMatches.length === 0
      }
    })
  }
}

/**
 * Setup individual match checkboxes
 */
function setupMatchCheckboxes(page) {
  const matchCheckboxes = page.container.querySelectorAll(".pnl-match-checkbox")
  matchCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.dataset.id

      if (checkbox.checked && !page.state.selectedMatches.includes(id)) {
        page.state.selectedMatches.push(id)
      } else if (!checkbox.checked) {
        page.state.selectedMatches = page.state.selectedMatches.filter((matchId) => matchId !== id)
      }

      // Update select all checkbox
      const allChecked = page.state.selectedMatches.length === page.state.queryResults.length
      const selectAllCheckbox = page.container.querySelector("#pnl-select-all")
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = allChecked && page.state.selectedMatches.length > 0
      }

      // Enable/disable delete button
      const deleteBtn = page.container.querySelector("#pnl-delete-selected")
      if (deleteBtn) {
        deleteBtn.disabled = page.state.selectedMatches.length === 0
      }

      // Enable/disable add to free button
      const addToFreeBtn = page.container.querySelector("#pnl-add-to-free")
      if (addToFreeBtn) {
        addToFreeBtn.disabled = page.state.selectedMatches.length === 0
      }
    })
  })
}

/**
 * Query predictions from the database
 */
async function queryPredictions(page) {
  // Reset UI
  page.state.error = null
  setButtonLoading(page, "#pnl-query-btn", true)
  page.state.selectedMatches = []
  page.refresh()

  // Get query parameters
  const date = page.state.queryDate
  const startTime = page.state.queryStartTime
  const endTime = page.state.queryEndTime
  const competition = page.state.queryCompetition
  const predictionStatus = page.state.queryStatus

  if (!date) {
    page.state.error = "Please select a date"
    setButtonLoading(page, "#pnl-query-btn", false)
    page.refresh()
    return
  }

  try {
    // Get Firebase access from the app
    const firebase = window.app.getLibrary("firebase")

    // Construct the base query using predictions_pro collection
    let query = firebase.collection(firebase.firestore, `predictions_pro/football/dates/${date}/matches`)

    // Apply filters to the Firestore query
    if (predictionStatus) {
      query = firebase.query(query, firebase.where("matchInfo.status", "==", predictionStatus))
    }

    if (startTime) {
      query = firebase.query(query, firebase.where("matchInfo.startTime", ">=", startTime))
    }

    if (endTime) {
      query = firebase.query(query, firebase.where("matchInfo.startTime", "<=", endTime))
    }

    if (competition) {
      query = firebase.query(query, firebase.where("matchInfo.competition_name", "==", competition))
    }

    const querySnapshot = await firebase.getDocs(query)

    if (querySnapshot.empty) {
      page.state.queryResults = []
      page.state.queryStats = {
        total: 0,
        won: 0,
        lost: 0,
        pending: 0,
        postponed: 0,
      }

      window.app.showToast("No matches found for the selected criteria", "warning")
      setButtonLoading(page, "#pnl-query-btn", false)
      page.refresh()
      return
    }

    const matches = []
    let lastUpdated = null

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.matchInfo) {
        // Store the document ID as well
        const matchInfo = {
          ...data.matchInfo,
          docId: doc.id, // Store the document ID explicitly
        }
        matches.push(matchInfo)

        // Track the most recent update timestamp
        const updateTime = new Date(data.matchInfo.last_update_at)
        if (!lastUpdated || updateTime > lastUpdated) {
          lastUpdated = updateTime
        }
      }
    })

    // Calculate statistics
    const stats = {
      total: matches.length,
      won: matches.filter((match) => match.status && match.status.toLowerCase() === "won").length,
      lost: matches.filter((match) => match.status && match.status.toLowerCase() === "lost").length,
      postponed: matches.filter((match) => match.status && match.status.toLowerCase() === "postponed").length,
      pending: matches.filter((match) => match.status && match.status.toLowerCase() === "pending").length,
    }

    page.state.queryResults = matches
    page.state.queryStats = stats
    page.state.lastUpdated = lastUpdated

    window.app.showToast(`Found ${matches.length} matches`, "success")
  } catch (error) {
    console.error("Error querying matches:", error)
    page.state.error = `Error querying matches: ${error.message}`

    window.app.showToast("Failed to query matches", "error")
  } finally {
    setButtonLoading(page, "#pnl-query-btn", false)
    page.refresh()
  }
}

/**
 * Show delete confirmation modal
 */
function showDeleteConfirmation(page) {
  const modalHtml = `
    <div class="pnl-modal-content">
      <h2><i class="fas fa-exclamation-triangle pnl-warning-icon"></i> Confirm Deletion</h2>
      <p>Are you sure you want to delete ${page.state.selectedMatches.length} selected matches?</p>
      <p class="pnl-modal-warning">This action cannot be undone!</p>
      <div class="pnl-modal-actions">
        <button class="pnl-btn pnl-btn-text" id="pnl-cancel-delete">Cancel</button>
        <button class="pnl-btn pnl-btn-danger" id="pnl-confirm-delete">Delete</button>
      </div>
    </div>
  `

  // Use the page's modal manager to show the modal
  const modal = page.getModalManager().showModal(modalHtml)

  // Set up cancel button
  const cancelBtn = modal.querySelector("#pnl-cancel-delete")
  cancelBtn.addEventListener("click", () => {
    page.getModalManager().closeModal()
  })

  // Set up confirm button
  const confirmBtn = modal.querySelector("#pnl-confirm-delete")
  confirmBtn.addEventListener("click", () => {
    page.getModalManager().closeModal()
    deleteSelectedMatches(page)
  })
}

/**
 * Show add to free confirmation modal
 */
function showAddToFreeConfirmation(page) {
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

  // Use the page's modal manager to show the modal
  const modal = page.getModalManager().showModal(modalHtml)

  // Set up cancel button
  const cancelBtn = modal.querySelector("#pnl-cancel-add")
  cancelBtn.addEventListener("click", () => {
    page.getModalManager().closeModal()
  })

  // Set up confirm button
  const confirmBtn = modal.querySelector("#pnl-confirm-add")
  confirmBtn.addEventListener("click", () => {
    page.getModalManager().closeModal()
    addSelectedToFree(page)
  })
}

/**
 * Delete selected matches from the database
 */
async function deleteSelectedMatches(page) {
  if (page.state.selectedMatches.length === 0) {
    window.app.showToast("No matches selected for deletion", "warning")
    return
  }

  // Show loading state
  setButtonLoading(page, "#pnl-delete-selected", true)
  page.refresh()

  try {
    // Get Firebase access from the app
    const firebase = window.app.getLibrary("firebase")

    const date = page.state.queryDate
    const idsToDelete = page.state.selectedMatches

    // Delete in batches
    const BATCH_SIZE = 100
    for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
      const batch = firebase.writeBatch(firebase.firestore)
      const currentBatch = idsToDelete.slice(i, i + BATCH_SIZE)

      currentBatch.forEach((id) => {
        // Use predictions_pro collection
        const docRef = firebase.doc(firebase.firestore, `predictions_pro/football/dates/${date}/matches/${id}`)
        batch.delete(docRef)
      })

      await batch.commit()
    }

    window.app.showToast(`Successfully deleted ${idsToDelete.length} matches`, "success")

    // Reset selected matches
    page.state.selectedMatches = []

    // Refresh query to show updated data
    await queryPredictions(page)
  } catch (error) {
    console.error("Error deleting matches:", error)
    page.state.error = `Error deleting matches: ${error.message}`

    window.app.showToast("Failed to delete matches", "error")
    setButtonLoading(page, "#pnl-delete-selected", false)
    page.refresh()
  }
}

// Replace the existing addSelectedToFree function with this improved version
async function addSelectedToFree(page) {
  setButtonLoading(page, "#pnl-add-to-free", true)

  try {
    // Get Firebase access from the app
    const firebase = window.app.getLibrary("firebase")

    const date = page.state.queryDate
    const selectedIds = page.state.selectedMatches

    // Debug log to check selected IDs
    console.log("Selected IDs:", selectedIds)
    console.log("Query Results:", page.state.queryResults)

    // Get selected matches from pro predictions
    // Use a more robust method to find matches by ID
    const selectedMatches = []
    for (const id of selectedIds) {
      const match = page.state.queryResults.find((m) => m.id === id || m.docId === id)
      if (match) {
        selectedMatches.push(match)
      }
    }

    console.log("Selected matches to add:", selectedMatches)

    if (selectedMatches.length === 0) {
      window.app.showToast("No valid matches found to add", "error")
      setButtonLoading(page, "#pnl-add-to-free", false)
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
        if (!matchId) {
          console.warn("Match without ID found:", match)
          return
        }

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
      if (typeof page.updateFreeTable === "function") {
        page.updateFreeTable()
      }
    }

    window.app.showToast(`Successfully added ${totalAdded} matches to Free predictions`, "success")

    // Reset selected matches
    page.state.selectedMatches = []

    // Update UI to reflect changes
    const selectAllCheckbox = page.container.querySelector("#pnl-select-all")
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false
    }

    // Disable buttons
    const deleteBtn = page.container.querySelector("#pnl-delete-selected")
    if (deleteBtn) {
      deleteBtn.disabled = true
    }

    const addToFreeBtn = page.container.querySelector("#pnl-add-to-free")
    if (addToFreeBtn) {
      addToFreeBtn.disabled = true
    }

    // Refresh the free predictions if we're on that tab
    if (page.state.activeTab === "free") {
      const loadFreeBtn = page.container.querySelector("#pnl-load-free")
      if (loadFreeBtn) {
        setTimeout(() => {
          loadFreeBtn.click()
        }, 500)
      }
    }
  } catch (error) {
    console.error("Error adding to Free predictions:", error)
    window.app.showToast("Error adding to Free predictions: " + error.message, "error")
  } finally {
    setButtonLoading(page, "#pnl-add-to-free", false)
  }
}

/**
 * Download query results as JSON
 */
function downloadQueryResults(page) {
  if (page.state.queryResults.length === 0) {
    window.app.showToast("No data available to download", "error")
    return
  }

  const dataStr = JSON.stringify(page.state.queryResults, null, 2)
  const dataBlob = new Blob([dataStr], { type: "application/json" })
  const url = URL.createObjectURL(dataBlob)

  const fileName = `football_query_results_${page.state.queryDate}.json`

  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  window.app.showToast("Query results downloaded successfully", "success")
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


