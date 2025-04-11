// Import the base Page class
import { Page } from "../../../core/page.js"

/**
 * UsersPage - User Management Dashboard
 *
 * Displays user statistics and a filterable, searchable table of users
 * with edit functionality.
 */
export class UsersPage extends Page {
  constructor() {
    super()

    // Basic configuration
    this.showMenuIcon = true
    this.showBackArrow = true
    this.requiresDatabase = true

    // Authentication settings
    this.requiresAuth = true
    this.authorizedUserTypes = ["Admin"]

    // Loading configuration
    this.loadingTimeout = 30000
    this.maxRetries = 2
    this.retryDelay = 1000

    // Page-specific state
    this.users = []
    this.filteredUsers = []
    this.userTypeFilter = "all"
    this.showCount = 10
    this.searchTerm = ""

    // Modal state
    this.modalVisible = false
    
    this.cssFiles = [
      "pages/admin/users/index.css",
    ]
  }

  getTitle() {
    return "User Management"
  }

  getHeaderIcon() {
    return "fas fa-users"
  }

  getActions() {
    return `
            <button class="btn btn-icon usr-refresh-btn" id="refreshBtn">
                <i class="fas fa-sync-alt"></i>
            </button>
        `
  }

  getSkeletonTemplate() {
    return `
            <div class="usr-skeleton-container">
                <!-- Stats cards skeleton -->
                <div class="usr-stats-row">
                    <div class="usr-stat-card-skeleton pulse">
                        <div class="usr-stat-icon-skeleton pulse"></div>
                        <div class="usr-stat-content-skeleton">
                            <div class="usr-stat-value-skeleton pulse"></div>
                            <div class="usr-stat-label-skeleton pulse"></div>
                        </div>
                    </div>
                    <div class="usr-stat-card-skeleton pulse">
                        <div class="usr-stat-icon-skeleton pulse"></div>
                        <div class="usr-stat-content-skeleton">
                            <div class="usr-stat-value-skeleton pulse"></div>
                            <div class="usr-stat-label-skeleton pulse"></div>
                        </div>
                    </div>
                    <div class="usr-stat-card-skeleton pulse">
                        <div class="usr-stat-icon-skeleton pulse"></div>
                        <div class="usr-stat-content-skeleton">
                            <div class="usr-stat-value-skeleton pulse"></div>
                            <div class="usr-stat-label-skeleton pulse"></div>
                        </div>
                    </div>
                    <div class="usr-stat-card-skeleton pulse">
                        <div class="usr-stat-icon-skeleton pulse"></div>
                        <div class="usr-stat-content-skeleton">
                            <div class="usr-stat-value-skeleton pulse"></div>
                            <div class="usr-stat-label-skeleton pulse"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Filters skeleton -->
                <div class="usr-filters-skeleton">
                    <div class="usr-filter-group-skeleton pulse"></div>
                    <div class="usr-filter-group-skeleton pulse"></div>
                    <div class="usr-button-skeleton pulse"></div>
                </div>
                
                <!-- Search skeleton -->
                <div class="usr-search-skeleton pulse"></div>
                
                <!-- Table skeleton -->
                <div class="usr-table-skeleton">
                    <div class="usr-table-header-skeleton pulse"></div>
                    <div class="usr-table-row-skeleton pulse"></div>
                    <div class="usr-table-row-skeleton pulse"></div>
                    <div class="usr-table-row-skeleton pulse"></div>
                    <div class="usr-table-row-skeleton pulse"></div>
                </div>
            </div>
        `
  }

