const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('price')
        .setDescription('Affiche les prix d\'un vaisseau sur différents magasins')
        .addStringOption(option =>
            option.setName('ship')
                .setDescription('Nom du vaisseau')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction, database) {
        const focusedValue = interaction.options.getFocused();
        
        if (focusedValue.length < 2) {
            await interaction.respond([]);
            return;
        }
        
        try {
            const ships = await database.searchShips(focusedValue);
            const choices = ships.slice(0, 25).map(ship => ({
                name: `${ship.name}${ship.manufacturer ? ` (${ship.manufacturer})` : ''}`,
                value: ship.name
            }));
            
            await interaction.respond(choices);
        } catch (error) {
            console.error('Erreur lors de l\'autocomplétion:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction, database) {
        const shipName = interaction.options.getString('ship');

        await interaction.deferReply();

        try {
            // Rechercher le vaisseau
            const ship = await database.getShipByName(shipName);

            if (!ship) {
                await interaction.editReply({
                    content: `❌ Vaisseau "${shipName}" non trouvé. Utilisez \`/ships\` pour voir la liste des vaisseaux disponibles.`
                });
                return;
            }

            // Rechercher tous les upgrades qui mènent à ce vaisseau (pour voir les prix)
            const upgradesToShip = await database.getUpgradesToShip(ship.id);
            const upgradesFromShip = await database.getUpgradesFromShip(ship.id);

            const embed = new EmbedBuilder()
                .setColor('#9C27B0')
                .setTitle(`💰 Prix - ${ship.name}`)
                .setTimestamp();

            // Informations de base du vaisseau
            let description = '';
            if (ship.manufacturer) description += `🏭 **Fabricant:** ${ship.manufacturer}\n`;
            if (ship.category) description += `📂 **Catégorie:** ${ship.category}\n`;
            if (ship.base_price) description += `💵 **Prix de base:** $${ship.base_price}\n`;

            embed.setDescription(description || 'Informations de base non disponibles');

            // Grouper les upgrades par magasin
            const pricesByStore = {};
            
            // Ajouter les upgrades vers ce vaisseau
            upgradesToShip.forEach(upgrade => {
                if (!pricesByStore[upgrade.store]) {
                    pricesByStore[upgrade.store] = {
                        upgrades: [],
                        directSales: []
                    };
                }
                pricesByStore[upgrade.store].upgrades.push({
                    from: upgrade.from_ship_name,
                    price: upgrade.price,
                    url: upgrade.url
                });
            });

            // Si le vaisseau a un prix de base, l'ajouter comme vente directe
            if (ship.base_price) {
                if (!pricesByStore['RSI']) {
                    pricesByStore['RSI'] = { upgrades: [], directSales: [] };
                }
                pricesByStore['RSI'].directSales.push({
                    type: 'Vente directe',
                    price: ship.base_price,
                    url: null
                });
            }

            // Afficher les prix par magasin
            if (Object.keys(pricesByStore).length > 0) {
                Object.entries(pricesByStore).forEach(([store, data]) => {
                    let storeInfo = '';
                    
                    // Ventes directes
                    if (data.directSales.length > 0) {
                        storeInfo += '**Vente directe:**\n';
                        data.directSales.forEach(sale => {
                            storeInfo += `💰 $${sale.price}`;
                            if (sale.url) storeInfo += ` [🔗](${sale.url})`;
                            storeInfo += '\n';
                        });
                    }
                    
                    // Upgrades
                    if (data.upgrades.length > 0) {
                        if (storeInfo) storeInfo += '\n';
                        storeInfo += '**Upgrades disponibles:**\n';
                        
                        // Trier par prix croissant et limiter à 5
                        const sortedUpgrades = data.upgrades.sort((a, b) => a.price - b.price).slice(0, 5);
                        
                        sortedUpgrades.forEach(upgrade => {
                            storeInfo += `• Depuis ${upgrade.from}: $${upgrade.price}`;
                            if (upgrade.url) storeInfo += ` [🔗](${upgrade.url})`;
                            storeInfo += '\n';
                        });
                        
                        if (data.upgrades.length > 5) {
                            storeInfo += `*... et ${data.upgrades.length - 5} autres upgrades*\n`;
                        }
                    }
                    
                    if (storeInfo) {
                        embed.addFields({
                            name: `🏪 ${store}`,
                            value: storeInfo.trim(),
                            inline: false
                        });
                    }
                });
            } else {
                embed.addFields({
                    name: '❌ Aucun prix trouvé',
                    value: 'Aucune information de prix disponible pour ce vaisseau.',
                    inline: false
                });
            }

            // Statistiques des upgrades
            if (upgradesFromShip.length > 0) {
                const upgradeStats = upgradesFromShip.slice(0, 5).map(upgrade => 
                    `• Vers ${upgrade.to_ship_name}: $${upgrade.price} (${upgrade.store})`
                ).join('\n');
                
                embed.addFields({
                    name: '🔄 Upgrades populaires depuis ce vaisseau',
                    value: upgradeStats + (upgradesFromShip.length > 5 ? `\n*... et ${upgradesFromShip.length - 5} autres*` : ''),
                    inline: false
                });
            }

            // Conseils d'achat
            const allUpgradePrices = upgradesToShip.map(u => u.price).filter(p => p > 0);
            if (allUpgradePrices.length > 0) {
                const minUpgradePrice = Math.min(...allUpgradePrices);
                const maxUpgradePrice = Math.max(...allUpgradePrices);
                
                let advice = `💡 **Conseils d'achat:**\n`;
                advice += `• Prix d'upgrade le plus bas: $${minUpgradePrice}\n`;
                advice += `• Prix d'upgrade le plus élevé: $${maxUpgradePrice}\n`;
                
                if (ship.base_price && minUpgradePrice < ship.base_price) {
                    const savings = ship.base_price - minUpgradePrice;
                    advice += `• 💰 Économie possible: $${savings} avec un upgrade\n`;
                }
                
                advice += `• Utilisez \`/upgrade from:vaisseau to:${ship.name}\` pour plus de détails`;
                
                embed.addFields({
                    name: '💡 Conseils',
                    value: advice,
                    inline: false
                });
            }

            embed.setFooter({
                text: 'Les prix peuvent changer. Vérifiez toujours sur le site du vendeur avant d\'acheter.'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors de la recherche de prix:', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors de la recherche de prix. Veuillez réessayer plus tard.'
            });
        }
    }
};
