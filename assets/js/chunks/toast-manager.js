// toast-manager.js
class ToastManager {
    constructor() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.classList.add('toast-container');
        document.body.appendChild(this.toastContainer);
        this.activeToasts = new Set();
        
        // Handle responsive positioning
        this.setResponsivePosition();
        window.addEventListener('resize', () => this.setResponsivePosition());
    }
    
    setResponsivePosition() {
        if (window.innerWidth <= 768) {
            this.toastContainer.classList.add('toast-container--mobile');
            this.toastContainer.classList.remove('toast-container--desktop');
        } else {
            this.toastContainer.classList.add('toast-container--desktop');
            this.toastContainer.classList.remove('toast-container--mobile');
        }
    }
    
    show(message, type = 'success', duration = 3000, title = '') {
        const toast = document.createElement('div');
        toast.classList.add('toast');
        toast.classList.add(`toast--${type}`);
        
        // Add icon based on type
        const iconMap = {
            'success': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            'error': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            'warning': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            'info': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };
        
        // Create toast content structure
        const toastContent = document.createElement('div');
        toastContent.classList.add('toast__content');
        
        const iconElement = document.createElement('div');
        iconElement.classList.add('toast__icon');
        iconElement.innerHTML = iconMap[type] || iconMap['info'];
        
        const textContainer = document.createElement('div');
        textContainer.classList.add('toast__text');
        
        if (title) {
            const titleElement = document.createElement('div');
            titleElement.classList.add('toast__title');
            titleElement.textContent = title;
            textContainer.appendChild(titleElement);
        }
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('toast__message');
        messageElement.textContent = message;
        textContainer.appendChild(messageElement);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.classList.add('toast__close');
        closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeButton.addEventListener('click', () => this.closeToast(toast));
        
        // Assemble the toast
        toastContent.appendChild(iconElement);
        toastContent.appendChild(textContainer);
        toast.appendChild(toastContent);
        toast.appendChild(closeButton);
        
        this.toastContainer.appendChild(toast);
        this.activeToasts.add(toast);
        
        // Add progress bar for duration
        if (duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.classList.add('toast__progress');
            toast.appendChild(progressBar);
            
            // Trigger animation
            requestAnimationFrame(() => {
                toast.classList.add('toast--visible');
                progressBar.style.transition = `width ${duration}ms linear`;
                progressBar.style.width = '0%';
            });
            
            // Auto dismiss after duration
            setTimeout(() => {
                this.closeToast(toast);
            }, duration);
        } else {
            // If no duration, just show without auto-dismiss
            requestAnimationFrame(() => {
                toast.classList.add('toast--visible');
            });
        }
        
        return toast;
    }
    
    closeToast(toast) {
        if (this.activeToasts.has(toast) && toast.parentNode === this.toastContainer) {
            toast.classList.remove('toast--visible');
            toast.classList.add('toast--hiding');
            
            toast.addEventListener('transitionend', () => {
                if (this.activeToasts.has(toast) && toast.parentNode === this.toastContainer) {
                    this.toastContainer.removeChild(toast);
                    this.activeToasts.delete(toast);
                }
            }, { once: true });
        }
    }
    
    // Enhanced API with more toast types
    success(message, duration = 3000, title = 'Success') {
        return this.show(message, 'success', duration, title);
    }
    
    error(message, duration = 3000, title = 'Error') {
        return this.show(message, 'error', duration, title);
    }
    
    warning(message, duration = 3000, title = 'Warning') {
        return this.show(message, 'warning', duration, title);
    }
    
    info(message, duration = 3000, title = 'Information') {
        return this.show(message, 'info', duration, title);
    }
}

const toastManager = new ToastManager();
export default toastManager;
