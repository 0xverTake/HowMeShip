const BaseScraper = require('./baseScraper');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class RSIScraper extends BaseScraper {
    constructor() {
        super('RSI', process.env.RSI_BASE_URL || 'https://robertsspaceindustries.com');
        this.pledgeStoreUrl = `${this.baseUrl}/pledge/ships`;
        this.upgradesUrl = `${this.baseUrl}/pledge/ship-upgrades`;
    }

    async scrapeShips() {
        const ships = [];
        
        try {
            // Scraper la page des vaisseaux du pledge store
            const html = await this.fetchPage(this.pledgeStoreUrl);
            const $ = cheerio.load(html);
            
            // Sélecteurs pour les vaisseaux (à adapter selon la structure réelle du site)
            $('.ship-item, .pledge-item').each((index, element) => {
                const $element = $(element);
                
                const name = $element.find('.ship-name, .title, h3, h4').first().text().trim();
                const priceText = $element.find('.price, .cost, .amount').first().text().trim();
                const manufacturer = $element.find('.manufacturer, .brand').first().text().trim();
                
                if (name) {
                    const price = this.parsePrice(priceText);
                    
                    ships.push({
                        name: name,
                        price: price,
                        manufacturer: manufacturer || null,
                        category: 'Ship'
                    });
                }
            });
            
            // Si la structure est différente, essayer d'autres sélecteurs
            if (ships.length === 0) {
                $('[data-ship], [data-pledge]').each((index, element) => {
                    const $element = $(element);
                    const name = $element.attr('data-ship') || $element.attr('data-pledge') || 
                                 $element.find('h1, h2, h3, h4, h5').first().text().trim();
                    
                    if (name) {
                        const priceText = $element.find('*').filter(function() {
                            return $(this).text().match(/\$[\d,]+/);
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
        
        // Ajouter des vaisseaux de base connus si le scraping n'a pas fonctionné
        if (ships.length === 0) {
            ships.push(...this.getKnownShips());
        }
        
        return ships;
    }

    async scrapeUpgrades() {
        const upgrades = [];
        
        try {
            const html = await this.fetchPage(this.upgradesUrl);
            const $ = cheerio.load(html);
            
            // Sélecteurs pour les upgrades
            $('.upgrade-item, .ccu-item').each((index, element) => {
                const $element = $(element);
                
                const fromShip = $element.find('.from-ship, .source').first().text().trim();
                const toShip = $element.find('.to-ship, .target').first().text().trim();
                const priceText = $element.find('.price, .cost').first().text().trim();
                const url = $element.find('a').first().attr('href');
                
                if (fromShip && toShip) {
                    const price = this.parsePrice(priceText);
                    
                    upgrades.push({
                        fromShip: fromShip,
                        toShip: toShip,
                        price: price || 0,
                        currency: 'USD',
                        availability: 'Available',
                        url: url ? `${this.baseUrl}${url}` : null
                    });
                }
            });
            
        } catch (error) {
            console.error(`[${this.name}] Erreur lors du scraping des upgrades:`, error.message);
        }
        
        return upgrades;
    }

    getKnownShips() {
        try {
            // Charger la base de données complète des vaisseaux
            const shipsDataPath = path.join(__dirname, '..', 'data', 'ships.json');
            
            if (fs.existsSync(shipsDataPath)) {
                const shipsData = JSON.parse(fs.readFileSync(shipsDataPath, 'utf8'));
                return shipsData.ships || [];
            }
        } catch (error) {
            console.error(`[${this.name}] Erreur lors du chargement des vaisseaux:`, error.message);
        }
        
        // Fallback avec quelques vaisseaux de base si le fichier JSON n'est pas disponible
        return [
            { name: 'Aurora MR', price: 25, manufacturer: 'RSI', category: 'Starter' },
            { name: 'Aurora ES', price: 20, manufacturer: 'RSI', category: 'Starter' },
            { name: 'Mustang Alpha', price: 30, manufacturer: 'Consolidated Outland', category: 'Starter' },
            { name: 'Avenger Titan', price: 70, manufacturer: 'Aegis Dynamics', category: 'Fighter' },
            { name: 'Cutlass Black', price: 100, manufacturer: 'Drake Interplanetary', category: 'Fighter' }
        ];
    }
}

module.exports = RSIScraper;
