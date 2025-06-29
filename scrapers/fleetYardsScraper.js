/**
 * FleetYards API Scraper - Star Citizen 4.2
 * Source: https://api.fleetyards.net/
 * 
 * FleetYards is a community-driven fleet management tool with comprehensive ship data
 * Updated for Star Citizen 4.2.x
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class FleetYardsScraper {
    constructor() {
        this.baseURL = 'https://api.fleetyards.net/v1';
        this.gameVersion = '4.2';
        this.rateLimit = 30; // Conservative rate limit
        this.lastRequest = 0;
        this.headers = {
            'User-Agent': 'HowMeShip-Bot/1.0 (Star Citizen Ship Bot)',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    /**
     * Rate limiting - wait between requests
     */
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        const minInterval = 60000 / this.rateLimit; // ms between requests

        if (timeSinceLastRequest < minInterval) {
            const waitTime = minInterval - timeSinceLastRequest;
            console.log(`🔄 Rate limiting: waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequest = Date.now();
    }

    /**
     * Make API request with proper error handling
     */
    async makeRequest(endpoint, params = {}) {
        await this.rateLimit();
        
        try {
            const url = `${this.baseURL}${endpoint}`;
            console.log(`📡 Fetching: ${url}`);
            
            const response = await axios.get(url, {
                headers: this.headers,
                params: {
                    per_page: 200, // Get more results per request
                    ...params
                },
                timeout: 30000
            });

            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                console.warn(`⚠️ Endpoint not found: ${endpoint}`);
                return null;
            }
            console.error(`❌ Request failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetch all models (ships) from FleetYards API
     */
    async fetchModels() {
        try {
            console.log('🚀 Fetching models from FleetYards API...');
            
            let allModels = [];
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
                const models = await this.makeRequest('/models', { page });
                
                if (!models || models.length === 0) {
                    hasMore = false;
                } else {
                    allModels = allModels.concat(models);
                    console.log(`📄 Page ${page}: ${models.length} models (Total: ${allModels.length})`);
                    page++;
                    
                    // FleetYards typically returns < 200 if it's the last page
                    if (models.length < 200) {
                        hasMore = false;
                    }
                }
            }
            
            console.log(`✅ Found ${allModels.length} models from FleetYards`);
            return allModels;
        } catch (error) {
            console.error('❌ Failed to fetch models:', error.message);
            throw error;
        }
    }

    /**
     * Fetch manufacturers from FleetYards API
     */
    async fetchManufacturers() {
        try {
            console.log('🏭 Fetching manufacturers...');
            const manufacturers = await this.makeRequest('/manufacturers');
            
            if (manufacturers && Array.isArray(manufacturers)) {
                console.log(`✅ Found ${manufacturers.length} manufacturers`);
                return manufacturers.reduce((acc, mfg) => {
                    acc[mfg.slug] = mfg;
                    return acc;
                }, {});
            }
            
            return {};
        } catch (error) {
            console.warn('⚠️ Failed to fetch manufacturers, continuing without them:', error.message);
            return {};
        }
    }

    /**
     * Transform FleetYards model data to our format
     */
    transformModelData(model, manufacturers = {}) {
        const manufacturer = manufacturers[model.manufacturer?.slug] || model.manufacturer || {};
        
        return {
            // Basic Info
            name: model.name,
            fullName: `${manufacturer.name || model.manufacturer?.name || ''} ${model.name}`.trim(),
            manufacturer: manufacturer.name || model.manufacturer?.name || 'Unknown',
            slug: model.slug,
            scIdentifier: model.sc_identifier,
            rsiId: model.rsi_id,
            
            // Physical Specifications
            dimensions: {
                length: model.length || 0,
                width: model.beam || 0,
                height: model.height || 0
            },
            mass: model.mass || 0,
            crew: {
                min: model.min_crew || 1,
                max: model.max_crew || model.min_crew || 1
            },
            
            // Cargo & Storage
            cargo: {
                scu: model.cargo || 0
            },
            
            // Ship Info
            size: model.size || 'Unknown',
            classification: model.classification?.name || 'Unknown',
            focus: model.focus || 'Unknown',
            type: model.type || 'Unknown',
            
            // Specifications
            specifications: this.extractSpecifications(model),
            
            // Production Info
            production: {
                status: model.production_status || 'Unknown',
                note: model.production_note
            },
            
            // Pricing
            price: {
                pledgePrice: model.pledge_price,
                lastPledgePrice: model.last_pledge_price,
                onSale: model.on_sale || false,
                msrp: model.msrp
            },
            
            // Media
            media: {
                storeImage: model.store_image,
                storeImageLarge: model.store_image_large,
                fleetchartImage: model.fleetchart_image,
                brochure: model.brochure,
                holo: model.holo
            },
            
            // Links
            links: {
                self: model.links?.self,
                hardpoints: model.links?.hardpoints
            },
            
            // Meta
            createdAt: model.created_at,
            updatedAt: model.updated_at,
            source: 'FleetYards API',
            sourceUrl: 'https://fleetyards.net/'
        };
    }

    /**
     * Extract detailed specifications if available
     */
    extractSpecifications(model) {
        const specs = {};
        
        // Speed & Agility
        if (model.speed) {
            specs.speed = {
                scm: model.speed.scm,
                afterburner: model.speed.afterburner,
                cruise: model.speed.cruise,
                quantum: model.speed.quantum
            };
        }
        
        // Range & Fuel
        if (model.range) {
            specs.range = model.range;
        }
        
        // Pitch/Yaw/Roll rates
        if (model.pitch || model.yaw || model.roll) {
            specs.agility = {
                pitch: model.pitch,
                yaw: model.yaw,
                roll: model.roll
            };
        }
        
        // Acceleration
        if (model.acceleration) {
            specs.acceleration = model.acceleration;
        }
        
        return Object.keys(specs).length > 0 ? specs : null;
    }

    /**
     * Fetch detailed model information
     */
    async fetchModelDetails(slug) {
        try {
            const details = await this.makeRequest(`/models/${slug}`);
            return details;
        } catch (error) {
            console.warn(`⚠️ Failed to fetch details for ${slug}:`, error.message);
            return null;
        }
    }

    /**
     * Fetch and transform all model data
     */
    async scrapeModels() {
        try {
            console.log('🌟 Starting FleetYards model scraping...');
            
            // Fetch manufacturers first
            const manufacturers = await this.fetchManufacturers();
            
            // Fetch all models
            const rawModels = await this.fetchModels();
            
            // Transform the data
            const models = rawModels.map(model => this.transformModelData(model, manufacturers));
            
            // Filter ships vs ground vehicles vs modules
            const ships = models.filter(model => 
                !model.type?.toLowerCase().includes('ground') && 
                !model.classification?.toLowerCase().includes('vehicle')
            );
            
            const vehicles = models.filter(model => 
                model.type?.toLowerCase().includes('ground') || 
                model.classification?.toLowerCase().includes('vehicle')
            );
            
            console.log(`✅ Transformed ${ships.length} ships and ${vehicles.length} vehicles`);
            
            return {
                ships,
                vehicles,
                manufacturers: Object.values(manufacturers),
                metadata: {
                    source: 'FleetYards API',
                    gameVersion: this.gameVersion,
                    scrapedAt: new Date().toISOString(),
                    totalCount: models.length,
                    shipsCount: ships.length,
                    vehiclesCount: vehicles.length,
                    manufacturersCount: Object.keys(manufacturers).length
                }
            };
        } catch (error) {
            console.error('❌ Scraping failed:', error.message);
            throw error;
        }
    }

    /**
     * Save scraped data to files
     */
    async saveToFiles(data, outputDir = '../data') {
        try {
            const dataDir = path.resolve(__dirname, outputDir);
            
            // Create data directory if it doesn't exist
            await fs.mkdir(dataDir, { recursive: true });
            
            // Save ships data
            const shipsFile = path.join(dataDir, 'ships_fleetyards.json');
            await fs.writeFile(shipsFile, JSON.stringify(data.ships, null, 2));
            console.log(`💾 Saved ${data.ships.length} ships to ${shipsFile}`);
            
            // Save vehicles data
            const vehiclesFile = path.join(dataDir, 'vehicles_fleetyards.json');
            await fs.writeFile(vehiclesFile, JSON.stringify(data.vehicles, null, 2));
            console.log(`💾 Saved ${data.vehicles.length} vehicles to ${vehiclesFile}`);
            
            // Save manufacturers
            const manufacturersFile = path.join(dataDir, 'manufacturers_fleetyards.json');
            await fs.writeFile(manufacturersFile, JSON.stringify(data.manufacturers, null, 2));
            console.log(`💾 Saved ${data.manufacturers.length} manufacturers to ${manufacturersFile}`);
            
            // Save metadata
            const metadataFile = path.join(dataDir, 'fleetyards_metadata.json');
            await fs.writeFile(metadataFile, JSON.stringify(data.metadata, null, 2));
            console.log(`💾 Saved metadata to ${metadataFile}`);
            
            return {
                shipsFile,
                vehiclesFile,
                manufacturersFile,
                metadataFile
            };
        } catch (error) {
            console.error('❌ Failed to save files:', error.message);
            throw error;
        }
    }
}

// Export for use in other modules
module.exports = FleetYardsScraper;

// CLI usage
if (require.main === module) {
    async function main() {
        const scraper = new FleetYardsScraper();
        
        try {
            console.log('🚀 Starting FleetYards scraper...');
            const data = await scraper.scrapeModels();
            await scraper.saveToFiles(data);
            
            console.log('\n✅ Scraping completed successfully!');
            console.log(`📊 Results:`);
            console.log(`   - Ships: ${data.ships.length}`);
            console.log(`   - Vehicles: ${data.vehicles.length}`);
            console.log(`   - Manufacturers: ${data.manufacturers.length}`);
            console.log(`   - Game Version: ${data.metadata.gameVersion}`);
            console.log(`   - Source: ${data.metadata.source}`);
            
        } catch (error) {
            console.error('❌ Scraping failed:', error.message);
            process.exit(1);
        }
    }
    
    main();
}
