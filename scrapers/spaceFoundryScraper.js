const BaseScraper = require('./baseScraper');
const cheerio = require('cheerio');

class SpaceFoundryScraper extends BaseScraper {
    constructor() {
        super('Space-Foundry', process.env.SPACE_FOUNDRY_BASE_URL || 'https://spacefoundry.com');
        this.shipsUrl = `${this.baseUrl}/ships`;
        this.upgradesUrl = `${this.baseUrl}/upgrades`;
    }

    async scrapeShips() {
        const ships = [];
        
        try {
            const html = await this.fetchPage(this.shipsUrl);
            const $ = cheerio.load(html);
            
            // Sélecteurs pour les vaisseaux Space Foundry
            $('.product, .ship-item, .item').each((index, element) => {
                const $element = $(element);
                
                const name = $element.find('.product-name, .ship-name, .title, h3, h4').first().text().trim();
                const priceText = $element.find('.price, .cost, .amount').first().text().trim();
                const availability = $element.find('.stock, .availability, .in-stock, .out-of-stock').first().text().trim();
                
                if (name) {
                    const price = this.parsePrice(priceText);
                    
                    ships.push({
                        name: name,
                        price: price,
                        manufacturer: null,
                        category: 'Ship',
                        availability: availability
                    });
                }
            });
            
            // Essayer d'autres sélecteurs
            if (ships.length === 0) {
                $('[data-product], .listing, .card').each((index, element) => {
                    const $element = $(element);
                    const name = $element.find('h1, h2, h3, h4, .name, .title').first().text().trim();
                    
                    if (name && (name.toLowerCase().includes('ship') || 
                                name.toLowerCase().includes('vessel') || 
                                name.toLowerCase().includes('fighter') ||
                                name.toLowerCase().includes('cargo'))) {
                        const priceText = $element.find('*').filter(function() {
                            return $(this).text().match(/[\$€£][\d,]+/);
                        }).first().text().trim();
                        
                        const price = this.parsePrice(priceText);
                        
                        ships.push({
                            name: name,
                            price: price,
                            manufacturer: null,
                            category: 'Ship'
                        });
                    }
                });
            }
            
        } catch (error) {
            console.error(`[${this.name}] Erreur lors du scraping des vaisseaux:`, error.message);
        }
        
        return ships;
    }

