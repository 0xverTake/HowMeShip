/**
 * Système d'alertes de prix pour les vaisseaux Star Citizen
 * Surveille les prix et notifie les utilisateurs des changements
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../config/database');

class PriceAlertSystem {
    constructor(client) {
        this.client = client;
        this.db = new Database();
        this.alerts = new Map();
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.checkInterval = 5 * 60 * 1000; // 5 minutes
        
        this.initialize();
    }

    /**
     * Initialiser le système d'alertes
     */
    async initialize() {
        try {
            await this.createAlertsTable();
            await this.loadActiveAlerts();
            console.log('[PriceAlert] 🔔 Système d\'alertes initialisé');
        } catch (error) {
            console.error('[PriceAlert] ❌ Erreur initialisation:', error.message);
        }
    }

    /**
     * Créer la table des alertes
     */
    async createAlertsTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS price_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                ship_name TEXT NOT NULL,
                target_price REAL NOT NULL,
                condition TEXT NOT NULL DEFAULT 'below',
                current_price REAL,
                source TEXT DEFAULT 'any',
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                triggered_at DATETIME,
                last_checked DATETIME,
                notifications_sent INTEGER DEFAULT 0
            )
        `;
        
        await this.db.run(query);
        
        // Créer un index pour les performances
        await this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_price_alerts_active 
            ON price_alerts(is_active, ship_name)
        `);
    }

    /**
     * Charger les alertes actives
     */
    async loadActiveAlerts() {
        const alerts = await this.db.all(`
            SELECT * FROM price_alerts 
            WHERE is_active = 1
        `);
        
        this.alerts.clear();
        alerts.forEach(alert => {
            const key = `${alert.user_id}_${alert.ship_name}`;
            this.alerts.set(key, alert);
        });
        
        console.log(`[PriceAlert] 📊 ${alerts.length} alertes actives chargées`);
        
        if (alerts.length > 0 && !this.isMonitoring) {
            this.startMonitoring();
        }
    }

    /**
     * Créer une nouvelle alerte de prix
     */
    async createAlert(userId, channelId, guildId, shipName, targetPrice, condition = 'below', source = 'any') {
        try {
            const alertKey = `${userId}_${shipName}`;
            
            // Vérifier si l'alerte existe déjà
            const existingAlert = await this.db.get(`
                SELECT id FROM price_alerts 
                WHERE user_id = ? AND ship_name = ? AND is_active = 1
            `, [userId, shipName]);
            
            if (existingAlert) {
                // Mettre à jour l'alerte existante
                await this.db.run(`
                    UPDATE price_alerts 
                    SET target_price = ?, condition = ?, source = ?, 
                        created_at = CURRENT_TIMESTAMP, triggered_at = NULL
                    WHERE id = ?
                `, [targetPrice, condition, source, existingAlert.id]);
                
                console.log(`[PriceAlert] 🔄 Alerte mise à jour: ${shipName} pour ${userId}`);
            } else {
                // Créer une nouvelle alerte
                const result = await this.db.run(`
                    INSERT INTO price_alerts 
                    (user_id, channel_id, guild_id, ship_name, target_price, condition, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [userId, channelId, guildId, shipName, targetPrice, condition, source]);
                
                console.log(`[PriceAlert] ✅ Nouvelle alerte créée: ${shipName} pour ${userId}`);
            }

            // Recharger les alertes
            await this.loadActiveAlerts();
            
            // Démarrer la surveillance si nécessaire
            if (!this.isMonitoring) {
                this.startMonitoring();
            }

            return true;
            
        } catch (error) {
            console.error('[PriceAlert] ❌ Erreur création alerte:', error.message);
            return false;
        }
    }

    /**
     * Supprimer une alerte
     */
    async removeAlert(userId, shipName) {
        try {
            await this.db.run(`
                UPDATE price_alerts 
                SET is_active = 0 
                WHERE user_id = ? AND ship_name = ? AND is_active = 1
            `, [userId, shipName]);
            
            const alertKey = `${userId}_${shipName}`;
            this.alerts.delete(alertKey);
            
            console.log(`[PriceAlert] 🗑️ Alerte supprimée: ${shipName} pour ${userId}`);
            return true;
            
        } catch (error) {
            console.error('[PriceAlert] ❌ Erreur suppression alerte:', error.message);
            return false;
        }
    }

    /**
     * Obtenir les alertes d'un utilisateur
     */
    async getUserAlerts(userId) {
        return await this.db.all(`
            SELECT * FROM price_alerts 
            WHERE user_id = ? AND is_active = 1
            ORDER BY created_at DESC
        `, [userId]);
    }

    /**
     * Démarrer la surveillance des prix
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log('[PriceAlert] 🎯 Démarrage de la surveillance des prix');
        
        this.monitoringInterval = setInterval(() => {
            this.checkAllAlerts();
        }, this.checkInterval);
    }

    /**
     * Arrêter la surveillance
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('[PriceAlert] ⏹️ Surveillance des prix arrêtée');
    }

    /**
     * Vérifier toutes les alertes actives
     */
    async checkAllAlerts() {
        if (this.alerts.size === 0) {
            this.stopMonitoring();
            return;
        }

        console.log(`[PriceAlert] 🔍 Vérification de ${this.alerts.size} alertes...`);
        
        // Grouper les alertes par vaisseau pour optimiser les requêtes
        const shipGroups = new Map();
        for (const alert of this.alerts.values()) {
            if (!shipGroups.has(alert.ship_name)) {
                shipGroups.set(alert.ship_name, []);
            }
            shipGroups.get(alert.ship_name).push(alert);
        }

        // Vérifier chaque groupe de vaisseaux
        for (const [shipName, alerts] of shipGroups.entries()) {
            try {
                await this.checkShipAlerts(shipName, alerts);
            } catch (error) {
                console.error(`[PriceAlert] ❌ Erreur vérification ${shipName}:`, error.message);
            }
        }
    }

    /**
     * Vérifier les alertes pour un vaisseau spécifique
     */
    async checkShipAlerts(shipName, alerts) {
        // Obtenir le prix actuel depuis les scrapers
        const currentPrices = await this.getCurrentPrices(shipName);
        
        if (currentPrices.length === 0) return;

        for (const alert of alerts) {
            const relevantPrices = currentPrices.filter(price => 
                alert.source === 'any' || price.source.toLowerCase().includes(alert.source.toLowerCase())
            );

            if (relevantPrices.length === 0) continue;

            // Trouver le meilleur prix selon la condition
            const bestPrice = alert.condition === 'below' 
                ? Math.min(...relevantPrices.map(p => p.price))
                : Math.max(...relevantPrices.map(p => p.price));

            const priceSource = relevantPrices.find(p => p.price === bestPrice);

            // Vérifier si l'alerte doit être déclenchée
            const shouldTrigger = this.shouldTriggerAlert(alert, bestPrice);
            
            if (shouldTrigger) {
                await this.triggerAlert(alert, bestPrice, priceSource);
            }

            // Mettre à jour le prix actuel et la dernière vérification
            await this.db.run(`
                UPDATE price_alerts 
                SET current_price = ?, last_checked = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [bestPrice, alert.id]);
        }
    }

    /**
     * Obtenir les prix actuels d'un vaisseau
     */
    async getCurrentPrices(shipName) {
        // Cette méthode devrait utiliser les scrapers implémentés précédemment
        // Pour l'instant, on simule avec des prix d'exemple
        
        try {
            const StarHangarScraper = require('../scrapers/starHangarScraper');
            const SpaceFoundryScraper = require('../scrapers/spaceFoundryScraper');
            const RSIScraper = require('../scrapers/rsiScraper');

            const scrapers = [
                new StarHangarScraper(),
                new SpaceFoundryScraper(),
                new RSIScraper()
            ];

            const prices = [];
            
            for (const scraper of scrapers) {
                try {
                    const results = await scraper.searchShip(shipName);
                    prices.push(...results);
                } catch (error) {
                    // Continuer avec le scraper suivant
                }
            }

            return prices;
            
        } catch (error) {
            console.error('[PriceAlert] ❌ Erreur récupération prix:', error.message);
            return [];
        }
    }

    /**
     * Vérifier si une alerte doit être déclenchée
     */
    shouldTriggerAlert(alert, currentPrice) {
        if (alert.condition === 'below') {
            return currentPrice <= alert.target_price;
        } else if (alert.condition === 'above') {
            return currentPrice >= alert.target_price;
        }
        return false;
    }

    /**
     * Déclencher une alerte
     */
    async triggerAlert(alert, currentPrice, priceSource) {
        try {
            const channel = await this.client.channels.fetch(alert.channel_id);
            if (!channel) return;

            const user = await this.client.users.fetch(alert.user_id);
            if (!user) return;

            // Créer l'embed d'alerte
            const embed = new EmbedBuilder()
                .setTitle('🚨 Alerte de Prix Déclenchée !')
                .setColor('#ff6b6b')
                .addFields(
                    { name: '🚀 Vaisseau', value: alert.ship_name, inline: true },
                    { name: '💰 Prix Cible', value: `$${alert.target_price}`, inline: true },
                    { name: '💵 Prix Actuel', value: `$${currentPrice}`, inline: true },
                    { name: '📊 Source', value: priceSource?.source || 'Unknown', inline: true },
                    { name: '📈 Condition', value: alert.condition === 'below' ? 'En dessous de' : 'Au dessus de', inline: true },
                    { name: '⏰ Économie', value: `$${Math.abs(alert.target_price - currentPrice)}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Système d\'alertes automatique' });

            if (priceSource?.url) {
                embed.addFields({ name: '🔗 Lien', value: `[Voir l'offre](${priceSource.url})`, inline: false });
            }

            // Créer les boutons d'action
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`alert_disable_${alert.id}`)
                        .setLabel('Désactiver cette alerte')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔕'),
                    new ButtonBuilder()
                        .setCustomId(`alert_snooze_${alert.id}`)
                        .setLabel('Reporter (1h)')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⏰')
                );

            // Envoyer la notification
            await channel.send({
                content: `${user} 🎯 **Alerte de prix pour ${alert.ship_name}** !`,
                embeds: [embed],
                components: [actionRow]
            });

            // Marquer l'alerte comme déclenchée
            await this.db.run(`
                UPDATE price_alerts 
                SET triggered_at = CURRENT_TIMESTAMP, notifications_sent = notifications_sent + 1
                WHERE id = ?
            `, [alert.id]);

            console.log(`[PriceAlert] 📢 Alerte envoyée: ${alert.ship_name} à $${currentPrice}`);
            
        } catch (error) {
            console.error('[PriceAlert] ❌ Erreur envoi alerte:', error.message);
        }
    }

    /**
     * Gérer les interactions des boutons d'alerte
     */
    async handleAlertButton(interaction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('alert_disable_')) {
            const alertId = customId.replace('alert_disable_', '');
            await this.disableAlert(alertId);
            await interaction.reply({ content: '🔕 Alerte désactivée !', ephemeral: true });
            
        } else if (customId.startsWith('alert_snooze_')) {
            const alertId = customId.replace('alert_snooze_', '');
            await this.snoozeAlert(alertId, 60); // 1 heure
            await interaction.reply({ content: '⏰ Alerte reportée de 1 heure !', ephemeral: true });
        }
    }

    /**
     * Désactiver une alerte
     */
    async disableAlert(alertId) {
        await this.db.run(`
            UPDATE price_alerts 
            SET is_active = 0 
            WHERE id = ?
        `, [alertId]);
        
        await this.loadActiveAlerts();
    }

    /**
     * Reporter une alerte
     */
    async snoozeAlert(alertId, minutes) {
        const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
        
        await this.db.run(`
            UPDATE price_alerts 
            SET last_checked = ?
            WHERE id = ?
        `, [snoozeUntil.toISOString(), alertId]);
    }

    /**
     * Obtenir les statistiques des alertes
     */
    async getStats() {
        const stats = await this.db.get(`
            SELECT 
                COUNT(*) as total_alerts,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_alerts,
                COUNT(CASE WHEN triggered_at IS NOT NULL THEN 1 END) as triggered_alerts,
                SUM(notifications_sent) as total_notifications
            FROM price_alerts
        `);
        
        return {
            ...stats,
            monitoring: this.isMonitoring,
            check_interval: `${this.checkInterval / 1000}s`
        };
    }
}

module.exports = PriceAlertSystem;
