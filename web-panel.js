const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.WEB_PORT || 3001;

// Configuration
let logs = [];
let botStats = {
    status: 'offline',
    uptime: 0,
    memory: 0,
    cpu: 0,
    guilds: 0,
    users: 0,
    commands: 0,
    lastRestart: null
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes API (avant le middleware static)
// Statut du bot
app.get('/api/bot/status', (req, res) => {
    res.set('Content-Type', 'application/json');
    // Vérifier si le processus Node.js du bot est actif (Linux)
    exec('pgrep -f "node.*index.js"', (error, stdout, stderr) => {
        if (error) {
            return res.json({ 
                status: 'offline', 
                uptime: '0s', 
                memory: '0 MB',
                cpu: '0%',
                guilds: 0,
                users: 0
            });
        }
        
        // Vérifier s'il y a au moins un processus bot
        const botProcesses = stdout.trim().split('\n').filter(pid => pid.length > 0);
        const isRunning = botProcesses.length > 0;
        
        if (isRunning) {
            // Calculer l'uptime approximatif
            const uptimeMs = Date.now() - (botStats.lastRestart || (Date.now() - 60000));
            const uptimeSeconds = Math.floor(uptimeMs / 1000);
            
            res.json({
                status: 'online',
                uptime: formatUptime(uptimeSeconds),
                memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                cpu: '5%', // Estimation
                guilds: botStats.guilds || 1,
                users: botStats.users || 0
            });
        } else {
            res.json({ 
                status: 'offline', 
                uptime: '0s', 
                memory: '0 MB',
                cpu: '0%',
                guilds: 0,
                users: 0
            });
        }
    });
});

// Middleware pour les fichiers statiques (après les routes API)
app.use(express.static('public'));

// Routes principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API Routes pour le dashboard

// Stats générales
app.get('/api/stats', (req, res) => {
    // Récupérer les stats de la base de données
    const db = new sqlite3.Database('./database.sqlite');
    
    const stats = {
        ships: 0,
        alerts: 0,
        searches: 0,
        commands: 0
    };
    
    db.serialize(() => {
        // Compter les vaisseaux
        db.get("SELECT COUNT(*) as count FROM ships", (err, row) => {
            if (!err && row) stats.ships = row.count;
        });
        
        // Compter les alertes
        db.get("SELECT COUNT(*) as count FROM price_alerts", (err, row) => {
            if (!err && row) stats.alerts = row.count;
        });
        
        // Compter les recherches (si table existe)
        db.get("SELECT COUNT(*) as count FROM searches", (err, row) => {
            if (!err && row) stats.searches = row.count;
        });
        
        setTimeout(() => {
            stats.commands = 8; // Nombre de commandes du bot
            res.json(stats);
            db.close();
        }, 100);
    });
});

// Contrôle du bot
app.post('/api/bot/start', (req, res) => {
    addLog('INFO', 'Tentative de démarrage du bot...');
    exec('pm2 start ecosystem.config.js', (error, stdout, stderr) => {
        if (error) {
            addLog('ERROR', `Erreur démarrage: ${error.message}`);
            return res.json({ success: false, message: 'Erreur lors du démarrage: ' + error.message });
        }
        addLog('SUCCESS', 'Bot démarré avec succès');
        res.json({ success: true, message: 'Bot démarré avec succès!' });
    });
});

app.post('/api/bot/stop', (req, res) => {
    addLog('INFO', 'Arrêt du bot demandé...');
    exec('pm2 stop all', (error, stdout, stderr) => {
        if (error) {
            addLog('ERROR', `Erreur arrêt: ${error.message}`);
            return res.json({ success: false, message: "Erreur lors de l'arrêt: " + error.message });
        }
        addLog('SUCCESS', 'Bot arrêté avec succès');
        res.json({ success: true, message: 'Bot arrêté avec succès!' });
    });
});

app.post('/api/bot/restart', (req, res) => {
    res.set('Content-Type', 'application/json');
    addLog('INFO', 'Redémarrage du bot...');
    
    // Utiliser PM2 pour redémarrer le bot sur Linux
    exec('pm2 restart star-citizen-bot', (error, stdout, stderr) => {
        if (error) {
            // Fallback : essayer de tuer le processus et le redémarrer
            exec('pkill -f "node.*index.js"', (killError) => {
                if (killError) {
                    addLog('ERROR', `Erreur redémarrage: ${error.message}`);
                    return res.json({ success: false, message: 'Erreur lors du redémarrage: ' + error.message });
                }
                
                // Redémarrer après un délai
                setTimeout(() => {
                    exec('nohup node index.js > /dev/null 2>&1 &', (restartErr) => {
                        if (restartErr) {
                            addLog('ERROR', 'Erreur lors du redémarrage du bot');
                        } else {
                            addLog('SUCCESS', 'Bot redémarré avec succès');
                        }
                    });
                }, 2000);
                
                botStats.lastRestart = new Date().toISOString();
                res.json({ success: true, message: 'Bot redémarré avec succès!' });
            });
            return;
        }
        
        addLog('SUCCESS', 'Bot redémarré avec succès via PM2');
        botStats.lastRestart = new Date().toISOString();
        res.json({ success: true, message: 'Bot redémarré avec succès via PM2!' });
    });
});

// Logs
app.get('/api/logs', (req, res) => {
    res.json({ logs: logs.slice(-100) }); // Derniers 100 logs
});

app.get('/api/logs/export', (req, res) => {
    const logsText = logs.map(log => `[${log.timestamp}] ${log.level}: ${log.message}`).join('\n');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="howmeship-logs.txt"');
    res.send(logsText);
});

app.post('/api/logs/clear', (req, res) => {
    logs = [];
    addLog('INFO', 'Logs nettoyés manuellement');
    res.json({ success: true, message: 'Logs nettoyés avec succès!' });
});

// Actions système
app.post('/api/system/update-ships', (req, res) => {
    addLog('INFO', 'Mise à jour des données vaisseaux...');
    exec('node scripts/fetch-all-data.js', (error, stdout, stderr) => {
        if (error) {
            addLog('ERROR', `Erreur mise à jour: ${error.message}`);
            return res.json({ success: false, message: 'Erreur lors de la mise à jour: ' + error.message });
        }
        addLog('SUCCESS', 'Données vaisseaux mises à jour');
        res.json({ success: true, message: 'Données des vaisseaux mises à jour avec succès!' });
    });
});

app.post('/api/system/backup', (req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-${timestamp}.sqlite`;
    
    addLog('INFO', `Création de la sauvegarde: ${backupFile}`);
    exec(`copy database.sqlite backups\\${backupFile}`, (error, stdout, stderr) => {
        if (error) {
            addLog('ERROR', `Erreur sauvegarde: ${error.message}`);
            return res.json({ success: false, message: 'Erreur lors de la sauvegarde: ' + error.message });
        }
        addLog('SUCCESS', `Sauvegarde créée: ${backupFile}`);
        res.json({ success: true, message: `Sauvegarde créée: ${backupFile}` });
    });
});

app.post('/api/system/optimize-db', (req, res) => {
    res.set('Content-Type', 'application/json');
    addLog('INFO', 'Optimisation de la base de données...');
    const db = new sqlite3.Database('./database.sqlite');
    
    db.exec('VACUUM; ANALYZE;', (error) => {
        if (error) {
            addLog('ERROR', `Erreur optimisation DB: ${error.message}`);
            db.close();
            return res.json({ success: false, message: 'Erreur lors de l\'optimisation: ' + error.message });
        }
        addLog('SUCCESS', 'Base de données optimisée');
        db.close();
        res.json({ success: true, message: 'Base de données optimisée avec succès!' });
    });
});

// Base de données
app.get('/api/database/stats', (req, res) => {
    const db = new sqlite3.Database('./database.sqlite');
    const stats = {};
    
    db.serialize(() => {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                return res.json({ error: 'Erreur lors de la lecture des tables' });
            }
            
            let completed = 0;
            const total = tables.length;
            
            tables.forEach(table => {
                db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
                    if (!err && row) {
                        stats[table.name] = row.count;
                    }
                    completed++;
                    
                    if (completed === total) {
                        res.json(stats);
                        db.close();
                    }
                });
            });
            
            if (total === 0) {
                res.json(stats);
                db.close();
            }
        });
    });
});

// Alertes
app.get('/api/alerts', (req, res) => {
    const db = new sqlite3.Database('./database.sqlite');
    
    db.all(`SELECT * FROM price_alerts ORDER BY created_at DESC LIMIT 20`, (err, rows) => {
        if (err) {
            return res.json({ error: 'Erreur lors de la lecture des alertes' });
        }
        res.json(rows || []);
        db.close();
    });
});

// Vérification de l'état des services
app.get('/api/services/status', (req, res) => {
    res.set('Content-Type', 'application/json');
    
    const serviceStatus = {
        database: 'checking',
        uex: 'checking',
        webInterface: 'online'
    };
    
    // Vérifier la base de données
    const db = new sqlite3.Database('./database.sqlite', (err) => {
        if (err) {
            serviceStatus.database = 'offline';
            res.json(serviceStatus);
        } else {
            serviceStatus.database = 'online';
            db.close();
            
            // Vérifier le service UEX (vérifier si les données sont présentes)
            const dbCheck = new sqlite3.Database('./database.sqlite');
            dbCheck.get("SELECT COUNT(*) as count FROM ships", (err, row) => {
                if (err || !row || row.count === 0) {
                    serviceStatus.uex = 'offline';
                } else {
                    serviceStatus.uex = 'online';
                }
                
                res.json(serviceStatus);
                dbCheck.close();
            });
        }
    });
});

// Fonction utilitaire pour les logs
function addLog(level, message) {
    const log = {
        timestamp: new Date().toISOString(),
        level: level,
        message: message
    };
    logs.push(log);
    
    // Garder seulement les 1000 derniers logs
    if (logs.length > 1000) {
        logs = logs.slice(-1000);
    }
    
    console.log(`[${log.timestamp}] ${level}: ${message}`);
}

// Fonction utilitaire pour formater l'uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}j ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

// Initialisation
addLog('INFO', 'Serveur web HowMeShip démarré');
addLog('INFO', `Panel disponible sur http://localhost:${PORT}`);

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🌐 Panel web HowMeShip disponible sur http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});

module.exports = app;
