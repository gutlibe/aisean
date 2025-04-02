// subscription-manager.js
class SubscriptionManager {
    constructor() {
        this.firebase = null;
        this.initialized = false;
        this.checkIntervalInMinutes = 60; // Check every hour by default
        this.checkInterval = null;
    }

    async initialize(checkIntervalInMinutes = 60) {
        if (this.initialized) {
            return true;
        }

        try {
            this.firebase = window.app.getLibrary('firebase');
            if (!this.firebase) {
                console.error('Firebase is required for SubscriptionManager');
                return false;
            }

            this.checkIntervalInMinutes = checkIntervalInMinutes;
            
            // Perform initial check
            await this.verifyAllSubscriptions();
            
            // Set up periodic checks
            this.checkInterval = setInterval(() => {
                this.verifyAllSubscriptions().catch(error => {
                    console.error('Error during subscription verification:', error);
                });
            }, this.checkIntervalInMinutes * 60 * 1000);
            
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

    async verifyAllSubscriptions() {
        try {
            const now = new Date();
            const nowTimestamp = this.firebase.Timestamp.fromDate(now);
            
            // Get all users with userType 'Pro'
            const usersRef = this.firebase.collection(this.firebase.firestore, 'users');
            const proUsersQuery = this.firebase.query(
                usersRef,
                this.firebase.where('userType', '==', 'Pro')
            );
            
            const proUsersSnapshot = await this.firebase.getDocs(proUsersQuery);
            
            const batch = this.firebase.writeBatch(this.firebase.firestore);
            let updatedCount = 0;
            
            proUsersSnapshot.forEach(userDoc => {
                const userData = userDoc.data();
                const uid = userDoc.id;
                
                if (userData.subscriptionStatus && userData.subscriptionStatus.isActive) {
                    const endTimestamp = userData.subscriptionStatus.endTimestamp;
                    const endDate = this._getDateFromTimestamp(endTimestamp);
                    
                    // Skip if unable to parse end date
                    if (!endDate) {
                        console.warn(`Unable to parse endTimestamp for user ${uid}`);
                        return;
                    }
                    
                    // Check if subscription has expired
                    if (endDate < now) {
                        // Update user document to mark subscription as expired
                        const userRef = this.firebase.doc(this.firebase.firestore, 'users', uid);
                        batch.update(userRef, {
                            'userType': 'Member',
                            'subscriptionStatus.isActive': false,
                            'subscriptionStatus.lastChecked': nowTimestamp,
                            'updatedAt': nowTimestamp
                        });
                        
                        // Update subscription document
                        const subscriptionRef = this.firebase.doc(this.firebase.firestore, 'subscriptions', uid);
                        batch.update(subscriptionRef, {
                            'isActive': false,
                            'lastVerified': nowTimestamp,
                            'updatedAt': nowTimestamp
                        });
                        
                        // Get a safe ID for the history record
                        const recordId = userData.subscriptionStatus.plan + '_' + 
                            (endDate.getTime() || Date.now());
                        
                        // Create subscription history record
                        const historyRef = this.firebase.doc(
                            this.firebase.firestore, 
                            `subscriptionHistory/${uid}/records/${recordId}`
                        );
                        
                        batch.set(historyRef, {
                            plan: userData.subscriptionStatus.plan,
                            startDate: userData.subscriptionStatus.startTimestamp || null,
                            endDate: endTimestamp,
                            status: 'expired',
                            createdAt: nowTimestamp,
                            updatedAt: nowTimestamp
                        });
                        
                        updatedCount++;
                    } else {
                        // Just update the lastChecked timestamp for active subscriptions
                        const userRef = this.firebase.doc(this.firebase.firestore, 'users', uid);
                        batch.update(userRef, {
                            'subscriptionStatus.lastChecked': nowTimestamp
                        });
                        
                        const subscriptionRef = this.firebase.doc(this.firebase.firestore, 'subscriptions', uid);
                        batch.update(subscriptionRef, {
                            'lastVerified': nowTimestamp
                        });
                    }
                }
            });
            
            // Commit all updates in a single batch
            if (updatedCount > 0 || proUsersSnapshot.size > 0) {
                await batch.commit();
                console.log(`Subscription check completed: ${updatedCount} expired subscriptions processed, ${proUsersSnapshot.size} total pro users checked.`);
            }
            
            return {
                totalChecked: proUsersSnapshot.size,
                expired: updatedCount
            };
        } catch (error) {
            console.error('Error verifying subscriptions:', error);
            throw error;
        }
    }
    
    async verifyUserSubscription(uid) {
        if (!uid) {
            console.error('User ID is required for subscription verification');
            return false;
        }
        
        try {
            const now = new Date();
            const nowTimestamp = this.firebase.Timestamp.fromDate(now);
            
            // Get user document
            const userRef = this.firebase.doc(this.firebase.firestore, 'users', uid);
            const userDoc = await this.firebase.getDoc(userRef);
            
            if (!userDoc.exists()) {
                console.warn(`User ${uid} not found during subscription verification`);
                return false;
            }
            
            const userData = userDoc.data();
            
            // If user is not pro or doesn't have subscription status, no verification needed
            if (userData.userType !== 'Pro' || !userData.subscriptionStatus || !userData.subscriptionStatus.isActive) {
                return false;
            }
            
            const endTimestamp = userData.subscriptionStatus.endTimestamp;
            const endDate = this._getDateFromTimestamp(endTimestamp);
            
            if (!endDate) {
                console.warn(`Unable to parse endTimestamp for user ${uid}`);
                return false;
            }
            
            // Check if subscription has expired
            if (endDate < now) {
                // Update user document to mark subscription as expired
                await this.firebase.updateDoc(userRef, {
                    'userType': 'Member',
                    'subscriptionStatus.isActive': false,
                    'subscriptionStatus.lastChecked': nowTimestamp,
                    'updatedAt': nowTimestamp
                });
                
                // Update subscription document
                const subscriptionRef = this.firebase.doc(this.firebase.firestore, 'subscriptions', uid);
                await this.firebase.updateDoc(subscriptionRef, {
                    'isActive': false,
                    'lastVerified': nowTimestamp,
                    'updatedAt': nowTimestamp
                });
                
                // Get a safe ID for the history record
                const recordId = userData.subscriptionStatus.plan + '_' + 
                    (endDate.getTime() || Date.now());
                
                // Create subscription history record
                const historyRef = this.firebase.doc(
                    this.firebase.firestore, 
                    `subscriptionHistory/${uid}/records/${recordId}`
                );
                
                await this.firebase.setDoc(historyRef, {
                    plan: userData.subscriptionStatus.plan,
                    startDate: userData.subscriptionStatus.startTimestamp || null,
                    endDate: endTimestamp,
                    status: 'expired',
                    createdAt: nowTimestamp,
                    updatedAt: nowTimestamp
                });
                
                return {
                    updated: true,
                    status: 'expired'
                };
            } else {
                // Just update the lastChecked timestamp
                await this.firebase.updateDoc(userRef, {
                    'subscriptionStatus.lastChecked': nowTimestamp
                });
                
                const subscriptionRef = this.firebase.doc(this.firebase.firestore, 'subscriptions', uid);
                await this.firebase.updateDoc(subscriptionRef, {
                    'lastVerified': nowTimestamp
                });
                
                return {
                    updated: true,
                    status: 'active'
                };
            }
        } catch (error) {
            console.error(`Error verifying subscription for user ${uid}:`, error);
            return false;
        }
    }
    
    stopChecking() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

export default {
    initialize: async (checkIntervalInMinutes) => {
        const manager = new SubscriptionManager();
        await manager.initialize(checkIntervalInMinutes);
        return manager;
    }
};
