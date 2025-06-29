const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UpgradePriceService = require('../services/upgradePriceService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade-alert')
        .setDescription('Gère les alertes de prix pour les upgrades de vaisseaux')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Crée une nouvelle alerte de prix d\'upgrade')
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
                        .setDescription('Magasins à surveiller')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Tous les magasins', value: 'all' },
                            { name: 'Star-Hangar + RSI', value: 'star-hangar,rsi' },
                            { name: 'Star-Hangar seulement', value: 'star-hangar' },
                            { name: 'RSI seulement', value: 'rsi' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Affiche tes alertes actives'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Supprime une alerte')
                .addIntegerOption(option =>
                    option.setName('alert_id')
                        .setDescription('ID de l\'alerte à supprimer')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Vérifie immédiatement le prix d\'un upgrade')
                .addStringOption(option =>
                    option.setName('from')
                        .setDescription('Vaisseau de départ')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('to')
                        .setDescription('Vaisseau de destination')
                        .setRequired(true)
                        .setAutocomplete(true))),

    async autocomplete(interaction, database) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            const focusedValue = focusedOption.value.toLowerCase();
            
            if (focusedValue.length < 2) {
                return await interaction.respond([]);
            }

            // Utiliser la base UEX Corp pour l'autocomplétion
            const ships = await database.searchShips(focusedValue, 25);

            const choices = ships.map(ship => ({
                name: ship.name,
                value: ship.name
            }));

            await interaction.respond(choices);
        } catch (error) {
            console.error('Erreur autocomplete upgrade-alert:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction, database) {
        const subcommand = interaction.options.getSubcommand();
        const upgradeService = new UpgradePriceService();

        try {
            await interaction.deferReply({ ephemeral: subcommand === 'list' });

            switch (subcommand) {
                case 'create':
                    await this.handleCreateAlert(interaction, upgradeService);
                    break;
                case 'list':
                    await this.handleListAlerts(interaction, upgradeService);
                    break;
                case 'delete':
                    await this.handleDeleteAlert(interaction, upgradeService);
                    break;
                case 'check':
                    await this.handleCheckPrice(interaction, upgradeService);
                    break;
            }
        } catch (error) {
            console.error('Erreur commande upgrade-alert:', error);
            
            const errorMessage = error.message.includes('non trouvé') 
                ? error.message
                : 'Une erreur est survenue lors du traitement de votre demande.';

            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ ${errorMessage}`,
                    ephemeral: true
                });
            }
        }
    },

    async handleCreateAlert(interaction, upgradeService) {
        const fromShip = interaction.options.getString('from');
        const toShip = interaction.options.getString('to');
        const maxPrice = interaction.options.getInteger('max_price');
        const storesOption = interaction.options.getString('stores') || 'star-hangar,rsi';

        // Parser les magasins
        const stores = storesOption === 'all' 
            ? ['star-hangar', 'rsi', 'space-foundry']
            : storesOption.split(',');

        const alert = await upgradeService.createPriceAlert(
            interaction.user.id,
            fromShip,
            toShip,
            maxPrice,
            stores
        );

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Alerte créée!')
            .setDescription(`Vous serez notifié par DM quand l'upgrade **${fromShip}** → **${toShip}** sera disponible à **$${maxPrice}** ou moins.`)
            .addFields(
                { name: '🚀 De', value: fromShip, inline: true },
                { name: '🎯 Vers', value: toShip, inline: true },
                { name: '💰 Prix max', value: `$${maxPrice}`, inline: true },
                { name: '🏪 Magasins surveillés', value: stores.join(', '), inline: false },
                { name: '📊 Prix actuel', value: alert.currentBestPrice ? `$${alert.currentBestPrice}` : 'N/A', inline: true }
            )
            .setFooter({ text: `ID de l'alerte: ${alert.id}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleListAlerts(interaction, upgradeService) {
        const alerts = await upgradeService.getUserAlerts(interaction.user.id);

        if (alerts.length === 0) {
            await interaction.editReply({
                content: '📭 Vous n\'avez aucune alerte active. Utilisez `/upgrade-alert create` pour en créer une.'
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle(`📋 Vos alertes d'upgrade (${alerts.length})`)
            .setTimestamp();

        alerts.forEach((alert, index) => {
            const stores = alert.stores.join(', ');
            const createdDate = new Date(alert.created_at).toLocaleDateString('fr-FR');
            
            embed.addFields({
                name: `${index + 1}. ${alert.from_ship_name} → ${alert.to_ship_name}`,
                value: `💰 Prix max: $${alert.max_price}\n🏪 Magasins: ${stores}\n📅 Créée: ${createdDate}\n🆔 ID: ${alert.id}`,
                inline: true
            });
        });

        embed.setFooter({ text: 'Utilisez /upgrade-alert delete <id> pour supprimer une alerte' });

        await interaction.editReply({ embeds: [embed] });
    },

    async handleDeleteAlert(interaction, upgradeService) {
        const alertId = interaction.options.getInteger('alert_id');
        
        const success = await upgradeService.deleteAlert(alertId, interaction.user.id);

        if (success) {
            await interaction.editReply({
                content: `✅ Alerte #${alertId} supprimée avec succès.`
            });
        } else {
            await interaction.editReply({
                content: `❌ Alerte #${alertId} non trouvée ou vous n'êtes pas autorisé à la supprimer.`
            });
        }
    },

    async handleCheckPrice(interaction, upgradeService) {
        const fromShip = interaction.options.getString('from');
        const toShip = interaction.options.getString('to');

        const upgradePaths = await upgradeService.findUpgradePaths(
            fromShip, 
            toShip, 
            ['star-hangar', 'rsi']
        );

        const bestPrice = Math.min(...upgradePaths.paths.map(p => p.totalPrice));
        const bestPath = upgradePaths.paths.find(p => p.totalPrice === bestPrice);

        const embed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle(`💰 Prix d'upgrade: ${fromShip} → ${toShip}`)
            .addFields(
                { name: '🚀 De', value: upgradePaths.fromShip.name, inline: true },
                { name: '🎯 Vers', value: upgradePaths.toShip.name, inline: true },
                { name: '💵 Meilleur prix', value: `$${bestPrice}`, inline: true }
            )
            .setTimestamp();

        if (bestPath) {
            const pathDescription = bestPath.steps.map(step => 
                `${step.from} → ${step.to} **$${step.price}** (${step.store})`
            ).join('\n');

            embed.addFields({
                name: '🛣️ Meilleur chemin',
                value: pathDescription,
                inline: false
            });
        }

        embed.setFooter({ text: 'Utilisez /upgrade-alert create pour être alerté quand le prix baisse' });

        await interaction.editReply({ embeds: [embed] });
    }
};
