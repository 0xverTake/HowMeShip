const BaseScraper = require('./baseScraper');
const cheerio = require('cheerio');

class StarHangarScraper extends BaseScraper {
    constructor() {
        super('Star-Hangar', process.env.STAR_HANGAR_BASE_URL || 'https://star-hangar.com');
        this.shipsUrl = `${this.baseUrl}/ships`;
        this.upgradesUrl = `${this.baseUrl}/upgrades`;
    }

    async scrapeShips() {
        const ships = [];
        
        try {
            const html = await this.fetchPage(this.shipsUrl);
            const $ = cheerio.load(html);
            
            // Sélecteurs pour les vaisseaux Star-Hangar
            $('.product-item, .ship-card, .item-card').each((index, element) => {
                const $element = $(element);
                
                const name = $element.find('.product-title, .ship-name, .title, h3, h4').first().text().trim();
                const priceText = $element.find('.price, .cost, .amount, .product-price').first().text().trim();
                const availability = $element.find('.stock, .availability, .status').first().text().trim();
                
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
            
            // Essayer d'autres sélecteurs si nécessaire
            if (ships.length === 0) {
                $('article, .product, .listing').each((index, element) => {
                    const $element = $(element);
                    const name = $element.find('h1, h2, h3, h4, .name, .title').first().text().trim();
                    
                    if (name && name.toLowerCase().includes('ship') || name.toLowerCase().includes('vessel')) {
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
            $('.upgrade-item, .ccu-item, .product-item').each((index, element) => {
                const $element = $(element);
                
                const title = $element.find('.title, .product-title, h3, h4').first().text().trim();
                const priceText = $element.find('.price, .cost, .amount').first().text().trim();
                const url = $element.find('a').first().attr('href');
                const availability = $element.find('.stock, .availability').first().text().trim();
                
                // Essayer d'extraire les noms des vaisseaux du titre
                if (title && (title.toLowerCase().includes('upgrade') || title.toLowerCase().includes('ccu'))) {
                    const upgradeMatch = title.match(/(.+?)\s*(?:to|->|→)\s*(.+?)(?:\s*upgrade|\s*ccu|$)/i);
                    
                    if (upgradeMatch) {
                        const fromShip = upgradeMatch[1].trim();
                        const toShip = upgradeMatch[2].trim();
                        const price = this.parsePrice(priceText);
                        
                        upgrades.push({
                            fromShip: fromShip,
                            toShip: toShip,
                            price: price || 0,
                            currency: 'USD',
                            availability: availability || 'Available',
                            url: url ? (url.startsWith('http') ? url : `${this.baseUrl}${url}`) : null
                        });
                    }
                }
            });
            
            // Essayer une approche différente si aucun upgrade n'a été trouvé
            if (upgrades.length === 0) {
                $('*').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('upgrade') || text.includes('ccu') || text.includes('cross chassis');
                }).each((index, element) => {
                    const $element = $(element);
                    const text = $element.text().trim();
                    
                    // Rechercher des patterns d'upgrade dans le texte
                    const patterns = [
                        /(.+?)\s*(?:to|->|→)\s*(.+?)\s*upgrade/i,
                        /(.+?)\s*(?:to|->|→)\s*(.+?)\s*ccu/i,
                        /upgrade\s*(.+?)\s*(?:to|->|→)\s*(.+)/i
                    ];
                    
                    for (const pattern of patterns) {
                        const match = text.match(pattern);
                        if (match) {
                            const fromShip = match[1].trim();
                            const toShip = match[2].trim();
                            
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
                });
            }
            
        } catch (error) {
            console.error(`[${this.name}] Erreur lors du scraping des upgrades:`, error.message);
        }
        
        return upgrades;
    }

    async scrapeAllPages() {
        const allShips = [];
        const allUpgrades = [];
        
        try {
            // Essayer de trouver la pagination
            const mainPageHtml = await this.fetchPage(this.shipsUrl);
            const $ = cheerio.load(mainPageHtml);
            
            const pageLinks = [];
            $('.pagination a, .page-numbers a, .next, .prev').each((index, element) => {
                const href = $(element).attr('href');
                if (href && !pageLinks.includes(href)) {
                    pageLinks.push(href.startsWith('http') ? href : `${this.baseUrl}${href}`);
                }
            });
            
            // Scraper la page principale
            const mainShips = await this.scrapeShips();
            allShips.push(...mainShips);
            
            // Scraper les autres pages si elles existent
            for (const pageUrl of pageLinks.slice(0, 5)) { // Limiter à 5 pages pour éviter les timeouts
                try {
                    await this.delay(2000); // Délai entre les requêtes
                    const pageHtml = await this.fetchPage(pageUrl);
                    const page$ = cheerio.load(pageHtml);
                    
                    // Utiliser la même logique de scraping sur chaque page
                    // ... (logique similaire à scrapeShips mais avec page$)
                    
                } catch (error) {
                    console.error(`[${this.name}] Erreur lors du scraping de la page ${pageUrl}:`, error.message);
                }
            }
            
        } catch (error) {
            console.error(`[${this.name}] Erreur lors du scraping multi-pages:`, error.message);
        }
        
        return { ships: allShips, upgrades: allUpgrades };
    }
}

module.exports = StarHangarScraper;
