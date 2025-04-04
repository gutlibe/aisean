/**
 * Payment processor utility for handling Paystack integration
 * and subscription management with optimized database structure
 */
class PaymentProcessor {
  constructor() {
    this.PAYSTACK_PUBLIC_KEY = null
    this.firebase = null
    this.currentUser = null
    this.initialized = false
  }

  /**
   * Initialize the payment processor with firebase instance and current user
   * @param {Object} firebase - Firebase instance
   * @param {Object} currentUser - Current authenticated user
   * @returns {Promise<Boolean>} - Whether initialization was successful
   */
  async initialize(firebase, currentUser) {
    if (!firebase) {
      window.app.showToast("Firebase instance is required for payment initialization", "error", 5000, "Initialization Error")
      return false
    }

    if (!currentUser) {
      window.app.showToast("User authentication required for payment initialization", "error", 5000, "Authentication Error")
      return false
    }

    this.firebase = firebase
    this.currentUser = currentUser
    
    // Get Paystack key from Firebase config
    try {
      const configKeys = await this.getConfigKeys()
      this.PAYSTACK_PUBLIC_KEY = configKeys.PAYSTACK_PUBLIC_KEY
      
      if (!this.PAYSTACK_PUBLIC_KEY) {
        window.app.showToast("Payment system configuration not found", "error", 5000, "Configuration Error")
        return false
      }
      
      this.initialized = true
      return true
    } catch (error) {
      console.error("Error initializing payment processor:", error)
      window.app.showToast("Payment system initialization failed", "error", 5000, "Initialization Error")
      return false
    }
  }

  /**
   * Retrieves configuration keys from Firebase
   * @returns {Promise<Object>} - Configuration keys
   */
  async getConfigKeys() {
    try {
      const configRef = this.firebase.ref(this.firebase.database, 'configs')
      const snapshot = await this.firebase.get(configRef)
      const configs = snapshot.val()
      if (!configs) {
        window.app.showToast("Unable to load payment configuration", "error", 5000, "Configuration Error")
        throw new Error('No configuration found in Firebase')
      }
      return {
        PAYSTACK_PUBLIC_KEY: configs.PAYSTACK_PUBLIC_KEY
      }
    } catch (error) {
      window.app.showToast("We're experiencing technical difficulties", "error", 5000, "Configuration Error")
      throw new Error('Failed to retrieve configuration keys')
    }
  }

  /**
   * Initializes a Paystack payment
   * @param {Object} paymentDetails - Payment details
   * @param {string} paymentDetails.plan - Plan type ("monthly" or "quarterly")
   * @param {number} paymentDetails.amount - Amount to charge in Ghana Cedis
   * @param {string} paymentDetails.email - Customer email address
   * @param {Object} callbacks - Callback functions
   * @returns {Promise} - Promise that resolves when payment is completed
   */
  async initiatePayment(paymentDetails, callbacks = {}) {
    if (!this.initialized) {
      window.app.showToast("Payment processor not properly initialized", "error", 5000, "Initialization Error")
      throw new Error("Payment processor not properly initialized")
    }

    // Validate payment details
    if (!paymentDetails.plan || !paymentDetails.amount || !paymentDetails.email) {
      window.app.showToast("Missing payment details", "error", 5000, "Validation Error")
      throw new Error("Invalid payment details")
    }

    // Convert Ghana Cedis amount to pesewas (Paystack uses the smallest currency unit)
    const amountInPesewas = Math.round(paymentDetails.amount * 100)

    // Generate a unique reference for this transaction
    const reference = `PRO_${this.currentUser.uid}_${Date.now()}`

    return new Promise((resolve, reject) => {
      try {
        // Initialize Paystack transaction using the modern API
        const paystack = new PaystackPop()
        paystack.newTransaction({
          key: this.PAYSTACK_PUBLIC_KEY,
          email: paymentDetails.email,
          amount: amountInPesewas,
          currency: "GHS",
          ref: reference,
          metadata: {
            user_id: this.currentUser.uid,
            plan_type: paymentDetails.plan,
            amount_cedis: paymentDetails.amount,
          },
          callback: async (response) => {
            try {
              // Payment was successful
              if (response.status === "success") {
                // Process the successful subscription
                const subscriptionResult = await this.processSuccessfulSubscription(paymentDetails, response.reference)

                if (callbacks.onSuccess) {
                  callbacks.onSuccess({
                    ...response,
                    subscription: subscriptionResult.subscription,
                  })
                }

                window.app.showToast("Payment successful", "success", 5000, "Subscription Activated")
                resolve({
                  status: "success",
                  reference: response.reference,
                  transaction: response.transaction,
                  subscription: subscriptionResult.subscription,
                })
              } else {
                const error = new Error("Payment was not successful")
                window.app.showToast("Payment was not successful", "error", 5000, "Payment Error")
                if (callbacks.onError) {
                  callbacks.onError(error)
                }
                reject(error)
              }
            } catch (error) {
              console.error("Error processing subscription:", error)
              window.app.showToast("Error processing subscription", "error", 5000, "Processing Error")
              if (callbacks.onError) {
                callbacks.onError(error)
              }
              reject(error)
            }
          },
          onClose: () => {
            if (callbacks.onClose) {
              callbacks.onClose()
            }
            // Payment window was closed without completing payment
            window.app.showToast("Payment window closed", "info", 3000)
            resolve({ status: "closed" })
          }
        })
      } catch (error) {
        console.error("Error initiating payment:", error)
        window.app.showToast("Error initiating payment", "error", 5000, "Payment Error")
        if (callbacks.onError) {
          callbacks.onError(error)
        }
        reject(error)
      }
    })
  }

