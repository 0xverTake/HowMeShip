/**
 * Système de cache avancé pour les données d'upgrade
 * Gère la mise en cache multi-niveaux avec TTL et persistance
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AdvancedCacheSystem {
    constructor(options = {}) {
        this.cacheDir = options.cacheDir || './cache';
        this.memoryCache = new Map();
        this.maxMemorySize = options.maxMemorySize || 1000; // Max items in memory
        this.defaultTTL = options.defaultTTL || 30 * 60 * 1000; // 30 minutes
        this.cacheLevels = {
            prices: { ttl: 15 * 60 * 1000, persist: true },      // 15 min
            ships: { ttl: 60 * 60 * 1000, persist: true },       // 1 hour
            upgrades: { ttl: 10 * 60 * 1000, persist: true },    // 10 min
            static: { ttl: 24 * 60 * 60 * 1000, persist: true }  // 24 hours
        };
        this.stats = {
            hits: 0,
            misses: 0,
            writes: 0,
            evictions: 0
        };
        
        this.initializeCache();
    }

    /**
     * Initialiser le système de cache
     */
    async initializeCache() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            console.log('[Cache] 🚀 Système de cache avancé initialisé');
            
            // Nettoyer les caches expirés au démarrage
            await this.cleanExpiredCache();
        } catch (error) {
            console.error('[Cache] ❌ Erreur initialisation:', error.message);
        }
    }

    /**
     * Générer une clé de cache unique
     */
    generateKey(namespace, identifier, params = {}) {
        const keyData = {
            namespace,
            identifier,
            params: Object.keys(params).sort().reduce((sorted, key) => {
                sorted[key] = params[key];
                return sorted;
            }, {})
        };
        
        return crypto.createHash('md5')
            .update(JSON.stringify(keyData))
            .digest('hex');
    }

    /**
     * Obtenir une valeur du cache
     */
    async get(namespace, identifier, params = {}) {
        const key = this.generateKey(namespace, identifier, params);
        const cacheConfig = this.cacheLevels[namespace] || { ttl: this.defaultTTL, persist: false };
        
        // 1. Vérifier le cache mémoire
        const memoryItem = this.memoryCache.get(key);
        if (memoryItem && !this.isExpired(memoryItem)) {
            this.stats.hits++;
            return memoryItem.data;
        }

        // 2. Vérifier le cache persistant
        if (cacheConfig.persist) {
            try {
                const filePath = path.join(this.cacheDir, `${key}.json`);
                const fileData = await fs.readFile(filePath, 'utf8');
                const item = JSON.parse(fileData);
                
                if (!this.isExpired(item)) {
                    // Remettre en cache mémoire
                    this.setMemoryCache(key, item);
                    this.stats.hits++;
                    return item.data;
                }
            } catch (error) {
                // Fichier n'existe pas ou erreur de lecture
            }
        }

        this.stats.misses++;
        return null;
    }

    /**
     * Définir une valeur dans le cache
     */
    async set(namespace, identifier, data, customTTL = null, params = {}) {
        const key = this.generateKey(namespace, identifier, params);
        const cacheConfig = this.cacheLevels[namespace] || { ttl: this.defaultTTL, persist: false };
        const ttl = customTTL || cacheConfig.ttl;
        
        const item = {
            data,
            timestamp: Date.now(),
            ttl,
            namespace,
            identifier
        };

        // Sauvegarder en mémoire
        this.setMemoryCache(key, item);

        // Sauvegarder sur disque si persistant
        if (cacheConfig.persist) {
            try {
                const filePath = path.join(this.cacheDir, `${key}.json`);
                await fs.writeFile(filePath, JSON.stringify(item, null, 2));
            } catch (error) {
                console.error('[Cache] ❌ Erreur sauvegarde disque:', error.message);
            }
        }

        this.stats.writes++;
    }

    /**
     * Gérer le cache mémoire avec LRU
     */
    setMemoryCache(key, item) {
        // Si le cache est plein, supprimer le plus ancien
        if (this.memoryCache.size >= this.maxMemorySize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
            this.stats.evictions++;
        }

        this.memoryCache.set(key, item);
    }

    /**
     * Vérifier si un élément est expiré
     */
    isExpired(item) {
        return Date.now() - item.timestamp > item.ttl;
    }

    /**
     * Supprimer un élément du cache
     */
    async delete(namespace, identifier, params = {}) {
        const key = this.generateKey(namespace, identifier, params);
        
        // Supprimer de la mémoire
        this.memoryCache.delete(key);

        // Supprimer du disque
        try {
            const filePath = path.join(this.cacheDir, `${key}.json`);
            await fs.unlink(filePath);
        } catch (error) {
            // Fichier n'existe pas
        }
    }

    /**
     * Nettoyer tous les caches expirés
     */
    async cleanExpiredCache() {
        console.log('[Cache] 🧹 Nettoyage des caches expirés...');
        
        // Nettoyer la mémoire
        let memoryCleanCount = 0;
        for (const [key, item] of this.memoryCache.entries()) {
            if (this.isExpired(item)) {
                this.memoryCache.delete(key);
                memoryCleanCount++;
            }
        }

        // Nettoyer les fichiers
        let fileCleanCount = 0;
        try {
            const files = await fs.readdir(this.cacheDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.cacheDir, file);
                    try {
                        const fileData = await fs.readFile(filePath, 'utf8');
                        const item = JSON.parse(fileData);
                        
                        if (this.isExpired(item)) {
                            await fs.unlink(filePath);
                            fileCleanCount++;
                        }
                    } catch (error) {
                        // Fichier corrompu, le supprimer
                        await fs.unlink(filePath);
                        fileCleanCount++;
                    }
                }
            }
        } catch (error) {
            console.error('[Cache] ❌ Erreur nettoyage fichiers:', error.message);
        }

        console.log(`[Cache] ✅ Nettoyage terminé: ${memoryCleanCount} mémoire, ${fileCleanCount} fichiers`);
    }

    /**
     * Obtenir ou définir avec une fonction factory
     */
    async getOrSet(namespace, identifier, factory, customTTL = null, params = {}) {
        const cached = await this.get(namespace, identifier, params);
        if (cached !== null) {
            return cached;
        }

        try {
            const data = await factory();
            await this.set(namespace, identifier, data, customTTL, params);
            return data;
        } catch (error) {
            console.error('[Cache] ❌ Erreur factory:', error.message);
            throw error;
        }
    }

    /**
     * Invalider tout un namespace
     */
    async invalidateNamespace(namespace) {
        console.log(`[Cache] 🗑️ Invalidation du namespace: ${namespace}`);
        
        // Supprimer de la mémoire
        const keysToDelete = [];
        for (const [key, item] of this.memoryCache.entries()) {
            if (item.namespace === namespace) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.memoryCache.delete(key));

        // Supprimer les fichiers
        try {
            const files = await fs.readdir(this.cacheDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.cacheDir, file);
                    try {
                        const fileData = await fs.readFile(filePath, 'utf8');
                        const item = JSON.parse(fileData);
                        
                        if (item.namespace === namespace) {
                            await fs.unlink(filePath);
                        }
                    } catch (error) {
                        // Ignorer les erreurs de lecture
                    }
                }
            }
        } catch (error) {
            console.error('[Cache] ❌ Erreur invalidation namespace:', error.message);
        }
    }

    /**
     * Obtenir les statistiques du cache
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            memorySize: this.memoryCache.size,
            maxMemorySize: this.maxMemorySize,
            hitRate: `${hitRate}%`,
            ...this.stats
        };
    }

    /**
     * Précharger des données dans le cache
     */
    async warmup(namespace, dataLoader) {
        console.log(`[Cache] 🔥 Préchauffage du cache: ${namespace}`);
        
        try {
            const data = await dataLoader();
            if (Array.isArray(data)) {
                for (const item of data) {
                    await this.set(namespace, item.id || item.name, item);
                }
            } else {
                await this.set(namespace, 'bulk', data);
            }
            
            console.log(`[Cache] ✅ Préchauffage terminé: ${namespace}`);
        } catch (error) {
            console.error(`[Cache] ❌ Erreur préchauffage ${namespace}:`, error.message);
        }
    }
}

module.exports = AdvancedCacheSystem;
