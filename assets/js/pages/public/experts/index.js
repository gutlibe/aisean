import { Page } from '../../core/page.js';

/**
 * ExpertPredictions - Page for displaying football match predictions by date
 */
export class ExpertPredictions extends Page {
    constructor() {
        super();

        this.showMenuIcon = false;
        this.showBackArrow = true;
        this.requiresDatabase = true;

        this.requiresAuth = true;
        this.authorizedUserTypes = ['Admin', 'Pro'];

        this.loadingTimeout = 30000;
        this.maxRetries = 2;
        this.retryDelay = 1000;

        this.selectedDate = this.formatDate(new Date());
        this.predictions = [];
        this.isLoading = false;
        this.dateInputEventBound = false; // Track if event listener is bound
        this.cssFiles = [
        "pages/public/experts/index.css",
    ]
    }

    getTitle() {
        return 'Expert Predictions';
    }

    getHeaderIcon() {
        return 'fas fa-chart-line';
    }

    getActions() {
        return `
            <div class="ep-date-selector">
                <input type="date" id="ep-prediction-date" class="ep-date-input" value="${this.selectedDate}">
            </div>
        `;
    }

    getSkeletonTemplate() {
        return `
            <div class="ep-skeleton-container">
                <div class="ep-date-info ep-shimmer">
                    <i class="fas fa-calendar-day"></i>
                    <span>Loading date...</span>
                </div>
                <div class="ep-skeleton-cards">
                    ${this.generateSkeletonCards(6)}
                </div>
            </div>
        `;
    }

