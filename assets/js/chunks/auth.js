const AuthManager = {
  instance: null,
  listeners: new Set(),
  user: null,
  authStateDetermined: false, // Flag to indicate if the auth state has been determined

  async initialize() {
    if (this.instance) {
      return this.instance;
    }

    try {
      const firebase = window.app.getLibrary('firebase');
      this.firebase = firebase;

      firebase.auth.onAuthStateChanged((user) => {
        this.user = user;
        // Mark auth state as determined on the first callback
        if (!this.authStateDetermined) {
          this.authStateDetermined = true;
        }
        this.notifyListeners(user);
      });

      this.instance = this;
      return this;
    } catch (error) {
      throw error;
    }
  },

  // Returns true if the auth state has not been determined yet
  isInitializing() {
    return !this.authStateDetermined;
  },

  onAuthStateChange(callback) {
    if (typeof callback !== 'function') {
      return;
    }

    this.listeners.add(callback);

    if (this.user !== undefined) {
      try {
        callback(this.user);
      } catch (error) {
        // Handle error silently
      }
    }

    return () => this.listeners.delete(callback);
  },

  notifyListeners(user) {
    this.listeners.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        // Handle error silently
      }
    });
  },

  getCurrentUser() {
    return this.user;
  },

  getFirebase() {
    return this.firebase;
  }
};

export default AuthManager;
