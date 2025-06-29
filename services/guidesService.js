const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

class StarCitizenGuidesService {
    constructor() {
        this.wikiAPI = 'https://starcitizen.tools/api.php';
        this.rsiAPI = 'https://robertsspaceindustries.com/api';
        this.headers = {
            'User-Agent': 'HowMeShip-Bot/1.0 (Star Citizen Discord Bot)',
            'Accept': 'application/json'
        };

        // Cache des guides pour éviter trop de requêtes
        this.guidesCache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes

        // Catégories de guides
        this.guideCategories = {
            'beginner': {
                name: 'Guides Débutant',
                icon: '🌟',
                keywords: ['beginner', 'starter', 'new player', 'getting started', 'tutorial']
            },
            'ships': {
                name: 'Guides Vaisseaux',
                icon: '🚀',
                keywords: ['ship guide', 'flight', 'pilot', 'vessel', 'spacecraft']
            },
            'trading': {
                name: 'Commerce & Trading',
                icon: '💰',
                keywords: ['trading', 'commerce', 'cargo', 'profit', 'economics']
            },
            'combat': {
                name: 'Combat',
                icon: '⚔️',
                keywords: ['combat', 'fighting', 'weapons', 'pvp', 'battle']
            },
            'mining': {
                name: 'Mining',
                icon: '⛏️',
                keywords: ['mining', 'prospector', 'quantainium', 'refining']
            },
            'exploration': {
                name: 'Exploration',
                icon: '🔍',
                keywords: ['exploration', 'scanning', 'discovery', 'quantum']
            },
            'missions': {
                name: 'Missions',
                icon: '📋',
                keywords: ['mission', 'contract', 'bounty', 'delivery']
            },
            'updates': {
                name: 'Mises à jour',
                icon: '🆕',
                keywords: ['patch', 'update', 'alpha', '4.2', 'changelog']
            }
        };
    }

