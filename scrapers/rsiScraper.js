/**
 * Scraper pour RSI (Roberts Space Industries)
 * Extrait les prix officiels des vaisseaux
 */

const axios = require('axios');
const cheerio = require('cheerio');

class RSIScraper {
    constructor() {
        this.baseURL = 'https://robertsspaceindustries.com';
        this.apiURL = 'https://robertsspaceindustries.com/api';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://robertsspaceindustries.com/pledge/ships'
        };
        this.cache = new Map();
        this.cacheTimeout = 60 * 60 * 1000; // 1 heure (prix officiels changent moins souvent)
    }

    /**
     * Scraper les prix officiels des vaisseaux depuis RSI
     */
    async scrapeShipPrices() {
        try {
            console.log('[RSI] 🔄 Scraping des prix officiels...');
            
            const ships = new Map();
            
            // Essayer d'abord l'API RSI
            const apiShips = await this.getShipsFromAPI();
            if (apiShips.length > 0) {
                apiShips.forEach(ship => {
                    ships.set(ship.name.toLowerCase(), ship);
                });
            } else {
                // Fallback sur le scraping HTML
                await this.scrapeShipStore(ships);
            }

            console.log(`[RSI] ✅ ${ships.size} vaisseaux officiels scrapés`);
            return ships;
            
        } catch (error) {
            console.error('[RSI] ❌ Erreur scraping:', error.message);
            return new Map();
        }
    }

    /**
     * Obtenir les vaisseaux via l'API RSI
     */
    async getShipsFromAPI() {
        try {
            // Endpoints API RSI connus
            const endpoints = [
                '/store/pledge/ships',
                '/store/getShips',
                '/pledge/ships/list'
            ];

            for (const endpoint of endpoints) {
                try {
                    const response = await axios.get(`${this.apiURL}${endpoint}`, {
                        headers: this.headers,
                        timeout: 10000
                    });

                    if (response.data && response.data.data) {
                        return this.parseAPIShips(response.data.data);
                    }
                } catch (error) {
                    // Essayer le prochain endpoint
                }
            }

            return [];
            
        } catch (error) {
            console.log('[RSI] API non accessible, utilisation du scraping HTML');
            return [];
        }
    }

    /**
     * Parser les données de l'API RSI
     */
    parseAPIShips(data) {
        const ships = [];
        
        if (Array.isArray(data)) {
            data.forEach(ship => {
                if (ship.name && ship.price) {
                    ships.push({
                        name: ship.name.trim(),
                        price: parseFloat(ship.price) || 0,
                        currency: 'USD',
                        source: 'RSI Official',
                        url: ship.url ? `${this.baseURL}${ship.url}` : null,
                        image: ship.image ? `${this.baseURL}${ship.image}` : null,
                        manufacturer: ship.manufacturer || 'Unknown',
                        scrapedAt: new Date().toISOString()
                    });
                }
            });
        }

        return ships;
    }

    /**
     * Scraper le store officiel RSI
     */
    async scrapeShipStore(ships) {
        const storeUrl = `${this.baseURL}/pledge/ships`;
        
        const response = await axios.get(storeUrl, {
            headers: this.headers,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        // Analyser les vaisseaux dans le store officiel
        $('.ship-item, .pledge-item, .product-item').each((index, element) => {
            try {
                const $item = $(element);
                
                // Extraire le nom du vaisseau
                const nameElement = $item.find('.ship-name, .pledge-name, .title, h3').first();
                let shipName = nameElement.text().trim();
                
                if (!shipName) return;

                // Extraire le prix
                const priceElement = $item.find('.price, .pledge-price, .amount').first();
                let price = priceElement.text().trim();
                
                if (price) {
                    price = this.parsePrice(price);
                    
                    if (price > 0) {
                        // Extraire des informations supplémentaires
                        const link = $item.find('a').first().attr('href');
                        const image = $item.find('img').first().attr('src');
                        const manufacturer = $item.find('.manufacturer, .brand').text().trim();
                        
                        ships.set(shipName.toLowerCase(), {
                            name: shipName,
                            price: price,
                            currency: 'USD',
                            source: 'RSI Official',
                            manufacturer: manufacturer || 'Unknown',
                            url: link ? (link.startsWith('http') ? link : this.baseURL + link) : null,
                            image: image ? (image.startsWith('http') ? image : this.baseURL + image) : null,
                            scrapedAt: new Date().toISOString()
                        });
                    }
                }
            } catch (error) {
                // Continue avec le prochain élément
            }
        });
    }

    /**
     * Rechercher un vaisseau spécifique
     */
    async searchShip(shipName) {
        try {
            const searchUrl = `${this.baseURL}/pledge/ships?search=${encodeURIComponent(shipName)}`;
            
            const response = await axios.get(searchUrl, {
                headers: this.headers,
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const results = [];

            $('.ship-item, .pledge-item').each((index, element) => {
                const $item = $(element);
                const name = $item.find('.ship-name, .pledge-name').text().trim();
                const priceText = $item.find('.price, .pledge-price').text().trim();
                const price = this.parsePrice(priceText);
                
                if (name && price > 0) {
                    results.push({
                        name: name,
                        price: price,
                        currency: 'USD',
                        source: 'RSI Official'
                    });
                }
            });

            return results;
            
        } catch (error) {
            console.error('[RSI] Erreur recherche:', error.message);
            return [];
        }
    }

    /**
     * Parser un prix depuis le texte
     */
    parsePrice(priceText) {
        if (!priceText) return 0;
        
        // Supprimer le symbole $ et autres caractères
        const numericPrice = priceText.replace(/[\$,\s]/g, '').replace(/[^\d.]/g, '');
        const price = parseFloat(numericPrice);
        
        return isNaN(price) ? 0 : price;
    }

    /**
     * Vérifier si le site est accessible
     */
    async testConnection() {
        try {
            const response = await axios.get(this.baseURL, {
                headers: this.headers,
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}

module.exports = RSIScraper;
