const BaseScraper = require('../baseScraper');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const https = require('https');

class ShipImageScraper extends BaseScraper {
    constructor() {
        super('Ship-Images', 'https://robertsspaceindustries.com');
        this.imagesDir = path.join(__dirname, '..', '..', 'data', 'images');
        this.shipDataFile = path.join(__dirname, '..', '..', 'data', 'ship_details.json');
        this.shipData = this.loadShipData();
        this.ensureDirectories();
    }

    /**
     * Assure que les répertoires nécessaires existent
     */
    ensureDirectories() {
        if (!fs.existsSync(this.imagesDir)) {
            fs.mkdirSync(this.imagesDir, { recursive: true });
        }
    }

    /**
     * Charge les données des vaisseaux depuis le fichier
     */
    loadShipData() {
        try {
            if (fs.existsSync(this.shipDataFile)) {
                const data = fs.readFileSync(this.shipDataFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données des vaisseaux:', error);
        }
        
        // Charger les données statiques en fallback
        try {
            const staticDataPath = path.join(__dirname, '..', '..', 'data', 'ship_images.json');
            if (fs.existsSync(staticDataPath)) {
                const staticData = fs.readFileSync(staticDataPath, 'utf8');
                return JSON.parse(staticData);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données statiques:', error);
        }
        
        return {};
    }

    /**
     * Sauvegarde les données des vaisseaux
     */
    saveShipData() {
        try {
            const dir = path.dirname(this.shipDataFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.shipDataFile, JSON.stringify(this.shipData, null, 2));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des données:', error);
        }
    }

    /**
     * Scrape les informations détaillées d'un vaisseau depuis RSI
     * @param {string} shipName - Nom du vaisseau
     * @returns {Object} Informations détaillées du vaisseau
     */
    async scrapeShipDetails(shipName) {
        try {
            // Normaliser le nom pour la recherche
            const normalizedName = this.normalizeShipName(shipName);
            
            // Vérifier si on a déjà les données en cache
            if (this.shipData[normalizedName] && this.shipData[normalizedName].lastUpdated) {
                const lastUpdate = new Date(this.shipData[normalizedName].lastUpdated);
                const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
                
                if (daysSinceUpdate < 7) { // Cache valide 7 jours
                    return this.shipData[normalizedName];
                }
            }

            console.log(`🔍 Scraping des détails pour ${shipName}...`);

            // Rechercher le vaisseau sur RSI
            const searchUrl = `${this.baseUrl}/pledge/ships?search=${encodeURIComponent(shipName)}`;
            const searchHtml = await this.fetchPage(searchUrl);
            const $ = cheerio.load(searchHtml);

            // Trouver le lien vers la page du vaisseau
            let shipPageUrl = null;
            $('.ship-item, .pledge-item, .product-item').each((index, element) => {
                const $element = $(element);
                const title = $element.find('.title, .name, h3, h4').text().trim();
                
                if (this.normalizeShipName(title) === normalizedName) {
                    const link = $element.find('a').first().attr('href');
                    if (link) {
                        shipPageUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
                        return false; // Break the loop
                    }
                }
            });

            if (!shipPageUrl) {
                // Essayer une recherche alternative
                shipPageUrl = await this.findShipPageAlternative(shipName);
            }

            if (!shipPageUrl) {
                console.log(`❌ Page du vaisseau ${shipName} non trouvée`);
                return null;
            }

            // Scraper la page du vaisseau
            const shipDetails = await this.scrapeShipPage(shipPageUrl, shipName);
            
            if (shipDetails) {
                shipDetails.lastUpdated = new Date().toISOString();
                this.shipData[normalizedName] = shipDetails;
                this.saveShipData();
            }

            return shipDetails;

        } catch (error) {
            console.error(`Erreur lors du scraping de ${shipName}:`, error.message);
            return null;
        }
    }

    /**
     * Recherche alternative de la page du vaisseau
     * @param {string} shipName - Nom du vaisseau
     * @returns {string|null} URL de la page du vaisseau
     */
    async findShipPageAlternative(shipName) {
        try {
            // Essayer avec l'URL directe basée sur le nom
            const slugName = shipName.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            
            const possibleUrls = [
                `${this.baseUrl}/pledge/ships/${slugName}`,
                `${this.baseUrl}/pledge/ships/${slugName}-ship`,
                `${this.baseUrl}/pledge/Standalone-Ship/${slugName}`,
                `${this.baseUrl}/pledge/Standalone-Ship/${slugName}-Ship`
            ];

            for (const url of possibleUrls) {
                try {
                    const html = await this.fetchPage(url);
                    if (html && html.includes(shipName)) {
                        return url;
                    }
                } catch (error) {
                    // Continue avec l'URL suivante
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Scrape les détails d'une page de vaisseau
     * @param {string} url - URL de la page du vaisseau
     * @param {string} shipName - Nom du vaisseau
     * @returns {Object} Détails du vaisseau
     */
    async scrapeShipPage(url, shipName) {
        try {
            const html = await this.fetchPage(url);
            const $ = cheerio.load(html);

            const details = {
                name: shipName,
                url: url,
                image: null,
                thumbnail: null,
                specifications: {},
                description: '',
                manufacturer: '',
                category: '',
                price: null,
                availability: '',
                images: []
            };

            // Extraire l'image principale
            const mainImage = $('.ship-image img, .product-image img, .hero-image img').first().attr('src');
            if (mainImage) {
                details.image = mainImage.startsWith('http') ? mainImage : `${this.baseUrl}${mainImage}`;
                details.thumbnail = details.image;
            }

            // Extraire toutes les images
            $('.gallery img, .ship-images img, .product-images img').each((index, element) => {
                const imgSrc = $(element).attr('src');
                if (imgSrc) {
                    const fullUrl = imgSrc.startsWith('http') ? imgSrc : `${this.baseUrl}${imgSrc}`;
                    if (!details.images.includes(fullUrl)) {
                        details.images.push(fullUrl);
                    }
                }
            });

            // Extraire la description
            const description = $('.description, .ship-description, .product-description').first().text().trim();
            if (description) {
                details.description = description;
            }

            // Extraire le fabricant
            const manufacturer = $('.manufacturer, .ship-manufacturer').first().text().trim();
            if (manufacturer) {
                details.manufacturer = manufacturer;
            }

            // Extraire la catégorie
            const category = $('.category, .ship-category, .ship-type').first().text().trim();
            if (category) {
                details.category = category;
            }

            // Extraire le prix
            const priceText = $('.price, .cost, .amount').first().text().trim();
            if (priceText) {
                details.price = this.parsePrice(priceText);
            }

            // Extraire la disponibilité
            const availability = $('.availability, .stock, .status').first().text().trim();
            if (availability) {
                details.availability = availability;
            }

            // Extraire les spécifications techniques
            this.extractSpecifications($, details);

            // Télécharger l'image principale si elle existe
            if (details.image) {
                const imagePath = await this.downloadImage(details.image, shipName);
                if (imagePath) {
                    details.localImagePath = imagePath;
                }
            }

            return details;

        } catch (error) {
            console.error(`Erreur lors du scraping de la page ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Extrait les spécifications techniques du vaisseau
     * @param {Object} $ - Instance Cheerio
     * @param {Object} details - Objet détails à remplir
     */
    extractSpecifications($, details) {
        // Chercher les spécifications dans différents formats
        const specSelectors = [
            '.specifications tr',
            '.specs tr',
            '.ship-specs tr',
            '.technical-specs tr',
            '.stats tr'
        ];

        for (const selector of specSelectors) {
            $(selector).each((index, element) => {
                const $row = $(element);
                const label = $row.find('td:first-child, th:first-child').text().trim();
                const value = $row.find('td:last-child, td:nth-child(2)').text().trim();

                if (label && value && label !== value) {
                    details.specifications[label] = value;
                }
            });

            if (Object.keys(details.specifications).length > 0) {
                break; // On a trouvé des spécifications
            }
        }

        // Chercher des spécifications dans des divs ou spans
        if (Object.keys(details.specifications).length === 0) {
            $('.spec-item, .stat-item').each((index, element) => {
                const $item = $(element);
                const label = $item.find('.label, .name, .title').text().trim();
                const value = $item.find('.value, .amount, .number').text().trim();

                if (label && value) {
                    details.specifications[label] = value;
                }
            });
        }

        // Spécifications communes à extraire
        const commonSpecs = {
            'Length': ['.length', '.ship-length'],
            'Beam': ['.beam', '.width'],
            'Height': ['.height', '.ship-height'],
            'Mass': ['.mass', '.weight'],
            'Cargo': ['.cargo', '.cargo-capacity'],
            'Crew': ['.crew', '.max-crew'],
            'Speed': ['.speed', '.max-speed'],
            'Manufacturer': ['.manufacturer', '.ship-manufacturer']
        };

        for (const [specName, selectors] of Object.entries(commonSpecs)) {
            if (!details.specifications[specName]) {
                for (const selector of selectors) {
                    const value = $(selector).text().trim();
                    if (value) {
                        details.specifications[specName] = value;
                        break;
                    }
                }
            }
        }
    }

    /**
     * Télécharge une image et la sauvegarde localement
     * @param {string} imageUrl - URL de l'image
     * @param {string} shipName - Nom du vaisseau
     * @returns {string|null} Chemin local de l'image
     */
    async downloadImage(imageUrl, shipName) {
        try {
            const normalizedName = this.normalizeShipName(shipName);
            const extension = path.extname(imageUrl) || '.jpg';
            const filename = `${normalizedName}${extension}`;
            const filepath = path.join(this.imagesDir, filename);

            // Vérifier si l'image existe déjà
            if (fs.existsSync(filepath)) {
                return filepath;
            }

            console.log(`📥 Téléchargement de l'image pour ${shipName}...`);

            return new Promise((resolve, reject) => {
                const file = fs.createWriteStream(filepath);
                
                https.get(imageUrl, (response) => {
                    if (response.statusCode === 200) {
                        response.pipe(file);
                        
                        file.on('finish', () => {
                            file.close();
                            console.log(`✅ Image téléchargée: ${filename}`);
                            resolve(filepath);
                        });
                    } else {
                        file.close();
                        fs.unlink(filepath, () => {}); // Supprimer le fichier vide
                        resolve(null);
                    }
                }).on('error', (error) => {
                    file.close();
                    fs.unlink(filepath, () => {}); // Supprimer le fichier vide
                    console.error(`Erreur lors du téléchargement de l'image:`, error.message);
                    resolve(null);
                });
            });

        } catch (error) {
            console.error(`Erreur lors du téléchargement de l'image:`, error.message);
            return null;
        }
    }

    /**
     * Obtient les détails d'un vaisseau (depuis le cache ou en scrapant)
     * @param {string} shipName - Nom du vaisseau
     * @returns {Object|null} Détails du vaisseau
     */
    async getShipDetails(shipName) {
        const normalizedName = this.normalizeShipName(shipName);
        
        // Vérifier le cache d'abord
        if (this.shipData[normalizedName]) {
            return this.shipData[normalizedName];
        }

        // Scraper si pas en cache
        return await this.scrapeShipDetails(shipName);
    }

    /**
     * Met à jour les détails de tous les vaisseaux connus
     * @param {Array} shipNames - Liste des noms de vaisseaux
     */
    async updateAllShipDetails(shipNames) {
        console.log(`🔄 Mise à jour des détails de ${shipNames.length} vaisseaux...`);
        
        for (let i = 0; i < shipNames.length; i++) {
            const shipName = shipNames[i];
            console.log(`📊 Progression: ${i + 1}/${shipNames.length} - ${shipName}`);
            
            try {
                await this.scrapeShipDetails(shipName);
                
                // Délai entre les requêtes pour éviter la surcharge
                await new Promise(resolve => setTimeout(resolve, 3000));
                
            } catch (error) {
                console.error(`Erreur pour ${shipName}:`, error.message);
            }
        }
        
        console.log('✅ Mise à jour terminée');
    }

    /**
     * Normalise le nom d'un vaisseau pour la comparaison
     * @param {string} shipName - Nom du vaisseau
     * @returns {string} Nom normalisé
     */
    normalizeShipName(shipName) {
        return shipName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/\s+/g, '');
    }

    /**
     * Obtient les statistiques du cache
     * @returns {Object} Statistiques
     */
    getStats() {
        const totalShips = Object.keys(this.shipData).length;
        const shipsWithImages = Object.values(this.shipData).filter(ship => ship.image).length;
        const shipsWithSpecs = Object.values(this.shipData).filter(ship => 
            ship.specifications && Object.keys(ship.specifications).length > 0
        ).length;

        return {
            totalShips,
            shipsWithImages,
            shipsWithSpecs,
            cacheSize: `${(JSON.stringify(this.shipData).length / 1024).toFixed(2)} KB`
        };
    }

    /**
     * Nettoie le cache et les images obsolètes
     * @param {number} maxAge - Âge maximum en jours (défaut: 30)
     */
    cleanup(maxAge = 30) {
        const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
        let cleaned = 0;

        for (const [shipName, data] of Object.entries(this.shipData)) {
            if (data.lastUpdated && new Date(data.lastUpdated) < cutoffDate) {
                delete this.shipData[shipName];
                cleaned++;

                // Supprimer l'image locale si elle existe
                if (data.localImagePath && fs.existsSync(data.localImagePath)) {
                    fs.unlinkSync(data.localImagePath);
                }
            }
        }

        if (cleaned > 0) {
            this.saveShipData();
            console.log(`🧹 ${cleaned} entrées obsolètes supprimées du cache`);
        }
    }
}

module.exports = ShipImageScraper;
