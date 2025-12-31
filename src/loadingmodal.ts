import { Modal, App } from 'obsidian';

export class LoadingModal extends Modal {
    public status: string = 'Loading...';
    private startTime: number;
    private timerInterval: number | null = null;
    private timerElement: HTMLElement | null = null;

    constructor(app: App) {
        super(app);
        this.startTime = Date.now();
    }

    onOpen() {
        const {contentEl} = this;
        
        // Create container with animation
        const container = contentEl.createEl('div', {
            cls: 'loading-container'
        });
        
        // Add loading message with fade-in animation
        const messageEl = container.createEl('div', {
            text: this.status,
            cls: 'loading-message'
        });
        messageEl.style.animation = 'fadeIn 0.3s ease-in';
        
        // Create spinner container for rotation animation
        const spinnerContainer = container.createEl('div', {
            cls: 'loading-spinner-container'
        });
        
        // Add animated spinner
        spinnerContainer.createEl('div', {
            cls: 'loading-spinner'
        });
        
        // Add timer display
        this.timerElement = container.createEl('div', {
            text: '0.0s',
            cls: 'loading-timer'
        });
        this.timerElement.style.animation = 'pulse 1.5s ease-in-out infinite';
        
        // Start the timer
        this.startTimer();
        
        // Add CSS animations to the document
        this.addAnimations();
    }

    private startTimer() {
        this.timerInterval = window.setInterval(() => {
            const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
            if (this.timerElement) {
                this.timerElement.textContent = `${elapsed}s`;
            }
        }, 100);
    }

    private addAnimations() {
        // Check if animations already exist
        if (document.getElementById('loading-modal-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'loading-modal-animations';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes fadeIn {
                0% { opacity: 0; transform: translateY(-10px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            
            .loading-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                padding: 20px;
                min-width: 200px;
            }
            
            .loading-message {
                font-size: 16px;
                font-weight: 600;
                color: var(--text-normal);
                text-align: center;
            }
            
            .loading-spinner-container {
                animation: bounce 1s ease-in-out infinite;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid var(--background-modifier-border);
                border-top: 3px solid var(--interactive-accent);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            .loading-timer {
                font-size: 14px;
                font-family: monospace;
                color: var(--text-muted);
                padding: 5px 10px;
                background: var(--background-secondary);
                border-radius: 4px;
                min-width: 60px;
                text-align: center;
            }
            
            /* Modal specific styling */
            .modal.loading-modal .modal-content {
                min-width: 250px;
            }
        `;
        document.head.appendChild(style);
    }

    onClose() {
        // Clear the timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Remove animations if no other modals are using them
        setTimeout(() => {
            if (document.querySelectorAll('.loading-modal').length === 0) {
                const style = document.getElementById('loading-modal-animations');
                if (style) style.remove();
            }
        }, 100);
        
        const {contentEl} = this;
        contentEl.empty();
    }
}
