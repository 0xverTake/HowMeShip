// Dashboard App - HowMeShip Mission Control
class Dashboard {
    constructor() {
        this.ws = null;
        this.logs = [];
        this.maxLogs = 1000;
        this.autoScroll = true;
        this.updateInterval = null;
        this.lastLogError = 0; // Pour éviter le spam d'erreurs
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupWebSocket();
        this.setupEventListeners();
        this.startPeriodicUpdates();
        this.loadInitialData();
    }

    // Navigation entre sections
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetSection = item.dataset.section;
                
                // Mise à jour navigation
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Mise à jour sections
                sections.forEach(section => section.classList.remove('active'));
                document.getElementById(targetSection)?.classList.add('active');
                
                // Actions spéciales selon la section
                this.onSectionChange(targetSection);
            });
        });
    }

    // WebSocket pour logs en temps réel (désactivé, utilise polling)
    setupWebSocket() {
        // WebSocket pas encore implémenté, utilise polling à la place
        this.addLog('Using polling for real-time updates', 'INFO');
        this.setupPolling();
    }

    // Polling en fallback si WebSocket indisponible
    setupPolling() {
        // Réduire la fréquence pour éviter le spam
        setInterval(() => {
            this.fetchBotStatus();
        }, 5000);
        
        // Logs moins fréquents
        setInterval(() => {
            this.fetchLogs();
        }, 15000); // Toutes les 15 secondes au lieu de 5
    }

    // Event listeners
    setupEventListeners() {
        // Auto-scroll checkbox
        const autoScrollCheckbox = document.getElementById('autoScroll');
        if (autoScrollCheckbox) {
            autoScrollCheckbox.addEventListener('change', (e) => {
                this.autoScroll = e.target.checked;
            });
        }

        // Responsive menu toggle
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        menuToggle.style.display = 'none';
        document.querySelector('.header-content').appendChild(menuToggle);

        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });

        // Responsive
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 1024) {
                menuToggle.style.display = 'block';
            } else {
                menuToggle.style.display = 'none';
                document.querySelector('.sidebar').classList.remove('open');
            }
        });
    }

    // Mises à jour périodiques
    startPeriodicUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateStats();
            this.updateUptime();
            this.updateSystemStatus();
            this.updateServiceStatus();
        }, 10000); // Toutes les 10 secondes
    }

    // Chargement initial des données
    async loadInitialData() {
        try {
            await Promise.all([
                this.fetchBotStatus(),
                this.fetchDatabaseStats(),
                this.updateStats()
            ]);
            
            this.addLog('Dashboard initialized successfully', 'SUCCESS');
        } catch (error) {
            this.addLog(`Failed to load initial data: ${error.message}`, 'ERROR');
        }
    }

    // Actions lors du changement de section
    onSectionChange(section) {
        switch (section) {
            case 'logs':
                this.scrollLogsToBottom();
                break;
            case 'performance':
                this.initPerformanceChart();
                break;
            case 'database':
                this.fetchDatabaseStats();
                break;
        }
    }

    // Gestion des messages WebSocket
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'log':
                this.addLog(data.message, data.level, data.timestamp);
                break;
            case 'status':
                this.updateBotStatus(data.status);
                break;
            case 'stats':
                this.updateStats(data.stats);
                break;
            case 'activity':
                this.addActivity(data.activity);
                break;
        }
    }

    // Mise à jour du statut du bot
    async fetchBotStatus() {
        try {
            const response = await fetch('/api/bot/status');
            const data = await response.json();
            this.updateBotStatus(data);
        } catch (error) {
            this.updateBotStatus({ status: 'offline', error: error.message });
        }
    }

    updateBotStatus(data) {
        const statusIndicator = document.getElementById('botStatus');
        const statusText = document.getElementById('botStatusText');
        const discordStatus = document.getElementById('discordStatus');
        
        if (statusIndicator && statusText) {
            statusIndicator.className = `fas fa-circle status-indicator ${data.status}`;
            statusText.textContent = data.status === 'online' ? 'Online' : 
                                   data.status === 'offline' ? 'Offline' : 'Connecting...';
        }
        
        if (discordStatus) {
            discordStatus.innerHTML = `<i class="fas fa-circle"></i> ${data.status === 'online' ? 'Online' : 'Offline'}`;
            discordStatus.className = `service-status ${data.status}`;
        }

        // Mise à jour des détails
        if (data.guilds) document.getElementById('guildCount').textContent = data.guilds;
        if (data.users) document.getElementById('userCount').textContent = data.users;
        if (data.commandsPerHour) document.getElementById('commandsPerHour').textContent = data.commandsPerHour;
        if (data.lastActivity) document.getElementById('lastActivity').textContent = data.lastActivity;
    }

    // Mise à jour des statistiques
    async updateStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            // Utiliser les vrais noms de propriétés de l'API
            document.getElementById('totalShips').textContent = data.ships || '--';
            document.getElementById('totalCommands').textContent = data.commands || '--';
            document.getElementById('activeAlerts').textContent = data.alerts || '--';
            
            // Obtenir l'usage mémoire via l'API bot status
            const statusResponse = await fetch('/api/bot/status');
            const statusData = await statusResponse.json();
            if (statusData.memory) {
                document.getElementById('memoryUsage').textContent = statusData.memory;
            }
            
        } catch (error) {
            this.addLog(`Failed to update stats: ${error.message}`, 'WARN');
        }
    }

    // Mise à jour de l'uptime
    updateUptime() {
        const uptimeElement = document.getElementById('uptime');
        if (uptimeElement && this.botStartTime) {
            const now = Date.now();
            const uptime = now - this.botStartTime;
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
            
            uptimeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    // Mise à jour du statut système
    async updateSystemStatus() {
        try {
            const response = await fetch('/api/services/status');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Mettre à jour l'état de la base de données
            const databaseElement = document.getElementById('databaseStatus');
            if (databaseElement) {
                databaseElement.innerHTML = `<i class="fas fa-circle"></i> ${data.database === 'online' ? 'Online' : 'Offline'}`;
                databaseElement.className = `service-status ${data.database === 'online' ? 'online' : 'offline'}`;
            }
            
            // Mettre à jour l'état du service UEX
            const uexElement = document.getElementById('uexStatus');
            if (uexElement) {
                uexElement.innerHTML = `<i class="fas fa-circle"></i> ${data.uex === 'online' ? 'Online' : 'Offline'}`;
                uexElement.className = `service-status ${data.uex === 'online' ? 'online' : 'offline'}`;
            }
                
        } catch (error) {
            this.addLog(`Failed to update system status: ${error.message}`, 'ERROR');
            
            // Valeurs par défaut en cas d'erreur
            const databaseElement = document.getElementById('databaseStatus');
            const uexElement = document.getElementById('uexStatus');
            
            if (databaseElement) {
                databaseElement.innerHTML = '<i class="fas fa-circle"></i> Unknown';
                databaseElement.className = 'service-status unknown';
            }
            
            if (uexElement) {
                uexElement.innerHTML = '<i class="fas fa-circle"></i> Unknown';
                uexElement.className = 'service-status unknown';
            }
        }
    }

    // Mise à jour des statuts des services
    async updateServiceStatus() {
        try {
            const response = await fetch('/api/services/status');
            
            // Vérifier le type de contenu
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }
            
            const services = await response.json();
            
            // Mettre à jour l'état de chaque service
            this.updateServiceIndicator('discord-bot', services.database === 'online' ? 'online' : 'offline');
            this.updateServiceIndicator('database', services.database);
            this.updateServiceIndicator('uex-service', services.uex);
            this.updateServiceIndicator('web-interface', services.webInterface);
            
        } catch (error) {
            this.addLog(`Failed to update service status: ${error.message}`, 'WARN');
            // Utiliser des valeurs par défaut
            this.updateServiceIndicator('discord-bot', 'unknown');
            this.updateServiceIndicator('database', 'unknown');
            this.updateServiceIndicator('uex-service', 'unknown');  
            this.updateServiceIndicator('web-interface', 'online');
        }
    }

    // Mettre à jour un indicateur de service
    updateServiceIndicator(serviceId, status) {
        const indicator = document.querySelector(`[data-service="${serviceId}"] .status-dot`);
        const statusText = document.querySelector(`[data-service="${serviceId}"] .status-text`);
        
        if (indicator && statusText) {
            indicator.className = `status-dot ${status}`;
            
            let displayText = status;
            if (status === 'online') displayText = 'En ligne';
            else if (status === 'offline') displayText = 'Hors ligne';
            else if (status === 'checking') displayText = 'Vérification...';
            
            statusText.textContent = displayText;
        }
    }

    // Gestion des logs
    addLog(message, level = 'INFO', timestamp = null) {
        const logEntry = {
            timestamp: timestamp || new Date().toLocaleTimeString(),
            level: level.toUpperCase(),
            message: message
        };
        
        this.logs.push(logEntry);
        
        // Limiter le nombre de logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        this.renderLogs();
        
        if (this.autoScroll) {
            this.scrollLogsToBottom();
        }
    }

    renderLogs() {
        const container = document.getElementById('logsContainer');
        if (!container) return;
        
        container.innerHTML = this.logs.map(log => `
            <div class="log-entry">
                <span class="timestamp">[${log.timestamp}]</span>
                <span class="level ${log.level}">${log.level}</span>
                <span class="message">${log.message}</span>
            </div>
        `).join('');
    }

    scrollLogsToBottom() {
        const container = document.getElementById('logsContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // Activité récente
    addActivity(activity) {
        const container = document.getElementById('recentActivity');
        if (!container) return;
        
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        activityElement.innerHTML = `
            <i class="fas fa-${activity.icon || 'info-circle'}"></i>
            <span>${activity.message}</span>
            <time>${activity.timestamp || 'À l\'instant'}</time>
        `;
        
        container.insertBefore(activityElement, container.firstChild);
        
        // Limiter à 10 activités
        while (container.children.length > 10) {
            container.removeChild(container.lastChild);
        }
    }

    // Statistiques de base de données
    async fetchDatabaseStats() {
        try {
            const response = await fetch('/api/database/stats');
            const data = await response.json();
            
            document.getElementById('extendedShipsCount').textContent = data.extendedShips || '--';
            document.getElementById('activeAlertsCount').textContent = data.activeAlerts || '--';
            document.getElementById('dbSize').textContent = data.size || '--';
            document.getElementById('lastDbUpdate').textContent = data.lastUpdate || '--';
            
        } catch (error) {
            this.addLog(`Failed to fetch database stats: ${error.message}`, 'ERROR');
        }
    }

    // Graphique de performance
    initPerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas || canvas.hasAttribute('data-initialized')) return;
        
        canvas.setAttribute('data-initialized', 'true');
        
        // Simulation de données de performance
        const ctx = canvas.getContext('2d');
        const data = Array.from({ length: 24 }, (_, i) => Math.random() * 100);
        
        this.drawChart(ctx, data, canvas.width, canvas.height);
    }

    drawChart(ctx, data, width, height) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
        
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const stepX = width / (data.length - 1);
        const maxY = Math.max(...data);
        
        data.forEach((value, index) => {
            const x = index * stepX;
            const y = height - (value / maxY) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }

    async fetchLogs() {
        try {
            const response = await fetch('/api/logs');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }
            
            const data = await response.json();
            
            // Traiter les logs seulement si nouveaux
            if (data.logs && Array.isArray(data.logs)) {
                const newLogs = data.logs.slice(this.logs.length); // Seulement les nouveaux logs
                newLogs.forEach(log => {
                    this.addLog(log.message || 'Log entry', log.level || 'INFO');
                });
            }
            
        } catch (error) {
            // Éviter de spammer les erreurs de logs
            if (!this.lastLogError || Date.now() - this.lastLogError > 60000) {
                this.addLog(`Failed to fetch logs: ${error.message}`, 'WARN');
                this.lastLogError = Date.now();
            }
        }
    }
}

