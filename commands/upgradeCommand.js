const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shipsLoader = require('../utils/shipsLoader');
const upgradePathfinder = require('../services/upgradePathfinder');
const priceAlertService = require('../services/priceAlertService');
const shipDisplayService = require('../services/shipDisplayService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription('Trouve les meilleurs chemins d\'upgrades entre deux vaisseaux avec prix en temps réel')
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
                    { name: 'RSI seulement', value: 'rsi' },
                    { name: 'Star-Hangar seulement', value: 'star-hangar' },
                    { name: 'Space-Foundry seulement', value: 'space-foundry' },
                    { name: 'RSI + Star-Hangar', value: 'rsi,star-hangar' },
                    { name: 'RSI + Space-Foundry', value: 'rsi,space-foundry' },
                    { name: 'Marchés secondaires', value: 'star-hangar,space-foundry' }
                ))
        .addIntegerOption(option =>
            option.setName('max_steps')
                .setDescription('Nombre maximum d\'étapes d\'upgrade (défaut: 3)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(5))
        .addIntegerOption(option =>
            option.setName('alert_price')
                .setDescription('Créer une alerte si le prix descend sous cette valeur')
                .setRequired(false)
                .setMinValue(0)),

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
        }
    },

    async execute(interaction) {
        const fromShipName = interaction.options.getString('from');
        const toShipName = interaction.options.getString('to');
        const storesOption = interaction.options.getString('stores') || 'all';
        const maxSteps = interaction.options.getInteger('max_steps') || 3;
        const alertPrice = interaction.options.getInteger('alert_price');

        await interaction.deferReply();

        try {
            // Déterminer les magasins à inclure
            let includeStores = ['RSI', 'Star-Hangar', 'Space-Foundry'];
            if (storesOption !== 'all') {
                const storeMap = {
                    'rsi': ['RSI'],
                    'star-hangar': ['Star-Hangar'],
                    'space-foundry': ['Space-Foundry']
                };
                
                if (storesOption.includes(',')) {
                    includeStores = storesOption.split(',').map(store => {
                        const mapped = storeMap[store.trim()];
                        return mapped ? mapped[0] : store.trim();
                    });
                } else {
                    includeStores = storeMap[storesOption] || [storesOption];
                }
            }

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

            // Créer l'embed de recherche en cours
            const searchingEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔍 Recherche en cours...')
                .setDescription(`Analyse des prix en temps réel pour l'upgrade **${fromShip.name}** → **${toShip.name}**`)
                .addFields(
                    { name: '🏪 Magasins', value: includeStores.join(', '), inline: true },
                    { name: '🔢 Étapes max', value: maxSteps.toString(), inline: true },
                    { name: '⏱️ Statut', value: 'Scraping des prix...', inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [searchingEmbed] });

            // Rechercher les meilleurs chemins d'upgrade
            const result = await upgradePathfinder.findBestUpgradePath(fromShipName, toShipName, {
                maxSteps,
                includeStores
            });

            // Créer l'alerte de prix si demandée
            let alertMessage = '';
            if (alertPrice && alertPrice > 0) {
                const alertResult = priceAlertService.addAlert(
                    interaction.user.id,
                    fromShipName,
                    toShipName,
                    alertPrice,
                    includeStores
                );
                alertMessage = `\n\n🔔 ${alertResult.message}`;
            }

            // Créer l'embed de résultats
            const resultEmbed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle('🚀 Résultats de recherche d\'upgrade')
                .setDescription(`Upgrade **${fromShip.name}** → **${toShip.name}**${alertMessage}`)
                .setTimestamp();

            // Ajouter les informations des vaisseaux
            let shipInfo = `**Départ:** ${fromShip.name}`;
            if (fromShip.manufacturer) shipInfo += ` (${fromShip.manufacturer})`;
            if (fromShip.price) shipInfo += ` - $${fromShip.price}`;
            
            shipInfo += `\n**Destination:** ${toShip.name}`;
            if (toShip.manufacturer) shipInfo += ` (${toShip.manufacturer})`;
            if (toShip.price) shipInfo += ` - $${toShip.price}`;

            if (fromShip.price && toShip.price) {
                const directCost = toShip.price - fromShip.price;
                shipInfo += `\n**Coût direct:** $${directCost}`;
            }

            resultEmbed.addFields({
                name: '📋 Informations',
                value: shipInfo,
                inline: false
            });

            // Ajouter les alertes de prix exceptionnels
            if (result.priceAlerts && result.priceAlerts.length > 0) {
                const alertsList = result.priceAlerts.map(alert => alert.message).join('\n');
                resultEmbed.addFields({
                    name: '🔥 Alertes de prix',
                    value: alertsList,
                    inline: false
                });
            }

            // Ajouter les upgrades directs
            if (result.directUpgrade && result.directUpgrade.length > 0) {
                const directList = result.directUpgrade.slice(0, 5).map((upgrade, index) => {
                    let line = `${index + 1}. **${upgrade.store}**: $${upgrade.price}`;
                    if (upgrade.availability) line += ` (${upgrade.availability})`;
                    if (upgrade.url) line += ` [🔗](${upgrade.url})`;
                    return line;
                }).join('\n');

                resultEmbed.addFields({
                    name: '🎯 Upgrades directs disponibles',
                    value: directList,
                    inline: false
                });
            }

            // Ajouter les meilleurs chemins d'upgrade
            if (result.paths && result.paths.length > 0) {
                const bestPaths = result.paths.slice(0, 3);
                
                bestPaths.forEach((path, index) => {
                    const steps = path.steps.map(step => 
                        `${step.from.name} → ${step.to.name} (${step.store}: $${step.price})`
                    ).join('\n');
                    
                    let pathValue = `**Coût total:** $${path.totalCost}\n`;
                    pathValue += `**Étapes:** ${path.steps.length}\n`;
                    pathValue += `**Temps estimé:** ${path.timeEstimate}\n`;
                    if (path.savings > 0) pathValue += `**Économies:** $${path.savings}\n`;
                    pathValue += `**Risque:** ${(path.riskLevel * 100).toFixed(0)}%\n\n`;
                    pathValue += steps;

                    resultEmbed.addFields({
                        name: `🛤️ Chemin ${index + 1}${index === 0 ? ' (Recommandé)' : ''}`,
                        value: pathValue.length > 1024 ? pathValue.substring(0, 1021) + '...' : pathValue,
                        inline: false
                    });
                });
            }

            // Ajouter les recommandations
            if (result.recommendations) {
                resultEmbed.addFields({
                    name: '💡 Recommandation',
                    value: result.recommendations.recommendation,
                    inline: false
                });
            }

            // Si aucun résultat trouvé
            if ((!result.directUpgrade || result.directUpgrade.length === 0) && 
                (!result.paths || result.paths.length === 0)) {
                
                resultEmbed.setColor('#ff6b6b');
                resultEmbed.addFields({
                    name: '❌ Aucun upgrade trouvé',
                    value: `Aucun chemin d'upgrade disponible actuellement.\n\n**Suggestions:**\n• Vérifiez la disponibilité sur les sites des vendeurs\n• Essayez avec d'autres magasins\n• Créez une alerte de prix pour être notifié`,
                    inline: false
                });
            }

            // Créer les boutons d'action
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`refresh_upgrade_${fromShipName}_${toShipName}`)
                        .setLabel('🔄 Actualiser')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`alert_upgrade_${fromShipName}_${toShipName}`)
                        .setLabel('🔔 Créer alerte')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`compare_ships_${fromShipName}_${toShipName}`)
                        .setLabel('⚖️ Comparer')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Ajouter les statistiques de recherche
            const searchStats = `**Magasins consultés:** ${includeStores.join(', ')}\n`;
            const totalUpgrades = (result.directUpgrade?.length || 0) + (result.paths?.length || 0);
            
            resultEmbed.setFooter({
                text: `${totalUpgrades} option(s) trouvée(s) • Données mises à jour en temps réel`
            });

            await interaction.editReply({ 
                embeds: [resultEmbed],
                components: [actionRow]
            });

        } catch (error) {
            console.error('Erreur lors de la recherche d\'upgrades:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de la recherche d\'upgrades.')
                .addFields({
                    name: '🔧 Que faire ?',
                    value: '• Vérifiez l\'orthographe des noms de vaisseaux\n• Réessayez dans quelques instants\n• Contactez un administrateur si le problème persiste'
                })
                .setTimestamp();

            await interaction.editReply({ 
                embeds: [errorEmbed],
                components: []
            });
        }
    }
};
