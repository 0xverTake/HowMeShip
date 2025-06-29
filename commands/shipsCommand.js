const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('../config/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ships')
        .setDescription('Recherche et affiche les vaisseaux Star Citizen disponibles')
        .addStringOption(option =>
            option.setName('search')
                .setDescription('Nom du vaisseau à rechercher (optionnel)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('manufacturer')
                .setDescription('Fabricant du vaisseau (optionnel)')
                .setRequired(false)
                .addChoices(
                    { name: 'RSI', value: 'RSI' },
                    { name: 'Aegis Dynamics', value: 'Aegis Dynamics' },
                    { name: 'Anvil Aerospace', value: 'Anvil Aerospace' },
                    { name: 'Origin Jumpworks', value: 'Origin Jumpworks' },
                    { name: 'Drake Interplanetary', value: 'Drake Interplanetary' },
                    { name: 'MISC', value: 'MISC' },
                    { name: 'Consolidated Outland', value: 'Consolidated Outland' },
                    { name: 'Crusader Industries', value: 'Crusader Industries' },
                    { name: 'Aopoa', value: 'Aopoa' },
                    { name: 'Esperia', value: 'Esperia' },
                    { name: 'Banu', value: 'Banu' },
                    { name: 'Tumbril Land Systems', value: 'Tumbril Land Systems' },
                    { name: 'Greycat Industrial', value: 'Greycat Industrial' },
                    { name: 'Argo Astronautics', value: 'Argo Astronautics' },
                    { name: 'Kruger Intergalactic', value: 'Kruger Intergalactic' }
                ))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Catégorie du vaisseau (optionnel)')
                .setRequired(false)
                .addChoices(
                    { name: 'Starter', value: 'Starter' },
                    { name: 'Fighter', value: 'Fighter' },
                    { name: 'Multi-role', value: 'Multi-role' },
                    { name: 'Cargo', value: 'Cargo' },
                    { name: 'Exploration', value: 'Exploration' },
                    { name: 'Racing', value: 'Racing' },
                    { name: 'Luxury', value: 'Luxury' },
                    { name: 'Bomber', value: 'Bomber' },
                    { name: 'Stealth Fighter', value: 'Stealth Fighter' },
                    { name: 'Support', value: 'Support' },
                    { name: 'Mining', value: 'Mining' },
                    { name: 'Transport', value: 'Transport' },
                    { name: 'Corvette', value: 'Corvette' },
                    { name: 'Ground Vehicle', value: 'Ground Vehicle' }
                ))
        .addStringOption(option =>
            option.setName('size')
                .setDescription('Taille du vaisseau (optionnel)')
                .setRequired(false)
                .addChoices(
                    { name: 'Small', value: 'Small' },
                    { name: 'Medium', value: 'Medium' },
                    { name: 'Large', value: 'Large' },
                    { name: 'Capital', value: 'Capital' },
                    { name: 'Snub', value: 'Snub' },
                    { name: 'Vehicle', value: 'Vehicle' }
                )),

    async execute(interaction, database) {
        const searchQuery = interaction.options.getString('search');
        const manufacturerFilter = interaction.options.getString('manufacturer');
        const categoryFilter = interaction.options.getString('category');
        const sizeFilter = interaction.options.getString('size');

        await interaction.deferReply();

        try {
            let ships;

            if (searchQuery) {
                // Recherche par nom dans la base UEX Corp
                ships = await database.searchShips(searchQuery, 50);
            } else {
                // Récupérer tous les vaisseaux avec limite
                ships = await database.getAllShips(100);
            }

            // Appliquer les filtres sur les données UEX Corp
            if (manufacturerFilter) {
                ships = ships.filter(ship => 
                    (ship.manufacturer_name || '').toLowerCase().includes(manufacturerFilter.toLowerCase())
                );
            }

            if (categoryFilter) {
                ships = ships.filter(ship => 
                    (ship.career || '').toLowerCase().includes(categoryFilter.toLowerCase()) ||
                    (ship.role || '').toLowerCase().includes(categoryFilter.toLowerCase())
                );
            }

            if (sizeFilter) {
                ships = ships.filter(ship => 
                    (ship.size || '').toLowerCase() === sizeFilter.toLowerCase()
                );
            }

            if (ships.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Aucun vaisseau trouvé')
                    .setDescription('Aucun vaisseau ne correspond à vos critères de recherche.')
                    .addFields(
                        { 
                            name: '💡 Suggestions', 
                            value: '• Vérifiez l\'orthographe\n• Essayez une recherche plus générale\n• Utilisez `/ships` sans paramètres pour voir tous les vaisseaux\n• Consultez `/help` pour plus d\'informations' 
                        }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Limiter à 25 résultats pour éviter les messages trop longs
            const displayShips = ships.slice(0, 25);
            
            const embed = new EmbedBuilder()
                .setColor('#2196F3')
                .setTitle('🚀 Base de données des vaisseaux Star Citizen')
                .setTimestamp();

            // Ajouter la description avec les filtres appliqués
            let description = `**${ships.length}** vaisseau${ships.length > 1 ? 'x' : ''} trouvé${ships.length > 1 ? 's' : ''}`;
            
            if (searchQuery || manufacturerFilter || categoryFilter || sizeFilter) {
                description += ' avec les filtres appliqués:';
                if (searchQuery) description += `\n🔍 **Recherche:** ${searchQuery}`;
                if (manufacturerFilter) description += `\n🏭 **Fabricant:** ${manufacturerFilter}`;
                if (categoryFilter) description += `\n📂 **Catégorie:** ${categoryFilter}`;
                if (sizeFilter) description += `\n📏 **Taille:** ${sizeFilter}`;
            }

            if (displayShips.length < ships.length) {
                description += `\n\n*Affichage des ${displayShips.length} premiers résultats*`;
            }

            embed.setDescription(description);

            // Grouper les vaisseaux par fabricant pour un meilleur affichage
            const shipsByManufacturer = {};
            displayShips.forEach(ship => {
                const manufacturer = ship.manufacturer_name || 'Inconnu';
                if (!shipsByManufacturer[manufacturer]) {
                    shipsByManufacturer[manufacturer] = [];
                }
                shipsByManufacturer[manufacturer].push(ship);
            });

            // Ajouter les champs pour chaque fabricant (limité à 25 champs max)
            let fieldCount = 0;
            Object.entries(shipsByManufacturer).forEach(([manufacturer, manufacturerShips]) => {
                if (fieldCount >= 20) return; // Garder de la place pour les stats et commandes

                const shipList = manufacturerShips.map(ship => {
                    let shipInfo = `• **${ship.name}**`;
                    if (ship.career) shipInfo += ` (${ship.career})`;
                    if (ship.size) shipInfo += ` [${ship.size}]`;
                    if (ship.price_standalone && ship.price_standalone > 0) shipInfo += ` - $${ship.price_standalone}`;
                    return shipInfo;
                }).join('\n');

                // Limiter la longueur du champ à 1024 caractères
                const truncatedList = shipList.length > 1024 ? shipList.substring(0, 1021) + '...' : shipList;

                embed.addFields({
                    name: `🏭 ${manufacturer} (${manufacturerShips.length})`,
                    value: truncatedList,
                    inline: false
                });

                fieldCount++;
            });

            // Ajouter des statistiques UEX Corp
            const totalShips = ships.length;
            const uniqueManufacturers = [...new Set(ships.map(s => s.manufacturer_name).filter(Boolean))].length;
            const uniqueCareers = [...new Set(ships.map(s => s.career).filter(Boolean))].length;
            const uniqueSizes = [...new Set(ships.map(s => s.size).filter(Boolean))].length;
            
            let statsText = `**Total:** ${totalShips} vaisseaux\n`;
            statsText += `**Fabricants:** ${uniqueManufacturers}\n`;
            statsText += `**Carrières:** ${uniqueCareers}\n`;
            statsText += `**Tailles:** ${uniqueSizes}`;

            embed.addFields({
                name: '📊 Statistiques UEX Corp',
                value: statsText,
                inline: true
            });

            // Ajouter des commandes utiles
            embed.addFields({
                name: '💡 Commandes utiles',
                value: '• `/upgrade from:vaisseau1 to:vaisseau2` - Trouver des upgrades\n• `/ships search:nom` - Rechercher un vaisseau\n• `/price ship:nom` - Voir les prix d\'un vaisseau\n• `/help` - Guide complet',
                inline: true
            });

            embed.setFooter({
                text: `Base de données mise à jour • ${stats.totalShips} vaisseaux disponibles`
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors de la recherche de vaisseaux:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de la recherche de vaisseaux.')
                .addFields({
                    name: '🔧 Que faire ?',
                    value: '• Réessayez dans quelques instants\n• Vérifiez votre recherche\n• Contactez un administrateur si le problème persiste'
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
