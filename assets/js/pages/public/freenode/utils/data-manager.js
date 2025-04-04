export class FootballDataManager {
  constructor(page) {
    this.page = page
    this.isLoading = false
  }

  // Format date for API requests
  formatDateForApi(date) {
    return date.toISOString().split("T")[0]
  }

  // Format date for display in tabs
  formatDateForTab(date) {
    const day = date.getDate()
    const month = date.toLocaleString("default", { month: "short" })
    return `${day} ${month}`
  }

  // Generate date tabs for the week
  generateDateTabs() {
    const dates = []
    const today = new Date()

    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 6)

    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 1)

    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const formattedDate = this.formatDateForTab(currentDate)
      let type = "past"
      if (currentDate.toDateString() === today.toDateString()) {
        type = "today"
      } else if (currentDate > today) {
        type = "future"
      }

      const tabId = `day-${formattedDate.replace(/ /g, "-")}`
      dates.push({
        id: tabId,
        date: new Date(currentDate),
        label: formattedDate,
        type: type,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return dates
  }

  // Process prediction data from API response
  processPredictionData(matchInfo) {
    // Extract the market data
    const marketData = matchInfo.marketData?.classic || {}

    // Extract score from result if available
    const score = matchInfo.result?.includes("-") ? matchInfo.result.replace(/ /g, "") : null

    // Determine prediction type based on the prediction value
    const predictionType = this.determinePredictionType(marketData.prediction || "")

    const status = matchInfo.status || "pending"

    return {
      season: matchInfo.season,
      id: matchInfo.id,
      result: matchInfo.result || "pending",
      start_date: matchInfo.start_date,
      last_update_at: matchInfo.last_update_at,
      home_team: matchInfo.home_team,
      away_team: matchInfo.away_team,
      competition_name: matchInfo.competition_name,
      market: "classic",
      competition_cluster: matchInfo.competition_cluster,
      federation: matchInfo.federation,
      prediction: marketData.prediction || "",
      predictionType: predictionType,
      status: status,
      score: score,
      is_expired: matchInfo.is_expired,
      odds: marketData.odds || {},
    }
  }

  // Determine prediction type based on the prediction value
  determinePredictionType(prediction) {
    if (!prediction) return "classic"

    if (["1X", "12", "X2"].includes(prediction)) {
      return "doubleChance"
    }

    return "classic"
  }
}

