const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const UpgradeNavigatorAPI = require('../scrapers/upgradeNavigatorAPI');
const AutonomousUpgradeSystem = require('../scrapers/autonomousUpgradeSystem');
const Database = require('../config/database');
const UexShipDisplayService = require('../services/uexShipDisplayService');

const uexShipDisplayService = new UexShipDisplayService();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription('Trouve les chemins d\'upgrade entre deux vaisseaux avec prix en temps réel')
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
        .addStringOption(option =>
            option.setName('stores')
                .setDescription('Magasins à inclure (par défaut: tous)')
                .setRequired(false)
                .addChoices(
                    { name: 'Tous les magasins', value: 'all' },
                    { name: 'Star-Hangar uniquement', value: 'star-hangar' },
                    { name: 'RSI Pledge Store uniquement', value: 'rsi' },
                    { name: 'Space Foundry uniquement', value: 'space-foundry' },
                    { name: 'Star-Hangar + RSI', value: 'star-hangar,rsi' }
                )),

    async autocomplete(interaction, database) {
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'from' || focusedOption.name === 'to') {
            try {
                const ships = await database.searchShips(focusedOption.value, 25);
                
                const choices = ships.map(ship => ({
                    name: `${ship.manufacturer} ${ship.name}`,
                    value: ship.name
                }));

                await interaction.respond(choices.slice(0, 25));
            } catch (error) {
                console.error('Erreur autocomplete upgrade:', error);
                await interaction.respond([]);
            }
        }
    },

    async execute(interaction, database) {
        try {
            await interaction.deferReply();

            const fromShip = interaction.options.getString('from');
            const toShip = interaction.options.getString('to');
            const storesOption = interaction.options.getString('stores') || 'all';

            // Valider les vaisseaux dans notre base - utiliser les données étendues
            const database = Database.getInstance();
            
            let fromShipData = await uexShipDisplayService.getShipByNameExtended(fromShip);
            let toShipData = await uexShipDisplayService.getShipByNameExtended(toShip);
            
            // Fallback vers la base normale si pas trouvé dans les données étendues
            if (!fromShipData) {
                fromShipData = await database.getShipByName(fromShip);
            }
            if (!toShipData) {
                toShipData = await database.getShipByName(toShip);
            }

            if (!fromShipData) {
                await interaction.editReply({
                    content: `❌ Vaisseau de départ "${fromShip}" non trouvé. Utilisez l'autocomplétion pour voir les vaisseaux disponibles.`
                });
                return;
            }

            if (!toShipData) {
                await interaction.editReply({
                    content: `❌ Vaisseau de destination "${toShip}" non trouvé. Utilisez l'autocomplétion pour voir les vaisseaux disponibles.`
                });
                return;
            }

            // Créer l'API Upgrade Navigator et le système autonome
            const upgradeAPI = new UpgradeNavigatorAPI();
            const autonomousSystem = new AutonomousUpgradeSystem();

            // Définir les magasins
            const storeMap = {
                'all': [1, 2, 3],
                'star-hangar': [1],
                'rsi': [2],
                'space-foundry': [3],
                'star-hangar,rsi': [1, 2]
            };

            // Variables pour les données des vaisseaux API
            let fromShipAPI = null;
            let toShipAPI = null;

            // Essayer d'abord le système autonome (plus fiable)
            console.log('🤖 Tentative avec le système autonome...');
            let upgradeData = await autonomousSystem.findUpgradePath(fromShip, toShip, [storesOption]);
            
            // Si le système autonome échoue, essayer l'API Upgrade Navigator
            if (!upgradeData.success) {
                console.log('🔍 Fallback vers Upgrade Navigator API...');
                
                // Récupérer les vaisseaux depuis l'API pour obtenir les IDs
                const apiShips = await upgradeAPI.getShips();
                
                if (apiShips && apiShips.length > 0) {
                    // Trouver les IDs correspondants
                    fromShipAPI = await upgradeAPI.findShipByName(fromShip);
                    toShipAPI = await upgradeAPI.findShipByName(toShip);

                    if (fromShipAPI && toShipAPI) {
                        const selectedStores = storeMap[storesOption] || [1, 2, 3];
                        upgradeData = await upgradeAPI.findUpgradePath(fromShipAPI.id, toShipAPI.id, selectedStores);
                    }
                }
            }

            if (!upgradeData) {
                await interaction.editReply({
                    content: '❌ Impossible de récupérer les données d\'upgrade. Le service pourrait être temporairement indisponible.'
                });
                return;
            }

            // Créer l'embed de résultat
            await module.exports.createUpgradeEmbed(interaction, fromShipData, toShipData, upgradeData, fromShipData, toShipData);

        } catch (error) {
            console.error('Erreur commande upgrade:', error);
            
            const errorMessage = {
                content: '❌ Une erreur est survenue lors de la recherche d\'upgrades. Réessayez plus tard.',
                ephemeral: true
            };
            
            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },

    async createUpgradeEmbed(interaction, fromShipData, toShipData, upgradeData, fromShipAPI, toShipAPI) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#00b4d8')
                .setTitle('🔄 Chemins d\'Upgrade Trouvés')
                .setDescription(`Upgrades disponibles: **${fromShipData.manufacturer} ${fromShipData.name}** → **${toShipData.manufacturer} ${toShipData.name}**`)
                .setTimestamp();

            // Ajouter les informations des vaisseaux
            embed.addFields(
                { 
                    name: '🚀 Vaisseau de départ', 
                    value: `**${fromShipData.manufacturer} ${fromShipData.name}**\nCatégorie: ${fromShipData.categories?.[0] || 'N/A'}\nÉquipage: ${fromShipData.crew?.min}-${fromShipData.crew?.max || fromShipData.crew?.min}`, 
                    inline: true 
                },
                { 
                    name: '🎯 Vaisseau de destination', 
                    value: `**${toShipData.manufacturer} ${toShipData.name}**\nCatégorie: ${toShipData.categories?.[0] || 'N/A'}\nÉquipage: ${toShipData.crew?.min}-${toShipData.crew?.max || toShipData.crew?.min}`, 
                    inline: true 
                }
            );

            // Traiter les données d'upgrade avec la nouvelle structure
            if (upgradeData && upgradeData.success) {
                if (upgradeData.type === 'autonomous') {
                    // Nouveau système autonome
                    embed.setColor('#00d2ff'); // Bleu cyan pour le système autonome
                    embed.setTitle('🤖 Chemins d\'Upgrade (Système Autonome)');
                    
                    if (upgradeData.paths && upgradeData.paths.length > 0) {
                        const pathsText = upgradeData.paths.slice(0, 5).map((path, index) => 
                            `**${index + 1}.** $${path.upgradeCost} - ${path.description}\n` +
                            `   📍 De: $${path.fromPrice} (${path.fromStore})\n` +
                            `   📍 Vers: $${path.toPrice} (${path.toStore})\n` +
                            `   💰 Type: ${path.type === 'official' ? 'Officiel' : 'Marché Gris'}`
                        ).join('\n\n');

                        embed.addFields({
                            name: '💰 Meilleurs chemins d\'upgrade',
                            value: pathsText,
                            inline: false
                        });

                        embed.addFields({
                            name: '📊 Sources',
                            value: upgradeData.sources.join(', '),
                            inline: true
                        });
                    } else {
                        embed.addFields({
                            name: '❌ Aucun upgrade trouvé',
                            value: 'Aucun chemin d\'upgrade disponible dans nos sources de données',
                            inline: false
                        });
                    }

                } else if (upgradeData.type === 'estimated') {
                    // Cas spécial pour les estimations
                    embed.setColor('#ff9500'); // Orange pour estimation
                    embed.setTitle('📊 Estimation d\'Upgrade');
                    
                    const estimationText = upgradeData.paths.map(path => 
                        `**${path.description}:** ${path.price}\n*${path.note}*`
                    ).join('\n\n');

                    embed.addFields({
                        name: '💰 Coût Estimé',
                        value: estimationText,
                        inline: false
                    });

                    embed.addFields({
                        name: '⚠️ Information',
                        value: upgradeData.message || 'Estimation basée sur les prix de base',
                        inline: false
                    });

                } else if (upgradeData.type === 'html' && upgradeData.paths && upgradeData.paths.length > 0) {
                    // Afficher les chemins trouvés
                    const pathsText = upgradeData.paths.slice(0, 5).map((path, index) => 
                        `**${index + 1}.** ${path.price} - ${path.item}`
                    ).join('\n');

                    embed.addFields({
                        name: '💰 Chemins d\'upgrade trouvés',
                        value: pathsText,
                        inline: false
                    });
                } else if (upgradeData.type === 'json' && upgradeData.data) {
                    // Format JSON
                    embed.addFields({
                        name: '📋 Données d\'upgrade',
                        value: 'Upgrade disponible - consultez le lien pour plus de détails',
                        inline: false
                    });
                } else {
                    // Autres formats
                    embed.addFields({
                        name: '✅ Upgrade trouvé',
                        value: 'Des chemins d\'upgrade ont été trouvés. Consultez le lien ci-dessous pour plus de détails.',
                        inline: false
                    });
                }
            } else {
                // Cas d'erreur - fournir des informations utiles malgré tout
                embed.setColor('#ff9500'); // Orange pour avertissement
                embed.setTitle('⚠️ Service Upgrade Temporairement Indisponible');
                
                let errorMessage = 'Le service de calcul d\'upgrades rencontre actuellement des difficultés techniques.';
                
                if (upgradeData && upgradeData.error) {
                    errorMessage += `\n\n**Détails:** ${upgradeData.error}`;
                }
                
                embed.addFields({
                    name: '🔧 Information',
                    value: errorMessage,
                    inline: false
                });
                
                // Ajouter des informations utiles sur les vaisseaux
                const fromPrice = fromShipAPI ? (fromShipAPI.listPrice || 'N/A') : 'N/A';
                const toPrice = toShipAPI ? (toShipAPI.listPrice || 'N/A') : 'N/A';
                
                if (fromPrice !== 'N/A' && toPrice !== 'N/A') {
                    const priceDiff = toPrice - fromPrice;
                    embed.addFields({
                        name: '💰 Estimation Approximative',
                        value: `**Différence de prix de base:** $${priceDiff}\n**Prix de départ:** $${fromPrice}\n**Prix de destination:** $${toPrice}\n\n*Cette estimation ne tient pas compte du marché gris*`,
                        inline: false
                    });
                }
                
                embed.addFields({
                    name: '🔗 Alternative',
                    value: `Vous pouvez vérifier manuellement sur [upgrade-navigator.com](https://upgrade-navigator.com) ou réessayer plus tard.`,
                    inline: false
                });
            }

            // Ajouter un lien vers le site si les données API sont disponibles
            if (fromShipAPI && toShipAPI) {
                embed.addFields({
                    name: '🔗 Plus de détails',
                    value: `[Voir sur Upgrade Navigator](https://upgrade-navigator.com/upgrade/${fromShipAPI.id}/${toShipAPI.id})`,
                    inline: false
                });
            }

            embed.setFooter({ text: 'Données en temps réel depuis upgrade-navigator.com' });

            // Créer un menu pour changer les options
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('upgrade_store_select')
                .setPlaceholder('Changer les magasins...')
                .addOptions([
                    {
                        label: 'Tous les magasins',
                        description: 'Star-Hangar + RSI + Space Foundry',
                        value: 'all',
                        emoji: '🛍️'
                    },
                    {
                        label: 'Star-Hangar uniquement',
                        description: 'Marché gris avec prix réduits',
                        value: 'star-hangar',
                        emoji: '🌟'
                    },
                    {
                        label: 'RSI Pledge Store',
                        description: 'Magasin officiel RSI',
                        value: 'rsi',
                        emoji: '🏢'
                    },
                    {
                        label: 'Star-Hangar + RSI',
                        description: 'Meilleure combinaison',
                        value: 'star-hangar,rsi',
                        emoji: '🎯'
                    }
                ]);

            const actionRow = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                embeds: [embed],
                components: [actionRow]
            });

        } catch (error) {
            console.error('Erreur création embed upgrade:', error);
            await interaction.editReply({
                content: '✅ Recherche terminée, mais impossible d\'afficher les résultats détaillés. Consultez https://upgrade-navigator.com pour plus d\'informations.'
            });
        }
    },

    // Gestion du menu de sélection
    async handleSelectMenu(interaction) {
        if (interaction.customId === 'upgrade_store_select') {
            try {
                await interaction.deferUpdate();
                
                // Pour l'instant, juste mettre à jour le message
                await interaction.editReply({
                    content: '🔄 Fonctionnalité de changement de magasin en cours de développement...',
                    components: []
                });
                
                return true;
            } catch (error) {
                console.error('Erreur menu upgrade:', error);
                return false;
            }
        }
        return false;
    }
};
