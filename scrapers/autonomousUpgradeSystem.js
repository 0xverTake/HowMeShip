/**
 * SYSTÈME D'UPGRADE AUTONOME AMÉLIORÉ
 * Basé sur les vraies données des sites de vente avec cache avancé
 */

const axios = require('axios');
const AdvancedCacheSystem = require('../services/advancedCacheSystem');
const StarHangarScraper = require('./starHangarScraper');
const SpaceFoundryScraper = require('./spaceFoundryScraper');
const RSIScraper = require('./rsiScraper');

class AutonomousUpgradeSystem {
    constructor() {
        this.cache = new AdvancedCacheSystem({
            cacheDir: './cache/upgrades',
            maxMemorySize: 2000,
            defaultTTL: 30 * 60 * 1000 // 30 minutes
        });
        
        this.scrapers = {
            starHangar: new StarHangarScraper(),
            spaceFoundry: new SpaceFoundryScraper(),
            rsi: new RSIScraper()
        };
        
        this.priceData = {
            starHangar: new Map(),
            spaceFoundry: new Map(), 
            rsi: new Map()
        };
        
        this.lastUpdate = null;
        this.updateInterval = 30 * 60 * 1000; // 30 minutes
        
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        };
    }

    /**
     * Calculer un chemin d'upgrade entre deux vaisseaux
     */
    async calculateUpgradePath(fromShip, toShip, preferredStores = ['all']) {
        console.log(`[AutonomousUpgrade] Calcul: ${fromShip} → ${toShip}`);
        
        try {
            // Vérifier si une mise à jour est nécessaire
            if (this.needsUpdate()) {
                await this.updateAllPrices();
            }
            
            // Normaliser les noms des vaisseaux
            const normalizedFrom = this.normalizeShipName(fromShip);
            const normalizedTo = this.normalizeShipName(toShip);
            
            // Récupérer les prix
            const fromPrices = this.getAllPricesForShip(normalizedFrom);
            const toPrices = this.getAllPricesForShip(normalizedTo);
            
            if (fromPrices.length === 0 || toPrices.length === 0) {
                return {
                    success: false,
                    error: 'Vaisseaux non trouvés dans nos bases de données',
                    available: {
                        from: fromPrices.length > 0,
                        to: toPrices.length > 0
                    }
                };
            }
            
            // Calculer tous les chemins possibles
            const upgradePaths = this.calculateUpgradePaths(fromPrices, toPrices, preferredStores);
            
            return {
                success: true,
                type: 'autonomous',
                fromShip: normalizedFrom,
                toShip: normalizedTo,
                paths: upgradePaths,
                lastUpdate: this.lastUpdate,
                cacheStats: this.cache.getStats()
            };
            
        } catch (error) {
            console.error('[AutonomousUpgrade] Erreur calcul:', error.message);
            return {
                success: false,
                error: error.message,
                type: 'autonomous'
            };
        }
    }

    /**
     * Vérifie si une mise à jour des prix est nécessaire
     */
    needsUpdate() {
        if (!this.lastUpdate) return true;
        // Si on a des données en mémoire, ne pas forcer la mise à jour
        if (this.priceData.starHangar.size > 0 || this.priceData.spaceFoundry.size > 0 || this.priceData.rsi.size > 0) {
            return Date.now() - this.lastUpdate > this.updateInterval;
        }
        return Date.now() - this.lastUpdate > this.updateInterval;
    }

    /**
     * Calcule tous les chemins d'upgrade possibles
     */
    calculateUpgradePaths(fromPrices, toPrices, preferredStores) {
        const paths = [];
        
        // Pour chaque combinaison from/to store
        fromPrices.forEach(fromPrice => {
            toPrices.forEach(toPrice => {
                // Vérifier si les stores sont compatibles (ou si on accepte tout)
                if (preferredStores.includes('all') || 
                    this.storesAreCompatible(fromPrice.store, toPrice.store, preferredStores)) {
                    
                    const upgradeCost = toPrice.price - fromPrice.price;
                    
                    if (upgradeCost >= 0) { // Seulement les upgrades positifs
                        paths.push({
                            fromStore: fromPrice.store,
                            toStore: toPrice.store,
                            fromPrice: fromPrice.price,
                            toPrice: toPrice.price,
                            upgradeCost: upgradeCost,
                            savings: this.calculateSavings(fromPrice, toPrice),
                            description: `${fromPrice.store} → ${toPrice.store}`,
                            url: toPrice.url,
                            type: this.getUpgradeType(fromPrice, toPrice)
                        });
                    }
                }
            });
        });
        
        // Trier par coût d'upgrade
        return paths.sort((a, b) => a.upgradeCost - b.upgradeCost);
    }

    /**
     * Met à jour les prix depuis tous les sites
     */
    async updateAllPrices() {
        console.log('[AutonomousUpgrade] 🔄 Mise à jour des prix...');
        
        try {
            // Utiliser le cache avancé pour éviter les requêtes répétées
            const cacheKey = 'all_prices';
            const cachedPrices = await this.cache.get('prices', cacheKey);
            
            if (cachedPrices) {
                console.log('[AutonomousUpgrade] 📦 Utilisation des prix en cache');
                // Reconstituer les Maps depuis les objets cachés
                this.priceData = {
                    starHangar: new Map(Object.entries(cachedPrices.starHangar || {})),
                    spaceFoundry: new Map(Object.entries(cachedPrices.spaceFoundry || {})),
                    rsi: new Map(Object.entries(cachedPrices.rsi || {}))
                };
                return;
            }
            
            // Lancer les mises à jour en parallèle avec les nouveaux scrapers
            const updates = await Promise.allSettled([
                this.updateStarHangarPrices(),
                this.updateSpaceFoundryPrices(),
                this.updateRSIPrices()
            ]);
            
            // Logger les résultats
            const results = ['Star Hangar', 'Space Foundry', 'RSI'].map((store, i) => ({
                store,
                status: updates[i].status,
                count: updates[i].status === 'fulfilled' ? updates[i].value : 0,
                error: updates[i].status === 'rejected' ? updates[i].reason.message : null
            }));
            
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    console.log(`[AutonomousUpgrade] ✅ ${result.store}: ${result.count} prix mis à jour`);
                } else {
                    console.log(`[AutonomousUpgrade] ❌ ${result.store}: ${result.error}`);
                }
            });
            
            // Mettre en cache globalement (convertir Maps en objets pour sérialisation)
            const cacheData = {
                starHangar: Object.fromEntries(this.priceData.starHangar),
                spaceFoundry: Object.fromEntries(this.priceData.spaceFoundry),
                rsi: Object.fromEntries(this.priceData.rsi)
            };
            await this.cache.set('prices', cacheKey, cacheData);
            
            this.lastUpdate = Date.now();
            
        } catch (error) {
            console.error('[AutonomousUpgrade] Erreur mise à jour:', error.message);
        }
    }

    /**
     * Normalise un nom de vaisseau pour la recherche
     */
    normalizeShipName(shipName) {
        return shipName
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Récupère tous les prix disponibles pour un vaisseau
     */
    getAllPricesForShip(shipName) {
        const prices = [];
        
        // Parcourir tous les stores
        for (const [store, storeData] of Object.entries(this.priceData)) {
            const shipData = storeData.get(shipName);
            if (shipData) {
                prices.push({
                    ship: shipName,
                    price: shipData.price,
                    store: store,
                    url: shipData.url,
                    source: shipData.source || store
                });
            }
        }
        
        return prices;
    }

    /**
     * Vérifie si deux stores sont compatibles pour un upgrade
     */
    storesAreCompatible(fromStore, toStore, preferredStores) {
        // Si on veut tous les stores
        if (preferredStores.includes('all')) return true;
        
        // Si les stores préférés incluent les deux
        return preferredStores.includes(fromStore) && preferredStores.includes(toStore);
    }

    /**
     * Calcule les économies réalisées
     */
    calculateSavings(fromPrice, toPrice) {
        // Comparer avec le prix RSI officiel si disponible
        const rsiPrice = this.priceData.rsi.get(toPrice.ship);
        if (rsiPrice) {
            return Math.max(0, rsiPrice.price - toPrice.price);
        }
        return 0;
    }

    /**
     * Détermine le type d'upgrade
     */
    getUpgradeType(fromPrice, toPrice) {
        if (fromPrice.store === 'rsi' && toPrice.store === 'rsi') {
            return 'official';
        } else if (fromPrice.store !== 'rsi' && toPrice.store !== 'rsi') {
            return 'grey_market';
        } else {
            return 'mixed';
        }
    }

    /**
     * Scraper Star Hangar avec cache
     */
    async updateStarHangarPrices() {
        try {
            const prices = await this.scrapers.starHangar.scrapeShipPrices();
            this.priceData.starHangar = prices;
            
            // Mise en cache individuelle
            for (const [shipName, priceData] of prices.entries()) {
                await this.cache.set('prices', `star_hangar_${shipName}`, priceData);
            }
            
            return prices.size;
        } catch (error) {
            console.error('[AutonomousUpgrade] ❌ Erreur Star Hangar:', error.message);
            return 0;
        }
    }

    /**
     * Scraper Space Foundry avec cache
     */
    async updateSpaceFoundryPrices() {
        try {
            const prices = await this.scrapers.spaceFoundry.scrapeShipPrices();
            this.priceData.spaceFoundry = prices;
            
            // Mise en cache individuelle
            for (const [shipName, priceData] of prices.entries()) {
                await this.cache.set('prices', `space_foundry_${shipName}`, priceData);
            }
            
            return prices.size;
        } catch (error) {
            console.error('[AutonomousUpgrade] ❌ Erreur Space Foundry:', error.message);
            return 0;
        }
    }

    /**
     * Scraper RSI avec cache
     */
    async updateRSIPrices() {
        try {
            const prices = await this.scrapers.rsi.scrapeShipPrices();
            this.priceData.rsi = prices;
            
            // Mise en cache individuelle
            for (const [shipName, priceData] of prices.entries()) {
                await this.cache.set('prices', `rsi_${shipName}`, priceData);
            }
            
            return prices.size;
        } catch (error) {
            console.error('[AutonomousUpgrade] ❌ Erreur RSI:', error.message);
            return 0;
        }
    }

    /**
     * Statistiques du système
     */
    getStats() {
        const stats = {
            lastUpdate: this.lastUpdate,
            totalShips: 0,
            sources: {},
            cache: this.cache.getStats()
        };
        
        for (const [store, data] of Object.entries(this.priceData)) {
            stats.sources[store] = data.size;
            stats.totalShips += data.size;
        }
        
        return stats;
    }

    /**
     * Nettoyer le cache
     */
    async clearCache() {
        await this.cache.invalidateNamespace('prices');
        console.log('[AutonomousUpgrade] 🧹 Cache nettoyé');
    }

    /**
     * Préchauffer le cache avec des données populaires
     */
    async warmupCache() {
        console.log('[AutonomousUpgrade] 🔥 Préchauffage du cache...');
        
        const popularShips = [
            'avenger titan', 'cutlass black', 'gladius', 'hornet', 'mustang alpha',
            'aurora mr', 'constellation andromeda', 'freelancer', 'carrack', 'hammerhead'
        ];
        
        for (const ship of popularShips) {
            try {
                await this.calculateUpgradePath(ship, 'carrack', ['all']);
            } catch (error) {
                // Continuer avec le prochain
            }
        }
        
        console.log('[AutonomousUpgrade] ✅ Préchauffage terminé');
    }
}

module.exports = AutonomousUpgradeSystem;
