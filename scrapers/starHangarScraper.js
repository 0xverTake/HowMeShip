/**
 * Scraper spécialisé pour Star Hangar
 * Extrait les prix en temps réel des vaisseaux
 */

const axios = require('axios');
const cheerio = require('cheerio');

class StarHangarScraper {
    constructor() {
        this.baseURL = 'https://star-hangar.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Scraper les prix des vaisseaux depuis Star Hangar
     */
    async scrapeShipPrices() {
        try {
            console.log('[StarHangar] 🔄 Scraping des prix...');
            
            const ships = new Map();
            const categories = [
                'star-citizen/spaceships.html',
                'star-citizen/ships.html',
                'marketplace',
                'catalog'
            ];

            for (const category of categories) {
                try {
                    await this.scrapeCategoryPrices(category, ships);
                } catch (error) {
                    console.log(`[StarHangar] ⚠️ Erreur catégorie ${category}:`, error.message);
                }
            }

            console.log(`[StarHangar] ✅ ${ships.size} vaisseaux scrapés`);
            return ships;
            
        } catch (error) {
            console.error('[StarHangar] ❌ Erreur scraping:', error.message);
            return new Map();
        }
    }

    /**
     * Scraper une catégorie spécifique
     */
    async scrapeCategoryPrices(category, ships) {
        const url = `${this.baseURL}/${category}`;
        
        const response = await axios.get(url, {
            headers: this.headers,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        // Analyser la structure HTML pour extraire les vaisseaux
        $('.product-item, .item-product, .product-wrapper, .product, .item, .listing').each((index, element) => {
            try {
                const $item = $(element);
                
                // Extraire le nom du vaisseau (plusieurs sélecteurs)
                const nameElement = $item.find('.product-name, .item-name, h2, h3, .title, .product-title, .name').first();
                let shipName = nameElement.text().trim();
                
                if (!shipName) return;

                // Nettoyer le nom
                shipName = this.cleanShipName(shipName);

                // Extraire le prix (plusieurs sélecteurs)
                const priceElement = $item.find('.price, .regular-price, .final-price, .amount, .product-price, .cost').first();
                let price = priceElement.text().trim();
                
                if (price) {
                    price = this.parsePrice(price);
                    
                    if (price > 0) {
                        // Extraire des informations supplémentaires
                        const link = $item.find('a').first().attr('href');
                        const image = $item.find('img').first().attr('src');
                        
                        ships.set(shipName.toLowerCase(), {
                            name: shipName,
                            price: price,
                            currency: 'USD',
                            source: 'Star Hangar',
                            url: link ? (link.startsWith('http') ? link : this.baseURL + link) : null,
                            image: image ? (image.startsWith('http') ? image : this.baseURL + image) : null,
                            category: category,
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
            const searchUrl = `${this.baseURL}/catalogsearch/result/?q=${encodeURIComponent(shipName)}`;
            
            const response = await axios.get(searchUrl, {
                headers: this.headers,
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const results = [];

            $('.product-item, .item-product').each((index, element) => {
                const $item = $(element);
                const name = $item.find('.product-name, .item-name').text().trim();
                const priceText = $item.find('.price, .regular-price').text().trim();
                const price = this.parsePrice(priceText);
                
                if (name && price > 0) {
                    results.push({
                        name: this.cleanShipName(name),
                        price: price,
                        currency: 'USD',
                        source: 'Star Hangar'
                    });
                }
            });

            return results;
            
        } catch (error) {
            console.error('[StarHangar] Erreur recherche:', error.message);
            return [];
        }
    }

    /**
     * Nettoyer le nom d'un vaisseau
     */
    cleanShipName(name) {
        return name
            .replace(/\s*-\s*LTI\s*/gi, '')
            .replace(/\s*\(.*?\)\s*/g, '')
            .replace(/\s*CCU\s*/gi, '')
            .replace(/\s*Upgrade\s*/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Parser un prix depuis le texte
     */
    parsePrice(priceText) {
        if (!priceText) return 0;
        
        // Supprimer tout sauf les chiffres et le point décimal
        const numericPrice = priceText.replace(/[^\d.]/g, '');
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

module.exports = StarHangarScraper;
