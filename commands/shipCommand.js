const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shipDisplayService = require('../services/shipDisplayService');
const Database = require('../config/database');

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

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            if (focusedValue.length < 2) {
                return await interaction.respond([]);
            }

            const db = Database.getInstance();
            const ships = db.prepare(`
                SELECT DISTINCT name 
                FROM ships 
                WHERE LOWER(name) LIKE ? 
                ORDER BY name 
                LIMIT 25
            `).all(`%${focusedValue}%`);

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

    async execute(interaction) {
        const shipName = interaction.options.getString('name');
        const compact = interaction.options.getBoolean('compact') || false;
        const noImage = interaction.options.getBoolean('no_image') || false;

        try {
            await interaction.deferReply();

            // Rechercher le vaisseau dans la base de données
            const db = Database.getInstance();
            const ship = db.prepare(`
                SELECT * FROM ships 
                WHERE LOWER(name) = LOWER(?)
                LIMIT 1
            `).get(shipName);

            if (!ship) {
                return await interaction.editReply({
                    content: `❌ Vaisseau "${shipName}" non trouvé. Utilisez l'autocomplétion pour voir les vaisseaux disponibles.`,
                    ephemeral: true
                });
            }

            // Créer l'embed enrichi avec image et caractéristiques
            const embedData = await shipDisplayService.createShipEmbed(ship, {
                color: '#0099ff',
                showSpecs: true,
                showImage: !noImage,
                showPrice: true,
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
            shipDisplayService.updateShipDetails(ship.name).catch(console.error);

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

            const db = Database.getInstance();
            const ship = db.prepare('SELECT * FROM ships WHERE id = ?').get(shipId);

            if (!ship) {
                return await interaction.editReply({
                    content: '❌ Vaisseau non trouvé.',
                    components: []
                });
            }

            switch (type) {
                case 'refresh':
                    // Forcer la mise à jour des détails
                    await shipDisplayService.updateShipDetails(ship.name);
                    
                    // Recréer l'embed avec les nouvelles données
                    const refreshedEmbedData = await shipDisplayService.createShipEmbed(ship, {
                        color: '#00ff00',
                        showSpecs: true,
                        showImage: true,
                        showPrice: true,
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
