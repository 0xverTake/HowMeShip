const shipsLoader = require('../utils/shipsLoader');
const RSIScraper = require('../scrapers/rsiScraper');
const StarHangarScraper = require('../scrapers/starHangarScraper');
const SpaceFoundryScraper = require('../scrapers/spaceFoundryScraper');

class UpgradePathfinder {
    constructor() {
        this.scrapers = {
            'RSI': new RSIScraper(),
            'Star-Hangar': new StarHangarScraper(),
            'Space-Foundry': new SpaceFoundryScraper()
        };
        this.priceCache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Trouve le meilleur chemin d'upgrade entre deux vaisseaux
     * @param {string} fromShipName - Nom du vaisseau de départ
     * @param {string} toShipName - Nom du vaisseau de destination
     * @param {Object} options - Options de recherche
     * @returns {Object} Résultat avec les meilleurs chemins
     */
    async findBestUpgradePath(fromShipName, toShipName, options = {}) {
        const { maxSteps = 3, includeStores = ['RSI', 'Star-Hangar', 'Space-Foundry'] } = options;

        try {
            // Trouver les vaisseaux dans la base de données
            const fromShip = shipsLoader.findShipByName(fromShipName);
            const toShip = shipsLoader.findShipByName(toShipName);

            if (!fromShip) {
                throw new Error(`Vaisseau de départ "${fromShipName}" non trouvé`);
            }

            if (!toShip) {
                throw new Error(`Vaisseau de destination "${toShipName}" non trouvé`);
            }

            // Récupérer les prix en temps réel de tous les magasins
            const allPrices = await this.getAllCurrentPrices(includeStores);

            // Calculer les chemins possibles
            const paths = await this.calculateUpgradePaths(fromShip, toShip, allPrices, maxSteps);

            // Analyser et trier les chemins
            const analyzedPaths = this.analyzePaths(paths, fromShip, toShip);

            return {
                fromShip,
                toShip,
                paths: analyzedPaths,
                directUpgrade: this.findDirectUpgrade(fromShip, toShip, allPrices),
                recommendations: this.generateRecommendations(analyzedPaths),
                priceAlerts: await this.checkPriceAlerts(fromShip, toShip, allPrices)
            };

        } catch (error) {
            console.error('Erreur lors de la recherche du chemin d\'upgrade:', error);
            throw error;
        }
    }

    /**
     * Récupère les prix actuels de tous les magasins
     * @param {Array} stores - Liste des magasins à scraper
     * @returns {Object} Prix par magasin et vaisseau
     */
    async getAllCurrentPrices(stores) {
        const allPrices = {
            ships: {},
            upgrades: {}
        };

        for (const storeName of stores) {
            try {
                console.log(`🔍 Scraping des prix ${storeName}...`);
                
                const scraper = this.scrapers[storeName];
                if (!scraper) continue;

                // Scraper les vaisseaux et upgrades
                const [ships, upgrades] = await Promise.all([
                    scraper.scrapeShips(),
                    scraper.scrapeUpgrades()
                ]);

                // Organiser les prix des vaisseaux
                if (!allPrices.ships[storeName]) {
                    allPrices.ships[storeName] = {};
                }

                ships.forEach(ship => {
                    const normalizedName = this.normalizeShipName(ship.name);
                    allPrices.ships[storeName][normalizedName] = {
                        price: ship.price,
                        availability: ship.availability,
                        url: ship.url
                    };
                });

                // Organiser les upgrades
                if (!allPrices.upgrades[storeName]) {
                    allPrices.upgrades[storeName] = [];
                }

                upgrades.forEach(upgrade => {
                    const normalizedFrom = this.normalizeShipName(upgrade.fromShip);
                    const normalizedTo = this.normalizeShipName(upgrade.toShip);
                    
                    allPrices.upgrades[storeName].push({
                        from: normalizedFrom,
                        to: normalizedTo,
                        price: upgrade.price,
                        availability: upgrade.availability,
                        url: upgrade.url
                    });
                });

                console.log(`✅ ${storeName}: ${ships.length} vaisseaux, ${upgrades.length} upgrades`);

            } catch (error) {
                console.error(`❌ Erreur lors du scraping ${storeName}:`, error.message);
            }
        }

        return allPrices;
    }

    /**
     * Calcule tous les chemins d'upgrade possibles
     * @param {Object} fromShip - Vaisseau de départ
     * @param {Object} toShip - Vaisseau de destination
     * @param {Object} allPrices - Prix de tous les magasins
     * @param {number} maxSteps - Nombre maximum d'étapes
     * @returns {Array} Liste des chemins possibles
     */
    async calculateUpgradePaths(fromShip, toShip, allPrices, maxSteps) {
        const paths = [];
        const visited = new Set();

        // Recherche en largeur pour trouver tous les chemins
        const queue = [{
            currentShip: fromShip,
            path: [fromShip],
            totalCost: 0,
            steps: []
        }];

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.path.length > maxSteps) continue;

            const currentShipName = this.normalizeShipName(current.currentShip.name);

            // Si on a atteint le vaisseau de destination
            if (currentShipName === this.normalizeShipName(toShip.name)) {
                paths.push(current);
                continue;
            }

            // Chercher tous les upgrades possibles depuis le vaisseau actuel
            for (const [storeName, upgrades] of Object.entries(allPrices.upgrades)) {
                for (const upgrade of upgrades) {
                    if (upgrade.from === currentShipName) {
                        const nextShip = shipsLoader.findShipByName(upgrade.to);
                        if (!nextShip) continue;

                        const nextShipName = this.normalizeShipName(nextShip.name);
                        const pathKey = `${current.path.map(s => s.name).join('->')}->${nextShipName}`;

                        if (!visited.has(pathKey)) {
                            visited.add(pathKey);

                            queue.push({
                                currentShip: nextShip,
                                path: [...current.path, nextShip],
                                totalCost: current.totalCost + upgrade.price,
                                steps: [...current.steps, {
                                    from: current.currentShip,
                                    to: nextShip,
                                    store: storeName,
                                    price: upgrade.price,
                                    url: upgrade.url,
                                    availability: upgrade.availability
                                }]
                            });
                        }
                    }
                }
            }
        }

