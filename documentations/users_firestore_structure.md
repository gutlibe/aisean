firestore-structure/
├── users/
│   ├── [user-uid]/
│   │   ├── username: string
│   │   ├── email: string
│   │   ├── createdAt: timestamp
│   │   ├── lastLogin: timestamp
│   │   ├── userType: "Member"        //Admin, Pro
│   │   └── status: "active"