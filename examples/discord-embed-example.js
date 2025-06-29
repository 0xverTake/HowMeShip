const { EmbedBuilder } = require('discord.js');
const shipImagesUrls = require('../data/ship_images_urls.json');
const shipsData = require('../data/sc-ships-4.2/ships-index.json');

/**
 * Fonction pour obtenir l'URL d'image d'un vaisseau
 * @param {string} shipClassName - Le nom de classe du vaisseau (ex: "AEGS_Avenger_Titan")
 * @param {boolean} useThumbnail - Utiliser la version thumbnail (plus petite) ou l'image complète
 * @returns {string} URL de l'image ou image par défaut
 */
function getShipImageUrl(shipClassName, useThumbnail = false) {
    const shipImage = shipImagesUrls.ships[shipClassName];
    
    if (shipImage) {
        return useThumbnail ? shipImage.thumbnailUrl : shipImage.imageUrl;
    }
    
    // Image par défaut si le vaisseau n'est pas trouvé
    return shipImagesUrls.fallbackImage.url;
}

/**
 * Créer un embed Discord pour un vaisseau
 * @param {Object} ship - Données du vaisseau depuis ships-index.json
 * @returns {EmbedBuilder} Embed Discord prêt à envoyer
 */
function createShipEmbed(ship) {
    const imageUrl = getShipImageUrl(ship.className);
    const thumbnailUrl = getShipImageUrl(ship.className, true);
    
    const embed = new EmbedBuilder()
        .setTitle(`🚀 ${ship.name}`)
        .setDescription(`**Fabricant:** ${ship.manufacturer}\n**Rôle:** ${ship.role || 'Non spécifié'}`)
        .setColor(getManufacturerColor(ship.manufacturer))
        .setImage(imageUrl) // Image principale (grande)
        .setThumbnail(thumbnailUrl) // Image miniature (petite, en haut à droite)
        .addFields(
            {
                name: '📏 Dimensions',
                value: `**Longueur:** ${ship.length || 'N/A'} m\n**Largeur:** ${ship.beam || 'N/A'} m\n**Hauteur:** ${ship.height || 'N/A'} m`,
                inline: true
            },
            {
                name: '⚖️ Caractéristiques',
                value: `**Masse:** ${ship.mass || 'N/A'} kg\n**Cargo:** ${ship.cargo || 'N/A'} SCU\n**Équipage:** ${ship.minCrew || 'N/A'}-${ship.maxCrew || 'N/A'}`,
                inline: true
            },
            {
                name: '🚀 Performance',
                value: `**Vitesse SCM:** ${ship.scmSpeed || 'N/A'} m/s\n**Vitesse Max:** ${ship.maxSpeed || 'N/A'} m/s\n**Accélération:** ${ship.acceleration || 'N/A'} m/s²`,
                inline: true
            }
        )
        .setFooter({
            text: `Star Citizen 4.2 • ${ship.className}`,
            iconURL: 'https://starcitizen.tools/images/thumb/v/v2/Star_Citizen_Logo.png/32px-Star_Citizen_Logo.png'
        })
        .setTimestamp();
    
    return embed;
}

/**
 * Obtenir la couleur associée au fabricant
 * @param {string} manufacturer - Nom du fabricant
 * @returns {number} Couleur hexadécimale pour l'embed
 */
function getManufacturerColor(manufacturer) {
    const colors = {
        'Aegis Dynamics': 0x1f4e79,      // Bleu foncé
        'Anvil Aerospace': 0x8b4513,     // Brun
        'Drake Interplanetary': 0x8b0000, // Rouge foncé
        'MISC': 0x228b22,                // Vert
        'Origin Jumpworks': 0x4b0082,    // Indigo
        'Roberts Space Industries': 0x000080, // Bleu marine
        'Crusader Industries': 0xff6347,     // Orange-rouge
        'Argo Astronautics': 0x696969,   // Gris
        'Esperia': 0x800080,             // Violet
        'Gatac Manufacture': 0xffd700,   // Or
        'Greycat Industrial': 0x2f4f4f,  // Gris ardoise
        'Kruger Intergalactic': 0x4682b4, // Bleu acier
        'Mirai': 0xff1493,               // Rose profond
        'Tumbril': 0x8fbc8f              // Vert mer
    };
    
    return colors[manufacturer] || 0x5865f2; // Couleur Discord par défaut
}

/**
 * Exemple d'utilisation dans une commande Discord
 */
async function handleShipCommand(interaction, shipName) {
    try {
        // Rechercher le vaisseau dans les données
        const ship = shipsData.find(s => 
            s.name.toLowerCase().includes(shipName.toLowerCase()) ||
            s.className.toLowerCase().includes(shipName.toLowerCase())
        );
        
        if (!ship) {
            return await interaction.reply({
                content: `❌ Vaisseau "${shipName}" non trouvé. Utilisez \`/ships\` pour voir la liste complète.`,
                ephemeral: true
            });
        }
        
        // Créer l'embed avec l'image
        const embed = createShipEmbed(ship);
        
        // Envoyer la réponse
        await interaction.reply({
            embeds: [embed]
        });
        
    } catch (error) {
        console.error('Erreur lors de l\'affichage du vaisseau:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue lors de l\'affichage du vaisseau.',
            ephemeral: true
        });
    }
}

/**
 * Créer un embed simple avec juste l'image
 * @param {string} shipClassName - Nom de classe du vaisseau
 * @returns {EmbedBuilder} Embed simple avec image
 */
function createSimpleShipImageEmbed(shipClassName) {
    const shipImage = shipImagesUrls.ships[shipClassName];
    const imageUrl = getShipImageUrl(shipClassName);
    
    const embed = new EmbedBuilder()
        .setTitle(shipImage ? shipImage.name : 'Vaisseau Star Citizen')
        .setImage(imageUrl)
        .setColor(0x5865f2);
    
    return embed;
}

// Export des fonctions pour utilisation dans votre bot
module.exports = {
    getShipImageUrl,
    createShipEmbed,
    createSimpleShipImageEmbed,
    handleShipCommand,
    getManufacturerColor
};

/* 
EXEMPLE D'UTILISATION DANS VOTRE BOT DISCORD:

// Dans votre fichier de commande slash
const { createShipEmbed, getShipImageUrl } = require('./examples/discord-embed-example');

// Commande slash pour afficher un vaisseau
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'ship') {
        const shipName = interaction.options.getString('name');
        await handleShipCommand(interaction, shipName);
    }
});

// Utilisation directe de l'URL d'image
const titanImageUrl = getShipImageUrl('AEGS_Avenger_Titan');
console.log(titanImageUrl); // https://starcitizen.tools/images/thumb/9/9a/Avenger_Titan_in_space_-_Isometric.jpg/800px-Avenger_Titan_in_space_-_Isometric.jpg

// Créer un embed simple
const embed = new EmbedBuilder()
    .setTitle('Aegis Avenger Titan')
    .setImage(getShipImageUrl('AEGS_Avenger_Titan'))
    .setColor(0x1f4e79);

await channel.send({ embeds: [embed] });
*/
