const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class PriceAlertService {
    constructor() {
        this.alertsFile = path.join(__dirname, '..', 'data', 'price_alerts.json');
        this.alerts = this.loadAlerts();
        this.priceHistory = new Map();
        this.checkInterval = 30 * 60 * 1000; // 30 minutes
        this.isRunning = false;
    }

    /**
     * Charge les alertes depuis le fichier
     * @returns {Array} Liste des alertes
     */
    loadAlerts() {
        try {
            if (fs.existsSync(this.alertsFile)) {
                const data = fs.readFileSync(this.alertsFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des alertes:', error);
        }
        return [];
    }

    /**
     * Sauvegarde les alertes dans le fichier
     */
    saveAlerts() {
        try {
            const dir = path.dirname(this.alertsFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.alertsFile, JSON.stringify(this.alerts, null, 2));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des alertes:', error);
        }
    }

    /**
     * Ajoute une alerte de prix
     * @param {string} userId - ID de l'utilisateur Discord
     * @param {string} fromShip - Vaisseau de départ
     * @param {string} toShip - Vaisseau de destination
     * @param {number} maxPrice - Prix maximum souhaité
     * @param {Array} stores - Magasins à surveiller
     * @returns {Object} Résultat de l'ajout
     */
    addAlert(userId, fromShip, toShip, maxPrice, stores = ['RSI', 'Star-Hangar', 'Space-Foundry']) {
        const alertId = `${userId}_${Date.now()}`;
        
        const alert = {
            id: alertId,
            userId,
            fromShip,
            toShip,
            maxPrice,
            stores,
            createdAt: new Date().toISOString(),
            triggered: false,
            lastChecked: null
        };

        this.alerts.push(alert);
        this.saveAlerts();

        return {
            success: true,
            alertId,
            message: `✅ Alerte créée ! Vous serez notifié si un upgrade ${fromShip} → ${toShip} est disponible pour moins de $${maxPrice}.`
        };
    }

    /**
     * Supprime une alerte
     * @param {string} userId - ID de l'utilisateur
     * @param {string} alertId - ID de l'alerte
     * @returns {Object} Résultat de la suppression
     */
    removeAlert(userId, alertId) {
        const initialLength = this.alerts.length;
        this.alerts = this.alerts.filter(alert => 
            !(alert.id === alertId && alert.userId === userId)
        );

        if (this.alerts.length < initialLength) {
            this.saveAlerts();
            return {
                success: true,
                message: '✅ Alerte supprimée avec succès.'
            };
        } else {
            return {
                success: false,
                message: '❌ Alerte non trouvée ou vous n\'avez pas les permissions pour la supprimer.'
            };
        }
    }

    /**
     * Récupère les alertes d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {Array} Alertes de l'utilisateur
     */
    getUserAlerts(userId) {
        return this.alerts.filter(alert => alert.userId === userId && !alert.triggered);
    }

    /**
     * Démarre le service de surveillance des prix
     * @param {Object} client - Client Discord
     * @param {Object} upgradePathfinder - Service de recherche d'upgrades
     */
    startMonitoring(client, upgradePathfinder) {
        if (this.isRunning) {
            console.log('⚠️ Le service d\'alertes est déjà en cours d\'exécution');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Démarrage du service d\'alertes de prix...');

        // Vérification initiale
        this.checkAllAlerts(client, upgradePathfinder);

        // Vérification périodique
        this.monitoringInterval = setInterval(() => {
            this.checkAllAlerts(client, upgradePathfinder);
        }, this.checkInterval);

        console.log(`✅ Service d'alertes démarré (vérification toutes les ${this.checkInterval / 60000} minutes)`);
    }

    /**
     * Arrête le service de surveillance
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isRunning = false;
        console.log('🛑 Service d\'alertes arrêté');
    }

    /**
     * Vérifie toutes les alertes actives
     * @param {Object} client - Client Discord
     * @param {Object} upgradePathfinder - Service de recherche d'upgrades
     */
    async checkAllAlerts(client, upgradePathfinder) {
        const activeAlerts = this.alerts.filter(alert => !alert.triggered);
        
        if (activeAlerts.length === 0) {
            return;
        }

        console.log(`🔍 Vérification de ${activeAlerts.length} alertes actives...`);

        for (const alert of activeAlerts) {
            try {
                await this.checkSingleAlert(client, upgradePathfinder, alert);
                
                // Délai entre les vérifications pour éviter le spam
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`❌ Erreur lors de la vérification de l'alerte ${alert.id}:`, error);
            }
        }
    }

    /**
     * Vérifie une alerte spécifique
     * @param {Object} client - Client Discord
     * @param {Object} upgradePathfinder - Service de recherche d'upgrades
     * @param {Object} alert - Alerte à vérifier
     */
    async checkSingleAlert(client, upgradePathfinder, alert) {
        try {
            // Rechercher les meilleurs prix pour cet upgrade
            const result = await upgradePathfinder.findBestUpgradePath(
                alert.fromShip, 
                alert.toShip, 
                { includeStores: alert.stores }
            );

            alert.lastChecked = new Date().toISOString();

            // Vérifier les upgrades directs
            const goodDeals = result.directUpgrade.filter(upgrade => 
                upgrade.price <= alert.maxPrice
            );

            // Vérifier les chemins d'upgrade
            const goodPaths = result.paths.filter(path => 
                path.totalCost <= alert.maxPrice
            );

            // Vérifier les alertes de prix exceptionnels
            const priceAlerts = result.priceAlerts.filter(priceAlert => 
                priceAlert.price <= alert.maxPrice
            );

            // Si on trouve de bonnes affaires, notifier l'utilisateur
            if (goodDeals.length > 0 || goodPaths.length > 0 || priceAlerts.length > 0) {
                await this.sendAlertNotification(client, alert, {
                    directUpgrades: goodDeals,
                    paths: goodPaths.slice(0, 3), // Limiter à 3 chemins
                    priceAlerts
                });

                // Marquer l'alerte comme déclenchée
                alert.triggered = true;
                this.saveAlerts();
            }

        } catch (error) {
            console.error(`Erreur lors de la vérification de l'alerte ${alert.id}:`, error);
        }
    }

    /**
     * Envoie une notification d'alerte à l'utilisateur
     * @param {Object} client - Client Discord
     * @param {Object} alert - Alerte déclenchée
     * @param {Object} deals - Bonnes affaires trouvées
     */
    async sendAlertNotification(client, alert, deals) {
        try {
            const user = await client.users.fetch(alert.userId);
            if (!user) return;

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🚨 ALERTE PRIX DÉCLENCHÉE !')
                .setDescription(`Votre alerte pour l'upgrade **${alert.fromShip}** → **${alert.toShip}** a été déclenchée !`)
                .setTimestamp();

            // Ajouter les upgrades directs
            if (deals.directUpgrades.length > 0) {
                const directList = deals.directUpgrades.map(upgrade => 
                    `• **${upgrade.store}**: $${upgrade.price}${upgrade.url ? ` [Lien](${upgrade.url})` : ''}`
                ).join('\n');

                embed.addFields({
                    name: '🎯 Upgrades directs disponibles',
                    value: directList,
                    inline: false
                });
            }

            // Ajouter les chemins d'upgrade
            if (deals.paths.length > 0) {
                const pathsList = deals.paths.map((path, index) => {
                    const steps = path.steps.map(step => `${step.from.name} → ${step.to.name} (${step.store}: $${step.price})`).join('\n  ');
                    return `**${index + 1}. Total: $${path.totalCost}** (${path.steps.length} étapes)\n  ${steps}`;
                }).join('\n\n');

                embed.addFields({
                    name: '🛤️ Chemins d\'upgrade',
                    value: pathsList.length > 1024 ? pathsList.substring(0, 1021) + '...' : pathsList,
                    inline: false
                });
            }

            // Ajouter les alertes de prix exceptionnels
            if (deals.priceAlerts.length > 0) {
                const alertsList = deals.priceAlerts.map(priceAlert => 
                    `• ${priceAlert.message}${priceAlert.url ? ` [Lien](${priceAlert.url})` : ''}`
                ).join('\n');

                embed.addFields({
                    name: '🔥 Prix exceptionnels',
                    value: alertsList,
                    inline: false
                });
            }

            embed.addFields({
                name: '⚡ Action recommandée',
                value: `Votre prix maximum était de **$${alert.maxPrice}**. Agissez rapidement car les prix peuvent changer !`,
                inline: false
            });

            embed.setFooter({
                text: 'Cette alerte a été automatiquement supprimée. Créez-en une nouvelle si nécessaire.'
            });

            await user.send({ embeds: [embed] });
            console.log(`✅ Notification d'alerte envoyée à l'utilisateur ${alert.userId}`);

        } catch (error) {
            console.error(`❌ Erreur lors de l'envoi de la notification:`, error);
        }
    }

    /**
     * Nettoie les anciennes alertes
     * @param {number} maxAge - Âge maximum en millisecondes (défaut: 30 jours)
     */
    cleanupOldAlerts(maxAge = 30 * 24 * 60 * 60 * 1000) {
        const now = Date.now();
        const initialLength = this.alerts.length;

        this.alerts = this.alerts.filter(alert => {
            const alertAge = now - new Date(alert.createdAt).getTime();
            return alertAge < maxAge;
        });

        if (this.alerts.length < initialLength) {
            this.saveAlerts();
            const removed = initialLength - this.alerts.length;
            console.log(`🧹 ${removed} anciennes alertes supprimées`);
        }
    }

    /**
     * Obtient des statistiques sur les alertes
     * @returns {Object} Statistiques
     */
    getStats() {
        const total = this.alerts.length;
        const active = this.alerts.filter(alert => !alert.triggered).length;
        const triggered = this.alerts.filter(alert => alert.triggered).length;
        
        const userCounts = {};
        this.alerts.forEach(alert => {
            userCounts[alert.userId] = (userCounts[alert.userId] || 0) + 1;
        });

        return {
            total,
            active,
            triggered,
            uniqueUsers: Object.keys(userCounts).length,
            averagePerUser: total > 0 ? (total / Object.keys(userCounts).length).toFixed(1) : 0
        };
    }

    /**
     * Crée un embed avec les statistiques des alertes
     * @returns {EmbedBuilder} Embed avec les statistiques
     */
    createStatsEmbed() {
        const stats = this.getStats();
        
        return new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle('📊 Statistiques des alertes de prix')
            .addFields(
                { name: '📈 Total des alertes', value: stats.total.toString(), inline: true },
                { name: '🟢 Alertes actives', value: stats.active.toString(), inline: true },
                { name: '🔔 Alertes déclenchées', value: stats.triggered.toString(), inline: true },
                { name: '👥 Utilisateurs uniques', value: stats.uniqueUsers.toString(), inline: true },
                { name: '📊 Moyenne par utilisateur', value: stats.averagePerUser.toString(), inline: true },
                { name: '⚙️ Statut du service', value: this.isRunning ? '🟢 Actif' : '🔴 Arrêté', inline: true }
            )
            .setTimestamp()
            .setFooter({
                text: `Vérification toutes les ${this.checkInterval / 60000} minutes`
            });
    }
}

module.exports = new PriceAlertService();