    async scrapeUpgrades() {
        const upgrades = [];
        
        try {
            const html = await this.fetchPage(this.upgradesUrl);
            const $ = cheerio.load(html);
            
            // Sélecteurs pour les upgrades
            $('.upgrade, .ccu, .product').each((index, element) => {
                const $element = $(element);
                
                const title = $element.find('.title, .product-title, .name, h3, h4').first().text().trim();
                const description = $element.find('.description, .details').first().text().trim();
                const priceText = $element.find('.price, .cost, .amount').first().text().trim();
                const url = $element.find('a').first().attr('href');
                const availability = $element.find('.stock, .availability').first().text().trim();
                
                // Analyser le titre et la description pour extraire les informations d'upgrade
                const fullText = `${title} ${description}`.toLowerCase();
                
                if (fullText.includes('upgrade') || fullText.includes('ccu') || fullText.includes('cross chassis')) {
                    // Patterns pour extraire les noms des vaisseaux
                    const patterns = [
                        /(.+?)\s*(?:to|->|→)\s*(.+?)\s*(?:upgrade|ccu)/i,
                        /upgrade\s*(?:from\s*)?(.+?)\s*(?:to|->|→)\s*(.+)/i,
                        /ccu\s*(.+?)\s*(?:to|->|→)\s*(.+)/i,
                        /(.+?)\s*(?:to|->|→)\s*(.+?)\s*cross\s*chassis/i
                    ];
                    
                    for (const pattern of patterns) {
                        const match = (title + ' ' + description).match(pattern);
                        if (match) {
                            const fromShip = match[1].trim().replace(/^(from|upgrade|ccu)\s*/i, '');
                            const toShip = match[2].trim().replace(/\s*(upgrade|ccu)$/i, '');
                            
                            if (fromShip && toShip && fromShip !== toShip) {
                                const price = this.parsePrice(priceText);
                                
                                upgrades.push({
                                    fromShip: fromShip,
                                    toShip: toShip,
                                    price: price || 0,
                                    currency: 'USD',
                                    availability: availability || 'Available',
                                    url: url ? (url.startsWith('http') ? url : `${this.baseUrl}${url}`) : null
                                });
                                break;
                            }
                        }
                    }
                }
            });
            
            // Si aucun upgrade n'a été trouvé, essayer une approche plus générale
            if (upgrades.length === 0) {
                $('*').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return (text.includes('upgrade') || text.includes('ccu')) && 
                           (text.includes('to') || text.includes('->') || text.includes('→'));
                }).each((index, element) => {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    // Essayer d'extraire les informations d'upgrade du texte
                    const upgradePatterns = [
                        /(.+?)\s*(?:to|->|→)\s*(.+?)\s*(?:upgrade|ccu|cross)/i,
                        /upgrade\s*(.+?)\s*(?:to|->|→)\s*(.+)/i
                    ];
                    
                    for (const pattern of upgradePatterns) {
                        const match = text.match(pattern);
                        if (match) {
                            const fromShip = match[1].trim();
                            const toShip = match[2].trim();
                            
                            // Vérifier que ce sont des noms de vaisseaux valides
                            if (fromShip.length > 2 && toShip.length > 2 && 
                                fromShip !== toShip && 
                                !fromShip.includes('$') && !toShip.includes('$')) {
                                
                                // Chercher le prix dans l'élément parent
                                const priceElement = $element.closest('*').find('*').filter(function() {
                                    return $(this).text().match(/[\$€£][\d,]+/);
                                }).first();
                                
                                const price = this.parsePrice(priceElement.text());
                                
                                upgrades.push({
                                    fromShip: fromShip,
                                    toShip: toShip,
                                    price: price || 0,
                                    currency: 'USD',
                                    availability: 'Available',
                                    url: null
                                });
                                break;
                            }
                        }
                    }
                });
            }
            
        } catch (error) {
            console.error(`[${this.name}] Erreur lors du scraping des upgrades:`, error.message);
        }
        
        return upgrades;
    }

    async scrapeCategories() {
        const categories = [];
        
        try {
            const html = await this.fetchPage(this.baseUrl);
            const $ = cheerio.load(html);
            
            // Chercher les catégories de produits
            $('.category, .nav-item, .menu-item').each((index, element) => {
                const $element = $(element);
                const categoryName = $element.find('a, span').first().text().trim();
                const categoryUrl = $element.find('a').first().attr('href');
                
                if (categoryName && categoryUrl && 
                    (categoryName.toLowerCase().includes('ship') || 
                     categoryName.toLowerCase().includes('upgrade') ||
                     categoryName.toLowerCase().includes('ccu'))) {
                    
                    categories.push({
                        name: categoryName,
                        url: categoryUrl.startsWith('http') ? categoryUrl : `${this.baseUrl}${categoryUrl}`
                    });
                }
            });
            
        } catch (error) {
            console.error(`[${this.name}] Erreur lors du scraping des catégories:`, error.message);
        }
        
        return categories;
    }

    async scrapeByCategory(categoryUrl) {
        const items = [];
        
        try {
            const html = await this.fetchPage(categoryUrl);
            const $ = cheerio.load(html);
            
            $('.product, .item, .listing').each((index, element) => {
                const $element = $(element);
                
                const name = $element.find('.name, .title, h3, h4').first().text().trim();
                const priceText = $element.find('.price, .cost').first().text().trim();
                const url = $element.find('a').first().attr('href');
                
                if (name) {
                    const price = this.parsePrice(priceText);
                    
                    items.push({
                        name: name,
                        price: price,
                        url: url ? (url.startsWith('http') ? url : `${this.baseUrl}${url}`) : null,
                        category: categoryUrl
                    });
                }
            });
            
        } catch (error) {
            console.error(`[${this.name}] Erreur lors du scraping de la catégorie ${categoryUrl}:`, error.message);
        }
        
        return items;
    }
}

module.exports = SpaceFoundryScraper;
