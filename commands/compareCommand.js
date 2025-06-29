const { SlashCommandBuilder } = require('discord.js');
const UexShipDisplayService = require('../services/uexShipDisplayService');
const Database = require('../config/database');

const uexShipDisplayService = new UexShipDisplayService();

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

    async autocomplete(interaction, database) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            const focusedValue = focusedOption.value.toLowerCase();
            
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
            console.error('Erreur autocomplete compare:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction, database) {
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

            // Rechercher les vaisseaux dans la base de données étendues d'abord
            let ship1 = await uexShipDisplayService.getShipByNameExtended(ship1Name);
            let ship2 = await uexShipDisplayService.getShipByNameExtended(ship2Name);
            
            // Si pas trouvé dans les données étendues, fallback vers la base normale
            if (!ship1) {
                ship1 = await database.getShipByName(ship1Name);
            }
            if (!ship2) {
                ship2 = await database.getShipByName(ship2Name);
            }

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
            const comparisonData = await uexShipDisplayService.createComparisonEmbed(ship1, ship2);

            await interaction.editReply(comparisonData);

            // Note: Les données UEX Corp sont déjà à jour localement
            // Pas besoin de mise à jour en arrière-plan

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
