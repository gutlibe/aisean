firestore/
├── users/
│   └── {uid}/                  # User document, indexed by user ID
│       ├── userType            # "pro" or "Member"
│       ├── subscriptionStatus  # Object containing subscription data
│       │   ├── isActive        # Boolean
│       │   ├── plan            # "monthly" or "quarterly" 
│       │   ├── endTimestamp    # Timestamp when subscription ends
│       │   └── lastChecked     # Timestamp of last verification
│       ├── createdAt           # User creation timestamp
│       └── updatedAt           # Last update timestamp
│
├── subscriptions/
│   └── {uid}/                  # Subscription document, indexed by user ID
│       ├── uid                 # User ID
│       ├── plan                # "monthly" or "quarterly"
│       ├── amount              # Amount paid
│       ├── startDate           # Timestamp when subscription started
│       ├── endDate             # Timestamp when subscription ends
│       ├── isActive            # Boolean
│       ├── lastVerified        # Timestamp of last verification
│       ├── createdAt           # Creation timestamp
│       └── updatedAt           # Last update timestamp
│
├── payments/
│   └── {uid}/                  # User's payment collection
│       └── transactions/       # Subcollection for transactions
│           └── {paymentId}/    # Individual payment document
│               ├── plan        # Subscription plan
│               ├── amount      # Amount paid
│               ├── paymentDate # Timestamp of payment
│               ├── paymentMethod # "paystack" or other methods
│               ├── reference   # Payment reference from payment gateway
│               ├── status      # "completed" or other statuses
│               └── createdAt   # Creation timestamp
│
└── subscriptionHistory/
    └── {uid}/                  # User's subscription history collection
        └── records/            # Subcollection for historical records
            └── {historyId}/    # Individual history document
                ├── plan        # Subscription plan
                ├── startDate   # Start timestamp
                ├── endDate     # End timestamp
                ├── status      # "active" or "expired"
                ├── amount      # Amount paid
                ├── createdAt   # Creation timestamp
                └── updatedAt   # Last update timestamp (when expired)