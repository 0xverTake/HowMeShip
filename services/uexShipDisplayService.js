const { EmbedBuilder } = require('discord.js');
const Database = require('../config/database');
const fs = require('fs');
const path = require('path');

class UEXShipDisplayService {
    constructor() {
        this.db = null;
        this.shipImages = null;
        this.initialized = false;
    }

    async ensureInitialized() {
        if (!this.initialized) {
            console.log('🔄 Initialisation du service UEX...');
            
            // Initialiser la base de données
            this.db = Database.getInstance();
            await this.db.ensureInitialized();
            console.log('✅ Base de données UEX initialisée');
            
            // Charger les images (de façon sécurisée)
            try {
                this.shipImages = this.loadShipImages();
                console.log('✅ Images UEX chargées');
            } catch (error) {
                console.log('⚠️ Erreur chargement images, utilisation du fallback');
                this.shipImages = {};
            }
            
            this.initialized = true;
            console.log('✅ UEXShipDisplayService initialisé');
        }
    }

    /**
     * Charge les URLs d'images des vaisseaux depuis le fichier local
     */
    loadShipImages() {
        try {
            const imagePath = path.join(__dirname, '..', 'data', 'ship_images_urls_complete.json');
            if (fs.existsSync(imagePath)) {
                const data = JSON.parse(fs.readFileSync(imagePath, 'utf8'));
                console.log(`📸 ${data.metadata.totalShips} URLs d'images chargées depuis le fichier local`);
                return data.ships;
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des images:', error.message);
        }
        return {};
    }

    /**
     * Trouve l'URL d'image pour un vaisseau donné
     */
    getShipImageUrl(shipName) {
        if (!this.shipImages || Object.keys(this.shipImages).length === 0) {
            return null;
        }

        // Recherche directe par nom exact
        for (const [key, shipData] of Object.entries(this.shipImages)) {
            if (shipData.name && shipData.name.toLowerCase() === shipName.toLowerCase()) {
                return shipData.imageUrl || shipData.thumbnailUrl;
            }
        }

        // Recherche par nom simplifié (sans les variantes)
        const simplifiedName = shipName.replace(/\s*(Mk\s*\w+|Mark\s*\w+|\w*Edition|\w*Series)/gi, '').trim();
        for (const [key, shipData] of Object.entries(this.shipImages)) {
            if (shipData.name && shipData.name.toLowerCase().includes(simplifiedName.toLowerCase())) {
                return shipData.imageUrl || shipData.thumbnailUrl;
            }
        }

        // Recherche partielle par mots-clés
        const searchTerms = shipName.toLowerCase().split(' ');
        for (const [key, shipData] of Object.entries(this.shipImages)) {
            const nameWords = (shipData.name || '').toLowerCase().split(' ');
            if (searchTerms.some(term => nameWords.some(word => word.includes(term) && term.length > 2))) {
                return shipData.imageUrl || shipData.thumbnailUrl;
            }
        }

        return null;
    }

    /**
     * Récupère un vaisseau depuis la base de données UEX Corp
     */
    async getShipFromDatabase(shipId) {
        try {
            const ship = await this.db.getShipById(shipId);
            return ship;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du vaisseau:', error);
            return null;
        }
    }

    /**
     * Obtient les données complètes d'un vaisseau depuis la table étendue
     */
    async getShipByNameExtended(name) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const normalizedName = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
            
            const sql = `
                SELECT * FROM ships_extended 
                WHERE normalized_name LIKE ? 
                   OR name LIKE ? 
                   OR full_name LIKE ?
                ORDER BY 
                    CASE 
                        WHEN normalized_name = ? THEN 1
                        WHEN normalized_name LIKE ? THEN 2
                        ELSE 3
                    END
                LIMIT 1
            `;
            
            const searchTerm = `%${normalizedName}%`;
            
            this.db.db.get(sql, [searchTerm, searchTerm, searchTerm, normalizedName, `${normalizedName}%`], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse JSON fields
                    if (row && row.images) {
                        try {
                            row.images = JSON.parse(row.images);
                        } catch (e) {
                            row.images = [];
                        }
                    }
                    resolve(row);
                }
            });
        });
    }

    /**
     * Crée un embed enrichi avec les données étendues UEX Corp pour TOUS les vaisseaux
     */
    async createShipEmbed(ship, options = {}) {
        await this.ensureInitialized();
        
        const {
            color = '#0099ff',
            showSpecs = true,
            showImage = true,
            showPrices = true,
            compact = false
        } = options;

        try {
            // Utiliser directement les données passées en paramètre
            // (pas de double récupération - elle est faite dans la commande)
            const shipData = ship;
            
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`🚀 ${shipData.full_name || shipData.name}`)
                .setTimestamp();

            // Image du vaisseau
            if (showImage) {
                let imageUrl = null;
                
                // Priorité aux images UEX Corp si disponibles
                if (shipData.images && Array.isArray(shipData.images) && shipData.images.length > 0) {
                    imageUrl = shipData.images[0];
                } else {
                    // Fallback vers le service d'images local
                    imageUrl = this.getShipImageUrl(shipData.full_name || shipData.name);
                }
                
                if (imageUrl) {
                    embed.setImage(imageUrl);
                }
            }

            // Description du vaisseau
            if (shipData.description && !compact) {
                const description = shipData.description.length > 300 
                    ? shipData.description.substring(0, 297) + '...'
                    : shipData.description;
                embed.setDescription(description);
            }

            // Informations de base
            const basicInfo = [];
            
            if (shipData.manufacturer || shipData.manufacturer_name) {
                basicInfo.push(`**Fabricant:** ${shipData.manufacturer || shipData.manufacturer_name}`);
            }
            
            if (shipData.career) {
                basicInfo.push(`**Carrière:** ${shipData.career}`);
            }

            if (shipData.role) {
                basicInfo.push(`**Rôle:** ${shipData.role}`);
            }

            if (shipData.size) {
                basicInfo.push(`**Taille:** ${shipData.size}`);
            }

            if (shipData.production_status) {
                const statusEmoji = this.getStatusEmoji(shipData.production_status);
                basicInfo.push(`**Statut:** ${statusEmoji} ${shipData.production_status}`);
            }

            // Ajout des catégories UEX Corp
            if (shipData.category) {
                basicInfo.push(`**Catégorie:** ${shipData.category}`);
            }

            if (basicInfo.length > 0) {
                embed.addFields({
                    name: '📋 Informations générales',
                    value: basicInfo.join('\n'),
                    inline: false
                });
            }

            // Spécifications techniques étendues
            if (showSpecs && !compact) {
                this.addExtendedSpecificationsToEmbed(embed, shipData);
            }

            // Membres d'équipage (données étendues)
            if (shipData.min_crew || shipData.max_crew) {
                const crewInfo = [];
                if (shipData.min_crew) crewInfo.push(`**Min:** ${shipData.min_crew}`);
                if (shipData.max_crew) crewInfo.push(`**Max:** ${shipData.max_crew}`);
                
                if (crewInfo.length > 0) {
                    embed.addFields({
                        name: '👥 Équipage',
                        value: crewInfo.join(' • '),
                        inline: true
                    });
                }
            }

            // Fret (données étendues)
            if (shipData.cargo_capacity) {
                embed.addFields({
                    name: '📦 Fret',
                    value: `${shipData.cargo_capacity} SCU`,
                    inline: true
                });
            }

            // Landing Pad
            if (shipData.landing_pad) {
                embed.addFields({
                    name: '🛬 Landing Pad',
                    value: shipData.landing_pad,
                    inline: true
                });
            }

            // Carburant
            if (shipData.quantum_fuel || shipData.hydrogen_fuel) {
                const fuelInfo = [];
                if (shipData.quantum_fuel) fuelInfo.push(`**Quantum:** ${shipData.quantum_fuel}`);
                if (shipData.hydrogen_fuel) fuelInfo.push(`**Hydrogène:** ${shipData.hydrogen_fuel}`);
                
                embed.addFields({
                    name: '⛽ Carburant',
                    value: fuelInfo.join('\n'),
                    inline: true
                });
            }

            // Liens utiles
            if (shipData.store_url || shipData.brochure_url || shipData.video_url) {
                const links = [];
                if (shipData.store_url) links.push(`[🛒 Store RSI](${shipData.store_url})`);
                if (shipData.brochure_url) links.push(`[📄 Brochure](${shipData.brochure_url})`);
                if (shipData.video_url) links.push(`[🎥 Vidéo](${shipData.video_url})`);
                
                if (links.length > 0) {
                    embed.addFields({
                        name: '🔗 Liens utiles',
                        value: links.join(' • '),
                        inline: false
                    });
                }
            }

            // Footer avec source des données
            const footerText = extendedShip ? 
                `Données UEX Corp complètes • ${shipData.game_version || 'v4.2'}` : 
                `Données de base • Bot HowMeShip`;
            embed.setFooter({ text: footerText });

            return {
                embeds: [embed],
                files: []
            };

        } catch (error) {
            console.error('Erreur lors de la création de l\'embed enrichi:', error);
            throw error;
        }
    }

    /**
     * Ajoute les spécifications techniques à l'embed
     */
    addSpecificationsToEmbed(embed, ship) {
        const specs = [];

        // Dimensions
        const dimensions = [];
        if (ship.length) dimensions.push(`**Longueur:** ${ship.length}m`);
        if (ship.beam) dimensions.push(`**Largeur:** ${ship.beam}m`);
        if (ship.height) dimensions.push(`**Hauteur:** ${ship.height}m`);
        if (ship.mass) dimensions.push(`**Masse:** ${ship.mass}kg`);

        if (dimensions.length > 0) {
            embed.addFields({
                name: '📏 Dimensions',
                value: dimensions.join('\n'),
                inline: true
            });
        }

        // Performance
        const performance = [];
        if (ship.scm_speed) performance.push(`**Vitesse SCM:** ${ship.scm_speed} m/s`);
        if (ship.afterburner_speed) performance.push(`**Postcombustion:** ${ship.afterburner_speed} m/s`);
        if (ship.pitch_max) performance.push(`**Pitch Max:** ${ship.pitch_max}°/s`);
        if (ship.yaw_max) performance.push(`**Yaw Max:** ${ship.yaw_max}°/s`);
        if (ship.roll_max) performance.push(`**Roll Max:** ${ship.roll_max}°/s`);

        if (performance.length > 0) {
            embed.addFields({
                name: '⚡ Performance',
                value: performance.join('\n'),
                inline: true
            });
        }

        // Combat & Défense
        const combat = [];
        if (ship.shield_hp) combat.push(`**Boucliers:** ${ship.shield_hp} HP`);
        if (ship.hull_hp) combat.push(`**Coque:** ${ship.hull_hp} HP`);
        
        if (combat.length > 0) {
            embed.addFields({
                name: '⚔️ Combat',
                value: combat.join('\n'),
                inline: true
            });
        }
    }

    /**
     * Ajoute les spécifications techniques étendues à l'embed
     */
    addExtendedSpecificationsToEmbed(embed, ship) {
        // Dimensions
        if (ship.length || ship.width || ship.height) {
            const dimensions = [];
            if (ship.length) dimensions.push(`**Longueur:** ${ship.length} m`);
            if (ship.width) dimensions.push(`**Largeur:** ${ship.width} m`);
            if (ship.height) dimensions.push(`**Hauteur:** ${ship.height} m`);
            if (ship.mass) dimensions.push(`**Masse:** ${ship.mass.toLocaleString()} kg`);

            if (dimensions.length > 0) {
                embed.addFields({
                    name: '📏 Dimensions & Masse',
                    value: dimensions.join('\n'),
                    inline: true
                });
            }
        }

        // Performance
        const performance = [];
        if (ship.scm_speed) performance.push(`**Vitesse SCM:** ${ship.scm_speed} m/s`);
        if (ship.afterburner_speed) performance.push(`**Postcombustion:** ${ship.afterburner_speed} m/s`);
        if (ship.pitch_max) performance.push(`**Pitch Max:** ${ship.pitch_max}°/s`);
        if (ship.yaw_max) performance.push(`**Yaw Max:** ${ship.yaw_max}°/s`);
        if (ship.roll_max) performance.push(`**Roll Max:** ${ship.roll_max}°/s`);

        if (performance.length > 0) {
            embed.addFields({
                name: '⚡ Performance',
                value: performance.join('\n'),
                inline: true
            });
        }

        // Combat & Défense
        const combat = [];
        if (ship.shield_hp) combat.push(`**Boucliers:** ${ship.shield_hp.toLocaleString()} HP`);
        if (ship.hull_hp) combat.push(`**Coque:** ${ship.hull_hp.toLocaleString()} HP`);
        
        if (combat.length > 0) {
            embed.addFields({
                name: '⚔️ Combat',
                value: combat.join('\n'),
                inline: true
            });
        }
    }

    /**
     * Obtient l'emoji correspondant au statut de production
     */
    getStatusEmoji(status) {
        const statusMap = {
            'Flight Ready': '✅',
            'In Development': '🚧',
            'Concept': '📝',
            'In Production': '🏭',
            'Alpha': '🔬',
            'Beta': '🧪'
        };

        return statusMap[status] || '❓';
    }

    /**
     * Crée un embed de comparaison entre deux vaisseaux UEX Corp
     */
    async createComparisonEmbed(ship1, ship2) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle(`⚖️ Comparaison: ${ship1.name} vs ${ship2.name}`)
                .setTimestamp();

            // Comparaison des prix
            if (ship1.price_standalone && ship2.price_standalone) {
                const difference = Math.abs(ship1.price_standalone - ship2.price_standalone);
                const cheaper = ship1.price_standalone < ship2.price_standalone ? ship1.name : ship2.name;

                embed.addFields({
                    name: '💰 Prix Standalone',
                    value: `**${ship1.name}:** $${ship1.price_standalone.toLocaleString()}\n**${ship2.name}:** $${ship2.price_standalone.toLocaleString()}\n\n🏆 **${cheaper}** est moins cher de $${difference.toLocaleString()}`,
                    inline: false
                });
            }

            // Comparaison des caractéristiques de base
            const comparison = [];
            
            if (ship1.manufacturer_name && ship2.manufacturer_name) {
                comparison.push(`**Fabricant:**\n• ${ship1.name}: ${ship1.manufacturer_name}\n• ${ship2.name}: ${ship2.manufacturer_name}`);
            }
            
            if (ship1.career && ship2.career) {
                comparison.push(`**Carrière:**\n• ${ship1.name}: ${ship1.career}\n• ${ship2.name}: ${ship2.career}`);
            }

            if (ship1.size && ship2.size) {
                comparison.push(`**Taille:**\n• ${ship1.name}: ${ship1.size}\n• ${ship2.name}: ${ship2.size}`);
            }

            if (ship1.cargo_capacity && ship2.cargo_capacity) {
                comparison.push(`**Fret:**\n• ${ship1.name}: ${ship1.cargo_capacity} SCU\n• ${ship2.name}: ${ship2.cargo_capacity} SCU`);
            }

            if (comparison.length > 0) {
                embed.addFields({
                    name: '⚙️ Caractéristiques',
                    value: comparison.join('\n\n'),
                    inline: false
                });
            }

            embed.setFooter({ text: 'Comparaison basée sur les données UEX Corp' });

            return {
                embeds: [embed],
                files: []
            };

        } catch (error) {
            console.error('Erreur lors de la création de la comparaison UEX:', error);
            
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
     * Obtient les statistiques du service
     */
    getStats() {
        return {
            totalImages: Object.keys(this.shipImages).length,
            dataSource: 'UEX Corp API + Base SQLite',
            lastUpdate: new Date().toISOString()
        };
    }
}

module.exports = UEXShipDisplayService;