  async loadDatabaseContent() {
    try {
      const firebase = window.app.getLibrary("firebase")

      // Get users collection
      const usersCollection = firebase.collection(firebase.firestore, "users")

      // Query all users, ordered by creation date (newest first)
      const usersQuery = firebase.query(usersCollection, firebase.orderBy("createdAt", "desc"))

      const usersSnapshot = await firebase.getDocs(usersQuery)

      // Process results
      this.users = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Convert timestamps to Date objects
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastLogin: doc.data().lastLogin?.toDate() || new Date(),
      }))

      // Initialize filtered users with all users
      this.filteredUsers = [...this.users]

      // Calculate statistics
      this.userStats = {
        total: this.users.length,
        admin: this.users.filter((user) => user.userType === "Admin").length,
        pro: this.users.filter((user) => user.userType === "Pro").length,
        member: this.users.filter((user) => user.userType === "Member").length,
      }

      return true
    } catch (error) {
      console.error("Error loading users:", error)
      throw new Error("DATABASE_ERROR")
    }
  }

  async getContent() {
    // If no users found
    if (!this.users || this.users.length === 0) {
      return `
                <div class="usr-empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No users found</h3>
                    <p>Users will appear here when they sign up on the website.</p>
                </div>
            `
    }

    // Build statistics cards
    const statsHtml = `
            <div class="usr-stats-container">
                <div class="usr-stat-card usr-stat-total">
                    <div class="usr-stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="usr-stat-content">
                        <span class="usr-stat-value">${this.userStats.total}</span>
                        <span class="usr-stat-label">Total Users</span>
                    </div>
                </div>
                <div class="usr-stat-card usr-stat-admin">
                    <div class="usr-stat-icon">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <div class="usr-stat-content">
                        <span class="usr-stat-value">${this.userStats.admin}</span>
                        <span class="usr-stat-label">Admins</span>
                    </div>
                </div>
                <div class="usr-stat-card usr-stat-pro">
                    <div class="usr-stat-icon">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="usr-stat-content">
                        <span class="usr-stat-value">${this.userStats.pro}</span>
                        <span class="usr-stat-label">Pro Users</span>
                    </div>
                </div>
                <div class="usr-stat-card usr-stat-member">
                    <div class="usr-stat-icon">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="usr-stat-content">
                        <span class="usr-stat-value">${this.userStats.member}</span>
                        <span class="usr-stat-label">Members</span>
                    </div>
                </div>
            </div>
        `

    // Build filters
    const filtersHtml = `
            <div class="usr-filters-container">
                <div class="usr-filter-group">
                    <label for="userTypeFilter">Role:</label>
                    <select id="userTypeFilter" class="usr-select">
                        <option value="all">All Users</option>
                        <option value="Admin">Admin</option>
                        <option value="Pro">Pro</option>
                        <option value="Member">Member</option>
                    </select>
                </div>
                <div class="usr-filter-group">
                    <label for="showCountFilter">Show:</label>
                    <select id="showCountFilter" class="usr-select">
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="all">All</option>
                    </select>
                </div>
                <button id="queryBtn" class="btn btn-primary usr-query-btn">
                    <i class="fas fa-search"></i> Query
                </button>
            </div>
        `

    // Build search bar
    const searchHtml = `
            <div class="usr-search-container">
                <div class="usr-search-input-wrapper">
                    <i class="fas fa-search usr-search-icon"></i>
                    <input type="text" id="userSearch" class="usr-search-input" placeholder="Search users...">
                </div>
            </div>
        `

    // Build table with users
    const tableHtml = `
    <div class="usr-table-container">
        <table class="usr-table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="usersTableBody">
                ${this.renderTableRows()}
            </tbody>
        </table>
    </div>
`

    // Custom modal HTML (initially hidden)
    const modalHtml = `
            <div id="userModal" class="usr-modal">
                <div class="usr-modal-overlay"></div>
                <div class="usr-modal-container">
                    <div class="usr-modal-content">
                        <div class="usr-modal-header">
                            <h2 id="modalTitle">Edit User</h2>
                            <button class="usr-modal-close" id="modalClose">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div id="modalBody" class="usr-modal-body">
                            <!-- Modal content will be inserted here -->
                        </div>
                    </div>
                </div>
            </div>
        `

    return `
            <div class="usr-page-container">
                ${statsHtml}
                ${filtersHtml}
                ${searchHtml}
                ${tableHtml}
                ${modalHtml}
            </div>
        `
  }

  renderTableRows() {
    // Get users to display based on current filters and pagination
    const displayUsers = this.getDisplayUsers()

    if (displayUsers.length === 0) {
      return `
            <tr>
                <td colspan="6" class="usr-no-results">
                    <i class="fas fa-search"></i>
                    <p>No users match your search criteria</p>
                </td>
            </tr>
        `
    }

    return displayUsers
      .map((user) => {
        // Format dates
        const joinedDate = this.formatDate(user.createdAt)
        const lastLoginDate = this.formatDate(user.lastLogin)

        return `
            <tr data-id="${user.id}">
                <td class="usr-username">${this.escapeHTML(user.username || "")}</td>
                <td class="usr-email">${this.escapeHTML(user.email || "")}</td>
                <td class="usr-role">
                    <span class="usr-role-badge usr-role-${(user.userType || "member").toLowerCase()}">${user.userType || "Member"}</span>
                </td>
                <td class="usr-joined">${joinedDate}</td>
                <td class="usr-last-login">${lastLoginDate}</td>
                <td class="usr-actions">
                    <button class="usr-edit-btn" data-id="${user.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `
      })
      .join("")
  }

  // Format date to a readable string
  formatDate(date) {
    if (!date) return "N/A"

    const options = { year: "numeric", month: "short", day: "numeric" }
    return date.toLocaleDateString(undefined, options)
  }

  // Implement escapeHTML directly in this class to avoid dependency on Page class implementation
  escapeHTML(str) {
    if (!str) return ""
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  getDisplayUsers() {
    // Apply filters to get the users to display
    let result = [...this.filteredUsers]

    // Apply search if there's a search term
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase()
      result = result.filter(
        (user) =>
          (user.username && user.username.toLowerCase().includes(searchLower)) ||
          (user.email && user.email.toLowerCase().includes(searchLower)) ||
          (user.userType && user.userType.toLowerCase().includes(searchLower)),
      )
    }

    // Apply pagination if not showing all
    if (this.showCount !== "all") {
      result = result.slice(0, Number.parseInt(this.showCount))
    }

    return result
  }

  async afterStructureRender() {
    await super.afterStructureRender()

    // Setup refresh button
    const refreshBtn = this.container.querySelector("#refreshBtn")
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        // Show loading spinner in the refresh button
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
        refreshBtn.disabled = true

        // Refresh the data
        this.refresh()
      })
    }

    // Setup modal close functionality
    this.setupModal()
  }

  setupModal() {
    const modal = this.container.querySelector("#userModal")
    const modalClose = this.container.querySelector("#modalClose")
    const modalOverlay = this.container.querySelector(".usr-modal-overlay")

    if (modalClose) {
      modalClose.addEventListener("click", () => this.closeModal())
    }

    if (modalOverlay) {
      modalOverlay.addEventListener("click", () => this.closeModal())
    }

    // Close modal on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modalVisible) {
        this.closeModal()
      }
    })
  }

  async afterContentRender() {
    // Setup filter change handlers
    const userTypeFilter = this.container.querySelector("#userTypeFilter")
    const showCountFilter = this.container.querySelector("#showCountFilter")
    const queryBtn = this.container.querySelector("#queryBtn")

    if (userTypeFilter) {
      userTypeFilter.value = this.userTypeFilter
      userTypeFilter.addEventListener("change", (e) => {
        this.userTypeFilter = e.target.value
      })
    }

    if (showCountFilter) {
      showCountFilter.value = this.showCount
      showCountFilter.addEventListener("change", (e) => {
        this.showCount = e.target.value
      })
    }

    if (queryBtn) {
      queryBtn.addEventListener("click", () => this.applyFilters())
    }

    // Setup search functionality
    const searchInput = this.container.querySelector("#userSearch")
    if (searchInput) {
      searchInput.value = this.searchTerm
      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value
        this.updateTableRows()
      })
    }

    // Setup edit buttons
    const editButtons = this.container.querySelectorAll(".usr-edit-btn")
    editButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const userId = e.currentTarget.dataset.id
        this.showEditUserModal(userId)
      })
    })
  }

  applyFilters() {
    // Show loading state on the query button
    const queryBtn = this.container.querySelector("#queryBtn")
    if (queryBtn) {
      queryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...'
      queryBtn.disabled = true
    }

    // Apply user type filter
    if (this.userTypeFilter === "all") {
      this.filteredUsers = [...this.users]
    } else {
      this.filteredUsers = this.users.filter((user) => user.userType === this.userTypeFilter)
    }

    // Update the table with filtered results
    setTimeout(() => {
      this.updateTableRows()

      // Reset button state
      if (queryBtn) {
        queryBtn.innerHTML = '<i class="fas fa-search"></i> Query'
        queryBtn.disabled = false
      }

      // Show toast notification
      window.app.showToast(`Found ${this.filteredUsers.length} users matching your criteria`, "info", 3000)
    }, 500) // Simulate a short delay for better UX
  }

  updateTableRows() {
    const tableBody = this.container.querySelector("#usersTableBody")
    if (tableBody) {
      tableBody.innerHTML = this.renderTableRows()

      // Re-attach event listeners to new edit buttons
      const editButtons = tableBody.querySelectorAll(".usr-edit-btn")
      editButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const userId = e.currentTarget.dataset.id
          this.showEditUserModal(userId)
        })
      })
    }
  }

  showEditUserModal(userId) {
    // Get user data
    const user = this.users.find((u) => u.id === userId)
    if (!user) return

    const modalBody = this.container.querySelector("#modalBody")
    const modalTitle = this.container.querySelector("#modalTitle")

    if (!modalBody || !modalTitle) return

    // Set modal title
    modalTitle.textContent = "Edit User"

    // Create form content
    const formHtml = `
        <form id="editUserForm" class="usr-form">
            <div class="usr-form-group">
                <label for="username">Username</label>
                <input type="text" id="username" class="usr-input" value="${this.escapeHTML(user.username || "")}" required>
            </div>
            <div class="usr-form-group">
                <label for="email">Email</label>
                <input type="email" id="email" class="usr-input" value="${this.escapeHTML(user.email || "")}" required>
            </div>
            <div class="usr-form-group">
                <label for="userType">Role</label>
                <select id="userType" class="usr-select" required>
                    <option value="Member" ${user.userType === "Member" ? "selected" : ""}>Member</option>
                    <option value="Pro" ${user.userType === "Pro" ? "selected" : ""}>Pro</option>
                    <option value="Admin" ${user.userType === "Admin" ? "selected" : ""}>Admin</option>
                </select>
            </div>
            <div class="usr-form-actions">
                <button type="button" class="btn usr-cancel-btn" id="cancelEdit">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button type="submit" class="btn usr-save-btn" id="saveUserBtn">
                    <i class="fas fa-save"></i> Save
                </button>
            </div>
        </form>
    `

    // Set modal content
    modalBody.innerHTML = formHtml

    // Show modal
    this.openModal()

    // Set up form submission
    const form = this.container.querySelector("#editUserForm")
    const saveBtn = this.container.querySelector("#saveUserBtn")
    const cancelBtn = this.container.querySelector("#cancelEdit")

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault()

        // Show loading state
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'
        saveBtn.disabled = true

        const userData = {
          username: form.querySelector("#username").value,
          email: form.querySelector("#email").value,
          userType: form.querySelector("#userType").value,
        }

        try {
          await this.updateUser(userId, userData)
          window.app.showToast("User updated successfully", "success")
          this.closeModal()
          this.refresh()
        } catch (error) {
          console.error("Error updating user:", error)
          window.app.showToast("Failed to update user. Please try again.", "error")

          // Reset button state
          saveBtn.innerHTML = '<i class="fas fa-save"></i> Save'
          saveBtn.disabled = false
        }
      })
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        this.closeModal()
      })
    }
  }

  openModal() {
    const modal = this.container.querySelector("#userModal")
    if (modal) {
      modal.classList.add("usr-modal-visible")
      this.modalVisible = true

      // Prevent body scrolling when modal is open
      document.body.style.overflow = "hidden"
    }
  }

  closeModal() {
    const modal = this.container.querySelector("#userModal")
    if (modal) {
      modal.classList.remove("usr-modal-visible")
      this.modalVisible = false

      // Restore body scrolling
      document.body.style.overflow = ""
    }
  }

  async updateUser(userId, userData) {
    const firebase = window.app.getLibrary("firebase")

    // Update in Firestore
    const userRef = firebase.doc(firebase.firestore, `users/${userId}`)
    await firebase.updateDoc(userRef, userData)

    return userId
  }

  refresh() {
    this.currentRenderAttempt = 0
    this.render()
  }

  destroy() {
    super.destroy()

    // Remove event listeners
    document.removeEventListener("keydown", this.handleKeyDown)

    // Reset body overflow if modal was open
    if (this.modalVisible) {
      document.body.style.overflow = ""
    }

    this.container = null
  }
}


