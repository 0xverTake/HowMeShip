const fs = require('fs');
const path = require('path');

class ShipsLoader {
    constructor() {
        this.shipsCache = null;
        this.lastLoadTime = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Charge tous les vaisseaux depuis le fichier JSON
     * @returns {Array} Liste de tous les vaisseaux
     */
    loadAllShips() {
        try {
            // Vérifier le cache
            if (this.shipsCache && this.lastLoadTime && 
                (Date.now() - this.lastLoadTime) < this.cacheTimeout) {
                return this.shipsCache;
            }

            const shipsDataPath = path.join(__dirname, '..', 'data', 'ships.json');
            
            if (fs.existsSync(shipsDataPath)) {
                const shipsData = JSON.parse(fs.readFileSync(shipsDataPath, 'utf8'));
                this.shipsCache = shipsData.ships || [];
                this.lastLoadTime = Date.now();
                
                console.log(`📦 ${this.shipsCache.length} vaisseaux chargés depuis la base de données`);
                return this.shipsCache;
            } else {
                console.warn('⚠️  Fichier ships.json non trouvé, utilisation des vaisseaux de fallback');
                return this.getFallbackShips();
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des vaisseaux:', error.message);
            return this.getFallbackShips();
        }
    }

    /**
     * Recherche des vaisseaux par nom (recherche floue)
     * @param {string} searchTerm - Terme de recherche
     * @returns {Array} Vaisseaux correspondants
     */
    searchShips(searchTerm) {
        const ships = this.loadAllShips();
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) return ships;

        return ships.filter(ship => {
            const name = ship.name.toLowerCase();
            const manufacturer = (ship.manufacturer || '').toLowerCase();
            const category = (ship.category || '').toLowerCase();
            
            return name.includes(term) || 
                   manufacturer.includes(term) || 
                   category.includes(term) ||
                   name.replace(/[\s-]/g, '').includes(term.replace(/[\s-]/g, ''));
        });
    }

    /**
     * Trouve un vaisseau par nom exact
     * @param {string} shipName - Nom exact du vaisseau
     * @returns {Object|null} Vaisseau trouvé ou null
     */
    findShipByName(shipName) {
        const ships = this.loadAllShips();
        const normalizedName = shipName.toLowerCase().trim();
        
        return ships.find(ship => 
            ship.name.toLowerCase() === normalizedName ||
            ship.name.toLowerCase().replace(/[\s-]/g, '') === normalizedName.replace(/[\s-]/g, '')
        ) || null;
    }

    /**
     * Filtre les vaisseaux par fabricant
     * @param {string} manufacturer - Nom du fabricant
     * @returns {Array} Vaisseaux du fabricant
     */
    getShipsByManufacturer(manufacturer) {
        const ships = this.loadAllShips();
        const normalizedManufacturer = manufacturer.toLowerCase().trim();
        
        return ships.filter(ship => 
            (ship.manufacturer || '').toLowerCase().includes(normalizedManufacturer)
        );
    }

    /**
     * Filtre les vaisseaux par catégorie
     * @param {string} category - Catégorie
     * @returns {Array} Vaisseaux de la catégorie
     */
    getShipsByCategory(category) {
        const ships = this.loadAllShips();
        const normalizedCategory = category.toLowerCase().trim();
        
        return ships.filter(ship => 
            (ship.category || '').toLowerCase().includes(normalizedCategory)
        );
    }

    /**
     * Filtre les vaisseaux par taille
     * @param {string} size - Taille (Small, Medium, Large, Capital, etc.)
     * @returns {Array} Vaisseaux de la taille
     */
    getShipsBySize(size) {
        const ships = this.loadAllShips();
        const normalizedSize = size.toLowerCase().trim();
        
        return ships.filter(ship => 
            (ship.size || '').toLowerCase() === normalizedSize
        );
    }

    /**
     * Filtre les vaisseaux par gamme de prix
     * @param {number} minPrice - Prix minimum
     * @param {number} maxPrice - Prix maximum
     * @returns {Array} Vaisseaux dans la gamme de prix
     */
    getShipsByPriceRange(minPrice, maxPrice) {
        const ships = this.loadAllShips();
        
        return ships.filter(ship => {
            const price = ship.price || 0;
            return price >= minPrice && price <= maxPrice;
        });
    }

    /**
     * Obtient tous les fabricants uniques
     * @returns {Array} Liste des fabricants
     */
    getAllManufacturers() {
        const ships = this.loadAllShips();
        const manufacturers = [...new Set(ships.map(ship => ship.manufacturer).filter(Boolean))];
        return manufacturers.sort();
    }

    /**
     * Obtient toutes les catégories uniques
     * @returns {Array} Liste des catégories
     */
    getAllCategories() {
        const ships = this.loadAllShips();
        const categories = [...new Set(ships.map(ship => ship.category).filter(Boolean))];
        return categories.sort();
    }

    /**
     * Obtient toutes les tailles uniques
     * @returns {Array} Liste des tailles
     */
    getAllSizes() {
        const ships = this.loadAllShips();
        const sizes = [...new Set(ships.map(ship => ship.size).filter(Boolean))];
        return sizes.sort();
    }

    /**
     * Obtient des statistiques sur la base de données
     * @returns {Object} Statistiques
     */
    getStats() {
        const ships = this.loadAllShips();
        const manufacturers = this.getAllManufacturers();
        const categories = this.getAllCategories();
        const sizes = this.getAllSizes();
        
        const priceStats = ships.reduce((stats, ship) => {
            const price = ship.price || 0;
            if (price > 0) {
                stats.min = Math.min(stats.min, price);
                stats.max = Math.max(stats.max, price);
                stats.total += price;
                stats.count++;
            }
            return stats;
        }, { min: Infinity, max: 0, total: 0, count: 0 });
        
        return {
            totalShips: ships.length,
            manufacturers: manufacturers.length,
            categories: categories.length,
            sizes: sizes.length,
            priceRange: {
                min: priceStats.min === Infinity ? 0 : priceStats.min,
                max: priceStats.max,
                average: priceStats.count > 0 ? Math.round(priceStats.total / priceStats.count) : 0
            }
        };
    }

    /**
     * Vaisseaux de fallback en cas d'erreur
     * @returns {Array} Liste minimale de vaisseaux
     */
    getFallbackShips() {
        return [
            { name: 'Aurora MR', price: 25, manufacturer: 'RSI', category: 'Starter', size: 'Small' },
            { name: 'Aurora ES', price: 20, manufacturer: 'RSI', category: 'Starter', size: 'Small' },
            { name: 'Mustang Alpha', price: 30, manufacturer: 'Consolidated Outland', category: 'Starter', size: 'Small' },
            { name: 'Avenger Titan', price: 70, manufacturer: 'Aegis Dynamics', category: 'Fighter', size: 'Small' },
            { name: 'Cutlass Black', price: 100, manufacturer: 'Drake Interplanetary', category: 'Fighter', size: 'Medium' },
            { name: 'Freelancer', price: 110, manufacturer: 'MISC', category: 'Multi-role', size: 'Medium' },
            { name: 'Constellation Andromeda', price: 240, manufacturer: 'RSI', category: 'Multi-role', size: 'Large' }
        ];
    }

    /**
     * Vide le cache (utile pour forcer un rechargement)
     */
    clearCache() {
        this.shipsCache = null;
        this.lastLoadTime = null;
        console.log('🗑️  Cache des vaisseaux vidé');
    }
}

// Export d'une instance singleton
module.exports = new ShipsLoader();
