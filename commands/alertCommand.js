const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const priceAlertService = require('../services/priceAlertService');
const shipsLoader = require('../utils/shipsLoader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('Gère les alertes de prix pour les upgrades de vaisseaux')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Crée une nouvelle alerte de prix')
                .addStringOption(option =>
                    option.setName('from')
                        .setDescription('Vaisseau de départ')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('to')
                        .setDescription('Vaisseau de destination')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addIntegerOption(option =>
                    option.setName('max_price')
                        .setDescription('Prix maximum souhaité en USD')
                        .setRequired(true)
                        .setMinValue(0))
                .addStringOption(option =>
                    option.setName('stores')
                        .setDescription('Magasins à surveiller (par défaut: tous)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Tous les magasins', value: 'all' },
                            { name: 'RSI seulement', value: 'RSI' },
                            { name: 'Star-Hangar seulement', value: 'Star-Hangar' },
                            { name: 'Space-Foundry seulement', value: 'Space-Foundry' },
                            { name: 'RSI + Star-Hangar', value: 'RSI,Star-Hangar' },
                            { name: 'RSI + Space-Foundry', value: 'RSI,Space-Foundry' },
                            { name: 'Marchés secondaires', value: 'Star-Hangar,Space-Foundry' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Affiche vos alertes actives'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Supprime une alerte')
                .addStringOption(option =>
                    option.setName('alert_id')
                        .setDescription('ID de l\'alerte à supprimer')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Affiche les statistiques des alertes (admin seulement)')),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'from' || focusedOption.name === 'to') {
            const query = focusedOption.value;
            
            if (query.length < 2) {
                await interaction.respond([]);
                return;
            }
            
            try {
                const ships = shipsLoader.searchShips(query);
                const choices = ships.slice(0, 25).map(ship => ({
                    name: `${ship.name}${ship.manufacturer ? ` (${ship.manufacturer})` : ''}${ship.price ? ` - $${ship.price}` : ''}`,
                    value: ship.name
                }));
                
                await interaction.respond(choices);
            } catch (error) {
                console.error('Erreur lors de l\'autocomplétion:', error);
                await interaction.respond([]);
            }
        } else if (focusedOption.name === 'alert_id') {
            try {
                const userAlerts = priceAlertService.getUserAlerts(interaction.user.id);
                const choices = userAlerts.slice(0, 25).map(alert => ({
                    name: `${alert.fromShip} → ${alert.toShip} (max $${alert.maxPrice})`,
                    value: alert.id
                }));
                
                await interaction.respond(choices);
            } catch (error) {
                console.error('Erreur lors de l\'autocomplétion des alertes:', error);
                await interaction.respond([]);
            }
        }
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await this.handleCreate(interaction);
                    break;
                case 'list':
                    await this.handleList(interaction);
                    break;
                case 'remove':
                    await this.handleRemove(interaction);
                    break;
                case 'stats':
                    await this.handleStats(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Sous-commande non reconnue.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Erreur dans la commande alert:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
                ephemeral: true
            });
        }
    },

    async handleCreate(interaction) {
        const fromShipName = interaction.options.getString('from');
        const toShipName = interaction.options.getString('to');
        const maxPrice = interaction.options.getInteger('max_price');
        const storesOption = interaction.options.getString('stores') || 'all';

        await interaction.deferReply();

        // Vérifier que les vaisseaux existent
        const fromShip = shipsLoader.findShipByName(fromShipName);
        const toShip = shipsLoader.findShipByName(toShipName);

        if (!fromShip) {
            await interaction.editReply({
                content: `❌ Vaisseau de départ "${fromShipName}" non trouvé. Utilisez l'autocomplétion pour voir les vaisseaux disponibles.`
            });
            return;
        }

        if (!toShip) {
            await interaction.editReply({
                content: `❌ Vaisseau de destination "${toShipName}" non trouvé. Utilisez l'autocomplétion pour voir les vaisseaux disponibles.`
            });
            return;
        }

        if (fromShip.name === toShip.name) {
            await interaction.editReply({
                content: `❌ Le vaisseau de départ et de destination sont identiques.`
            });
            return;
        }

        // Déterminer les magasins à surveiller
        let stores = ['RSI', 'Star-Hangar', 'Space-Foundry'];
        if (storesOption !== 'all') {
            stores = storesOption.split(',').map(store => store.trim());
        }

        // Vérifier le nombre d'alertes existantes pour cet utilisateur
        const userAlerts = priceAlertService.getUserAlerts(interaction.user.id);
        if (userAlerts.length >= 10) {
            await interaction.editReply({
                content: '❌ Vous avez atteint la limite de 10 alertes actives. Supprimez-en une avec `/alert remove` avant d\'en créer une nouvelle.'
            });
            return;
        }

        // Créer l'alerte
        const result = priceAlertService.addAlert(
            interaction.user.id,
            fromShipName,
            toShipName,
            maxPrice,
            stores
        );

        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('🔔 Alerte de prix créée')
            .setDescription(result.message)
            .addFields(
                { name: '🚀 Upgrade', value: `${fromShipName} → ${toShipName}`, inline: true },
                { name: '💰 Prix maximum', value: `$${maxPrice}`, inline: true },
                { name: '🏪 Magasins surveillés', value: stores.join(', '), inline: true },
                { name: '📊 Vos alertes actives', value: `${userAlerts.length + 1}/10`, inline: true },
                { name: '⏱️ Fréquence de vérification', value: '30 minutes', inline: true },
                { name: '🔔 Notification', value: 'Message privé Discord', inline: true }
            )
            .addFields({
                name: '💡 Conseils',
                value: '• Vous recevrez un message privé dès qu\'une offre correspondante sera trouvée\n• L\'alerte sera automatiquement supprimée après déclenchement\n• Utilisez `/alert list` pour voir toutes vos alertes'
            })
            .setTimestamp()
            .setFooter({
                text: `ID de l'alerte: ${result.alertId}`
            });

        await interaction.editReply({ embeds: [embed] });
    },

    async handleList(interaction) {
        await interaction.deferReply();

        const userAlerts = priceAlertService.getUserAlerts(interaction.user.id);

        if (userAlerts.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('📋 Vos alertes de prix')
                .setDescription('Vous n\'avez aucune alerte active.')
                .addFields({
                    name: '💡 Créer une alerte',
                    value: 'Utilisez `/alert create` pour créer votre première alerte de prix et être notifié des bonnes affaires !'
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle('📋 Vos alertes de prix actives')
            .setDescription(`Vous avez **${userAlerts.length}** alerte(s) active(s)`)
            .setTimestamp();

        userAlerts.forEach((alert, index) => {
            const createdDate = new Date(alert.createdAt).toLocaleDateString('fr-FR');
            const lastChecked = alert.lastChecked ? 
                new Date(alert.lastChecked).toLocaleString('fr-FR') : 
                'Jamais';

            embed.addFields({
                name: `${index + 1}. ${alert.fromShip} → ${alert.toShip}`,
                value: `💰 **Prix max:** $${alert.maxPrice}\n🏪 **Magasins:** ${alert.stores.join(', ')}\n📅 **Créée:** ${createdDate}\n🔍 **Dernière vérif:** ${lastChecked}\n🆔 **ID:** \`${alert.id}\``,
                inline: false
            });
        });

        embed.addFields({
            name: '🔧 Gestion des alertes',
            value: '• `/alert remove alert_id:ID` - Supprimer une alerte\n• `/alert create` - Créer une nouvelle alerte\n• Les alertes sont vérifiées toutes les 30 minutes'
        });

        embed.setFooter({
            text: `${userAlerts.length}/10 alertes utilisées`
        });

        await interaction.editReply({ embeds: [embed] });
    },

    async handleRemove(interaction) {
        const alertId = interaction.options.getString('alert_id');

        await interaction.deferReply();

        const result = priceAlertService.removeAlert(interaction.user.id, alertId);

        const embed = new EmbedBuilder()
            .setColor(result.success ? '#4CAF50' : '#ff6b6b')
            .setTitle(result.success ? '✅ Alerte supprimée' : '❌ Erreur')
            .setDescription(result.message)
            .setTimestamp();

        if (result.success) {
            const remainingAlerts = priceAlertService.getUserAlerts(interaction.user.id);
            embed.addFields({
                name: '📊 Alertes restantes',
                value: `${remainingAlerts.length}/10 alertes actives`
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleStats(interaction) {
        // Vérifier les permissions d'administrateur
        if (!interaction.member.permissions.has('Administrator')) {
            await interaction.reply({
                content: '❌ Cette commande est réservée aux administrateurs.',
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply();

        const statsEmbed = priceAlertService.createStatsEmbed();
        
        // Ajouter des informations supplémentaires
        const stats = priceAlertService.getStats();
        
        if (stats.total > 0) {
            statsEmbed.addFields({
                name: '🔧 Actions administrateur',
                value: '• Le service d\'alertes se lance automatiquement\n• Les alertes sont vérifiées toutes les 30 minutes\n• Les anciennes alertes sont nettoyées automatiquement'
            });
        }

        await interaction.editReply({ embeds: [statsEmbed] });
    }
};