        return paths;
    }

    /**
     * Trouve un upgrade direct entre deux vaisseaux
     * @param {Object} fromShip - Vaisseau de départ
     * @param {Object} toShip - Vaisseau de destination
     * @param {Object} allPrices - Prix de tous les magasins
     * @returns {Array} Upgrades directs disponibles
     */
    findDirectUpgrade(fromShip, toShip, allPrices) {
        const directUpgrades = [];
        const fromName = this.normalizeShipName(fromShip.name);
        const toName = this.normalizeShipName(toShip.name);

        for (const [storeName, upgrades] of Object.entries(allPrices.upgrades)) {
            for (const upgrade of upgrades) {
                if (upgrade.from === fromName && upgrade.to === toName) {
                    directUpgrades.push({
                        store: storeName,
                        price: upgrade.price,
                        url: upgrade.url,
                        availability: upgrade.availability
                    });
                }
            }
        }

        return directUpgrades.sort((a, b) => a.price - b.price);
    }

    /**
     * Analyse et trie les chemins par efficacité
     * @param {Array} paths - Chemins trouvés
     * @param {Object} fromShip - Vaisseau de départ
     * @param {Object} toShip - Vaisseau de destination
     * @returns {Array} Chemins analysés et triés
     */
    analyzePaths(paths, fromShip, toShip) {
        return paths.map(path => {
            const analysis = {
                ...path,
                efficiency: this.calculateEfficiency(path, fromShip, toShip),
                riskLevel: this.calculateRisk(path),
                timeEstimate: this.estimateTime(path),
                savings: this.calculateSavings(path, fromShip, toShip)
            };

            return analysis;
        }).sort((a, b) => {
            // Trier par efficacité (prix + risque + temps)
            return a.efficiency - b.efficiency;
        });
    }

    /**
     * Calcule l'efficacité d'un chemin (plus bas = meilleur)
     * @param {Object} path - Chemin à analyser
     * @param {Object} fromShip - Vaisseau de départ
     * @param {Object} toShip - Vaisseau de destination
     * @returns {number} Score d'efficacité
     */
    calculateEfficiency(path, fromShip, toShip) {
        const costWeight = 1.0;
        const stepsWeight = 0.2;
        const riskWeight = 0.3;

        const costScore = path.totalCost;
        const stepsScore = path.steps.length * 50; // Pénalité pour chaque étape
        const riskScore = this.calculateRisk(path) * 100;

        return costScore * costWeight + stepsScore * stepsWeight + riskScore * riskWeight;
    }

    /**
     * Calcule le niveau de risque d'un chemin
     * @param {Object} path - Chemin à analyser
     * @returns {number} Niveau de risque (0-1)
     */
    calculateRisk(path) {
        let riskScore = 0;

        path.steps.forEach(step => {
            // Risque basé sur la disponibilité
            if (step.availability && step.availability.toLowerCase().includes('limited')) {
                riskScore += 0.3;
            }
            if (step.availability && step.availability.toLowerCase().includes('out')) {
                riskScore += 0.5;
            }

            // Risque basé sur le magasin (RSI = plus fiable)
            if (step.store !== 'RSI') {
                riskScore += 0.1;
            }
        });

        return Math.min(riskScore / path.steps.length, 1);
    }

    /**
     * Estime le temps nécessaire pour compléter un chemin
     * @param {Object} path - Chemin à analyser
     * @returns {string} Estimation du temps
     */
    estimateTime(path) {
        const baseTime = 5; // 5 minutes par étape
        const totalMinutes = path.steps.length * baseTime;

        if (totalMinutes < 60) {
            return `${totalMinutes} minutes`;
        } else {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
        }
    }

    /**
     * Calcule les économies par rapport à l'achat direct
     * @param {Object} path - Chemin à analyser
     * @param {Object} fromShip - Vaisseau de départ
     * @param {Object} toShip - Vaisseau de destination
     * @returns {number} Économies en USD
     */
    calculateSavings(path, fromShip, toShip) {
        const directCost = (toShip.price || 0) - (fromShip.price || 0);
        const upgradeCost = path.totalCost;
        return Math.max(0, directCost - upgradeCost);
    }

    /**
     * Génère des recommandations basées sur les chemins trouvés
     * @param {Array} paths - Chemins analysés
     * @returns {Object} Recommandations
     */
    generateRecommendations(paths) {
        if (paths.length === 0) {
            return {
                bestPath: null,
                cheapestPath: null,
                fastestPath: null,
                recommendation: "Aucun chemin d'upgrade trouvé. Vérifiez la disponibilité sur les sites des vendeurs."
            };
        }

        const bestPath = paths[0]; // Déjà trié par efficacité
        const cheapestPath = paths.reduce((min, path) => path.totalCost < min.totalCost ? path : min);
        const fastestPath = paths.reduce((min, path) => path.steps.length < min.steps.length ? path : min);

        let recommendation = "";
        if (bestPath.steps.length === 1) {
            recommendation = "🎯 Upgrade direct disponible ! C'est la solution la plus simple.";
        } else if (bestPath.savings > 50) {
            recommendation = `💰 Chemin recommandé : économisez $${bestPath.savings} avec ${bestPath.steps.length} étapes.`;
        } else {
            recommendation = "⚖️ Plusieurs options disponibles. Comparez les prix et la complexité.";
        }

        return {
            bestPath,
            cheapestPath,
            fastestPath,
            recommendation
        };
    }

    /**
     * Vérifie les alertes de prix
     * @param {Object} fromShip - Vaisseau de départ
     * @param {Object} toShip - Vaisseau de destination
     * @param {Object} allPrices - Prix actuels
     * @returns {Array} Alertes de prix
     */
    async checkPriceAlerts(fromShip, toShip, allPrices) {
        const alerts = [];
        const fromName = this.normalizeShipName(fromShip.name);
        const toName = this.normalizeShipName(toShip.name);

        // Chercher les upgrades directs avec des prix exceptionnels
        for (const [storeName, upgrades] of Object.entries(allPrices.upgrades)) {
            for (const upgrade of upgrades) {
                if (upgrade.from === fromName && upgrade.to === toName) {
                    // Comparer avec le prix de base RSI
                    const basePrice = (toShip.price || 0) - (fromShip.price || 0);
                    const discount = basePrice - upgrade.price;
                    
                    if (discount > 20) { // Plus de $20 d'économie
                        alerts.push({
                            type: 'GOOD_DEAL',
                            store: storeName,
                            message: `🔥 Excellent prix sur ${storeName} ! Économisez $${discount}`,
                            price: upgrade.price,
                            savings: discount,
                            url: upgrade.url
                        });
                    }
                }
            }
        }

        return alerts;
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
     * Vide le cache des prix
     */
    clearCache() {
        this.priceCache.clear();
        console.log('🗑️ Cache des prix vidé');
    }
}

module.exports = new UpgradePathfinder();
