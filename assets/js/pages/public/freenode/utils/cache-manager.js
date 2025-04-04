export class FootballCacheManager {
  constructor() {
    this.cache = new Map() // Cache for storing data by date
    this.cacheRefreshTimeout = null
    this.cacheRefreshDelay = 10000 // 10 seconds delay for auto-refresh
    this.usedCacheData = false // Track if we used cache data
  }

  // Check if data is cached for a specific date
  hasCache(dateKey) {
    return this.cache.has(dateKey) && this.cache.get(dateKey).predictions.length > 0
  }

  // Get cached data for a specific date
  getCachedData(dateKey) {
    return this.cache.get(dateKey)
  }

  // Set cache for a specific date
  setCache(dateKey, data) {
    this.cache.set(dateKey, data)
  }

  // Clear cache for a specific date
  clearCache(dateKey) {
    if (this.cache.has(dateKey)) {
      this.cache.delete(dateKey)
    }
  }

  // Clear all cache
  clearAllCache() {
    this.cache.clear()
  }

  // Get used cache data flag
  getUsedCacheData() {
    return this.usedCacheData
  }

  // Set used cache data flag
  setUsedCacheData(value) {
    this.usedCacheData = value
  }

  // Schedule cache refresh
  scheduleCacheRefresh(refreshCallback) {
    // Clear any existing timeout first
    if (this.cacheRefreshTimeout) {
      clearTimeout(this.cacheRefreshTimeout)
    }

    // Set a new timeout to refresh data
    this.cacheRefreshTimeout = setTimeout(() => {
      refreshCallback()
    }, this.cacheRefreshDelay)
  }

  // Clear all timeouts
  clearTimeouts() {
    if (this.cacheRefreshTimeout) {
      clearTimeout(this.cacheRefreshTimeout)
      this.cacheRefreshTimeout = null
    }
  }
}

