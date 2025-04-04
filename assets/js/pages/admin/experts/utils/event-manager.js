export class EventManager {
  constructor(page) {
    this.page = page
  }

  setupHeaderButtons() {
    // Make sure the Add Match button in the header is properly styled and functional
    const addMatchBtn = this.page.container.querySelector("#addMatchBtn")
    if (addMatchBtn) {
      // Ensure button has the correct styling
      addMatchBtn.classList.add("exp-add-btn")
      addMatchBtn.addEventListener("click", () => this.page.showAddMatchModal())
    }
  }

  setupEventListeners() {
    this.setupDateNavigation()
    this.setupEmptyStateButton()
    this.setupMatchActions()
  }

  setupDateNavigation() {
    const prevDateBtn = this.page.container.querySelector("#prevDate")
    const nextDateBtn = this.page.container.querySelector("#nextDate")
    const dateSelector = this.page.container.querySelector("#dateSelector")

    if (prevDateBtn) {
      prevDateBtn.addEventListener("click", () => this.page.changeDate(-1))
    }

    if (nextDateBtn) {
      nextDateBtn.addEventListener("click", () => this.page.changeDate(1))
    }

    if (dateSelector) {
      dateSelector.addEventListener("change", (e) => {
        this.page.formattedDate = e.target.value
        this.page.refresh()
      })
    }
  }

  setupEmptyStateButton() {
    // Add event listener for the empty state add button
    const emptyStateAddBtn = this.page.container.querySelector("#emptyStateAddBtn")
    if (emptyStateAddBtn) {
      emptyStateAddBtn.addEventListener("click", () => this.page.showAddMatchModal())
    }
  }

  setupMatchActions() {
    this.setupEditButtons()
    this.setupDeleteButtons()
  }

  setupEditButtons() {
    const editButtons = this.page.container.querySelectorAll(".exp-edit-btn")
    editButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const matchId = e.target.closest("[data-id]").dataset.id
        this.page.editMatch(matchId)
      })
    })
  }

  setupDeleteButtons() {
    const deleteButtons = this.page.container.querySelectorAll(".exp-delete-btn")
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const matchId = e.target.closest("[data-id]").dataset.id
        this.page.confirmDeleteMatch(matchId)
      })
    })
  }
}

// Test the EventManager module
console.log("EventManager module loaded successfully");