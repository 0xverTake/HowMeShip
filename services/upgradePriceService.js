const axios = require('axios');
const Database = require('../config/database');
const { EmbedBuilder } = require('discord.js');
const UpgradeNavigatorAPI = require('../scrapers/upgradeNavigatorAPI');

class UpgradePriceService {
    constructor() {
        this.db = null; // Sera initialisé lors de l'utilisation
        this.isInitialized = false;
        this.upgradeAPI = new UpgradeNavigatorAPI();
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        };
        
        // Stores supportés avec leurs IDs
        this.stores = {
            'star-hangar': { id: 1, name: 'Star-Hangar', active: true },
            'rsi': { id: 2, name: 'RSI Pledge-Store', active: true },
            'space-foundry': { id: 3, name: 'Space Foundry', active: false }
        };
        
        this.alertsTable = 'upgrade_alerts';
        this.priceHistoryTable = 'price_history';
    }

    /**
     * Initialise la base de données si nécessaire
     */
    async ensureDatabase() {
        if (!this.db) {
            this.db = new Database();
            await this.db.init();
        }
        return this.db;
    }

    /**
     * Initialise les tables pour les alertes
     */
    async initializeTables() {
        try {
            await this.ensureDatabase();
            
            // Table des alertes d'upgrade
            await this.db.db.exec(`
                CREATE TABLE IF NOT EXISTS ${this.alertsTable} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    from_ship_name TEXT NOT NULL,
                    to_ship_name TEXT NOT NULL,
                    max_price INTEGER NOT NULL,
                    stores TEXT NOT NULL,
                    active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_checked DATETIME,
                    last_notified DATETIME
                )
            `);

            // Table de l'historique des prix
            await this.db.db.exec(`
                CREATE TABLE IF NOT EXISTS ${this.priceHistoryTable} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    from_ship_name TEXT NOT NULL,
                    to_ship_name TEXT NOT NULL,
                    store_name TEXT NOT NULL,
                    price INTEGER NOT NULL,
                    available INTEGER DEFAULT 1,
                    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.log('✅ Tables d\'alertes initialisées');
        } catch (error) {
            console.error('❌ Erreur initialisation tables:', error);
        }
    }

    /**
     * Récupère les vaisseaux depuis Upgrade Navigator (nouvelle API)
     */
    async getUpgradeNavigatorShips() {
        try {
            return await this.upgradeAPI.getShips();
        } catch (error) {
            console.error('Erreur récupération vaisseaux Upgrade Navigator:', error.message);
            return [];
        }
    }

    /**
     * Trouve les upgrades possibles entre deux vaisseaux (nouvelle API)
     */
    async findUpgradePaths(fromShipName, toShipName, enabledStores = ['star-hangar', 'rsi']) {
        try {
            // Utiliser la nouvelle API pour trouver les vaisseaux
            const fromShip = await this.upgradeAPI.findShipByName(fromShipName);
            const toShip = await this.upgradeAPI.findShipByName(toShipName);

            if (!fromShip || !toShip) {
                throw new Error(`Vaisseau non trouvé: ${!fromShip ? fromShipName : toShipName}`);
            }

            // Convertir les noms de magasins en IDs
            const storeMapping = {
                'star-hangar': 1,
                'rsi': 2,
                'space-foundry': 3
            };
            
            const storeIds = enabledStores.map(store => storeMapping[store]).filter(id => id);

            // Utiliser la nouvelle API pour trouver le chemin d'upgrade
            const upgradeResult = await this.upgradeAPI.findUpgradePath(fromShip.id, toShip.id, storeIds);
            
            if (upgradeResult && upgradeResult.success) {
                // Adapter le format pour la compatibilité
                return {
                    fromShip,
                    toShip,
                    directPrice: toShip.listPrice - fromShip.listPrice,
                    paths: upgradeResult.paths || [
                        {
                            stores: enabledStores,
                            totalPrice: toShip.listPrice - fromShip.listPrice,
                            savings: 0,
                            steps: [
                                {
                                    from: fromShip.name,
                                    to: toShip.name,
                                    price: toShip.listPrice - fromShip.listPrice,
                                    store: 'rsi'
                                }
                            ]
                        }
                    ]
                };
            } else {
                // Fallback vers le calcul direct
                const directPrice = toShip.listPrice - fromShip.listPrice;
                
                return {
                    fromShip,
                    toShip,
                    directPrice,
                    paths: [
                        {
                            stores: enabledStores,
                            totalPrice: directPrice,
                            savings: 0,
                            steps: [
                                {
                                    from: fromShip.name,
                                    to: toShip.name,
                                    price: directPrice,
                                    store: 'rsi'
                                }
                            ]
                        }
                    ]
                };
            }
        } catch (error) {
            console.error('Erreur recherche upgrade paths:', error.message);
            throw error;
        }
    }

    /**
     * Crée une alerte de prix pour un upgrade
     */
    async createPriceAlert(userId, fromShipName, toShipName, maxPrice, stores = ['star-hangar', 'rsi']) {
        try {
            await this.ensureDatabase();
            await this.initializeTables();

            // Vérifier que l'upgrade est possible
            const upgradePaths = await this.findUpgradePaths(fromShipName, toShipName, stores);
            
            const stmt = await this.db.db.prepare(`
                INSERT INTO ${this.alertsTable} 
                (user_id, from_ship_name, to_ship_name, max_price, stores) 
                VALUES (?, ?, ?, ?, ?)
            `);

            const result = await stmt.run([
                userId,
                fromShipName,
                toShipName,
                maxPrice,
                JSON.stringify(stores)
            ]);

            await stmt.finalize();

            console.log(`✅ Alerte créée: ${fromShipName} -> ${toShipName} (${maxPrice}$) pour ${userId}`);
            
            return {
                id: result.lastID,
                fromShip: upgradePaths.fromShip,
                toShip: upgradePaths.toShip,
                maxPrice,
                stores,
                currentBestPrice: upgradePaths.paths[0]?.totalPrice
            };
        } catch (error) {
            console.error('Erreur création alerte:', error.message);
            throw error;
        }
    }

    /**
     * Récupère les alertes actives d'un utilisateur
     */
    async getUserAlerts(userId) {
        try {
            await this.ensureDatabase();
            await this.initializeTables();

            const stmt = await this.db.db.prepare(`
                SELECT * FROM ${this.alertsTable} 
                WHERE user_id = ? AND active = 1 
                ORDER BY created_at DESC
            `);

            const alerts = await stmt.all([userId]);
            await stmt.finalize();

            return alerts.map(alert => ({
                ...alert,
                stores: JSON.parse(alert.stores)
            }));
        } catch (error) {
            console.error('Erreur récupération alertes:', error.message);
            return [];
        }
    }

    /**
     * Supprime une alerte
     */
    async deleteAlert(alertId, userId) {
        try {
            const stmt = await this.db.db.prepare(`
                UPDATE ${this.alertsTable} 
                SET active = 0 
                WHERE id = ? AND user_id = ?
            `);

            const result = await stmt.run([alertId, userId]);
            await stmt.finalize();

            return result.changes > 0;
        } catch (error) {
            console.error('Erreur suppression alerte:', error.message);
            return false;
        }
    }

    /**
     * Vérifie toutes les alertes actives et envoie des notifications
     */
    async checkAlerts(client) {
        try {
            console.log('🔍 Vérification des alertes de prix...');
            
            // S'assurer que la base de données est initialisée
            await this.ensureDatabase();
            
            const stmt = this.db.db.prepare(`
                SELECT * FROM ${this.alertsTable} 
                WHERE active = 1 
                AND (last_checked IS NULL OR last_checked < datetime('now', '-30 minutes'))
            `);

            const alerts = stmt.all();
            stmt.finalize();

            console.log(`📋 ${alerts ? alerts.length : 0} alertes à vérifier`);

            if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
                console.log('✅ Aucune alerte à vérifier pour le moment');
                return;
            }

            for (const alert of alerts) {
                try {
                    const stores = JSON.parse(alert.stores);
                    const upgradePaths = await this.findUpgradePaths(
                        alert.from_ship_name, 
                        alert.to_ship_name, 
                        stores
                    );

                    const bestPrice = Math.min(...upgradePaths.paths.map(p => p.totalPrice));

                    // Mettre à jour la dernière vérification
                    await this.updateAlertLastChecked(alert.id);

                    // Si le prix est inférieur au seuil, envoyer une notification
                    if (bestPrice <= alert.max_price) {
                        await this.sendPriceAlert(client, alert, upgradePaths, bestPrice);
                    }

                    // Enregistrer l'historique des prix
                    await this.savePriceHistory(alert.from_ship_name, alert.to_ship_name, upgradePaths);

                } catch (alertError) {
                    console.error(`Erreur vérification alerte ${alert.id}:`, alertError.message);
                }
            }

        } catch (error) {
            console.error('Erreur vérification alertes:', error.message);
        }
    }

    /**
     * Envoie une alerte de prix à l'utilisateur
     */
    async sendPriceAlert(client, alert, upgradePaths, bestPrice) {
        try {
            const user = await client.users.fetch(alert.user_id);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🚨 Alerte de Prix Upgrade!')
                .setDescription(`Le prix d'upgrade **${alert.from_ship_name}** → **${alert.to_ship_name}** est maintenant disponible à votre prix cible!`)
                .addFields(
                    { name: '💰 Prix trouvé', value: `$${bestPrice}`, inline: true },
                    { name: '🎯 Prix cible', value: `$${alert.max_price}`, inline: true },
                    { name: '💵 Économies', value: `$${alert.max_price - bestPrice}`, inline: true }
                )
                .setTimestamp();

            // Ajouter les détails du meilleur chemin
            const bestPath = upgradePaths.paths.find(p => p.totalPrice === bestPrice);
            if (bestPath) {
                const pathDescription = bestPath.steps.map(step => 
                    `${step.from} → ${step.to} ($${step.price}) sur ${step.store}`
                ).join('\n');

                embed.addFields({
                    name: '🛣️ Meilleur chemin',
                    value: pathDescription,
                    inline: false
                });
            }

            await user.send({ embeds: [embed] });
            
            // Marquer comme notifié
            await this.updateAlertLastNotified(alert.id);
            
            console.log(`📧 Alerte envoyée à ${alert.user_id} pour ${alert.from_ship_name} -> ${alert.to_ship_name}`);
            
        } catch (error) {
            console.error('Erreur envoi alerte:', error.message);
        }
    }

    /**
     * Met à jour la dernière vérification d'une alerte
     */
    async updateAlertLastChecked(alertId) {
        try {
            const stmt = await this.db.db.prepare(`
                UPDATE ${this.alertsTable} 
                SET last_checked = datetime('now') 
                WHERE id = ?
            `);
            await stmt.run([alertId]);
            await stmt.finalize();
        } catch (error) {
            console.error('Erreur mise à jour last_checked:', error.message);
        }
    }

    /**
     * Met à jour la dernière notification d'une alerte
     */
    async updateAlertLastNotified(alertId) {
        try {
            const stmt = await this.db.db.prepare(`
                UPDATE ${this.alertsTable} 
                SET last_notified = datetime('now') 
                WHERE id = ?
            `);
            await stmt.run([alertId]);
            await stmt.finalize();
        } catch (error) {
            console.error('Erreur mise à jour last_notified:', error.message);
        }
    }

    /**
     * Sauvegarde l'historique des prix
     */
    async savePriceHistory(fromShipName, toShipName, upgradePaths) {
        try {
            for (const path of upgradePaths.paths) {
                for (const step of path.steps) {
                    const stmt = await this.db.db.prepare(`
                        INSERT INTO ${this.priceHistoryTable} 
                        (from_ship_name, to_ship_name, store_name, price, available) 
                        VALUES (?, ?, ?, ?, ?)
                    `);

                    await stmt.run([
                        fromShipName,
                        toShipName,
                        step.store,
                        step.price,
                        1
                    ]);

                    await stmt.finalize();
                }
            }
        } catch (error) {
            console.error('Erreur sauvegarde historique prix:', error.message);
        }
    }

    /**
     * Démarre le service de vérification périodique
     */
    async startAlertService(client, intervalMinutes = 30) {
        try {
            console.log(`🚀 Service d'alertes démarré (vérification toutes les ${intervalMinutes} minutes)`);
            
            // S'assurer que la base de données et les tables sont initialisées
            await this.ensureDatabase();
            await this.initializeTables();
            this.isInitialized = true;
            
            // Vérification immédiate (après un petit délai)
            setTimeout(() => {
                this.checkAlerts(client);
            }, 5000); // 5 secondes de délai
            
            // Vérification périodique
            setInterval(() => {
                this.checkAlerts(client);
            }, intervalMinutes * 60 * 1000);
            
        } catch (error) {
            console.error('❌ Erreur démarrage service alertes:', error.message);
        }
    }
}

module.exports = UpgradePriceService;
