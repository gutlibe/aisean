/**
 * API-related functionality for the Panel page
 */

/**
 * Set up API section event listeners and functionality
 */
export function setupApiSection(page) {
  // API Key input
  setupInputListener(page, "#pnl-api-key", "change", (e) => {
    const apiKey = e.target.value.trim()
    page.state.apiKey = apiKey
    localStorage.setItem("footballApiKey", apiKey)
  })

  // Date navigation
  setupDateNavigation(page)

  // Federation select
  setupInputListener(page, "#pnl-federation", "change", (e) => {
    page.state.federation = e.target.value
  })

  // Button event listeners
  setupButtonListeners(page, {
    "#pnl-fetch-btn": () => fetchPredictions(page),
    "#pnl-download-json": () => downloadJSON(page),
    "#pnl-upload-db": () => uploadToDatabase(page),
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

/**
 * Setup date navigation
 */
function setupDateNavigation(page) {
  // Date input
  setupInputListener(page, "#pnl-date", "change", (e) => {
    page.state.selectedDate = e.target.value
  })

  // Previous day button
  setupInputListener(page, "#pnl-prev-day", "click", () => {
    navigateDate(page, -1)
  })

  // Next day button
  setupInputListener(page, "#pnl-next-day", "click", () => {
    navigateDate(page, 1)
  })

  // Today button
  setupInputListener(page, "#pnl-today", "click", () => {
    setToday(page)
  })
}

/**
 * Navigate date by specified number of days
 */
function navigateDate(page, days) {
  const currentDate = new Date(page.state.selectedDate)
  currentDate.setDate(currentDate.getDate() + days)
  page.state.selectedDate = page.formatDateForInput(currentDate)

  // Update the input field
  const dateInput = page.container.querySelector("#pnl-date")
  if (dateInput) {
    dateInput.value = page.state.selectedDate
  }
}

/**
 * Set date to today
 */
function setToday(page) {
  const today = new Date()
  page.state.selectedDate = page.formatDateForInput(today)

  // Update the input field
  const dateInput = page.container.querySelector("#pnl-date")
  if (dateInput) {
    dateInput.value = page.state.selectedDate
  }
}

/**
 * Fetch predictions from the API
 */
async function fetchPredictions(page) {
  // Reset UI
  page.state.error = null
  setButtonLoading(page, "#pnl-fetch-btn", true)

  // Get API key
  const apiKey = page.state.apiKey
  if (!apiKey) {
    page.state.error = "Please enter your API key"
    setButtonLoading(page, "#pnl-fetch-btn", false)
    page.refresh()
    return
  }

  // Get selected date
  const selectedDate = page.state.selectedDate
  if (!selectedDate) {
    page.state.error = "Please select a date"
    setButtonLoading(page, "#pnl-fetch-btn", false)
    page.refresh()
    return
  }

  // Get federation
  const selectedFederation = page.state.federation
  const federationParam = selectedFederation ? `&federation=${selectedFederation}` : ""

  // API endpoint
  const apiUrl = `https://football-prediction-api.p.rapidapi.com/api/v2/predictions?market=classic&iso_date=${selectedDate}${federationParam}`

  // API options
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "football-prediction-api.p.rapidapi.com",
    },
  }

  try {
    const response = await fetch(apiUrl, options)

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()
    page.state.predictions = data

    // Show success notification
    window.app.showToast("Predictions fetched successfully", "success")
  } catch (error) {
    page.state.error = `Failed to fetch data: ${error.message}`
    console.error("API Error:", error)

    // Show error notification
    window.app.showToast("Failed to fetch predictions", "error")
  } finally {
    setButtonLoading(page, "#pnl-fetch-btn", false)
    page.refresh()
  }
}

/**
 * Download predictions as JSON
 */
function downloadJSON(page) {
  if (!page.state.predictions) {
    window.app.showToast("No data available to download", "error")
    return
  }

  const dataStr = JSON.stringify(page.state.predictions, null, 2)
  const dataBlob = new Blob([dataStr], { type: "application/json" })
  const url = URL.createObjectURL(dataBlob)

  const fileName = `football_predictions_${page.state.selectedDate}.json`

  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  window.app.showToast("JSON file downloaded successfully", "success")
}

/**
 * Upload predictions to database
 */
function uploadToDatabase(page) {
  // Switch to database tab
  page.state.activeTab = "database"
  page.state.uploadDate = page.state.selectedDate
  page.refresh()

  // Show toast notification
  window.app.showToast("Switched to Database tab for upload", "info")

  // After refresh, show upload modal
  setTimeout(() => {
    showUploadModal(page)
  }, 200)
}

/**
 * Show upload modal
 */
function showUploadModal(page) {
  if (!page.state.predictions || !page.state.predictions.data) {
    window.app.showToast("No predictions to upload", "error")
    return
  }

  const predictions = page.state.predictions.data

  const modalHtml = `
    <div class="pnl-modal-content">
      <h2>Upload Predictions to Database</h2>
      <p>You are about to upload ${predictions.length} predictions for ${page.formatDateForDisplay(page.state.selectedDate)}.</p>
      
      <div class="pnl-form-group">
        <label for="pnl-upload-date" class="pnl-label">Upload for Date</label>
        <input type="date" id="pnl-upload-date" class="pnl-input" value="${page.state.uploadDate}">
      </div>
      
      <div class="pnl-form-group">
        <div class="pnl-checkbox-container">
          <input type="checkbox" id="pnl-make-free" class="pnl-checkbox">
          <label for="pnl-make-free" class="pnl-checkbox-label">Also add to Free predictions</label>
        </div>
        <p class="pnl-help-text">Check this to automatically add these predictions to the Free predictions section</p>
      </div>
      
      <div class="pnl-modal-actions">
        <button class="pnl-btn pnl-btn-text" id="pnl-cancel-upload">Cancel</button>
        <button class="pnl-btn pnl-btn-primary" id="pnl-confirm-upload">Upload</button>
      </div>
    </div>
  `

  // Use our custom modal manager to show the modal
  const modal = page.getModalManager().showModal(modalHtml)

  // Set up cancel button
  const cancelBtn = modal.querySelector("#pnl-cancel-upload")
  cancelBtn.addEventListener("click", () => {
    page.getModalManager().closeModal()
  })

  // Set up upload date input
  const uploadDateInput = modal.querySelector("#pnl-upload-date")
  uploadDateInput.addEventListener("change", () => {
    page.state.uploadDate = uploadDateInput.value
  })

  // Set up confirm button
  const confirmBtn = modal.querySelector("#pnl-confirm-upload")
  confirmBtn.addEventListener("click", () => {
    const addToFree = modal.querySelector("#pnl-make-free").checked
    page.getModalManager().closeModal()
    performUpload(page, addToFree)
  })
}

/**
 * Perform the actual upload to database
 */
async function performUpload(page, addToFree = false) {
  if (!page.state.predictions || !page.state.predictions.data) {
    window.app.showToast("No predictions to upload", "error")
    return
  }

  const predictions = page.state.predictions.data
  const uploadDate = page.state.uploadDate

  // Show loading state
  setButtonLoading(page, "#pnl-query-btn", true)
  page.state.uploadProgress = 0
  page.refresh()

  try {
    // Get Firebase access from the app
    const firebase = window.app.getLibrary("firebase")

    // Transform data for Firestore
    const transformedData = transformData(predictions, uploadDate)

    // Process in batches for Firestore limits
    const BATCH_SIZE = 50
    let totalUploaded = 0
    let successCount = 0

    // First, upload to the Pro predictions collection
    for (let i = 0; i < transformedData.length; i += BATCH_SIZE) {
      try {
        const batch = firebase.writeBatch(firebase.firestore)
        const currentBatch = transformedData.slice(i, i + BATCH_SIZE)

        currentBatch.forEach((match) => {
          // Use predictions_pro collection
          const docRef = firebase.doc(
            firebase.firestore,
            `predictions_pro/football/dates/${uploadDate}/matches/${match.id}`,
          )

          batch.set(docRef, match.docData, { merge: true })
        })

        await batch.commit()
        successCount += currentBatch.length
      } catch (error) {
        console.error(`Error in batch ${i}:`, error)
        // Continue with next batch even if one fails
      }

      totalUploaded += Math.min(BATCH_SIZE, transformedData.length - i)
      page.state.uploadProgress = Math.floor((totalUploaded / transformedData.length) * 50) // Up to 50% for pro predictions
      page.refresh()
    }

    // If addToFree is true, also upload to the Free predictions collection
    if (addToFree) {
      totalUploaded = 0
      let freeSuccessCount = 0

      for (let i = 0; i < transformedData.length; i += BATCH_SIZE) {
        try {
          const batch = firebase.writeBatch(firebase.firestore)
          const currentBatch = transformedData.slice(i, i + BATCH_SIZE)

          currentBatch.forEach((match) => {
            // Use regular predictions collection for free predictions
            const docRef = firebase.doc(
              firebase.firestore,
              `predictions/football/dates/${uploadDate}/matches/${match.id}`,
            )

            batch.set(docRef, match.docData, { merge: true })
          })

          await batch.commit()
          freeSuccessCount += currentBatch.length
        } catch (error) {
          console.error(`Error in free predictions batch ${i}:`, error)
          // Continue with next batch even if one fails
        }

        totalUploaded += Math.min(BATCH_SIZE, transformedData.length - i)
        page.state.uploadProgress = 50 + Math.floor((totalUploaded / transformedData.length) * 50) // 50-100% for free predictions
        page.refresh()
      }

      window.app.showToast(
        `Successfully uploaded ${successCount} Pro predictions and ${freeSuccessCount} Free predictions`,
        "success",
      )
    } else {
      window.app.showToast(`Successfully uploaded ${successCount} Pro predictions`, "success")
    }

    // Store last updated timestamp
    page.state.lastUpdated = new Date()

    // Switch to database tab to show the uploaded predictions
    page.state.activeTab = "database"
    page.state.queryDate = uploadDate
    page.refresh()

    // Query the uploaded predictions
    setTimeout(() => {
      const queryBtn = page.container.querySelector("#pnl-query-btn")
      if (queryBtn) queryBtn.click()
    }, 500)
  } catch (error) {
    console.error("Error uploading to Firestore:", error)
    page.state.error = `Error uploading to database: ${error.message}`

    // Show error notification
    window.app.showToast("Failed to upload predictions", "error")
  } finally {
    setButtonLoading(page, "#pnl-query-btn", false)
    page.refresh()
  }
}

/**
 * Transform the JSON data to match Firestore structure
 */
function transformData(data, selectedDate) {
  const transformed = []

  data.forEach((match) => {
    try {
      const { date, time } = parseDateTime(match.start_date)

      // Create transformed structure
      const transformedMatch = {
        id: match.id,
        docData: {
          matchInfo: {
            id: match.id,
            season: match.season,
            result: match.result,
            start_date: match.start_date,
            last_update_at: match.last_update_at || new Date().toISOString(),
            home_team: match.home_team,
            competition_name: match.competition_name,
            away_team: match.away_team,
            competition_cluster: match.competition_cluster,
            status: match.status || "pending",
            federation: match.federation,
            is_expired: match.is_expired,
            marketData: {
              classic: {
                prediction: match.prediction,
                odds: match.odds || {},
              },
            },
            startDate: date,
            startTime: time,
            timestamp: new Date(match.start_date).toISOString(),
          },
        },
      }

      transformed.push(transformedMatch)
    } catch (error) {
      console.error(`Error transforming match ${match.id}:`, error)
      // Skip this match and continue with the rest
    }
  })

  return transformed
}

/**
 * Parse ISO date string into date and time components
 */
function parseDateTime(isoString) {
  try {
    const date = new Date(isoString)
    const dateStr = date.toISOString().split("T")[0]
    const timeStr = date.toTimeString().substring(0, 5)
    return { date: dateStr, time: timeStr }
  } catch (error) {
    console.error("Error parsing date:", error)
    // Return today's date as fallback
    const today = new Date()
    return {
      date: today.toISOString().split("T")[0],
      time: today.toTimeString().substring(0, 5),
    }
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


