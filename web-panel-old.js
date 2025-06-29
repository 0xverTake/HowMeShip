const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.WEB_PORT || 3001;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route pour le favicon
app.get('/favicon.ico', (req, res) => {
    res.status(204).send();
});

// Configuration du bot
let botConfig = {
    status: 'unknown',
    uptime: 0,
    memory: 0,
    cpu: 0,
    lastRestart: null
};

// Route principale - Page d'accueil immersive
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour le dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
        }
        
        .card h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-online { background-color: #4CAF50; }
        .status-offline { background-color: #f44336; }
        .status-unknown { background-color: #ff9800; }
        
        .btn {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
            margin: 5px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .btn-danger {
            background: linear-gradient(45deg, #f44336, #d32f2f);
        }
        
        .btn-success {
            background: linear-gradient(45deg, #4CAF50, #388e3c);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        
        .form-group input, .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .logs {
            background: #1e1e1e;
            color: #00ff00;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            max-height: 400px;
            overflow-y: auto;
            white-space: pre-wrap;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .alert-success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        
        .alert-danger {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 HowMeShip Bot</h1>
            <p>Panel de Contrôle - Star Citizen Discord Bot</p>
        </div>
        
        <div class="dashboard">
            <!-- Statut du Bot -->
            <div class="card">
                <h3>📊 Statut du Bot</h3>
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-value">
                            <span class="status-indicator status-unknown"></span>
                            <span id="bot-status">Chargement...</span>
                        </div>
                        <div class="stat-label">Statut</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="bot-uptime">--</div>
                        <div class="stat-label">Uptime</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="bot-memory">--</div>
                        <div class="stat-label">Mémoire</div>
                    </div>
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn btn-success" onclick="startBot()">▶️ Démarrer</button>
                    <button class="btn btn-danger" onclick="stopBot()">⏹️ Arrêter</button>
                    <button class="btn" onclick="restartBot()">🔄 Redémarrer</button>
                </div>
            </div>
            
            <!-- Configuration -->
            <div class="card">
                <h3>⚙️ Configuration</h3>
                <form id="config-form">
                    <div class="form-group">
                        <label for="discord-token">Token Discord:</label>
                        <input type="password" id="discord-token" name="discord-token" placeholder="Votre token Discord">
                    </div>
                    <div class="form-group">
                        <label for="client-id">Client ID:</label>
                        <input type="text" id="client-id" name="client-id" placeholder="ID de votre application Discord">
                    </div>
                    <button type="submit" class="btn">💾 Sauvegarder</button>
                </form>
            </div>
            
            <!-- Statistiques -->
            <div class="card">
                <h3>📈 Statistiques</h3>
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-value" id="total-ships">245</div>
                        <div class="stat-label">Vaisseaux</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="total-commands">7</div>
                        <div class="stat-label">Commandes</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="total-servers">--</div>
                        <div class="stat-label">Serveurs</div>
                    </div>
                </div>
            </div>
            
            <!-- Actions Rapides -->
            <div class="card">
                <h3>⚡ Actions Rapides</h3>
                <button class="btn" onclick="updateShipData()">🔄 Mettre à jour les données</button>
                <button class="btn" onclick="clearLogs()">🗑️ Vider les logs</button>
                <button class="btn" onclick="exportConfig()">📤 Exporter config</button>
                <button class="btn" onclick="viewLogs()">📋 Voir les logs</button>
            </div>
        </div>
        
        <!-- Logs -->
        <div class="card">
            <h3>📋 Logs en Temps Réel</h3>
            <div id="logs" class="logs">
Chargement des logs...
            </div>
            <button class="btn" onclick="refreshLogs()">🔄 Actualiser</button>
        </div>
    </div>
    
    <script>
        // Fonctions de contrôle du bot
        async function startBot() {
            try {
                const response = await fetch('/api/bot/start', { method: 'POST' });
                const result = await response.json();
                showAlert(result.message, result.success ? 'success' : 'danger');
                updateStatus();
            } catch (error) {
                showAlert('Erreur lors du démarrage: ' + error.message, 'danger');
            }
        }
        
        async function stopBot() {
            try {
                const response = await fetch('/api/bot/stop', { method: 'POST' });
                const result = await response.json();
                showAlert(result.message, result.success ? 'success' : 'danger');
                updateStatus();
            } catch (error) {
                showAlert("Erreur lors de l'arrêt: " + error.message, 'danger');
            }
        }
        
        async function restartBot() {
            try {
                const response = await fetch('/api/bot/restart', { method: 'POST' });
                const result = await response.json();
                showAlert(result.message, result.success ? 'success' : 'danger');
                updateStatus();
            } catch (error) {
                showAlert('Erreur lors du redémarrage: ' + error.message, 'danger');
            }
        }
        
        async function updateStatus() {
            try {
                const response = await fetch('/api/bot/status');
                const status = await response.json();
                
                document.getElementById('bot-status').textContent = status.status;
                document.getElementById('bot-uptime').textContent = status.uptime;
                document.getElementById('bot-memory').textContent = status.memory;
                
                const indicator = document.querySelector('.status-indicator');
                indicator.className = 'status-indicator status-' + status.status;
            } catch (error) {
                console.error('Erreur lors de la mise à jour du statut:', error);
            }
        }
        
        async function refreshLogs() {
            try {
                const response = await fetch('/api/logs');
                const logs = await response.text();
                document.getElementById('logs').textContent = logs;
            } catch (error) {
                document.getElementById('logs').textContent = 'Erreur lors du chargement des logs: ' + error.message;
            }
        }
        
        function showAlert(message, type) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-' + type;
            alertDiv.textContent = message;
            
            const container = document.querySelector('.container');
            container.insertBefore(alertDiv, container.firstChild);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
        
        // Configuration
        document.getElementById('config-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const config = Object.fromEntries(formData);
            
            try {
                const response = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                
                const result = await response.json();
                showAlert(result.message, result.success ? 'success' : 'danger');
            } catch (error) {
                showAlert('Erreur lors de la sauvegarde: ' + error.message, 'danger');
            }
        });
        
        // Actions rapides
        async function updateShipData() {
            showAlert('Mise à jour des données en cours...', 'success');
            // Implémentation à ajouter
        }
        
        async function clearLogs() {
            try {
                const response = await fetch('/api/logs/clear', { method: 'POST' });
                const result = await response.json();
                showAlert(result.message, result.success ? 'success' : 'danger');
                refreshLogs();
            } catch (error) {
                showAlert('Erreur: ' + error.message, 'danger');
            }
        }
        
        function exportConfig() {
            showAlert('Export de la configuration...', 'success');
            // Implémentation à ajouter
        }
        
        function viewLogs() {
            refreshLogs();
        }
        
        // Mise à jour automatique
        setInterval(updateStatus, 5000);
        setInterval(refreshLogs, 10000);
        
        // Chargement initial
        updateStatus();
        refreshLogs();
    </script>
</body>
</html>
    `);
});

// API Routes
app.get('/api/bot/status', (req, res) => {
    exec('pm2 jlist', (error, stdout, stderr) => {
        if (error) {
            return res.json({ status: 'unknown', uptime: '--', memory: '--' });
        }
        
        try {
            const processes = JSON.parse(stdout);
            const botProcess = processes.find(p => p.name === 'star-citizen-bot');
            
            if (botProcess) {
                const uptime = Math.floor(botProcess.pm2_env.pm_uptime / 1000);
                const memory = Math.round(botProcess.monit.memory / 1024 / 1024);
                
                res.json({
                    status: botProcess.pm2_env.status === 'online' ? 'online' : 'offline',
                    uptime: formatUptime(uptime),
                    memory: memory + ' MB'
                });
            } else {
                res.json({ status: 'offline', uptime: '--', memory: '--' });
            }
        } catch (e) {
            res.json({ status: 'unknown', uptime: '--', memory: '--' });
        }
    });
});

app.post('/api/bot/start', (req, res) => {
    exec('pm2 start ecosystem.config.js', (error, stdout, stderr) => {
        if (error) {
            return res.json({ success: false, message: 'Erreur lors du démarrage: ' + error.message });
        }
        res.json({ success: true, message: 'Bot démarré avec succès!' });
    });
});

app.post('/api/bot/stop', (req, res) => {
    exec('pm2 stop star-citizen-bot', (error, stdout, stderr) => {
        if (error) {
            return res.json({ success: false, message: "Erreur lors de l'arrêt: " + error.message });
        }
        res.json({ success: true, message: 'Bot arrêté avec succès!' });
    });
});

app.post('/api/bot/restart', (req, res) => {
    exec('pm2 restart star-citizen-bot', (error, stdout, stderr) => {
        if (error) {
            return res.json({ success: false, message: 'Erreur lors du redémarrage: ' + error.message });
        }
        res.json({ success: true, message: 'Bot redémarré avec succès!' });
    });
});

app.get('/api/logs', (req, res) => {
    exec('pm2 logs star-citizen-bot --lines 50 --nostream', (error, stdout, stderr) => {
        if (error) {
            return res.send('Erreur lors de la récupération des logs: ' + error.message);
        }
        res.send(stdout);
    });
});

app.post('/api/logs/clear', (req, res) => {
    exec('pm2 flush star-citizen-bot', (error, stdout, stderr) => {
        if (error) {
            return res.json({ success: false, message: 'Erreur lors du nettoyage: ' + error.message });
        }
        res.json({ success: true, message: 'Logs nettoyés avec succès!' });
    });
});

app.post('/api/config', (req, res) => {
    const { 'discord-token': token, 'client-id': clientId } = req.body;
    
    if (!token || !clientId) {
        return res.json({ success: false, message: 'Token et Client ID requis!' });
    }
    
    const envContent = `DISCORD_TOKEN=${token}
CLIENT_ID=${clientId}
DATABASE_PATH=./database.sqlite
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
`;
    
    fs.writeFileSync('.env', envContent);
    res.json({ success: true, message: 'Configuration sauvegardée! Redémarrez le bot pour appliquer les changements.' });
});

// Fonction utilitaire
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

app.listen(PORT, () => {
    console.log(`🌐 Panel web disponible sur http://localhost:${PORT}`);
});

module.exports = app;