    /**
     * Récupère les guides depuis Star Citizen Tools Wiki
     */
    async getWikiGuides(category = null, gameVersion = '4.2') {
        try {
            const cacheKey = `wiki_${category || 'all'}_${gameVersion}`;
            
            // Vérifier le cache
            if (this.guidesCache.has(cacheKey)) {
                const cached = this.guidesCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            console.log(`[Guides] Récupération guides wiki pour ${category || 'toutes catégories'}`);

            // Rechercher les pages de guides
            const searchTerms = category && this.guideCategories[category] 
                ? this.guideCategories[category].keywords 
                : ['guide', 'tutorial', 'how to'];

            const guides = [];

            for (const term of searchTerms) {
                const searchResponse = await axios.get(this.wikiAPI, {
                    headers: this.headers,
                    params: {
                        action: 'query',
                        list: 'search',
                        srsearch: `${term} ${gameVersion}`,
                        format: 'json',
                        srlimit: 10
                    }
                });

                if (searchResponse.data.query && searchResponse.data.query.search) {
                    for (const result of searchResponse.data.query.search) {
                        // Éviter les doublons
                        if (!guides.find(g => g.title === result.title)) {
                            guides.push({
                                title: result.title,
                                snippet: result.snippet.replace(/<[^>]*>/g, ''), // Retirer le HTML
                                url: `https://starcitizen.tools/${encodeURIComponent(result.title.replace(/ /g, '_'))}`,
                                source: 'Star Citizen Tools',
                                category: this.categorizeGuide(result.title, result.snippet),
                                lastModified: new Date().toISOString() // Approximation
                            });
                        }
                    }
                }

                // Délai entre les requêtes
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Récupérer les guides de mise à jour spécifiques
            await this.addVersionSpecificGuides(guides, gameVersion);

            // Mettre en cache
            this.guidesCache.set(cacheKey, {
                data: guides,
                timestamp: Date.now()
            });

            console.log(`[Guides] ${guides.length} guides trouvés`);
            return guides;

        } catch (error) {
            console.error('[Guides] Erreur récupération wiki:', error.message);
            return [];
        }
    }

    /**
     * Ajoute les guides spécifiques à une version
     */
    async addVersionSpecificGuides(guides, gameVersion) {
        try {
            // Rechercher les pages de patch notes et guides de version
            const versionResponse = await axios.get(this.wikiAPI, {
                headers: this.headers,
                params: {
                    action: 'query',
                    list: 'search',
                    srsearch: `"Alpha ${gameVersion}" OR "Update ${gameVersion}" OR "Patch ${gameVersion}"`,
                    format: 'json',
                    srlimit: 5
                }
            });

            if (versionResponse.data.query && versionResponse.data.query.search) {
                for (const result of versionResponse.data.query.search) {
                    if (!guides.find(g => g.title === result.title)) {
                        guides.push({
                            title: result.title,
                            snippet: result.snippet.replace(/<[^>]*>/g, ''),
                            url: `https://starcitizen.tools/${encodeURIComponent(result.title.replace(/ /g, '_'))}`,
                            source: 'Star Citizen Tools',
                            category: 'updates',
                            lastModified: new Date().toISOString(),
                            version: gameVersion
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[Guides] Erreur guides version:', error.message);
        }
    }

    /**
     * Catégorise automatiquement un guide
     */
    categorizeGuide(title, snippet) {
        const text = `${title} ${snippet}`.toLowerCase();
        
        for (const [key, category] of Object.entries(this.guideCategories)) {
            if (category.keywords.some(keyword => text.includes(keyword))) {
                return key;
            }
        }
        
        return 'general';
    }

    /**
     * Récupère les guides communautaires depuis Reddit/Discord
     */
    async getCommunityGuides(category = null) {
        try {
            console.log('[Guides] Récupération guides communautaires...');
            
            // Pour l'instant, retourner des guides statiques populaires
            // TODO: Implémenter l'API Reddit pour r/starcitizen
            const communityGuides = [
                {
                    title: "New Player's Guide to Star Citizen 4.2",
                    snippet: "Comprehensive guide for new players covering all basics",
                    url: "https://www.reddit.com/r/starcitizen/comments/newplayer",
                    source: "Reddit Community",
                    category: "beginner",
                    author: "Community",
                    votes: 500
                },
                {
                    title: "Mining Guide 4.2 - Complete Walkthrough",
                    snippet: "Everything you need to know about mining in 4.2",
                    url: "https://www.reddit.com/r/starcitizen/comments/mining42",
                    source: "Reddit Community",
                    category: "mining",
                    author: "Community",
                    votes: 300
                }
            ];

            return category 
                ? communityGuides.filter(g => g.category === category)
                : communityGuides;

        } catch (error) {
            console.error('[Guides] Erreur guides communautaires:', error.message);
            return [];
        }
    }

    /**
     * Détecte automatiquement la version actuelle du jeu
     */
    async getCurrentGameVersion() {
        try {
            // Récupérer la version depuis la page principale du wiki
            const response = await axios.get(this.wikiAPI, {
                headers: this.headers,
                params: {
                    action: 'parse',
                    page: 'Star_Citizen_Wiki',
                    format: 'json',
                    section: 0
                }
            });

            if (response.data.parse && response.data.parse.text) {
                const content = response.data.parse.text['*'];
                
                // Chercher des patterns de version comme "4.2.0", "4.2.1", etc.
                const versionMatch = content.match(/(?:Alpha\s+|LIVE\s+|PTU\s+)?(\d+\.\d+(?:\.\d+)?)/);
                
                if (versionMatch) {
                    console.log(`[Guides] Version détectée: ${versionMatch[1]}`);
                    return versionMatch[1];
                }
            }

            // Fallback sur 4.2 si pas trouvé
            return '4.2';

        } catch (error) {
            console.error('[Guides] Erreur détection version:', error.message);
            return '4.2';
        }
    }

    /**
     * Crée un embed Discord pour afficher les guides
     */
    async createGuidesEmbed(category = null, maxGuides = 10) {
        try {
            const currentVersion = await this.getCurrentGameVersion();
            const wikiGuides = await this.getWikiGuides(category, currentVersion);
            const communityGuides = await this.getCommunityGuides(category);
            
            const allGuides = [...wikiGuides, ...communityGuides]
                .sort((a, b) => b.votes || 0 - a.votes || 0) // Trier par popularité
                .slice(0, maxGuides);

            const categoryInfo = category && this.guideCategories[category] 
                ? this.guideCategories[category]
                : { name: 'Tous les Guides', icon: '📚' };

            const embed = new EmbedBuilder()
                .setColor('#00b4d8')
                .setTitle(`${categoryInfo.icon} ${categoryInfo.name} - Star Citizen ${currentVersion}`)
                .setDescription(`Guides mis à jour pour la version **${currentVersion}**`)
                .setTimestamp();

            if (allGuides.length === 0) {
                embed.addFields({
                    name: '❌ Aucun guide trouvé',
                    value: 'Aucun guide disponible pour cette catégorie. Essayez une autre catégorie ou `/guides list` pour voir toutes les options.',
                    inline: false
                });
            } else {
                // Grouper par source
                const wikiGuidesFiltered = allGuides.filter(g => g.source === 'Star Citizen Tools').slice(0, 5);
                const communityGuidesFiltered = allGuides.filter(g => g.source === 'Reddit Community').slice(0, 3);

                if (wikiGuidesFiltered.length > 0) {
                    const wikiList = wikiGuidesFiltered.map(guide => 
                        `• [${guide.title}](${guide.url})\n  ${guide.snippet.substring(0, 80)}...`
                    ).join('\n\n');

                    embed.addFields({
                        name: '📖 Guides Officiels (Star Citizen Tools)',
                        value: wikiList.length > 1024 ? wikiList.substring(0, 1021) + '...' : wikiList,
                        inline: false
                    });
                }

                if (communityGuidesFiltered.length > 0) {
                    const communityList = communityGuidesFiltered.map(guide => 
                        `• [${guide.title}](${guide.url})\n  ${guide.snippet.substring(0, 60)}... 👍 ${guide.votes || 0}`
                    ).join('\n\n');

                    embed.addFields({
                        name: '👥 Guides Communautaires',
                        value: communityList.length > 1024 ? communityList.substring(0, 1021) + '...' : communityList,
                        inline: false
                    });
                }
            }

            // Ajouter les catégories disponibles
            const categories = Object.entries(this.guideCategories)
                .map(([key, cat]) => `${cat.icon} \`${key}\``)
                .join(' • ');

            embed.addFields({
                name: '📂 Catégories disponibles',
                value: categories,
                inline: false
            });

            embed.setFooter({ 
                text: `Données mises à jour automatiquement • Version ${currentVersion} • ${allGuides.length} guides trouvés` 
            });

            return {
                embeds: [embed],
                guides: allGuides
            };

        } catch (error) {
            console.error('[Guides] Erreur création embed:', error.message);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur de récupération des guides')
                .setDescription('Impossible de récupérer les guides pour le moment. Réessayez plus tard.')
                .setTimestamp();

            return { embeds: [errorEmbed], guides: [] };
        }
    }

    /**
     * Recherche un guide spécifique
     */
    async searchGuide(query) {
        try {
            console.log(`[Guides] Recherche: "${query}"`);
            
            const currentVersion = await this.getCurrentGameVersion();
            
            // Recherche dans le wiki
            const searchResponse = await axios.get(this.wikiAPI, {
                headers: this.headers,
                params: {
                    action: 'query',
                    list: 'search',
                    srsearch: `${query} ${currentVersion}`,
                    format: 'json',
                    srlimit: 5
                }
            });

            const results = [];

            if (searchResponse.data.query && searchResponse.data.query.search) {
                for (const result of searchResponse.data.query.search) {
                    results.push({
                        title: result.title,
                        snippet: result.snippet.replace(/<[^>]*>/g, ''),
                        url: `https://starcitizen.tools/${encodeURIComponent(result.title.replace(/ /g, '_'))}`,
                        source: 'Star Citizen Tools',
                        category: this.categorizeGuide(result.title, result.snippet),
                        relevance: result.score || 0
                    });
                }
            }

            return results.sort((a, b) => b.relevance - a.relevance);

        } catch (error) {
            console.error('[Guides] Erreur recherche:', error.message);
            return [];
        }
    }

    /**
     * Nettoie le cache des guides
     */
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.guidesCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.guidesCache.delete(key);
            }
        }
        console.log(`[Guides] Cache nettoyé: ${this.guidesCache.size} entrées restantes`);
    }

    /**
     * Obtient les statistiques du service
     */
    getStats() {
        return {
            cacheSize: this.guidesCache.size,
            categories: Object.keys(this.guideCategories).length,
            sources: ['Star Citizen Tools', 'Reddit Community'],
            lastUpdate: new Date().toISOString()
        };
    }
}

module.exports = new StarCitizenGuidesService();
