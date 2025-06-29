const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const ShipImageScraper = require('../scrapers/images/shipImageScraper');
const fs = require('fs');
const path = require('path');

class ShipDisplayService {
    constructor() {
        this.imageScraper = new ShipImageScraper();
    }

    /**
     * Crée un embed enrichi pour un vaisseau avec image et caractéristiques
     * @param {Object} ship - Données de base du vaisseau
     * @param {Object} options - Options d'affichage
     * @returns {Object} Embed et attachments pour Discord
     */
    async createShipEmbed(ship, options = {}) {
        const {
            color = '#0099ff',
            showSpecs = true,
            showImage = true,
            showPrice = true,
            compact = false
        } = options;

        try {
            // Récupérer les détails enrichis du vaisseau
            const shipDetails = await this.imageScraper.getShipDetails(ship.name);

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`🚀 ${ship.name}`)
                .setTimestamp();

            let attachments = [];

            // Ajouter l'image si disponible et demandée
            if (showImage && shipDetails?.image) {
                if (shipDetails.localImagePath && fs.existsSync(shipDetails.localImagePath)) {
                    // Utiliser l'image locale
                    const filename = path.basename(shipDetails.localImagePath);
                    const attachment = new AttachmentBuilder(shipDetails.localImagePath, { name: filename });
                    attachments.push(attachment);
                    embed.setImage(`attachment://${filename}`);
                } else if (shipDetails.image) {
                    // Utiliser l'image distante
                    embed.setImage(shipDetails.image);
                }
            }

            // Ajouter la description si disponible
            if (shipDetails?.description && !compact) {
                const description = shipDetails.description.length > 300 
                    ? shipDetails.description.substring(0, 297) + '...'
                    : shipDetails.description;
                embed.setDescription(description);
            }

            // Informations de base
            const basicInfo = [];
            
            if (shipDetails?.manufacturer || ship.manufacturer) {
                basicInfo.push(`**Fabricant:** ${shipDetails?.manufacturer || ship.manufacturer}`);
            }
            
            if (shipDetails?.category || ship.category) {
                basicInfo.push(`**Catégorie:** ${shipDetails?.category || ship.category}`);
            }

            if (showPrice && (shipDetails?.price || ship.price)) {
                const price = shipDetails?.price || ship.price;
                basicInfo.push(`**Prix:** $${price.toLocaleString()}`);
            }

            if (shipDetails?.availability) {
                basicInfo.push(`**Disponibilité:** ${shipDetails.availability}`);
            }

            if (basicInfo.length > 0) {
                embed.addFields({
                    name: '📋 Informations générales',
                    value: basicInfo.join('\n'),
                    inline: false
                });
            }

            // Ajouter les spécifications techniques si disponibles et demandées
            if (showSpecs && shipDetails?.specifications && Object.keys(shipDetails.specifications).length > 0) {
                this.addSpecificationsToEmbed(embed, shipDetails.specifications, compact);
            }

            // Ajouter l'URL si disponible
            if (shipDetails?.url) {
                embed.setURL(shipDetails.url);
            }

            // Footer avec source des données
            const footerText = shipDetails ? 
                `Données RSI • Dernière mise à jour: ${new Date(shipDetails.lastUpdated).toLocaleDateString('fr-FR')}` :
                'Données de base • Utilisez /ship pour plus de détails';
            
            embed.setFooter({ text: footerText });

            return {
                embeds: [embed],
                files: attachments
            };

        } catch (error) {
            console.error('Erreur lors de la création de l\'embed:', error);
            
            // Fallback vers un embed basique
            const basicEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`🚀 ${ship.name}`)
                .setTimestamp();

            if (ship.manufacturer) {
                basicEmbed.addFields({
                    name: '📋 Informations',
                    value: `**Fabricant:** ${ship.manufacturer}${ship.price ? `\n**Prix:** $${ship.price.toLocaleString()}` : ''}`,
                    inline: false
                });
            }

            basicEmbed.setFooter({ text: 'Données de base • Erreur lors du chargement des détails' });

