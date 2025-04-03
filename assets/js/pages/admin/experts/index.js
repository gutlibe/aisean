import { Page } from "../../../core/page.js"
import { UI } from "./utils/ui.js"
import { EventManager } from "./utils/event-manager.js"

export class ExpertsPage extends Page {
  constructor() {
    super()

    this.showMenuIcon = false
    this.showBackArrow = true
    this.requiresDatabase = true
    this.requiresAuth = true
    this.authorizedUserTypes = ["Admin"]
    this.loadingTimeout = 30000
    this.maxRetries = 2
    this.retryDelay = 1000
    this.currentDate = new Date()
    this.formattedDate = this.formatDate(this.currentDate)
    this.matches = []
    this.editingMatchId = null
    this.ui = new UI(this)
    this.eventManager = new EventManager(this)
    
    this.cssFiles = [
      "pages/admin/experts/index.css",
    ]
  }


  getTitle() {
    return "Expert Predictions"
  }

  getHeaderIcon() {
    return ""
  }

  getActions() {
    return `
      <button class="btn btn-primary" id="addMatchBtn">
        <i class="fas fa-plus"></i> Add Match
      </button>
    `
  }

  getSkeletonTemplate() {
    return this.ui.getSkeletonTemplate()
  }

  async loadDatabaseContent() {
    try {
      const firebase = window.app.getLibrary("firebase")
      const dateString = this.formattedDate
      const matchesRef = firebase.collection(
        firebase.firestore,
        `expertPredictions/football/dates/${dateString}/matches`,
      )

      const matchesQuery = firebase.query(matchesRef, firebase.orderBy("matchInfo.start_time", "asc"))

      const matchesSnapshot = await firebase.getDocs(matchesQuery)
      this.matches = matchesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      return true
    } catch (error) {
      console.error("Error loading predictions:", error)
      throw new Error("DATABASE_ERROR")
    }
  }

  async getContent() {
    return this.ui.getContent()
  }

  async afterStructureRender() {
    await super.afterStructureRender()
    this.eventManager.setupHeaderButtons()
  }

  async afterContentRender() {
    this.eventManager.setupEventListeners()
  }

  changeDate(dayOffset) {
    const date = new Date(this.formattedDate)
    date.setDate(date.getDate() + dayOffset)
    this.formattedDate = this.formatDate(date)

    const dateSelector = this.container.querySelector("#dateSelector")
    if (dateSelector) {
      dateSelector.value = this.formattedDate
    }

    this.refresh()
  }

  showAddMatchModal() {
    this.ui.showAddMatchModal()
  }

  async saveNewMatch(matchData) {
    try {
      const firebase = window.app.getLibrary("firebase")

      const dateString = this.formattedDate
      const matchesRef = firebase.collection(
        firebase.firestore,
        `expertPredictions/football/dates/${dateString}/matches`,
      )

      await firebase.addDoc(matchesRef, matchData)

      window.app.showToast("Match prediction added successfully", "success")
      this.refresh()
    } catch (error) {
      console.error("Error saving match:", error)
      window.app.showToast("Failed to save match prediction", "error")
    }
  }

  editMatch(matchId) {
    const match = this.matches.find((m) => m.id === matchId)
    if (!match) return

    this.editingMatchId = matchId
    this.showAddMatchModal()
    this.ui.populateEditForm(match)
  }

  async updateMatch(matchId, matchData) {
  try {
    const firebase = window.app.getLibrary("firebase")

    const dateString = this.formattedDate
    const matchRef = firebase.doc(
      firebase.firestore,
      `expertPredictions/football/dates/${dateString}/matches/${matchId}`,
    )

    // Use setDoc instead of updateDoc - this will create the document if it doesn't exist
    // or update it if it does exist
    await firebase.setDoc(matchRef, matchData, { merge: true })

    window.app.showToast("Match prediction saved successfully", "success")
    this.refresh()
  } catch (error) {
    console.error("Error saving match:", error)
    window.app.showToast("Failed to save match prediction", "error")
  }
}

  confirmDeleteMatch(matchId) {
    this.ui.showDeleteConfirmation(matchId)
  }

  async deleteMatch(matchId) {
    try {
      const firebase = window.app.getLibrary("firebase")

      const dateString = this.formattedDate
      const matchRef = firebase.doc(
        firebase.firestore,
        `expertPredictions/football/dates/${dateString}/matches/${matchId}`,
      )

      await firebase.deleteDoc(matchRef)

      window.app.showToast("Match prediction deleted successfully", "success")
      this.refresh()
    } catch (error) {
      console.error("Error deleting match:", error)
      window.app.showToast("Failed to delete match prediction", "error")
    }
  }

  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  formatDateForDisplay(dateString) {
    const date = new Date(dateString)
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    return date.toLocaleDateString(undefined, options)
  }

  formatTime(timeString) {
    if (!timeString) return ""

    let hours, minutes

    if (timeString.includes(":")) {
      ;[hours, minutes] = timeString.split(":")
    } else {
      hours = timeString.substring(0, 2)
      minutes = timeString.substring(2, 4)
    }

    let period = "AM"
    if (hours >= 12) {
      period = "PM"
      if (hours > 12) {
        hours -= 12
      }
    }

    if (hours === "00") {
      hours = "12"
    }

    hours = Number.parseInt(hours, 10).toString()

    return `${hours}:${minutes} ${period}`
  }

  escapeHtml(unsafe) {
    if (!unsafe) return ""
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  refresh() {
    this.currentRenderAttempt = 0
    this.render()
  }

  destroy() {
    super.destroy()

    const modals = document.querySelectorAll(".exp-modal-overlay")
    modals.forEach((modal) => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal)
      }
    })

    this.matches = null
    this.editingMatchId = null
    this.container = null
  }
}

// Test the code structure
console.log("ExpertsPage module loaded successfully");