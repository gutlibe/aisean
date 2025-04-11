// subscription-manager.js
class SubscriptionManager {
  constructor() {
    this.firebase = null;
    this.initialized = false;
    this.firestore = null;
    this.doc = null;
    this.getDoc = null;
    this.updateDoc = null;
    this.setDoc = null;
    this.Timestamp = null;
    this.runTransaction = null;
    this.collection = null;
  }
  
  async initialize() {
    if (this.initialized) {
      return true;
    }
    
    try {
      this.firebase = window.app.getLibrary('firebase');
      if (!this.firebase) {
        console.error('Firebase is required for SubscriptionManager');
        return false;
      }
      
      // Store necessary Firebase/Firestore functions and instances
      this.firestore = this.firebase.firestore;
      this.doc = this.firebase.doc;
      this.getDoc = this.firebase.getDoc;
      this.updateDoc = this.firebase.updateDoc;
      this.setDoc = this.firebase.setDoc;
      this.Timestamp = this.firebase.Timestamp;
      this.runTransaction = this.firebase.runTransaction;
      this.collection = this.firebase.collection;
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('SubscriptionManager initialization failed:', error);
      return false;
    }
  }
  
  // Helper function to safely get date from timestamp
  _getDateFromTimestamp(timestamp) {
    if (!timestamp) return null;
    
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // If it's a Firebase Timestamp object with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // If it's a number (Unix timestamp in milliseconds)
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    // If it's a string representation of a timestamp
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // If it's an object with seconds and nanoseconds (Firebase Timestamp format)
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }
    
    return null;
  }
  
  async verifyUserSubscription(uid) {
    if (!this.initialized) {
      return {
        success: false,
        status: 'error',
        message: 'SubscriptionManager not initialized',
        updated: false
      };
    }
    
    if (!uid) {
      return {
        success: false,
        status: 'error',
        message: 'User ID is required for subscription verification',
        updated: false
      };
    }
    
    try {
      const now = new Date();
      const nowTimestamp = this.Timestamp.fromDate(now);
      
      // Get user document
      const userRef = this.doc(this.firestore, 'users', uid);
      const userDoc = await this.getDoc(userRef);
      
      if (!userDoc.exists()) {
        return {
          success: false,
          status: 'not_found',
          message: `User ${uid} not found during subscription verification`,
          updated: false
        };
      }
      
      const userData = userDoc.data();
      
      // If user is not pro or doesn't have subscription status, no verification needed
      if (userData.userType !== 'Pro' ||
        !userData.subscriptionStatus ||
        !userData.subscriptionStatus.isActive) {
        return {
          success: true,
          status: 'not_pro_or_inactive',
          message: 'User is not a Pro user or has an inactive subscription',
          updated: false
        };
      }
      
      const endTimestamp = userData.subscriptionStatus.endTimestamp;
      const endDate = this._getDateFromTimestamp(endTimestamp);
      
      if (!endDate) {
        return {
          success: false,
          status: 'error',
          message: `Unable to parse endTimestamp for user ${uid}`,
          updated: false
        };
      }
      
      // Check if subscription has expired
      if (endDate < now) {
        // Use a transaction to ensure all updates happen atomically
        const result = await this.runTransaction(this.firestore, async (transaction) => {
          // Update user document to mark subscription as expired
          transaction.update(userRef, {
            'userType': 'Member',
            'subscriptionStatus.isActive': false,
            'subscriptionStatus.lastChecked': nowTimestamp,
            'updatedAt': nowTimestamp
          });
          
          // Update subscription document
          const subscriptionRef = this.doc(this.firestore, 'subscriptions', uid);
          
          // Get subscription document first to check if it exists
          const subscriptionDoc = await transaction.get(subscriptionRef);
          
          if (subscriptionDoc.exists()) {
            transaction.update(subscriptionRef, {
              'isActive': false,
              'lastVerified': nowTimestamp,
              'updatedAt': nowTimestamp
            });
          }
          
          // Get a safe ID for the history record
          const plan = userData.subscriptionStatus.plan || 'unknown';
          const endTime = endDate.getTime() || Date.now();
          const recordId = `${plan}_${endTime}`;
          
          // Create subscription history record
          const historyRef = this.doc(
            this.firestore,
            `subscriptionHistory/${uid}/records/${recordId}`
          );
          
          transaction.set(historyRef, {
            plan: plan,
            startDate: userData.subscriptionStatus.startTimestamp || null,
            endDate: endTimestamp,
            status: 'expired',
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp
          });
          
          return {
            success: true,
            status: 'expired',
            message: 'Subscription has expired and was updated',
            updated: true
          };
        });
        
        return result;
      } else {
        // Subscription is still active, update the lastChecked timestamp
        const subscriptionRef = this.doc(this.firestore, 'subscriptions', uid);
        
        // Also use a transaction here for consistency and to maintain the approach
        // This ensures both the user and subscription documents are updated together
        const result = await this.runTransaction(this.firestore, async (transaction) => {
          // Update user document
          transaction.update(userRef, {
            'subscriptionStatus.lastChecked': nowTimestamp
          });
          
          // Get subscription document first to check if it exists
          const subscriptionDoc = await transaction.get(subscriptionRef);
          
          if (subscriptionDoc.exists()) {
            transaction.update(subscriptionRef, {
              'lastVerified': nowTimestamp
            });
          }
          
          return {
            success: true,
            status: 'active',
            message: 'Subscription is active and timestamps were updated',
            updated: true
          };
        });
        
        return result;
      }
    } catch (error) {
      console.error(`Error verifying subscription for user ${uid}:`, error);
      return {
        success: false,
        status: 'error',
        message: `Error verifying subscription: ${error.message}`,
        updated: false
      };
    }
  }
}

export default {
  initialize: async () => {
    const manager = new SubscriptionManager();
    await manager.initialize();
    return manager;
  }
};