/**
 * Commande Discord pour les alertes de prix
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const PriceAlertSystem = require('../services/priceAlertSystem');

// Store du système d'alertes (sera initialisé dans le bot principal)
let alertSystem = null;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('Gérer les alertes de prix pour les vaisseaux')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Créer une alerte de prix')
                .addStringOption(option =>
                    option.setName('ship')
                        .setDescription('Nom du vaisseau')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addNumberOption(option =>
                    option.setName('price')
                        .setDescription('Prix cible en USD')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option.setName('condition')
                        .setDescription('Condition de déclenchement')
                        .setRequired(false)
                        .addChoices(
                            { name: 'En dessous de', value: 'below' },
                            { name: 'Au dessus de', value: 'above' }
                        ))
                .addStringOption(option =>
                    option.setName('source')
                        .setDescription('Source de prix préférée')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Toutes les sources', value: 'any' },
                            { name: 'Star Hangar', value: 'star_hangar' },
                            { name: 'Space Foundry', value: 'space_foundry' },
                            { name: 'RSI Officiel', value: 'rsi' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Voir toutes vos alertes actives'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Supprimer une alerte')
                .addStringOption(option =>
                    option.setName('ship')
                        .setDescription('Nom du vaisseau')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Statistiques du système d\'alertes')),

    async execute(interaction) {
        if (!alertSystem) {
            await interaction.reply({
                content: '❌ Le système d\'alertes n\'est pas encore initialisé. Réessayez dans quelques secondes.',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await this.handleCreateAlert(interaction);
                    break;
                case 'list':
                    await this.handleListAlerts(interaction);
                    break;
                case 'remove':
                    await this.handleRemoveAlert(interaction);
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
            console.error('Erreur commande alert:', error);
            const errorMessage = {
                content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
                ephemeral: true
            };
            
            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },

    /**
     * Créer une nouvelle alerte
     */
    async handleCreateAlert(interaction) {
        const shipName = interaction.options.getString('ship');
        const targetPrice = interaction.options.getNumber('price');
        const condition = interaction.options.getString('condition') || 'below';
        const source = interaction.options.getString('source') || 'any';

        await interaction.deferReply();

        const success = await alertSystem.createAlert(
            interaction.user.id,
            interaction.channel.id,
            interaction.guild?.id || 'DM',
            shipName,
            targetPrice,
            condition,
            source
        );

        if (success) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Alerte Créée !')
                .setColor('#00ff00')
                .addFields(
                    { name: '🚀 Vaisseau', value: shipName, inline: true },
                    { name: '💰 Prix Cible', value: `$${targetPrice}`, inline: true },
                    { name: '📊 Condition', value: condition === 'below' ? 'En dessous de' : 'Au dessus de', inline: true },
                    { name: '🔍 Source', value: this.formatSource(source), inline: true },
                    { name: '⏰ Surveillance', value: 'Active (vérification toutes les 5 min)', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Vous serez notifié automatiquement' });

            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply({
                content: '❌ Impossible de créer l\'alerte. Vérifiez vos paramètres et réessayez.'
            });
        }
    },

    /**
     * Lister les alertes de l'utilisateur
     */
    async handleListAlerts(interaction) {
        await interaction.deferReply();

        const alerts = await alertSystem.getUserAlerts(interaction.user.id);

        if (alerts.length === 0) {
            await interaction.editReply({
                content: '📭 Vous n\'avez aucune alerte active.\n\nUtilisez `/alert create` pour en créer une !'
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🔔 Vos Alertes de Prix (${alerts.length})`)
            .setColor('#3498db')
            .setTimestamp();

        alerts.forEach((alert, index) => {
            const conditionText = alert.condition === 'below' ? '⬇️ En dessous de' : '⬆️ Au dessus de';
            const currentPriceText = alert.current_price ? `\n💵 Prix actuel: $${alert.current_price}` : '';
            const lastCheckedText = alert.last_checked ? 
                `\n🕒 Dernière vérif: <t:${Math.floor(new Date(alert.last_checked).getTime() / 1000)}:R>` : '';

            embed.addFields({
                name: `${index + 1}. ${alert.ship_name}`,
                value: `${conditionText} **$${alert.target_price}**` +
                       `\n🔍 Source: ${this.formatSource(alert.source)}` +
                       currentPriceText +
                       lastCheckedText,
                inline: false
            });
        });

        // Ajouter des boutons de gestion
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('alert_manage')
                    .setPlaceholder('Gérer une alerte...')
                    .addOptions(
                        alerts.map((alert, index) => ({
                            label: `${alert.ship_name} - $${alert.target_price}`,
                            value: `remove_${alert.ship_name}`,
                            description: `${alert.condition === 'below' ? 'En dessous' : 'Au dessus'} de $${alert.target_price}`,
                            emoji: '🗑️'
                        }))
                    )
            );

        await interaction.editReply({
            embeds: [embed],
            components: [actionRow]
        });
    },

    /**
     * Supprimer une alerte
     */
    async handleRemoveAlert(interaction) {
        const shipName = interaction.options.getString('ship');

        await interaction.deferReply();

        const success = await alertSystem.removeAlert(interaction.user.id, shipName);

        if (success) {
            await interaction.editReply({
                content: `✅ Alerte supprimée pour **${shipName}** !`
            });
        } else {
            await interaction.editReply({
                content: `❌ Aucune alerte trouvée pour **${shipName}**.`
            });
        }
    },

    /**
     * Afficher les statistiques
     */
    async handleStats(interaction) {
        await interaction.deferReply();

        const stats = await alertSystem.getStats();

        const embed = new EmbedBuilder()
            .setTitle('📊 Statistiques du Système d\'Alertes')
            .setColor('#9b59b6')
            .addFields(
                { name: '🔔 Total Alertes', value: stats.total_alerts.toString(), inline: true },
                { name: '✅ Alertes Actives', value: stats.active_alerts.toString(), inline: true },
                { name: '🚨 Alertes Déclenchées', value: stats.triggered_alerts.toString(), inline: true },
                { name: '📧 Notifications Envoyées', value: stats.total_notifications.toString(), inline: true },
                { name: '🔄 Surveillance', value: stats.monitoring ? 'Active' : 'Inactive', inline: true },
                { name: '⏱️ Intervalle', value: stats.check_interval, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Système d\'alertes automatique' });

        await interaction.editReply({ embeds: [embed] });
    },

    /**
     * Gérer l'autocomplétion
     */
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        // Liste des vaisseaux populaires pour l'autocomplétion
        const popularShips = [
            'Avenger Titan', 'Cutlass Black', 'Gladius', 'Hornet',
            'Mustang Alpha', 'Aurora MR', 'Constellation Andromeda',
            'Freelancer', 'Carrack', 'Hammerhead', 'Sabre', 'Vanguard',
            'Caterpillar', 'Hercules', 'Redeemer', 'Eclipse'
        ];

        const filtered = popularShips.filter(ship =>
            ship.toLowerCase().includes(focusedValue.toLowerCase())
        );

        await interaction.respond(
            filtered.slice(0, 25).map(ship => ({
                name: ship,
                value: ship
            }))
        );
    },

    /**
     * Gérer les interactions des menus
     */
    async handleSelectMenu(interaction) {
        if (interaction.customId === 'alert_manage') {
            const value = interaction.values[0];
            
            if (value.startsWith('remove_')) {
                const shipName = value.replace('remove_', '');
                const success = await alertSystem.removeAlert(interaction.user.id, shipName);
                
                if (success) {
                    await interaction.reply({
                        content: `✅ Alerte supprimée pour **${shipName}** !`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: `❌ Erreur lors de la suppression de l'alerte.`,
                        ephemeral: true
                    });
                }
            }
        }
    },

    /**
     * Formater le nom de la source
     */
    formatSource(source) {
        const sources = {
            'any': 'Toutes les sources',
            'star_hangar': 'Star Hangar',
            'space_foundry': 'Space Foundry',
            'rsi': 'RSI Officiel'
        };
        return sources[source] || source;
    },

    /**
     * Initialiser le système d'alertes
     */
    initializeAlertSystem(client) {
        alertSystem = new PriceAlertSystem(client);
        console.log('[AlertCommand] Système d\'alertes initialisé');
    }
};
