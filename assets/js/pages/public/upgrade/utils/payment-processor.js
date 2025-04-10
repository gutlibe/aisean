class PaymentProcessor {
  constructor() {
    this.PAYSTACK_PUBLIC_KEY = null;
    this.firebase = null;
    this.currentUser = null;
    this.initialized = false;
  }

  async initialize(firebase, currentUser) {
    if (!firebase) {
      console.error("Firebase instance is required for payment initialization");
      window.app?.showToast("Firebase instance is required", "error", 5000, "Init Error");
      return false;
    }

    if (!currentUser) {
      console.error("User authentication required for payment initialization");
      window.app?.showToast("User authentication required", "error", 5000, "Auth Error");
      return false;
    }

    this.firebase = firebase;
    this.currentUser = currentUser;

    try {
      const configKeys = await this.getConfigKeys();
      this.PAYSTACK_PUBLIC_KEY = configKeys.PAYSTACK_PUBLIC_KEY;

      if (!this.PAYSTACK_PUBLIC_KEY) {
        console.error("Payment system configuration (Paystack Key) not found");
        window.app?.showToast("Payment config missing", "error", 5000, "Config Error");
        return false;
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Error initializing payment processor:", error);
      window.app?.showToast("Payment init failed", "error", 5000, "Init Error");
      return false;
    }
  }

  async getConfigKeys() {
    try {
      const { ref, get, database } = this.firebase;
      const configRef = ref(database, 'configs');
      const snapshot = await get(configRef);
      const configs = snapshot.val();
      if (!configs || !configs.PAYSTACK_PUBLIC_KEY) {
         console.error("Unable to load Paystack configuration from Firebase 'configs'");
         window.app?.showToast("Payment config error", "error", 5000, "Config Error");
         throw new Error('Paystack configuration not found in Firebase');
      }
      return {
        PAYSTACK_PUBLIC_KEY: configs.PAYSTACK_PUBLIC_KEY
      };
    } catch (error) {
      console.error("Failed to retrieve configuration keys:", error);
      window.app?.showToast("Config load failed", "error", 5000, "Config Error");
      throw new Error('Failed to retrieve configuration keys');
    }
  }

  async initiatePayment(paymentDetails, callbacks = {}) {
    if (!this.initialized) {
      const errorMsg = "Payment processor not properly initialized";
      console.error(errorMsg);
      window.app?.showToast(errorMsg, "error", 5000, "Init Error");
      throw new Error(errorMsg);
    }

    if (!paymentDetails.plan || !paymentDetails.amount || !paymentDetails.email) {
       const errorMsg = "Missing required payment details (plan, amount, email)";
       console.error(errorMsg, paymentDetails);
       window.app?.showToast("Missing payment details", "error", 5000, "Validation Error");
       throw new Error(errorMsg);
    }

    const amountInPesewas = Math.round(paymentDetails.amount * 100);
    const reference = `PRO_${this.currentUser.uid}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      try {
        if (typeof PaystackPop === 'undefined') {
            const errorMsg = "Paystack JS library not loaded.";
            console.error(errorMsg);
            window.app?.showToast(errorMsg, "error", 5000, "Setup Error");
            return reject(new Error(errorMsg));
        }

        const paystack = new PaystackPop();
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
              if (response.status === "success") {
                const subscriptionResult = await this.processSuccessfulSubscription(paymentDetails, response.reference);
                if (callbacks.onSuccess) {
                  callbacks.onSuccess({
                    ...response,
                    subscription: subscriptionResult.subscription,
                  });
                }
                 window.app?.showToast("Payment successful", "success", 5000, "Subscription Activated");
                resolve({
                  status: "success",
                  reference: response.reference,
                  transaction: response.transaction,
                  subscription: subscriptionResult.subscription,
                });
              } else {
                const error = new Error(`Payment was not successful: ${response.status} - ${response.message || 'No message'}`);
                console.warn("Paystack payment unsuccessful response:", response);
                window.app?.showToast("Payment not successful", "warning", 5000, "Payment Status");
                if (callbacks.onError) {
                  callbacks.onError(error);
                }
                resolve({ status: "failed", message: response.message || 'Payment failed', response: response });
              }
            } catch (error) {
              console.error("Error processing successful subscription callback:", error);
              window.app?.showToast("Subscription update failed", "error", 5000, "Processing Error");
              if (callbacks.onError) {
                callbacks.onError(error);
              }
              reject(error);
            }
          },
          onClose: () => {
            if (callbacks.onClose) {
              callbacks.onClose();
            }
            window.app?.showToast("Payment window closed", "info", 3000);
            resolve({ status: "closed" });
          }
        });
      } catch (error) {
        console.error("Error initiating Paystack transaction:", error);
        window.app?.showToast("Error starting payment", "error", 5000, "Payment Error");
        if (callbacks.onError) {
          callbacks.onError(error);
        }
        reject(error);
      }
    });
  }

  async processSuccessfulSubscription(paymentDetails, reference) {
    if (!this.initialized) {
      throw new Error("Payment processor not properly initialized");
    }

    try {
      const { firestore, writeBatch, doc, collection, serverTimestamp, getDoc } = this.firebase;
      const uid = this.currentUser.uid;
      const now = new Date();
      const startTimestamp = now.getTime();
      const endDate = new Date(now);
      let daysToAdd = 0;

      if (paymentDetails.plan === "monthly") {
        daysToAdd = 30;
      } else if (paymentDetails.plan === "quarterly") {
        daysToAdd = 90;
      } else {
         console.error("Invalid subscription plan during processing:", paymentDetails.plan);
         window.app?.showToast("Invalid plan type", "error", 5000, "Processing Error");
         throw new Error("Invalid subscription plan");
      }
      endDate.setDate(endDate.getDate() + daysToAdd);
      const endTimestamp = endDate.getTime();

      const batch = writeBatch(firestore);

      const userDocRef = doc(firestore, `users/${uid}`);
      batch.update(userDocRef, {
        userType: "Pro",
        "subscriptionStatus.isActive": true,
        "subscriptionStatus.plan": paymentDetails.plan,
        "subscriptionStatus.endTimestamp": endTimestamp,
        "subscriptionStatus.lastChecked": startTimestamp,
         updatedAt: serverTimestamp(),
      });

      const subscriptionDocRef = doc(firestore, `subscriptions/${uid}`);
      const subscriptionData = {
        uid: uid,
        plan: paymentDetails.plan,
        amount: paymentDetails.amount,
        startDate: startTimestamp,
        endDate: endTimestamp,
        isActive: true,
        lastVerified: startTimestamp,
        updatedAt: serverTimestamp(),
      };

      const existingSubscription = await getDoc(subscriptionDocRef);
      if (existingSubscription.exists()) {
        batch.update(subscriptionDocRef, subscriptionData);
      } else {
        batch.set(subscriptionDocRef, {
          ...subscriptionData,
          createdAt: serverTimestamp(),
        });
      }

      const paymentId = `payment_${Date.now()}`;
      const paymentDocRef = doc(firestore, `payments/${uid}/transactions/${paymentId}`);
      batch.set(paymentDocRef, {
        plan: paymentDetails.plan,
        amount: paymentDetails.amount,
        paymentDate: startTimestamp,
        paymentMethod: "paystack",
        reference: reference,
        status: "completed",
        createdAt: serverTimestamp(),
        uid: uid,
      });

      const historyId = `history_${Date.now()}`;
      const historyDocRef = doc(firestore, `subscriptionHistory/${uid}/records/${historyId}`);
      batch.set(historyDocRef, {
        plan: paymentDetails.plan,
        startDate: startTimestamp,
        endDate: endTimestamp,
        status: "active",
        amount: paymentDetails.amount,
        paymentReference: reference,
        createdAt: serverTimestamp(),
        uid: uid,
      });

      await batch.commit();

      return {
        status: "success",
        subscription: {
          plan: paymentDetails.plan,
          startDate: new Date(startTimestamp),
          endDate: new Date(endTimestamp),
        },
      };
    } catch (error) {
      console.error("Error processing successful subscription:", error);
      window.app?.showToast("Subscription update failed", "error", 5000, "Database Error");
      throw new Error("Failed to update subscription. Please contact support.");
    }
  }

  async verifySubscription() {
    if (!this.initialized) {
       const errorMsg = "Payment processor not initialized for verification";
       console.error(errorMsg);
       window.app?.showToast("Cannot verify status", "error", 5000, "Init Error");
       throw new Error(errorMsg);
    }

    try {
      const { firestore, doc, getDoc, updateDoc, writeBatch, collection, query, where, getDocs, serverTimestamp } = this.firebase;
      const uid = this.currentUser.uid;
      const now = new Date().getTime();
      const userDocRef = doc(firestore, `users/${uid}`);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.warn(`User document not found for UID: ${uid} during verification.`);
        window.app?.showToast("User profile missing", "error", 5000, "Verification Error");
        return { isActive: false, message: "User profile not found" };
      }

      const userData = userDoc.data();
      const subscriptionStatus = userData.subscriptionStatus || {};
      const currentUserType = userData.userType;

      const cacheValidDuration = 60 * 60 * 1000;
      if (subscriptionStatus.lastChecked && (now - subscriptionStatus.lastChecked) < cacheValidDuration) {
         const isActiveAccordingToCache = subscriptionStatus.isActive && subscriptionStatus.endTimestamp > now;
         if (isActiveAccordingToCache) {
             return {
                isActive: true,
                plan: subscriptionStatus.plan,
                endDate: new Date(subscriptionStatus.endTimestamp),
                daysRemaining: Math.ceil((subscriptionStatus.endTimestamp - now) / (1000 * 60 * 60 * 24)),
             };
         } else {
            if (subscriptionStatus.endTimestamp && subscriptionStatus.endTimestamp <= now) {
                return {
                   isActive: false,
                   message: "Subscription expired (cached)",
                   lastPlan: subscriptionStatus.plan,
                   expiredOn: new Date(subscriptionStatus.endTimestamp),
                };
            }
         }
      }

      const subscriptionDocRef = doc(firestore, `subscriptions/${uid}`);
      const subscriptionDoc = await getDoc(subscriptionDocRef);

      if (!subscriptionDoc.exists()) {
        const updateData = {
          "subscriptionStatus.isActive": false,
          "subscriptionStatus.plan": null,
          "subscriptionStatus.endTimestamp": null,
          "subscriptionStatus.lastChecked": now,
          updatedAt: serverTimestamp(),
        };
        if (currentUserType === "Pro") {
          updateData.userType = "Member";
        }
        await updateDoc(userDocRef, updateData);

        return {
          isActive: false,
          message: "No active subscription found",
        };
      }

      const subscriptionData = subscriptionDoc.data();
      const endDate = subscriptionData.endDate;

      if (subscriptionData.isActive && endDate > now) {
        const batch = writeBatch(firestore);
        batch.update(subscriptionDocRef, {
          lastVerified: now,
          updatedAt: serverTimestamp(),
        });
        batch.update(userDocRef, {
          userType: "Pro",
          "subscriptionStatus.isActive": true,
          "subscriptionStatus.plan": subscriptionData.plan,
          "subscriptionStatus.endTimestamp": endDate,
          "subscriptionStatus.lastChecked": now,
          updatedAt: serverTimestamp(),
        });
        await batch.commit();

        return {
          isActive: true,
          plan: subscriptionData.plan,
          endDate: new Date(endDate),
          daysRemaining: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
        };
      }
      else {
        const batch = writeBatch(firestore);

        batch.update(subscriptionDocRef, {
          isActive: false,
          lastVerified: now,
          updatedAt: serverTimestamp(),
        });

        const userUpdateData = {
          "subscriptionStatus.isActive": false,
          "subscriptionStatus.plan": subscriptionData.plan,
          "subscriptionStatus.endTimestamp": endDate,
          "subscriptionStatus.lastChecked": now,
          updatedAt: serverTimestamp(),
        };
        if (currentUserType === "Pro") {
          userUpdateData.userType = "Member";
        }
        batch.update(userDocRef, userUpdateData);

        if(endDate) {
            const historyCollectionRef = collection(firestore, `subscriptionHistory/${uid}/records`);
            const historyQuery = query(
              historyCollectionRef,
              where("endDate", "==", endDate),
              where("status", "==", "active")
            );
            const historyQuerySnapshot = await getDocs(historyQuery);
            if (!historyQuerySnapshot.empty) {
              const historyDocToUpdate = historyQuerySnapshot.docs[0];
              batch.update(historyDocToUpdate.ref, {
                status: "expired",
                updatedAt: serverTimestamp(),
              });
            }
        }

        await batch.commit();

        window.app?.showToast("Your subscription has expired", "warning", 7000, "Subscription Status");

        return {
          isActive: false,
          message: "Subscription has expired",
          lastPlan: subscriptionData.plan,
          expiredOn: new Date(endDate),
        };
      }
    } catch (error) {
      console.error("Error verifying subscription:", error);
      window.app?.showToast("Subscription check failed", "error", 5000, "Verification Error");
      const cachedStatus = userData?.subscriptionStatus || {};
      return {
          isActive: cachedStatus.isActive && cachedStatus.endTimestamp > Date.now(),
          message: "Error during verification, status may be outdated.",
          error: true,
      };
    }
  }
}

const paymentProcessor = new PaymentProcessor();
export default paymentProcessor;