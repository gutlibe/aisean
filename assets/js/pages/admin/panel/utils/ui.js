/**
 * UI-related functionality for the Panel page
 */

/**
 * Set up UI components
 */
export function setupUIComponents(page) {
  // Set up table sorting
  setupTableSorting(page)

  // Set up table filtering
  setupTableFiltering(page)

  // Set up responsive behavior
  setupResponsiveBehavior(page)
}

/**
 * Set up table sorting functionality
 */
function setupTableSorting(page) {
  const tables = page.container.querySelectorAll(".pnl-table")

  tables.forEach((table) => {
    const headers = table.querySelectorAll("thead th")

    headers.forEach((header, index) => {
      // Skip the checkbox column
      if (index === 0 && header.querySelector(".pnl-checkbox")) {
        return
      }

      header.classList.add("pnl-sortable")
      header.addEventListener("click", () => {
        sortTable(table, index, header)
      })
    })
  })
}

/**
 * Sort a table by a specific column
 */
function sortTable(table, columnIndex, header) {
  const tbody = table.querySelector("tbody")
  const rows = Array.from(tbody.querySelectorAll("tr"))

  // Determine sort direction
  const currentDirection = header.getAttribute("data-sort") || "none"
  const newDirection = currentDirection === "asc" ? "desc" : "asc"

  // Reset all headers
  table.querySelectorAll("thead th").forEach((th) => {
    th.setAttribute("data-sort", "none")
    th.classList.remove("pnl-sort-asc", "pnl-sort-desc")
  })

  // Set new sort direction
  header.setAttribute("data-sort", newDirection)
  header.classList.add(newDirection === "asc" ? "pnl-sort-asc" : "pnl-sort-desc")

  // Sort the rows
  rows.sort((rowA, rowB) => {
    const cellA = rowA.querySelectorAll("td")[columnIndex].textContent.trim()
    const cellB = rowB.querySelectorAll("td")[columnIndex].textContent.trim()

    if (cellA < cellB) {
      return newDirection === "asc" ? -1 : 1
    }
    if (cellA > cellB) {
      return newDirection === "asc" ? 1 : -1
    }
    return 0
  })

  // Remove existing rows
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild)
  }

  // Add sorted rows
  rows.forEach((row) => {
    tbody.appendChild(row)
  })
}

/**
 * Set up table filtering functionality
 */
function setupTableFiltering(page) {
  // Add filter inputs to prediction tables
  const predictionsTables = [
    page.container.querySelector("#pnl-predictions-table"),
    page.container.querySelector("#pnl-query-table"),
    page.container.querySelector("#pnl-pro-table"),
    page.container.querySelector("#pnl-free-table"),
  ]

  predictionsTables.forEach((table) => {
    if (!table) return

    const tableContainer = table.closest(".pnl-table-container")
    if (!tableContainer) return

    // Create filter input
    const filterContainer = document.createElement("div")
    filterContainer.className = "pnl-filter-container"

    const filterInput = document.createElement("input")
    filterInput.type = "text"
    filterInput.className = "pnl-filter-input"
    filterInput.placeholder = "Filter results..."

    filterContainer.appendChild(filterInput)
    tableContainer.insertBefore(filterContainer, table)

    // Add event listener
    filterInput.addEventListener("input", () => {
      const filterValue = filterInput.value.toLowerCase()
      const rows = table.querySelectorAll("tbody tr")

      rows.forEach((row) => {
        const text = row.textContent.toLowerCase()
        row.style.display = text.includes(filterValue) ? "" : "none"
      })
    })
  })
}

/**
 * Set up responsive behavior
 */
function setupResponsiveBehavior(page) {
  // Handle table responsiveness
  const tables = page.container.querySelectorAll(".pnl-table")

  tables.forEach((table) => {
    const tableContainer = table.closest(".pnl-table-container")
    if (!tableContainer) return

    // Add responsive class to all tables to ensure horizontal scrolling
    tableContainer.classList.add("pnl-table-responsive")

    // Add a class to the table to ensure it takes appropriate width
    table.classList.add("pnl-table-full-content")
  })

  // Handle form responsiveness
  const formRows = page.container.querySelectorAll(".pnl-form-row")

  formRows.forEach((row) => {
    // Add responsive class to form rows
    row.classList.add("pnl-form-row-responsive")
  })

  // Initial resize handler call
  handleResize(page)
}

/**
 * Handle window resize events
 */
function handleResize(page) {
  // Adjust table container heights
  const tableContainers = page.container.querySelectorAll(".pnl-table-container")

  tableContainers.forEach((container) => {
    // Set max height based on viewport
    const viewportHeight = window.innerHeight
    const containerTop = container.getBoundingClientRect().top
    const maxHeight = viewportHeight - containerTop - 50 // 50px buffer

    container.style.maxHeight = `${Math.max(300, maxHeight)}px`
  })

  // Adjust card actions on small screens
  const cardActions = page.container.querySelectorAll(".pnl-card-actions")

  cardActions.forEach((actions) => {
    if (window.innerWidth < 768) {
      actions.classList.add("pnl-card-actions-stacked")
    } else {
      actions.classList.remove("pnl-card-actions-stacked")
    }
  })
}

