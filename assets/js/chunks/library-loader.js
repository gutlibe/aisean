const LibraryLoader = {
    instance: null,
    loadedLibraries: new Map(),
    loadingPromises: new Map(),
    criticalLibraries: ['firebaseApp', 'firebaseAuth', 'firebaseDatabase', 'firebaseFirestore'],
    libraryConfigs: {
        firebaseApp: {
            url: 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js',
            globalVar: 'firebase',
            version: '11.6.0',
            type: 'module',
            critical: true
        },
        firebaseAuth: {
            url: 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js',
            globalVar: 'firebaseAuth',
            version: '11.6.0',
            type: 'module',
            dependencies: ['firebaseApp'],
            critical: true
        },
        firebaseDatabase: {
            url: 'https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js',
            globalVar: 'firebaseDatabase',
            version: '11.6.0',
            type: 'module',
            dependencies: ['firebaseApp'],
            critical: true
        },
        firebaseFirestore: {
            url: 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js',
            globalVar: 'firebaseFirestore',
            version: '11.6.0',
            type: 'module',
            dependencies: ['firebaseApp'],
            critical: true
        },
        paystack: {
            url: 'https://js.paystack.co/v2/inline.js',
            globalVar: 'PaystackPop',
            version: '2.0.0',
            type: 'script',
            critical: false
        }
    },

    firebaseConfig: {
            apiKey: "AIzaSyCdqEXkgSy8GH1Xh1lXes6RFcuch6KtBsk",
            authDomain: "aisean.firebaseapp.com",
            databaseURL: "https://aisean-default-rtdb.firebaseio.com",
            projectId: "aisean",
            storageBucket: "aisean.firebasestorage.app",
            messagingSenderId: "230112341467",
            appId: "1:230112341467:web:9e6c9d35b6060911e48bfe",
            measurementId: "G-CJ2EQM0MQC"
    },

    async initialize() {
        if (this.instance) {
            return this.instance;
        }

        try {
            await this.loadCriticalLibraries();
            this.loadNonCriticalLibraries();
            
            this.instance = this;
            return this;
        } catch (error) {
            throw new Error('Unable to initialize core application services. Please check your internet connection and try again.');
        }
    },

    async loadCriticalLibraries() {
        const firebase = await this.loadFirebaseLibraries();
        return firebase;
    },

    loadNonCriticalLibraries() {
        Object.keys(this.libraryConfigs)
            .filter(key => !this.libraryConfigs[key].critical)
            .forEach(key => {
                this.loadLibrary(key)
                    .catch(() => {
                        // Silently handle non-critical library load failures
                    });
            });
    },

    async loadFirebaseLibraries() {
        const loadPromises = [];
    
        const firebaseApp = await this.loadLibrary('firebaseApp');
        const app = firebaseApp.initializeApp(this.firebaseConfig);
    
        loadPromises.push(this.loadLibrary('firebaseAuth'));
        loadPromises.push(this.loadLibrary('firebaseDatabase'));
        loadPromises.push(this.loadLibrary('firebaseFirestore'));
    
        const [firebaseAuth, firebaseDatabase, firebaseFirestore] = await Promise.all(loadPromises);
    
        const auth = firebaseAuth.getAuth(app);
        const database = firebaseDatabase.getDatabase(app);
        const firestore = firebaseFirestore.getFirestore(app);
    
        const firebase = {
            app,
            auth,
            database,
            firestore,
            // Add Firestore methods
            collection: firebaseFirestore.collection,
            doc: firebaseFirestore.doc,
            getDoc: firebaseFirestore.getDoc,
            setDoc: firebaseFirestore.setDoc,
            updateDoc: firebaseFirestore.updateDoc,
            writeBatch: firebaseFirestore.writeBatch,
            increment: firebaseFirestore.increment,
            ...firebaseDatabase,
            ...firebaseFirestore,
            signOut: firebaseAuth.signOut,
        };
    
        // Removed console.log for production optimization
    
        this.loadedLibraries.set('firebase', firebase);
        return firebase;
    },

    async loadLibrary(libraryKey) {
        if (this.loadedLibraries.has(libraryKey)) {
            return this.loadedLibraries.get(libraryKey);
        }

        if (this.loadingPromises.has(libraryKey)) {
            return this.loadingPromises.get(libraryKey);
        }

        const config = this.libraryConfigs[libraryKey];
        if (!config) {
            throw new Error('Required application resource not found. Please contact support if this issue persists.');
        }

        const loadPromise = (async () => {
            try {
                if (config.dependencies) {
                    await Promise.all(
                        config.dependencies.map(dep => this.loadLibrary(dep))
                    );
                }

                let library;
                if (config.type === 'module') {
                    library = await import(config.url);
                } else {
                    await this.loadScript(config.url);
                    library = await this.waitForGlobal(config.globalVar);
                }
                
                this.loadedLibraries.set(libraryKey, library);
                this.loadingPromises.delete(libraryKey);
                return library;
            } catch (error) {
                this.loadingPromises.delete(libraryKey);
                throw new Error('Unable to load required resources. Please check your internet connection and try again.');
            }
        })();

        this.loadingPromises.set(libraryKey, loadPromise);
        return loadPromise;
    },

    async loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load required resources. Please refresh the page and try again.'));

            document.head.appendChild(script);
        });
    },

    async waitForGlobal(globalVarName, timeout = 5000) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            if (window[globalVarName]) {
                return window[globalVarName];
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('Application resources took too long to load. Please check your internet connection and try again.');
    },

    getLibrary(libraryKey) {
        if (!this.loadedLibraries.has(libraryKey)) {
            throw new Error('Required application resource is not available. Please refresh the page.');
        }
        return this.loadedLibraries.get(libraryKey);
    },

    getFirebase() {
        return this.getLibrary('firebase');
    }
};

export default LibraryLoader;