  /**
   * Process a successful subscription by updating Firestore
   * @param {Object} paymentDetails - Payment details
   * @param {string} paymentDetails.plan - Plan type ("monthly" or "quarterly")
   * @param {string} reference - Payment reference from Paystack
   * @returns {Promise} - Promise that resolves when database updates are complete
   */
  async processSuccessfulSubscription(paymentDetails, reference) {
    if (!this.initialized) {
      throw new Error("Payment processor not properly initialized")
    }

    try {
      // Extract necessary Firebase methods
      const { firestore, writeBatch, doc, collection, serverTimestamp } = this.firebase
      const uid = this.currentUser.uid

      // Calculate subscription period based on plan
      const now = new Date()
      const startTimestamp = now.getTime()
      const endDate = new Date(now)

      if (paymentDetails.plan === "monthly") {
        endDate.setDate(endDate.getDate() + 30) // 30 days subscription
      } else if (paymentDetails.plan === "quarterly") {
        endDate.setDate(endDate.getDate() + 90) // 90 days subscription
      } else {
        throw new Error("Invalid subscription plan")
      }
      
      const endTimestamp = endDate.getTime()

      // Create a batch to perform multiple operations atomically
      const batch = writeBatch(firestore)

      // 1. Update User Document
      const userDocRef = doc(firestore, `users/${uid}`)
      batch.update(userDocRef, {
        userType: "Pro",
        "subscriptionStatus.isActive": true,
        "subscriptionStatus.plan": paymentDetails.plan,
        "subscriptionStatus.endTimestamp": endTimestamp,
        "subscriptionStatus.lastChecked": startTimestamp,
        updatedAt: serverTimestamp(),
      })

      // 2. Update Subscription Document
      const subscriptionDocRef = doc(firestore, `subscriptions/${uid}`)
      
      // Check if subscription exists
      const existingSubscription = await this.firebase.getDoc(subscriptionDocRef)
      const subscriptionData = {
        uid: uid,
        plan: paymentDetails.plan,
        amount: paymentDetails.amount,
        startDate: startTimestamp,
        endDate: endTimestamp,
        isActive: true,
        lastVerified: startTimestamp,
        updatedAt: serverTimestamp(),
      }
      
      if (existingSubscription.exists()) {
        // Update existing subscription
        batch.update(subscriptionDocRef, subscriptionData)
      } else {
        // Create new subscription
        batch.set(subscriptionDocRef, {
          ...subscriptionData,
          createdAt: serverTimestamp(),
        })
      }

      // 3. Create Payment Record
      const paymentId = `payment_${Date.now()}`
      const paymentDocRef = doc(firestore, `payments/${uid}/transactions/${paymentId}`)
      batch.set(paymentDocRef, {
        plan: paymentDetails.plan,
        amount: paymentDetails.amount,
        paymentDate: startTimestamp,
        paymentMethod: "paystack",
        reference: reference,
        status: "completed",
        createdAt: serverTimestamp(),
      })

      // 4. Create Subscription History Record
      const historyId = `history_${Date.now()}`
      const historyDocRef = doc(firestore, `subscriptionHistory/${uid}/records/${historyId}`)
      batch.set(historyDocRef, {
        plan: paymentDetails.plan,
        startDate: startTimestamp,
        endDate: endTimestamp,
        status: "active",
        amount: paymentDetails.amount,
        createdAt: serverTimestamp(),
      })

      // Commit the batch
      await batch.commit()

      return {
        status: "success",
        subscription: {
          plan: paymentDetails.plan,
          startDate: new Date(startTimestamp),
          endDate: new Date(endTimestamp),
        },
      }
    } catch (error) {
      console.error("Error processing subscription:", error)
      window.app.showToast("Failed to update subscription", "error", 5000, "Database Error")
      throw new Error("Failed to update subscription. Please contact support.")
    }
  }

