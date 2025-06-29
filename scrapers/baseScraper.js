const axios = require('axios');
const cheerio = require('cheerio');

class BaseScraper {
    constructor(name, baseUrl) {
        this.name = name;
        this.baseUrl = baseUrl;
        this.userAgent = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        this.axiosConfig = {
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            timeout: 30000,
        };
    }

    async fetchPage(url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`[${this.name}] Fetching: ${url} (tentative ${i + 1}/${retries})`);
                const response = await axios.get(url, this.axiosConfig);
                return response.data;
            } catch (error) {
                console.error(`[${this.name}] Erreur lors du fetch (tentative ${i + 1}/${retries}):`, error.message);
                if (i === retries - 1) {
                    throw error;
                }
                // Attendre avant de réessayer
                await this.delay(2000 * (i + 1));
            }
        }
    }

    parsePrice(priceText) {
        if (!priceText) return null;
        
        // Nettoyer le texte du prix
        const cleanPrice = priceText.replace(/[^\d.,]/g, '');
        const price = parseFloat(cleanPrice.replace(',', '.'));
        
        return isNaN(price) ? null : price;
    }

    normalizeShipName(name) {
        if (!name) return '';
        
        return name
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s-]/g, '')
            .toLowerCase();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async scrapeShips() {
        throw new Error('scrapeShips method must be implemented by subclass');
    }

    async scrapeUpgrades() {
        throw new Error('scrapeUpgrades method must be implemented by subclass');
    }

    async scrape(database) {
        try {
            console.log(`[${this.name}] Début du scraping...`);
            
            // Scraper les vaisseaux
            const ships = await this.scrapeShips();
            console.log(`[${this.name}] ${ships.length} vaisseaux trouvés`);
            
            // Insérer les vaisseaux dans la base de données
            for (const ship of ships) {
                try {
                    await database.insertShip(
                        ship.name,
                        ship.price,
                        ship.manufacturer,
                        ship.category
                    );
                } catch (error) {
                    console.error(`[${this.name}] Erreur lors de l'insertion du vaisseau ${ship.name}:`, error.message);
                }
            }
            
            // Scraper les upgrades
            const upgrades = await this.scrapeUpgrades();
            console.log(`[${this.name}] ${upgrades.length} upgrades trouvés`);
            
            // Insérer les upgrades dans la base de données
            for (const upgrade of upgrades) {
                try {
                    const fromShip = await database.getShipByName(upgrade.fromShip);
                    const toShip = await database.getShipByName(upgrade.toShip);
                    
                    if (fromShip && toShip) {
                        await database.insertUpgrade(
                            fromShip.id,
                            toShip.id,
                            this.name,
                            upgrade.price,
                            upgrade.currency || 'USD',
                            upgrade.availability,
                            upgrade.url
                        );
                    } else {
                        console.warn(`[${this.name}] Vaisseaux non trouvés pour l'upgrade: ${upgrade.fromShip} -> ${upgrade.toShip}`);
                    }
                } catch (error) {
                    console.error(`[${this.name}] Erreur lors de l'insertion de l'upgrade:`, error.message);
                }
            }
            
            console.log(`[${this.name}] Scraping terminé avec succès`);
            
        } catch (error) {
            console.error(`[${this.name}] Erreur lors du scraping:`, error.message);
            throw error;
        }
    }
}

module.exports = BaseScraper;