    generateSkeletonCards(count) {
        let cards = '';
        for (let i = 0; i < count; i++) {
            cards += `
                <div class="ep-skeleton-card">
                    <div class="ep-skeleton-header ep-shimmer"></div>
                    <div class="ep-skeleton-teams">
                        <div class="ep-skeleton-team ep-shimmer"></div>
                        <div class="ep-skeleton-vs ep-shimmer"></div>
                        <div class="ep-skeleton-team ep-shimmer"></div>
                    </div>
                    <div class="ep-skeleton-prediction">
                        <div class="ep-skeleton-title ep-shimmer"></div>
                        <div class="ep-skeleton-details">
                            <div class="ep-skeleton-badge ep-shimmer"></div>
                            <div class="ep-skeleton-odd ep-shimmer"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        return cards;
    }

    async loadDatabaseContent() {
        if (this.isLoading) return false;
        
        try {
            this.isLoading = true;
            
            const firebase = window.app.getLibrary('firebase');
            const dateKey = this.selectedDate;
            
            const matchesCollectionRef = firebase.collection(
                firebase.firestore, 
                `expertPredictions/football/dates/${dateKey}/matches`
            );
            
            const matchesSnapshot = await firebase.getDocs(matchesCollectionRef);
            
            this.predictions = matchesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            return true;
        } catch (error) {
            console.error('Error loading expert predictions:', error);
            window.app.showToast('Failed to load predictions', 'error', 3000);
            throw new Error('DATABASE_ERROR');
        } finally {
            this.isLoading = false;
        }
    }

    async getContent() {
        const displayDate = this.formatDisplayDate(this.selectedDate);
        
        if (!this.predictions || this.predictions.length === 0) {
            return `
                <div class="ep-date-info">
                    <i class="fas fa-calendar-day"></i>
                    <span>${displayDate}</span>
                </div>
                <div class="ep-prediction-container">
                    <div class="ep-empty-state">
                        <i class="fas fa-futbol"></i>
                        <h3>No predictions available</h3>
                        <p>There are no expert predictions for this date. Please try another date.</p>
                    </div>
                </div>
            `;
        }
        
        const predictionCards = this.predictions.map(prediction => 
            this.buildPredictionCard(prediction)).join('');
        
        return `
            <div class="ep-date-info">
                <i class="fas fa-calendar-day"></i>
                <span>${displayDate}</span>
            </div>
            <div class="ep-prediction-container">
                <div class="ep-prediction-cards">
                    ${predictionCards}
                </div>
            </div>
        `;
    }

    buildPredictionCard(prediction) {
        const { matchInfo, marketData } = prediction;
        
        const matchTime = matchInfo.start_time 
            ? this.formatTime(new Date(`${this.selectedDate}T${matchInfo.start_time}`)) 
            : 'TBD';
            
        const statusText = matchInfo.status || 'Pending';
        const resultDisplay = matchInfo.result ? `<span class="ep-match-result">${matchInfo.result}</span>` : '';
        
        return `
            <div class="ep-prediction-card" data-id="${prediction.id}">
                <div class="ep-match-info">
                    <div class="ep-match-header">
                        <div class="ep-match-time">
                            <svg class="ep-icon" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${matchTime}</span>
                        </div>
                        <div class="ep-match-meta">
                            <span class="ep-match-status">${statusText}</span>
                            ${resultDisplay}
                        </div>
                    </div>
                    <div class="ep-teams">
                        <span>${this.escapeHtml(matchInfo.home_team || '')}</span>
                        <span class="ep-vs">vs</span>
                        <span>${this.escapeHtml(matchInfo.away_team || '')}</span>
                    </div>
                </div>
                <div class="ep-classic-prediction">
                    <div>
                        <div class="ep-prediction-title">Classic Prediction</div>
                        <div class="ep-prediction-details">
                            <span class="ep-prediction-badge ${this.getStatusClass(marketData?.classic?.status)}">
                                ${marketData?.classic?.prediction || 'N/A'}
                            </span>
                            <span class="ep-prediction-odd">
                                Odd: ${marketData?.classic?.odd ? marketData.classic.odd.toFixed(2) : '-'}
                            </span>
                            <span class="ep-prediction-status">
                                ${this.getStatusIcon(marketData?.classic?.status)}
                                ${marketData?.classic?.status || 'Pending'}
                            </span>
                        </div>
                    </div>
                    <button class="ep-toggle-btn" data-id="${prediction.id}" aria-label="Toggle predictions">
                        <svg class="ep-icon" viewBox="0 0 24 24">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="ep-other-predictions" id="ep-other-predictions-${prediction.id}">
                    <div class="ep-other-predictions-content">
                        ${this.renderOtherPredictions(prediction)}
                    </div>
                </div>
            </div>
        `;
    }

    renderOtherPredictions(prediction) {
        const { marketData } = prediction;
        if (!marketData) return '';
        
        let html = '';

        if (marketData.doubleChance) {
            html += `
                <div class="ep-prediction-item">
                    <div class="ep-prediction-title">Double Chance</div>
                    <div class="ep-prediction-details">
                        <span class="ep-prediction-badge ${this.getStatusClass(marketData.doubleChance.status)}">
                            ${marketData.doubleChance.prediction || 'N/A'}
                        </span>
                        <span class="ep-prediction-odd">
                            Odd: ${marketData.doubleChance.odd ? marketData.doubleChance.odd.toFixed(2) : '-'}
                        </span>
                        <span class="ep-prediction-status">
                            ${this.getStatusIcon(marketData.doubleChance.status)}
                            ${marketData.doubleChance.status || 'Pending'}
                        </span>
                    </div>
                </div>
            `;
        }

        if (marketData.gg) {
            html += `
                <div class="ep-prediction-item">
                    <div class="ep-prediction-title">Both Teams to Score</div>
                    <div class="ep-prediction-details">
                        <span class="ep-prediction-badge ${this.getStatusClass(marketData.gg.status)}">
                            ${marketData.gg.prediction ? 'Yes' : 'No'}
                        </span>
                        <span class="ep-prediction-odd">
                            Odd: ${marketData.gg.odd ? marketData.gg.odd.toFixed(2) : '-'}
                        </span>
                        <span class="ep-prediction-status">
                            ${this.getStatusIcon(marketData.gg.status)}
                            ${marketData.gg.status || 'Pending'}
                        </span>
                    </div>
                </div>
            `;
        }

        if (marketData.goals) {
            const goalType = marketData.goals.type ? 
                `${marketData.goals.type.charAt(0).toUpperCase() + marketData.goals.type.slice(1)}` : '';
                
            html += `
                <div class="ep-prediction-item">
                    <div class="ep-prediction-title">Goals</div>
                    <div class="ep-prediction-details">
                        <span class="ep-prediction-badge ${this.getStatusClass(marketData.goals.status)}">
                            ${goalType} ${marketData.goals.prediction || 'N/A'}
                        </span>
                        <span class="ep-prediction-odd">
                            Odd: ${marketData.goals.odd ? marketData.goals.odd.toFixed(2) : '-'}
                        </span>
                        <span class="ep-prediction-status">
                            ${this.getStatusIcon(marketData.goals.status)}
                            ${marketData.goals.status || 'Pending'}
                        </span>
                    </div>
                </div>
            `;
        }

        return html;
    }

    getStatusIcon(status) {
        if (status === 'postponed') {
            return `<svg class="ep-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>`;
        }
        return '';
    }