  /**
   * Verify subscription status for the current user and update if necessary
   * @returns {Promise<Object>} - Subscription status
   */
  async verifySubscription() {
    if (!this.initialized) {
      window.app.showToast("Payment processor not properly initialized", "error", 5000, "Initialization Error")
      throw new Error("Payment processor not properly initialized")
    }

    try {
      const { firestore, doc, getDoc, updateDoc, serverTimestamp } = this.firebase
      const uid = this.currentUser.uid
      const now = new Date().getTime()

      // Get user document to check subscription status
      const userDocRef = doc(firestore, `users/${uid}`)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        window.app.showToast("User profile not found", "error", 5000, "Verification Error")
        throw new Error("User document not found")
      }
      
      const userData = userDoc.data()
      const subscriptionStatus = userData.subscriptionStatus || {};
      
      // If we've checked recently (within the last hour), use cached data
      if (subscriptionStatus.lastChecked && 
          (now - subscriptionStatus.lastChecked) < (60 * 60 * 1000)) {
        
        if (subscriptionStatus.isActive && subscriptionStatus.endTimestamp > now) {
          return {
            isActive: true,
            plan: subscriptionStatus.plan,
            endDate: new Date(subscriptionStatus.endTimestamp),
            daysRemaining: Math.ceil((subscriptionStatus.endTimestamp - now) / (1000 * 60 * 60 * 24)),
          }
        } else {
          return {
            isActive: false,
            message: "Subscription has expired",
            lastPlan: subscriptionStatus.plan,
            expiredOn: subscriptionStatus.endTimestamp ? new Date(subscriptionStatus.endTimestamp) : null,
          }
        }
      }
      
      // Get the subscription document for more detailed info
      const subscriptionDocRef = doc(firestore, `subscriptions/${uid}`)
      const subscriptionDoc = await getDoc(subscriptionDocRef)

      if (!subscriptionDoc.exists()) {
        // Update user document to reflect no subscription
        await updateDoc(userDocRef, {
          userType: "Member",
          "subscriptionStatus.isActive": false,
          "subscriptionStatus.lastChecked": now,
          updatedAt: serverTimestamp(),
        })
        
        return {
          isActive: false,
          message: "No active subscription found",
        }
      }

      const subscriptionData = subscriptionDoc.data()
      const endDate = subscriptionData.endDate

      // Check if subscription is still active
      if (subscriptionData.isActive && endDate > now) {
        // Update lastVerified in subscription and lastChecked in user
        await Promise.all([
          updateDoc(subscriptionDocRef, {
            lastVerified: now,
            updatedAt: serverTimestamp(),
          }),
          updateDoc(userDocRef, {
            "subscriptionStatus.lastChecked": now,
            updatedAt: serverTimestamp(),
          })
        ]);
        
        return {
          isActive: true,
          plan: subscriptionData.plan,
          endDate: new Date(endDate),
          daysRemaining: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
        }
      } else {
        // Subscription has expired, update all relevant documents
        
        // 1. Update subscription document
        await updateDoc(subscriptionDocRef, {
          isActive: false,
          lastVerified: now,
          updatedAt: serverTimestamp(),
        });
        
        // 2. Update user document
        await updateDoc(userDocRef, {
          userType: "Member",
          "subscriptionStatus.isActive": false,
          "subscriptionStatus.lastChecked": now,
          updatedAt: serverTimestamp(),
        });
        
        // 3. Update subscription history if needed
        const historyCollectionRef = collection(firestore, `subscriptionHistory/${uid}/records`);
        const historyQuery = await this.firebase.query(
          historyCollectionRef,
          this.firebase.where("endDate", "==", endDate),
          this.firebase.where("status", "==", "active")
        );
        
        const historyQuerySnapshot = await this.firebase.getDocs(historyQuery);
        
        if (!historyQuerySnapshot.empty) {
          const historyDoc = historyQuerySnapshot.docs[0];
          await updateDoc(historyDoc.ref, {
            status: "expired",
            updatedAt: serverTimestamp(),
          });
        }

        window.app.showToast("Your subscription has expired", "warning", 7000, "Subscription Status")

        return {
          isActive: false,
          message: "Subscription has expired",
          lastPlan: subscriptionData.plan,
          expiredOn: new Date(endDate),
        }
      }
    } catch (error) {
      console.error("Error verifying subscription:", error)
      window.app.showToast("Failed to verify subscription status", "error", 5000, "Verification Error")
      throw new Error("Failed to verify subscription status")
    }
  }
}

// Create and export a singleton instance
const paymentProcessor = new PaymentProcessor()
export default paymentProcessor