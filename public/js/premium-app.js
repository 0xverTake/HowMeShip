/**
 * HowMeShip Premium Interface JavaScript
 * Star Citizen Ship Upgrade Assistant
 */

class HowMeShipApp {
    constructor() {
        this.apiUrl = '';
        this.refreshInterval = 30000; // 30 secondes
        this.autoRefreshTimer = null;
        this.init();
    }

    /**
     * Initialisation de l'application
     */
    init() {
        this.initAnimations();
        this.initParallax();
        this.startAutoRefresh();
        this.bindEvents();
        console.log('🚀 HowMeShip Premium Interface initialisée');
    }

    /**
     * Initialisation des animations au scroll
     */
    initAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observer tous les éléments avec la classe fade-in
        document.querySelectorAll('.fade-in').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease';
            observer.observe(el);
        });
    }

    /**
     * Initialisation de l'effet parallax
     */
    initParallax() {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const video = document.querySelector('.video-background');
            if (video) {
                video.style.transform = `translateY(${scrolled * 0.5}px)`;
            }
        });
    }

    /**
     * Démarrage de l'actualisation automatique
     */
    startAutoRefresh() {
        this.autoRefreshTimer = setInterval(() => {
            this.refreshStats();
        }, this.refreshInterval);
    }

    /**
     * Arrêt de l'actualisation automatique
     */
    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    }

    /**
     * Liaison des événements
     */
    bindEvents() {
        // Gestionnaire pour le bouton d'actualisation
        const refreshBtn = document.querySelector('[onclick="refreshStats()"]');
        if (refreshBtn) {
            refreshBtn.removeAttribute('onclick');
            refreshBtn.addEventListener('click', () => this.refreshStats());
        }

        // Gestionnaires pour les liens API
        this.bindApiLinks();

        // Gestionnaire pour la vidéo
        this.bindVideoEvents();
    }

    /**
     * Liaison des événements pour les liens API
     */
    bindApiLinks() {
        const apiLinks = document.querySelectorAll('a[href^="/api/"]');
        apiLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleApiRequest(link.href);
            });
        });
    }

    /**
     * Liaison des événements pour la vidéo
     */
    bindVideoEvents() {
        const video = document.querySelector('.video-background');
        if (video) {
            video.addEventListener('loadstart', () => {
                console.log('🎥 Chargement de la vidéo Kraken...');
            });

            video.addEventListener('loadeddata', () => {
                console.log('✅ Vidéo Kraken chargée avec succès');
            });

            video.addEventListener('error', (e) => {
                console.error('❌ Erreur lors du chargement de la vidéo Kraken:', e);
                this.showNotification('Erreur de chargement de la vidéo', 'error');
            });
        }
    }

    /**
     * Actualisation des statistiques
     */
    async refreshStats() {
        try {
            this.showLoadingState();
            
            const response = await fetch('/api/bot-stats');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const stats = await response.json();
            this.updateStatsDisplay(stats);
            this.showNotification('Statistiques actualisées', 'success');
            
        } catch (error) {
            console.error('Erreur lors de l\'actualisation:', error);
            this.showNotification('Erreur lors de l\'actualisation', 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Mise à jour de l'affichage des statistiques
     */
    updateStatsDisplay(stats) {
        const elements = {
            'upgrades-count': stats.upgradesCalculated || 0,
            'alerts-count': stats.alertsActive || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                this.animateStatUpdate(element);
            }
        });
    }

    /**
     * Animation de mise à jour des statistiques
     */
    animateStatUpdate(element) {
        element.style.transform = 'scale(1.1)';
        element.style.color = '#00ff00';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '#00d4ff';
        }, 200);
    }

    /**
     * Affichage de l'état de chargement
     */
    showLoadingState() {
        const refreshBtn = document.querySelector('button[class*="btn"]:last-child');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-spinner fa-spin';
            }
            refreshBtn.disabled = true;
        }
    }

    /**
     * Masquage de l'état de chargement
     */
    hideLoadingState() {
        const refreshBtn = document.querySelector('button[class*="btn"]:last-child');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-sync-alt';
            }
            refreshBtn.disabled = false;
        }
    }

    /**
     * Gestion des requêtes API
     */
    async handleApiRequest(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.displayApiResponse(data, url);
            
        } catch (error) {
            console.error('Erreur API:', error);
            this.showNotification(`Erreur API: ${error.message}`, 'error');
        }
    }

    /**
     * Affichage de la réponse API
     */
    displayApiResponse(data, url) {
        const modalContent = this.createApiModal(data, url);
        document.body.appendChild(modalContent);
        
        // Auto-fermeture après 10 secondes
        setTimeout(() => {
            if (modalContent.parentNode) {
                modalContent.remove();
            }
        }, 10000);
    }

    /**
     * Création d'une modal pour l'affichage API
     */
    createApiModal(data, url) {
        const modal = document.createElement('div');
        modal.className = 'api-modal';
        modal.innerHTML = `
            <div class="api-modal-content">
                <div class="api-modal-header">
                    <h3>Réponse API: ${url}</h3>
                    <button class="api-modal-close">&times;</button>
                </div>
                <div class="api-modal-body">
                    <pre><code>${JSON.stringify(data, null, 2)}</code></pre>
                </div>
            </div>
        `;

        // Style de la modal
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const content = modal.querySelector('.api-modal-content');
        content.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 30px;
            max-width: 80%;
            max-height: 80%;
            overflow: auto;
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;

        // Gestionnaire de fermeture
        const closeBtn = modal.querySelector('.api-modal-close');
        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        return modal;
    }

    /**
     * Affichage des notifications
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animation d'apparition
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto-suppression après 3 secondes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Gestion des erreurs globales
     */
    handleGlobalError(error) {
        console.error('Erreur globale de l\'application:', error);
        this.showNotification('Une erreur inattendue s\'est produite', 'error');
    }

    /**
     * Nettoyage des ressources
     */
    destroy() {
        this.stopAutoRefresh();
        // Supprimer les event listeners si nécessaire
        console.log('🧹 HowMeShip App nettoyée');
    }
}

// Fonction globale pour compatibilité avec l'ancien code
function refreshStats() {
    if (window.howMeShipApp) {
        window.howMeShipApp.refreshStats();
    }
}

// Initialisation de l'application au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    window.howMeShipApp = new HowMeShipApp();
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    if (window.howMeShipApp) {
        window.howMeShipApp.handleGlobalError(event.error);
    }
});

// Nettoyage avant déchargement de la page
window.addEventListener('beforeunload', () => {
    if (window.howMeShipApp) {
        window.howMeShipApp.destroy();
    }
});

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HowMeShipApp;
}