    getStatusClass(status) {
        switch (status) {
            case 'won': return 'ep-status-won';
            case 'lost': return 'ep-status-lost';
            case 'postponed': return 'ep-status-postponed';
            default: return 'ep-status-pending';
        }
    }

    async reloadContent() {
        try {
            const contentContainer = this.container.querySelector('.ep-prediction-container');
            if (!contentContainer) return;
            
            // Use the new skeleton template for better visual feedback during reload
            contentContainer.innerHTML = `
                <div class="ep-skeleton-cards">
                    ${this.generateSkeletonCards(6)}
                </div>
            `;
            
            this.predictions = [];
            await this.loadDatabaseContent();
            
            if (this.container) {
                const displayDate = this.formatDisplayDate(this.selectedDate);
                const dateInfo = this.container.querySelector('.ep-date-info');
                
                if (dateInfo) {
                    dateInfo.innerHTML = `
                        <i class="fas fa-calendar-day"></i>
                        <span>${displayDate}</span>
                    `;
                }
                
                if (!this.predictions || this.predictions.length === 0) {
                    contentContainer.innerHTML = `
                        <div class="ep-empty-state">
                            <i class="fas fa-futbol"></i>
                            <h3>No predictions available</h3>
                            <p>There are no expert predictions for this date. Please try another date.</p>
                        </div>
                    `;
                } else {
                    const predictionCards = this.predictions.map(prediction => 
                        this.buildPredictionCard(prediction)).join('');
                    
                    contentContainer.innerHTML = `
                        <div class="ep-prediction-cards">
                            ${predictionCards}
                        </div>
                    `;
                }
                
                await this.attachEventListeners();
            }
        } catch (error) {
            console.error('Error reloading content:', error);
            window.app.showToast('Failed to refresh predictions', 'error', 3000);
        }
    }

    // New method to attach event listeners to toggle buttons
    async attachEventListeners() {
        const toggleBtns = this.container.querySelectorAll('.ep-toggle-btn');
        toggleBtns.forEach(btn => {
            // Remove any existing event listeners to prevent duplicates
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                const predictionId = newBtn.getAttribute('data-id');
                const otherPredictions = this.container.querySelector(`#ep-other-predictions-${predictionId}`);
                
                if (otherPredictions) {
                    newBtn.classList.toggle('ep-active');
                    otherPredictions.classList.toggle('ep-expanded');
                }
            });
        });
    }

    async afterContentRender() {
        await this.attachEventListeners();
    }

    async afterStructureRender() {
        await super.afterStructureRender();
        
        // Get the date input element
        const dateInput = this.container.querySelector('#ep-prediction-date');
        if (dateInput) {
            // Set the current value
            dateInput.value = this.selectedDate;
            
            // Remove any existing event listeners to prevent duplicates
            if (this.dateInputEventBound) {
                const newDateInput = dateInput.cloneNode(true);
                dateInput.parentNode.replaceChild(newDateInput, dateInput);
                
                // Update the reference to the new element
                this.dateInput = newDateInput;
            } else {
                this.dateInput = dateInput;
                this.dateInputEventBound = true;
            }
            
            // Add the event listener to the new element
            this.dateInput.addEventListener('change', async (event) => {
                this.selectedDate = event.target.value;
                await this.reloadContent();
            });
        }
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatDisplayDate(dateStr) {
        if (!dateStr) return '';
        
        try {
            const date = new Date(dateStr);
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString(undefined, options);
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateStr;
        }
    }

    formatTime(date) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return 'TBD';
        }
        
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    destroy() {
        // Clean up event listeners
        if (this.dateInput) {
            this.dateInput.replaceWith(this.dateInput.cloneNode(true));
            this.dateInput = null;
        }
        
        this.dateInputEventBound = false;
        this.container = null;
        super.destroy();
    }
}