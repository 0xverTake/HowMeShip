const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UexShipDisplayService = require('../services/uexShipDisplayService');
const Database = require('../config/database');

const uexShipDisplayService = new UexShipDisplayService();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ship')
        .setDescription('Affiche les détails complets d\'un vaisseau avec image et caractéristiques')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Nom du vaisseau')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addBooleanOption(option =>
            option.setName('compact')
                .setDescription('Affichage compact (défaut: false)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('no_image')
                .setDescription('Masquer l\'image (défaut: false)')
                .setRequired(false)
        ),

    async autocomplete(interaction, database) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            if (focusedValue.length < 2) {
                return await interaction.respond([]);
            }

            const ships = await database.searchShips(focusedValue, 25);

            const choices = ships.map(ship => ({
                name: ship.name,
                value: ship.name
            }));

            await interaction.respond(choices);
        } catch (error) {
            console.error('Erreur autocomplete ship:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction, database) {
        const shipName = interaction.options.getString('name');
        const compact = interaction.options.getBoolean('compact') || false;
        const noImage = interaction.options.getBoolean('no_image') || false;

        try {
            await interaction.deferReply();

            // Rechercher le vaisseau dans la base de données étendues d'abord
            let ship = await uexShipDisplayService.getShipByNameExtended(shipName);
            
            // Si pas trouvé dans les données étendues, fallback vers la base normale
            if (!ship) {
                ship = await database.getShipByName(shipName);
            }

            if (!ship) {
                return await interaction.editReply({
                    content: `❌ Vaisseau "${shipName}" non trouvé. Utilisez l'autocomplétion pour voir les vaisseaux disponibles.`,
                    ephemeral: true
                });
            }

            // Créer l'embed enrichi avec TOUTES les données UEX Corp complètes
            const embedData = await uexShipDisplayService.createShipEmbed(ship, {
                color: '#0099ff',
                showSpecs: true,
                showImage: !noImage,
                showPrices: true,
                compact: compact
            });

            // Créer les boutons d'action
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ship_refresh_${ship.id}`)
                        .setLabel('🔄 Actualiser')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`ship_compare_${ship.id}`)
                        .setLabel('⚖️ Comparer')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`ship_upgrade_${ship.id}`)
                        .setLabel('🚀 Upgrades')
                        .setStyle(ButtonStyle.Success)
                );

            await interaction.editReply({
                ...embedData,
                components: [actionRow]
            });

            // Mettre à jour les détails en arrière-plan si nécessaire
            // Note: Pas de mise à jour nécessaire avec les données UEX Corp locales

        } catch (error) {
            console.error('Erreur commande ship:', error);
            
            const errorMessage = error.message.includes('timeout') 
                ? '⏱️ Délai d\'attente dépassé lors du chargement des détails du vaisseau.'
                : '❌ Erreur lors du chargement des détails du vaisseau.';

            if (interaction.deferred) {
                await interaction.editReply({
                    content: errorMessage,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            }
        }
    },

    async handleButton(interaction) {
        const [action, type, shipId] = interaction.customId.split('_');
        
        if (action !== 'ship') return false;

        try {
            await interaction.deferUpdate();

            // Utiliser getInstance mais s'assurer que c'est initialisé
            const db = Database.getInstance();
            await db.ensureInitialized();
            
            // Chercher d'abord dans les données étendues, puis fallback
            let ship = null;
            try {
                // Essayer avec l'ID d'abord
                ship = await db.getShipById(shipId);
                if (ship) {
                    // Puis chercher les données étendues pour ce vaisseau
                    const extendedShip = await uexShipDisplayService.getShipByNameExtended(ship.name);
                    if (extendedShip) {
                        ship = extendedShip;
                    }
                }
            } catch (error) {
                console.log('Erreur lors de la récupération des données étendues:', error);
            }

            if (!ship) {
                return await interaction.editReply({
                    content: '❌ Vaisseau non trouvé.',
                    components: []
                });
            }

            switch (type) {
                case 'refresh':
                    // Les données UEX Corp sont déjà à jour localement
                    
                    // Recréer l'embed avec les données actuelles
                    const refreshedEmbedData = await uexShipDisplayService.createShipEmbed(ship, {
                        color: '#00ff00',
                        showSpecs: true,
                        showImage: true,
                        showPrices: true,
                        compact: false
                    });

                    const refreshActionRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`ship_refresh_${ship.id}`)
                                .setLabel('🔄 Actualiser')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`ship_compare_${ship.id}`)
                                .setLabel('⚖️ Comparer')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId(`ship_upgrade_${ship.id}`)
                                .setLabel('🚀 Upgrades')
                                .setStyle(ButtonStyle.Success)
                        );

                    await interaction.editReply({
                        ...refreshedEmbedData,
                        components: [refreshActionRow]
                    });
                    break;

                case 'compare':
                    // Afficher un message pour demander le deuxième vaisseau
                    await interaction.followUp({
                        content: `🔍 Pour comparer **${ship.name}**, utilisez la commande:\n\`\`\`/compare ship1:${ship.name} ship2:[nom du deuxième vaisseau]\`\`\``,
                        ephemeral: true
                    });
                    break;

                case 'upgrade':
                    // Rediriger vers la commande upgrade
                    await interaction.followUp({
                        content: `🚀 Pour voir les upgrades depuis **${ship.name}**, utilisez:\n\`\`\`/upgrade from:${ship.name} to:[vaisseau cible]\`\`\``,
                        ephemeral: true
                    });
                    break;
            }

            return true;

        } catch (error) {
            console.error('Erreur bouton ship:', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ Erreur lors du traitement de l\'action.',
                    components: []
                });
            }
            
            return true;
        }
    }
};