// Fonctions globales pour les boutons
window.restartBot = async function() {
    if (!confirm('Êtes-vous sûr de vouloir redémarrer le bot ?')) return;
    
    try {
        const response = await fetch('/api/bot/restart', { method: 'POST' });
        
        // Vérifier le type de contenu
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
        }
        
        const result = await response.json();
        
        if (result.success) {
            dashboard.addLog('Bot restart initiated', 'INFO');
        } else {
            dashboard.addLog(`Failed to restart bot: ${result.message || 'Unknown error'}`, 'ERROR');
        }
    } catch (error) {
        dashboard.addLog(`Restart failed: ${error.message}`, 'ERROR');
    }
};

window.refreshData = async function() {
    try {
        const response = await fetch('/api/data/refresh', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            dashboard.addLog('Data refresh initiated', 'INFO');
            dashboard.updateStats();
        } else {
            dashboard.addLog(`Failed to refresh data: ${result.error}`, 'ERROR');
        }
    } catch (error) {
        dashboard.addLog(`Refresh failed: ${error.message}`, 'ERROR');
    }
};

window.deployCommands = async function() {
    try {
        const response = await fetch('/api/bot/deploy-commands', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            dashboard.addLog('Commands deployed successfully', 'SUCCESS');
        } else {
            dashboard.addLog(`Failed to deploy commands: ${result.error}`, 'ERROR');
        }
    } catch (error) {
        dashboard.addLog(`Deploy failed: ${error.message}`, 'ERROR');
    }
};

