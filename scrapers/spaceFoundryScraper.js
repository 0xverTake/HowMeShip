/**
 * Scraper spécialisé pour Space Foundry
 * Extrait les prix en temps réel des vaisseaux du marché gris
 */

const axios = require('axios');
const cheerio = require('cheerio');

class SpaceFoundryScraper {
    constructor() {
        this.baseURL = 'https://space-foundry.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache'
        };
        this.cache = new Map();
        this.cacheTimeout = 15 * 60 * 1000; // 15 minutes (plus fréquent pour le marché gris)
    }

    /**
     * Scraper les prix des vaisseaux depuis Space Foundry
     */
    async scrapeShipPrices() {
        try {
            console.log('[SpaceFoundry] 🔄 Scraping des prix du marché gris...');
            
            const ships = new Map();
            const collections = [
                'collections/all',
                'collections/standalone-ccud-ship',
                'collections/standalone-original-concept-ship',
                'collections/type-upgrade'
            ];

            for (const collection of collections) {
                try {
                    await this.scrapeCollectionPrices(collection, ships);
                } catch (error) {
                    console.log(`[SpaceFoundry] ⚠️ Erreur collection ${collection}:`, error.message);
                }
            }

            console.log(`[SpaceFoundry] ✅ ${ships.size} vaisseaux scrapés`);
            return ships;
            
        } catch (error) {
            console.error('[SpaceFoundry] ❌ Erreur scraping:', error.message);
            return new Map();
        }
    }

    /**
     * Scraper une collection spécifique
     */
    async scrapeCollectionPrices(collection, ships) {
        const url = `${this.baseURL}/${collection}`;
        
        const response = await axios.get(url, {
            headers: this.headers,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        // Analyser les produits dans la grille Space Foundry
        $('.grid-product, .product-item, .product-card').each((index, element) => {
            try {
                const $item = $(element);
                
                // Extraire le nom du vaisseau
                const nameElement = $item.find('.product-title, .grid-product__title, h3, .title').first();
                let shipName = nameElement.text().trim();
                
                if (!shipName) return;

                // Nettoyer le nom
                shipName = this.cleanShipName(shipName);

                // Extraire le prix (chercher dans plusieurs sélecteurs)
                const priceElement = $item.find('.money, .price, .grid-product__price, .product-price').first();
                let price = priceElement.text().trim();
                
                if (price) {
                    price = this.parsePrice(price);
                    
                    if (price > 0) {
                        // Extraire des informations supplémentaires
                        const link = $item.find('a').first().attr('href');
                        const image = $item.find('img').first().attr('src') || $item.find('img').first().attr('data-src');
                        const vendor = $item.find('.vendor, .seller, .grid-product__vendor').text().trim();
                        
                        ships.set(shipName.toLowerCase(), {
                            name: shipName,
                            price: price,
                            currency: 'USD',
                            source: 'Space Foundry',
                            vendor: vendor || 'Unknown',
                            url: link ? (link.startsWith('http') ? link : this.baseURL + link) : null,
                            image: image ? (image.startsWith('http') ? image : this.baseURL + image) : null,
                            collection: collection,
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
            const searchUrl = `${this.baseURL}/search?q=${encodeURIComponent(shipName)}`;
            
            const response = await axios.get(searchUrl, {
                headers: this.headers,
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const results = [];

            $('.grid-product, .product-item').each((index, element) => {
                const $item = $(element);
                const name = $item.find('.product-title, .grid-product__title').text().trim();
                const priceText = $item.find('.money, .price').text().trim();
                const price = this.parsePrice(priceText);
                const vendor = $item.find('.vendor, .grid-product__vendor').text().trim();
                
                if (name && price > 0) {
                    results.push({
                        name: this.cleanShipName(name),
                        price: price,
                        currency: 'USD',
                        source: 'Space Foundry',
                        vendor: vendor || 'Unknown'
                    });
                }
            });

            return results;
            
        } catch (error) {
            console.error('[SpaceFoundry] Erreur recherche:', error.message);
            return [];
        }
    }

    /**
     * Obtenir les données de produit via l'API Shopify
     */
    async getProductData() {
        try {
            const url = `${this.baseURL}/products.json`;
            
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 10000
            });

            if (response.data && response.data.products) {
                return response.data.products.map(product => ({
                    name: this.cleanShipName(product.title),
                    price: product.variants && product.variants[0] ? product.variants[0].price / 100 : 0,
                    currency: 'USD',
                    source: 'Space Foundry',
                    vendor: product.vendor || 'Unknown',
                    url: `${this.baseURL}/products/${product.handle}`,
                    image: product.images && product.images[0] ? product.images[0].src : null,
                    scrapedAt: new Date().toISOString()
                }));
            }

            return [];
            
        } catch (error) {
            console.log('[SpaceFoundry] API Shopify non accessible, utilisation du scraping HTML');
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
            .replace(/\s*Package\s*/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
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

module.exports = SpaceFoundryScraper;