            return {
                embeds: [basicEmbed],
                files: []
            };
        }
    }

    /**
     * Ajoute les spécifications techniques à l'embed
     * @param {EmbedBuilder} embed - Embed à modifier
     * @param {Object} specifications - Spécifications du vaisseau
     * @param {boolean} compact - Mode compact
     */
    addSpecificationsToEmbed(embed, specifications, compact = false) {
        // Spécifications prioritaires à afficher en premier
        const prioritySpecs = [
            'Length', 'Beam', 'Height', 'Mass', 'Cargo', 'Crew', 'Speed', 'Max Speed'
        ];

        // Spécifications de combat
        const combatSpecs = [
            'Shields', 'Armor', 'Weapons', 'Missiles', 'Countermeasures'
        ];

        // Organiser les spécifications
        const organizedSpecs = {
            dimensions: [],
            performance: [],
            combat: [],
            other: []
        };

        for (const [key, value] of Object.entries(specifications)) {
            const lowerKey = key.toLowerCase();
            
            if (lowerKey.includes('length') || lowerKey.includes('beam') || lowerKey.includes('height') || lowerKey.includes('mass')) {
                organizedSpecs.dimensions.push(`**${key}:** ${value}`);
            } else if (lowerKey.includes('speed') || lowerKey.includes('cargo') || lowerKey.includes('crew') || lowerKey.includes('fuel')) {
                organizedSpecs.performance.push(`**${key}:** ${value}`);
            } else if (lowerKey.includes('shield') || lowerKey.includes('armor') || lowerKey.includes('weapon') || lowerKey.includes('missile')) {
                organizedSpecs.combat.push(`**${key}:** ${value}`);
            } else {
                organizedSpecs.other.push(`**${key}:** ${value}`);
            }
        }

        // Ajouter les champs selon le mode
        if (compact) {
            // Mode compact : tout dans un seul champ
            const allSpecs = [
                ...organizedSpecs.dimensions,
                ...organizedSpecs.performance,
                ...organizedSpecs.combat,
                ...organizedSpecs.other
            ].slice(0, 10); // Limiter à 10 spécifications

            if (allSpecs.length > 0) {
                embed.addFields({
                    name: '⚙️ Spécifications',
                    value: allSpecs.join('\n'),
                    inline: true
                });
            }
        } else {
            // Mode détaillé : champs séparés
            if (organizedSpecs.dimensions.length > 0) {
                embed.addFields({
                    name: '📏 Dimensions',
                    value: organizedSpecs.dimensions.join('\n'),
                    inline: true
                });
            }

            if (organizedSpecs.performance.length > 0) {
                embed.addFields({
                    name: '⚡ Performance',
                    value: organizedSpecs.performance.join('\n'),
                    inline: true
                });
            }

            if (organizedSpecs.combat.length > 0) {
                embed.addFields({
                    name: '⚔️ Combat',
                    value: organizedSpecs.combat.join('\n'),
                    inline: true
                });
            }

            if (organizedSpecs.other.length > 0 && organizedSpecs.other.length <= 5) {
                embed.addFields({
                    name: '🔧 Autres',
                    value: organizedSpecs.other.join('\n'),
                    inline: true
                });
            }
        }
    }

    /**
     * Crée un embed de comparaison entre deux vaisseaux
     * @param {Object} ship1 - Premier vaisseau
     * @param {Object} ship2 - Deuxième vaisseau
     * @returns {Object} Embed de comparaison
     */
    async createComparisonEmbed(ship1, ship2) {
        try {
            const [details1, details2] = await Promise.all([
                this.imageScraper.getShipDetails(ship1.name),
                this.imageScraper.getShipDetails(ship2.name)
            ]);

            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle(`⚖️ Comparaison: ${ship1.name} vs ${ship2.name}`)
                .setTimestamp();

            // Comparaison des prix
            if ((details1?.price || ship1.price) && (details2?.price || ship2.price)) {
                const price1 = details1?.price || ship1.price;
                const price2 = details2?.price || ship2.price;
                const difference = Math.abs(price1 - price2);
                const cheaper = price1 < price2 ? ship1.name : ship2.name;

                embed.addFields({
                    name: '💰 Prix',
                    value: `**${ship1.name}:** $${price1.toLocaleString()}\n**${ship2.name}:** $${price2.toLocaleString()}\n\n🏆 **${cheaper}** est moins cher de $${difference.toLocaleString()}`,
                    inline: false
                });
            }

            // Comparaison des spécifications
            if (details1?.specifications && details2?.specifications) {
                const specs1 = details1.specifications;
                const specs2 = details2.specifications;
                
                const commonSpecs = Object.keys(specs1).filter(key => specs2[key]);
                
                if (commonSpecs.length > 0) {
                    const comparison = commonSpecs.slice(0, 5).map(spec => {
                        return `**${spec}:**\n• ${ship1.name}: ${specs1[spec]}\n• ${ship2.name}: ${specs2[spec]}`;
                    }).join('\n\n');

                    embed.addFields({
                        name: '⚙️ Spécifications',
                        value: comparison,
                        inline: false
                    });
                }
            }

            embed.setFooter({ text: 'Comparaison basée sur les données RSI' });

            return {
                embeds: [embed],
                files: []
            };

        } catch (error) {
            console.error('Erreur lors de la création de la comparaison:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur de comparaison')
                .setDescription('Impossible de comparer ces vaisseaux pour le moment.')
                .setTimestamp();

            return {
                embeds: [errorEmbed],
                files: []
            };
        }
    }

    /**
     * Met à jour les détails d'un vaisseau en arrière-plan
     * @param {string} shipName - Nom du vaisseau
     */
    async updateShipDetails(shipName) {
        try {
            await this.imageScraper.scrapeShipDetails(shipName);
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de ${shipName}:`, error);
        }
    }

    /**
     * Obtient les statistiques du service d'images
     * @returns {Object} Statistiques
     */
    getStats() {
        return this.imageScraper.getStats();
    }

    /**
     * Nettoie le cache des images
     * @param {number} maxAge - Âge maximum en jours
     */
    cleanup(maxAge = 30) {
        this.imageScraper.cleanup(maxAge);
    }
}

module.exports = new ShipDisplayService();
