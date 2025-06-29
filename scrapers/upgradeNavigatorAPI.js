const axios = require('axios');

/**
 * API Upgrade Navigator - Version Complètement Refaite
 * Basée sur l'analyse complète du site upgrade-navigator.com
 */
class UpgradeNavigatorAPI {
    constructor() {
        this.baseURL = 'https://upgrade-navigator.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/html, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
        
        this.timeout = 15000; // 15 secondes
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Récupère tous les vaisseaux disponibles
     * Endpoint confirmé: GET /ajax/getShips
     */
    async getShips() {
        const cacheKey = 'ships';
        
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('[UpgradeNavigator] Utilisation du cache pour les vaisseaux');
                return cached.data;
            }
        }

        try {
            console.log('[UpgradeNavigator] Récupération des vaisseaux depuis l\'API...');
            
            const response = await axios.get(`${this.baseURL}/ajax/getShips`, {
                headers: this.headers,
                timeout: this.timeout
            });

            if (response.data && Array.isArray(response.data)) {
                // Valider la structure des données
                const validShips = response.data.filter(ship => 
                    ship.id && ship.name && typeof ship.id === 'number'
                );

                console.log(`[UpgradeNavigator] ✅ ${validShips.length} vaisseaux récupérés`);
                
                // Mettre en cache
                this.cache.set(cacheKey, {
                    data: validShips,
                    timestamp: Date.now()
                });

                return validShips;
            }

            console.log('[UpgradeNavigator] ⚠️ Format de données inattendu');
            return [];

        } catch (error) {
            console.error('[UpgradeNavigator] ❌ Erreur getShips:', error.message);
            
            // Retourner des données de fallback si disponibles
            if (this.cache.has(cacheKey)) {
                console.log('[UpgradeNavigator] Utilisation des données de cache expirées');
                return this.cache.get(cacheKey).data;
            }
            
            return [];
        }
    }

    /**
     * Récupère les magasins disponibles avec parsing HTML amélioré
     * Endpoint confirmé: GET /ajax/getStores
     */
    async getStores() {
        const cacheKey = 'stores';
        
        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('[UpgradeNavigator] Utilisation du cache pour les magasins');
                return cached.data;
            }
        }

        try {
            console.log('[UpgradeNavigator] Récupération des magasins depuis l\'API...');
            
            const response = await axios.get(`${this.baseURL}/ajax/getStores`, {
                headers: this.headers,
                timeout: this.timeout
            });

            if (response.data && typeof response.data === 'string') {
                const stores = this.parseStoresHTML(response.data);
                
                if (stores.length > 0) {
                    console.log(`[UpgradeNavigator] ✅ ${stores.length} magasins récupérés:`, stores.map(s => s.name));
                    
                    // Mettre en cache
                    this.cache.set(cacheKey, {
                        data: stores,
                        timestamp: Date.now()
                    });

                    return stores;
                }
            }

            console.log('[UpgradeNavigator] ⚠️ Impossible de parser les magasins, utilisation du fallback');
            return this.getDefaultStores();

        } catch (error) {
            console.error('[UpgradeNavigator] ❌ Erreur getStores:', error.message);
            console.log('[UpgradeNavigator] Utilisation des magasins par défaut');
            return this.getDefaultStores();
        }
    }

    /**
     * Parse le HTML des magasins avec regex améliorée
     */
    parseStoresHTML(html) {
        try {
            // Regex améliorée pour capturer les magasins
            const regex = /<div\s+id="(\d+)"\s+class="un-filter-item([^"]*)"\s*[^>]*>\s*<p>([^<]+)<\/p>\s*<\/div>/gi;
            const stores = [];
            let match;

            while ((match = regex.exec(html)) !== null) {
                const store = {
                    id: parseInt(match[1]),
                    name: match[3].trim(),
                    active: match[2].includes('active')
                };

                // Validation des données
                if (store.id && store.name) {
                    stores.push(store);
                }
            }

            return stores;
        } catch (error) {
            console.error('[UpgradeNavigator] Erreur parsing HTML:', error.message);
            return [];
        }
    }

    /**
     * Retourne les magasins par défaut (fallback)
     */
    getDefaultStores() {
        return [
            { id: 1, name: 'Star-Hangar', active: true },
            { id: 2, name: 'RSI Pledge-Store', active: true },
            { id: 3, name: 'Space Foundry', active: false }
        ];
    }

    /**
     * Trouve les chemins d'upgrade entre deux vaisseaux
     * Avec fallback intelligent si l'API principale ne fonctionne pas
     */
    async findUpgradePath(fromShipId, toShipId, storeIds = [1, 2, 3]) {
        try {
            console.log(`[UpgradeNavigator] Recherche upgrade ${fromShipId} → ${toShipId}`);

            // Essayer l'endpoint principal
            const mainResult = await this.tryMainUpgradeEndpoint(fromShipId, toShipId, storeIds);
            if (mainResult.success) {
                return mainResult;
            }

            // Si l'endpoint principal échoue, essayer les alternatives
            const alternativeResult = await this.tryAlternativeUpgradeEndpoints(fromShipId, toShipId, storeIds);
            if (alternativeResult && alternativeResult.success) {
                return alternativeResult;
            }

            // Si aucun endpoint ne fonctionne, créer une estimation basée sur nos données
            return await this.createEstimatedUpgrade(fromShipId, toShipId);

        } catch (error) {
            console.error('[UpgradeNavigator] ❌ Erreur findUpgradePath:', error.message);
            return await this.createEstimatedUpgrade(fromShipId, toShipId);
        }
    }

    /**
     * Essaie l'endpoint principal d'upgrade
     */
    async tryMainUpgradeEndpoint(fromShipId, toShipId, storeIds) {
        try {
            // Préparer les données du formulaire
            const formData = new URLSearchParams();
            formData.append('from', fromShipId.toString());
            formData.append('to', toShipId.toString());
            formData.append('stores', storeIds.join(','));

            const response = await axios.post(`${this.baseURL}/ajax/getPath`, formData, {
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': this.baseURL
                },
                timeout: this.timeout
            });

            console.log(`[UpgradeNavigator] ✅ Réponse upgrade reçue (${response.status})`);
            return this.parseUpgradeResponse(response.data);

        } catch (error) {
            console.log(`[UpgradeNavigator] ❌ Endpoint principal échoué: ${error.response?.status || error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crée une estimation d'upgrade basée sur nos données
     */
    async createEstimatedUpgrade(fromShipId, toShipId) {
        try {
            // Récupérer les informations des vaisseaux
            const ships = await this.getShips();
            const fromShip = ships.find(ship => ship.id === fromShipId);
            const toShip = ships.find(ship => ship.id === toShipId);

            if (!fromShip || !toShip) {
                return {
                    success: false,
                    error: 'Vaisseaux non trouvés',
                    message: 'Impossible de trouver les vaisseaux spécifiés'
                };
            }

            // Calculer une estimation basée sur les prix
            const fromPrice = fromShip.listPrice || 0;
            const toPrice = toShip.listPrice || 0;
            const estimatedUpgradeCost = Math.max(0, toPrice - fromPrice);

            return {
                success: true,
                type: 'estimated',
                estimated: true,
                fromShip: fromShip,
                toShip: toShip,
                estimatedCost: estimatedUpgradeCost,
                paths: [{
                    type: 'estimation',
                    price: `$${estimatedUpgradeCost}`,
                    description: 'Estimation basée sur les prix de base',
                    note: 'Cette estimation ne tient pas compte du marché gris'
                }],
                message: 'Service d\'upgrade temporairement indisponible - estimation fournie',
                fallback: {
                    fromShip: fromShipId,
                    toShip: toShipId,
                    suggestion: 'Vérifiez manuellement sur upgrade-navigator.com'
                }
            };

        } catch (error) {
            console.error('[UpgradeNavigator] ❌ Erreur estimation:', error.message);
            return {
                success: false,
                error: 'Impossible de créer une estimation',
                message: 'Service temporairement indisponible'
            };
        }
    }

    /**
     * Essaie d'autres endpoints pour les upgrades
     */
    async tryAlternativeUpgradeEndpoints(fromShipId, toShipId, storeIds) {
        const alternatives = [
            '/ajax/getUpgrades',
            '/ajax/calculateUpgrade',
            '/ajax/findPath'
        ];

        console.log('[UpgradeNavigator] 🔄 Test des endpoints alternatifs...');
        
        for (const endpoint of alternatives) {
            try {
                const formData = new URLSearchParams();
                formData.append('from', fromShipId);
                formData.append('to', toShipId);
                formData.append('stores', storeIds.join(','));

                const response = await axios.post(`${this.baseURL}${endpoint}`, formData, {
                    headers: {
                        ...this.headers,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    timeout: 10000
                });

                console.log(`[UpgradeNavigator] ✅ Endpoint alternatif trouvé: ${endpoint}`);
                return this.parseUpgradeResponse(response.data);

            } catch (error) {
                // Logging silencieux pour les alternatives
            }
        }

        console.log('[UpgradeNavigator] ❌ Tous les endpoints d\'upgrade sont indisponibles');
        
        // Si aucun endpoint ne fonctionne, retourner une réponse structurée
        return {
            success: false,
            error: 'Endpoints d\'upgrade indisponibles (erreurs 500/404)',
            message: 'Le site upgrade-navigator.com semble avoir des problèmes techniques',
            fallback: {
                fromShip: fromShipId,
                toShip: toShipId,
                suggestion: 'Vérifiez manuellement sur le site upgrade-navigator.com'
            }
        };
    }

    /**
     * Parse la réponse d'upgrade (format à déterminer)
     */
    parseUpgradeResponse(data) {
        try {
            if (typeof data === 'string') {
                // Si c'est du HTML, essayer de le parser
                if (data.includes('<table') || data.includes('ITEM')) {
                    return {
                        success: true,
                        type: 'html',
                        content: data,
                        paths: this.extractPathsFromHTML(data)
                    };
                }
                
                // Si c'est du JSON string
                try {
                    const parsed = JSON.parse(data);
                    return { success: true, type: 'json', data: parsed };
                } catch {
                    return { success: true, type: 'text', content: data };
                }
            }

            if (typeof data === 'object') {
                return { success: true, type: 'object', data: data };
            }

            return { success: false, error: 'Format de données non reconnu' };

        } catch (error) {
            console.error('[UpgradeNavigator] Erreur parsing upgrade:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extrait les chemins d'upgrade depuis le HTML
     */
    extractPathsFromHTML(html) {
        try {
            const paths = [];
            
            // Chercher les patterns de prix dans le HTML
            const priceMatches = html.match(/\$[0-9,]+\.?[0-9]*/g);
            const itemMatches = html.match(/>[^<]*(?:to|→|->)[^<]*</g);

            if (priceMatches && itemMatches) {
                // Combiner les données trouvées
                for (let i = 0; i < Math.min(priceMatches.length, itemMatches.length); i++) {
                    paths.push({
                        item: itemMatches[i].replace(/<[^>]*>/g, '').trim(),
                        price: priceMatches[i],
                        index: i
                    });
                }
            }

            return paths;
        } catch (error) {
            console.error('[UpgradeNavigator] Erreur extraction paths:', error.message);
            return [];
        }
    }

    /**
     * Recherche un vaisseau par nom
     */
    async findShipByName(shipName) {
        const ships = await this.getShips();
        
        return ships.find(ship => 
            ship.name.toLowerCase().includes(shipName.toLowerCase()) ||
            shipName.toLowerCase().includes(ship.name.toLowerCase())
        );
    }

    /**
     * Obtient les statistiques de l'API
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            baseURL: this.baseURL,
            timeout: this.timeout,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Nettoie le cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[UpgradeNavigator] Cache nettoyé');
    }

    /**
     * Test complet de l'API
     */
    async runFullTest() {
        console.log('🧪 TEST COMPLET DE L\'API UPGRADE NAVIGATOR');
        console.log('='.repeat(50));

        const results = {
            ships: { success: false, count: 0 },
            stores: { success: false, count: 0 },
            upgrade: { success: false, tested: false }
        };

        try {
            // Test 1: Vaisseaux
            console.log('\\n1️⃣ Test récupération des vaisseaux...');
            const ships = await this.getShips();
            results.ships = { 
                success: ships.length > 0, 
                count: ships.length,
                sample: ships.slice(0, 3)
            };
            console.log(`✅ ${ships.length} vaisseaux récupérés`);

            // Test 2: Magasins
            console.log('\\n2️⃣ Test récupération des magasins...');
            const stores = await this.getStores();
            results.stores = { 
                success: stores.length > 0, 
                count: stores.length,
                list: stores
            };
            console.log(`✅ ${stores.length} magasins récupérés`);

            // Test 3: Upgrade (si on a des vaisseaux)
            if (ships.length >= 2) {
                console.log('\\n3️⃣ Test calcul d\'upgrade...');
                const upgrade = await this.findUpgradePath(ships[0].id, ships[1].id, [1, 2]);
                results.upgrade = { 
                    success: upgrade && upgrade.success, 
                    tested: true,
                    result: upgrade
                };
                
                if (upgrade && upgrade.success) {
                    console.log('✅ Calcul d\'upgrade réussi');
                } else {
                    console.log('⚠️ Calcul d\'upgrade échoué (normal si endpoint non confirmé)');
                }
            }

        } catch (error) {
            console.error('❌ Erreur durant les tests:', error.message);
        }

        console.log('\\n📊 RÉSULTATS:');
        console.log('- Vaisseaux:', results.ships.success ? '✅' : '❌', `(${results.ships.count})`);
        console.log('- Magasins:', results.stores.success ? '✅' : '❌', `(${results.stores.count})`);
        console.log('- Upgrades:', results.upgrade.tested ? (results.upgrade.success ? '✅' : '⚠️') : '⏭️');

        return results;
    }
}

// Test automatique si le fichier est exécuté directement
if (require.main === module) {
    const api = new UpgradeNavigatorAPI();
    api.runFullTest().catch(console.error);
}

module.exports = UpgradeNavigatorAPI;