window.emergencyStop = async function() {
    if (!confirm('ATTENTION: Ceci va arrêter complètement le bot. Continuer ?')) return;
    
    try {
        const response = await fetch('/api/bot/emergency-stop', { method: 'POST' });
        dashboard.addLog('Emergency stop initiated', 'WARN');
    } catch (error) {
        dashboard.addLog(`Emergency stop failed: ${error.message}`, 'ERROR');
    }
};

window.clearLogs = function() {
    if (!confirm('Effacer tous les logs ?')) return;
    
    dashboard.logs = [];
    dashboard.renderLogs();
    dashboard.addLog('Logs cleared', 'INFO');
};

window.saveLogs = function() {
    const logsText = dashboard.logs.map(log => 
        `[${log.timestamp}] ${log.level}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `howmeship-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    dashboard.addLog('Logs saved', 'INFO');
};

window.backupDatabase = async function() {
    try {
        const response = await fetch('/api/database/backup', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            dashboard.addLog('Database backup created', 'SUCCESS');
        } else {
            dashboard.addLog(`Backup failed: ${result.error}`, 'ERROR');
        }
    } catch (error) {
        dashboard.addLog(`Backup failed: ${error.message}`, 'ERROR');
    }
};

window.optimizeDatabase = async function() {
    try {
        const response = await fetch('/api/system/optimize-db', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            dashboard.addLog('Database optimized', 'SUCCESS');
            dashboard.fetchDatabaseStats();
        } else {
            dashboard.addLog(`Optimization failed: ${result.message}`, 'ERROR');
        }
    } catch (error) {
        dashboard.addLog(`Optimization failed: ${error.message}`, 'ERROR');
    }
};

window.updateShipsData = async function() {
    try {
        const response = await fetch('/api/ships/update', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            dashboard.addLog('Ships data update initiated', 'INFO');
        } else {
            dashboard.addLog(`Update failed: ${result.error}`, 'ERROR');
        }
    } catch (error) {
        dashboard.addLog(`Update failed: ${error.message}`, 'ERROR');
    }
};

// Initialisation
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});
