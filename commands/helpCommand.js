const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche l\'aide et les commandes disponibles'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#00D4FF')
            .setTitle('🚀 Star Citizen Upgrade Navigator - Aide')
            .setDescription('Bot Discord pour trouver les meilleurs prix d\'upgrades de vaisseaux Star Citizen')
            .setThumbnail('https://media.robertsspaceindustries.com/logo/sc_logo_white.png')
            .addFields(
                {
                    name: '🔄 /upgrade',
                    value: '```/upgrade from:vaisseau_départ to:vaisseau_destination [store:magasin]```\nTrouve les upgrades disponibles entre deux vaisseaux.\n• `from` : Vaisseau de départ (autocomplétion)\n• `to` : Vaisseau de destination (autocomplétion)\n• `store` : Magasin spécifique (optionnel)',
                    inline: false
                },
                {
                    name: '🚀 /ships',
                    value: '```/ships [search:nom] [manufacturer:fabricant] [category:catégorie]```\nRecherche et affiche les vaisseaux disponibles.\n• `search` : Nom du vaisseau (optionnel)\n• `manufacturer` : Filtrer par fabricant (optionnel)\n• `category` : Filtrer par catégorie (optionnel)',
                    inline: false
                },
                {
                    name: '💰 /price',
                    value: '```/price ship:vaisseau```\nAffiche les prix d\'un vaisseau sur différents magasins.\n• `ship` : Nom du vaisseau (autocomplétion)',
                    inline: false
                },
                {
                    name: '❓ /help',
                    value: '```/help```\nAffiche cette aide.',
                    inline: false
                },
                {
                    name: '🏪 Magasins supportés',
                    value: '• **RSI** - Magasin officiel Roberts Space Industries\n• **Star-Hangar** - Marché secondaire\n• **Space Foundry** - Marché secondaire',
                    inline: true
                },
                {
                    name: '💡 Conseils d\'utilisation',
                    value: '• Utilisez l\'autocomplétion pour sélectionner facilement les vaisseaux\n• Les prix sont mis à jour automatiquement\n• Vérifiez toujours sur le site du vendeur avant d\'acheter',
                    inline: true
                },
                {
                    name: '📊 Exemples',
                    value: '```/upgrade from:Aurora MR to:Avenger Titan```\n```/ships search:hornet manufacturer:Anvil Aerospace```\n```/price ship:Constellation Andromeda```',
                    inline: false
                }
            )
            .setFooter({
                text: 'Star Citizen Upgrade Navigator • Données mises à jour automatiquement',
                iconURL: 'https://media.robertsspaceindustries.com/favicon.ico'
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
