class ContentLayoutManager {
    constructor() {
        this.contentWrap = null;
        this.pageHeader = null;
        this.resizeObserver = null;
        this.initialized = false;
    }

    initialize() {
        // Get references to required elements
        this.contentWrap = document.querySelector('.content-wrap');
        this.pageHeader = document.querySelector('.page-header');
        
        if (!this.contentWrap) {
            console.error('Content wrap element not found');
            return false;
        }
        
        // Set initial margin
        this.updateContentMargin();
        
        // Set up event listeners
        window.addEventListener('resize', this.updateContentMargin.bind(this));
        
        // Set up MutationObserver to detect DOM changes
        this.setupMutationObserver();
        
        // Set up ResizeObserver for the header element
        this.setupResizeObserver();
        
        this.initialized = true;
        return true;
    }
    
    updateContentMargin() {
        if (!this.contentWrap) return;
        
        // Default margin if header doesn't exist
        let headerHeight = 64; // Default fallback height
        
        if (this.pageHeader) {
            // Get the actual height of the header
            headerHeight = this.pageHeader.offsetHeight;
        }
        
        // Update content wrap margin-top
        this.contentWrap.style.marginTop = `${headerHeight}px`;
        
        // Update min-height calculation to account for header height
        this.contentWrap.style.minHeight = `calc(100vh - ${headerHeight}px)`;
    }
    
    setupMutationObserver() {
        // Create a MutationObserver to watch for changes to the DOM
        const observer = new MutationObserver((mutations) => {
            // Check if .page-header has been added or modified
            for (const mutation of mutations) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // If header reference is lost, try to find it again
                    if (!this.pageHeader) {
                        this.pageHeader = document.querySelector('.page-header');
                    }
                    this.updateContentMargin();
                }
            }
        });
        
        // Start observing the document with configured parameters
        observer.observe(document.body, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }
    
    setupResizeObserver() {
        // Create a ResizeObserver to watch for changes to the header size
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateContentMargin();
            });
            
            // If we have a header, observe it
            if (this.pageHeader) {
                this.resizeObserver.observe(this.pageHeader);
            }
            
            // Set up a mutation observer to detect when header is added if not present initially
            const headerWatcher = new MutationObserver((mutations) => {
                if (!this.pageHeader) {
                    this.pageHeader = document.querySelector('.page-header');
                    if (this.pageHeader && this.resizeObserver) {
                        this.resizeObserver.observe(this.pageHeader);
                        headerWatcher.disconnect(); // Stop observing once header is found
                    }
                }
            });
            
            headerWatcher.observe(document.body, { childList: true, subtree: true });
        }
    }
}

export default ContentLayoutManager;