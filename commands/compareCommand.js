const { SlashCommandBuilder } = require('discord.js');
const shipDisplayService = require('../services/shipDisplayService');
const Database = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('compare')
        .setDescription('Compare deux vaisseaux avec leurs caractéristiques détaillées')
        .addStringOption(option =>
            option.setName('ship1')
                .setDescription('Premier vaisseau à comparer')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('ship2')
                .setDescription('Deuxième vaisseau à comparer')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            const focusedValue = focusedOption.value.toLowerCase();
            
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
            console.error('Erreur autocomplete compare:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const ship1Name = interaction.options.getString('ship1');
        const ship2Name = interaction.options.getString('ship2');

        try {
            await interaction.deferReply();

            // Vérifier que les deux vaisseaux sont différents
            if (ship1Name.toLowerCase() === ship2Name.toLowerCase()) {
                return await interaction.editReply({
                    content: '❌ Vous ne pouvez pas comparer un vaisseau avec lui-même. Choisissez deux vaisseaux différents.',
                    ephemeral: true
                });
            }

            // Rechercher les vaisseaux dans la base de données
            const db = Database.getInstance();
            
            const ship1 = db.prepare(`
                SELECT * FROM ships 
                WHERE LOWER(name) = LOWER(?)
                LIMIT 1
            `).get(ship1Name);

            const ship2 = db.prepare(`
                SELECT * FROM ships 
                WHERE LOWER(name) = LOWER(?)
                LIMIT 1
            `).get(ship2Name);

            if (!ship1) {
                return await interaction.editReply({
                    content: `❌ Premier vaisseau "${ship1Name}" non trouvé. Utilisez l'autocomplétion pour voir les vaisseaux disponibles.`,
                    ephemeral: true
                });
            }

            if (!ship2) {
                return await interaction.editReply({
                    content: `❌ Deuxième vaisseau "${ship2Name}" non trouvé. Utilisez l'autocomplétion pour voir les vaisseaux disponibles.`,
                    ephemeral: true
                });
            }

            // Créer l'embed de comparaison
            const comparisonData = await shipDisplayService.createComparisonEmbed(ship1, ship2);

            await interaction.editReply(comparisonData);

            // Mettre à jour les détails en arrière-plan
            Promise.all([
                shipDisplayService.updateShipDetails(ship1.name),
                shipDisplayService.updateShipDetails(ship2.name)
            ]).catch(console.error);

        } catch (error) {
            console.error('Erreur commande compare:', error);
            
            const errorMessage = error.message.includes('timeout') 
                ? '⏱️ Délai d\'attente dépassé lors du chargement des détails des vaisseaux.'
                : '❌ Erreur lors de la comparaison des vaisseaux.';

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
    }
};
