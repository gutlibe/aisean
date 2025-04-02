/**
 * AuthManager.js
 * Authentication utilities for the Page class
 */

export class AuthManager {
  constructor(page) {
    this.page = page
    this.authData = null
  }

  async waitForAuthAndUser(maxWait = 15000, interval = 100) {
    return new Promise((resolve) => {
      const startTime = Date.now()

      const checkAuth = async () => {
        try {
          const authManager = window.app?.getAuthManager()
          const firebase = window.app?.getLibrary("firebase")

          if (!authManager || !firebase || !firebase.firestore) {
            if (Date.now() - startTime >= maxWait) {
              resolve({ auth: authManager, user: null, firebase, userType: null, username: null, isReady: false })
            } else {
              setTimeout(checkAuth, interval)
            }
            return
          }

          const user = authManager.getCurrentUser()

          if (!user) {
            if (authManager.isInitializing()) {
              if (Date.now() - startTime >= maxWait) {
                resolve({
                  auth: authManager,
                  user: null,
                  firebase,
                  userType: null,
                  username: null,
                  isReady: false,
                  stillInitializing: true,
                })
              } else {
                setTimeout(checkAuth, interval)
              }
              return
            }

            resolve({
              auth: authManager,
              user: null,
              firebase,
              userType: null,
              username: null,
              isReady: true,
              stillInitializing: false,
            })
            return
          }

          let username = null
          try {
            const userDoc = await firebase.getDoc(firebase.doc(firebase.firestore, `users/${user.uid}`))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              username = userData.username
            }
          } catch (error) {
            console.error("Error fetching username:", error)
          }

          if (!this.page.authorizedUserTypes || this.page.authorizedUserTypes.length === 0) {
            resolve({
              auth: authManager,
              user,
              firebase,
              userType: null,
              username,
              isReady: true,
            })
            return
          }

          try {
            const userDoc = await firebase.getDoc(firebase.doc(firebase.firestore, `users/${user.uid}`))

            if (userDoc.exists()) {
              const userData = userDoc.data()
              const userType = userData.userType
              username = userData.username || username

              const isAuthorized = this.page.authorizedUserTypes.includes(userType)

              resolve({
                auth: authManager,
                user,
                firebase,
                userType,
                isAuthorized,
                username,
                isReady: true,
              })
            } else {
              resolve({
                auth: authManager,
                user,
                firebase,
                userType: null,
                isAuthorized: false,
                username,
                isReady: true,
              })
            }
          } catch (error) {
            resolve({
              auth: authManager,
              user,
              firebase,
              userType: null,
              isAuthorized: false,
              username,
              error,
              isReady: true,
            })
          }
        } catch (error) {
          if (Date.now() - startTime >= maxWait) {
            resolve({
              auth: null,
              user: null,
              firebase: null,
              userType: null,
              isAuthorized: false,
              username: null,
              error,
              isReady: false,
            })
          } else {
            setTimeout(checkAuth, interval)
          }
        }
      }

      checkAuth()
    })
  }

  async verifyAuth() {
    const authData = await this.waitForAuthAndUser(15000)
    this.authData = authData

    if (authData.stillInitializing) {
      return { success: true, authData, pending: true }
    }

    if (!authData.auth || !authData.firebase) {
      return {
        success: false,
        error: "AUTH_ERROR",
        message: "Authentication system unavailable",
      }
    }

    // Always fetch user data when logged in, regardless of page auth requirements
    if (authData.user) {
      try {
        const userDoc = await authData.firebase.getDoc(
          authData.firebase.doc(authData.firebase.firestore, `users/${authData.user.uid}`),
        )
        if (userDoc.exists()) {
          const userData = userDoc.data()
          authData.userType = userData.userType
          authData.username = userData.username
          this.authData = authData
        }
      } catch (error) {
        console.error("User data fetch error:", error)
      }
    }

    if (!this.page.requiresAuth && this.page.authorizedUserTypes.length === 0) {
      return { success: true, authData }
    }

    if (this.page.requiresAuth && !authData.user) {
      return {
        success: false,
        error: "AUTH_ERROR",
        message: "Authentication required",
      }
    }

    if (this.page.authorizedUserTypes.length > 0 && authData.user) {
      const isAuthorized = this.page.authorizedUserTypes.includes(authData.userType)
      if (!isAuthorized) {
        return {
          success: false,
          error: "UNAUTHORIZED",
          message: "User not authorized",
        }
      }
    }

    return {
      success: true,
      authData: {
        ...authData,
        userType: authData.userType || null,
        username: authData.username || null,
      },
    }
  }

  async recheckAuth(originalRenderTimestamp) {
    try {
      if (this.page.latestRenderTimestamp !== originalRenderTimestamp) return

      const authResult = await this.verifyAuth()

      if (authResult.pending) {
        setTimeout(() => this.recheckAuth(originalRenderTimestamp), 2000)
        return
      }

      if (!authResult.success) {
        if (authResult.error === "AUTH_ERROR") {
          window.location.replace("/login")
        } else if (authResult.error === "UNAUTHORIZED") {
          // Get the appropriate unauthorized redirect path
          const redirectPath = window.app.router.getUnauthorizedRedirectPath()
          window.app.navigateTo(redirectPath)
        }
      }
    } catch (error) {
      console.error("Error during auth recheck:", error)
    }
  }

  setupAuthListener(callback) {
    const authManager = window.app?.getAuthManager()
    if (!authManager) return null

    const currentPage = this.page
    let isProcessing = false

    const authHandler = async (user) => {
      if (isProcessing) return
      isProcessing = true

      try {
        const authData = await currentPage.authManager.waitForAuthAndUser()
        currentPage.authData = authData
        if (callback) callback(authData)
      } finally {
        isProcessing = false
      }
    }

    const unsubscribe = authManager.onAuthStateChange(authHandler)
    return () => {
      if (currentPage === this.page) unsubscribe()
    }
  }

  getUserData() {
    return this.authData?.user || null
  }

  getUserType() {
    return this.authData?.userType || null
  }

  getUserName() {
    return this.authData?.username || null
  }

  isUserAuthorized() {
    if (!this.page.requiresAuth) return true
    if (this.page.authorizedUserTypes.length > 0) {
      return this.authData?.isAuthorized || false
    }
    return !!this.authData?.user
  }
}


