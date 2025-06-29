/**
 * UEX Corp API Scraper - Star Citizen 4.2
 * Source: https://uexcorp.space/api
 * 
 * This scraper uses the UEX Corp API v2.0 to fetch up-to-date ship data
 * for Star Citizen 4.2.x
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class UEXCorpScraper {
    constructor() {
        this.baseURL = 'https://uexcorp.space/api';
        this.apiVersion = '2.0';
        this.gameVersion = '4.2';
        this.rateLimitPerMinute = 10; // 10 requests per minute
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
        const minInterval = 60000 / this.rateLimitPerMinute; // ms between requests

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
    async makeRequest(endpoint) {
        await this.rateLimit();
        
        try {
            const url = `${this.baseURL}${endpoint}`;
            console.log(`📡 Fetching: ${url}`);
            
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 30000
            });

            if (response.data.status === 'ok') {
                return response.data.data;
            } else {
                throw new Error(`API Error: ${response.data.message || response.data.status}`);
            }
        } catch (error) {
            console.error(`❌ Request failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetch all vehicles/ships from UEX Corp API
     */
    async fetchShips() {
        try {
            console.log('🚀 Fetching ships from UEX Corp API...');
            const ships = await this.makeRequest('/vehicles');
            
            console.log(`✅ Found ${ships.length} ships from UEX Corp`);
            return ships;
        } catch (error) {
            console.error('❌ Failed to fetch ships:', error.message);
            throw error;
        }
    }

    /**
     * Transform UEX Corp ship data to our format
     */
    transformShipData(uexShip) {
        return {
            // Basic Info
            name: uexShip.name,
            fullName: uexShip.name_full,
            manufacturer: uexShip.company_name,
            slug: uexShip.slug,
            uuid: uexShip.uuid,
            gameVersion: uexShip.game_version,
            
            // Physical Specifications
            dimensions: {
                length: uexShip.length || 0,
                width: uexShip.width || 0,
                height: uexShip.height || 0
            },
            mass: uexShip.mass || 0,
            crew: {
                min: this.parseCrewString(uexShip.crew).min,
                max: this.parseCrewString(uexShip.crew).max
            },
            
            // Cargo & Storage
            cargo: {
                scu: uexShip.scu || 0,
                containerSizes: this.parseContainerSizes(uexShip.container_sizes)
            },
            
            // Fuel System
            fuel: {
                quantum: uexShip.fuel_quantum || 0,
                hydrogen: uexShip.fuel_hydrogen || 0
            },
            
            // Ship Categories/Types
            categories: this.extractCategories(uexShip),
            
            // Landing Pad
            landingPad: uexShip.pad_type || 'Unknown',
            
            // Store Info
            store: {
                available: !!uexShip.url_store,
                url: uexShip.url_store || null,
                brochureUrl: uexShip.url_brochure || null,
                videoUrl: uexShip.url_video || null,
                images: this.parseImages(uexShip.url_photos)
            },
            
            // Meta
            dateAdded: new Date(uexShip.date_added * 1000),
            dateModified: new Date(uexShip.date_modified * 1000),
            source: 'UEX Corp API',
            sourceUrl: 'https://uexcorp.space/'
        };
    }

    /**
     * Parse crew string like "1,4" or "2" into min/max
     */
    parseCrewString(crewStr) {
        if (!crewStr) return { min: 1, max: 1 };
        
        const parts = crewStr.toString().split(',');
        if (parts.length === 1) {
            const crew = parseInt(parts[0]) || 1;
            return { min: crew, max: crew };
        } else {
            return {
                min: parseInt(parts[0]) || 1,
                max: parseInt(parts[1]) || parseInt(parts[0]) || 1
            };
        }
    }

    /**
     * Parse container sizes string like "1,2,4,8,16,24,32"
     */
    parseContainerSizes(sizesStr) {
        if (!sizesStr) return [];
        return sizesStr.split(',').map(size => parseInt(size.trim())).filter(size => !isNaN(size));
    }

    /**
     * Extract ship categories from boolean flags
     */
    extractCategories(ship) {
        const categories = [];
        
        // Primary roles
        if (ship.is_cargo) categories.push('Cargo');
        if (ship.is_mining) categories.push('Mining');
        if (ship.is_exploration) categories.push('Exploration');
        if (ship.is_medical) categories.push('Medical');
        if (ship.is_salvage) categories.push('Salvage');
        if (ship.is_refinery) categories.push('Refinery');
        if (ship.is_refuel) categories.push('Refueling');
        if (ship.is_repair) categories.push('Repair');
        if (ship.is_racing) categories.push('Racing');
        if (ship.is_passenger) categories.push('Passenger');
        if (ship.is_construction) categories.push('Construction');
        if (ship.is_research) categories.push('Research');
        if (ship.is_science) categories.push('Science');
        if (ship.is_scanning) categories.push('Scanning');
        
        // Combat roles
        if (ship.is_military) categories.push('Military');
        if (ship.is_bomber) categories.push('Bomber');
        if (ship.is_interdiction) categories.push('Interdiction');
        if (ship.is_boarding) categories.push('Boarding');
        if (ship.is_emp) categories.push('EMP');
        if (ship.is_qed) categories.push('QED');
        
        // Special types
        if (ship.is_carrier) categories.push('Carrier');
        if (ship.is_hangar) categories.push('Hangar');
        if (ship.is_stealth) categories.push('Stealth');
        if (ship.is_civilian) categories.push('Civilian');
        if (ship.is_starter) categories.push('Starter');
        if (ship.is_concept) categories.push('Concept');
        if (ship.is_showdown_winner) categories.push('Best in Show');
        
        // Vehicle types
        if (ship.is_spaceship) categories.push('Spaceship');
        if (ship.is_ground_vehicle) categories.push('Ground Vehicle');
        if (ship.is_addon) categories.push('Module/Addon');
        
        return categories.length > 0 ? categories : ['Unknown'];
    }

    /**
     * Parse images JSON string
     */
    parseImages(imagesStr) {
        if (!imagesStr) return [];
        
        try {
            // UEX API returns images as JSON string with escaped quotes
            const cleanStr = imagesStr.replace(/\\\//g, '/').replace(/\\\"/g, '"');
            const images = JSON.parse(cleanStr);
            return Array.isArray(images) ? images : [];
        } catch (error) {
            console.warn('Failed to parse images:', error.message);
            return [];
        }
    }

    /**
     * Fetch and transform all ship data
     */
    async scrapeShips() {
        try {
            console.log('🌟 Starting UEX Corp ship scraping...');
            
            const rawShips = await this.fetchShips();
            const transformedShips = rawShips.map(ship => this.transformShipData(ship));
            
            // Filter out modules/addons for main ship list
            const ships = transformedShips.filter(ship => !ship.categories.includes('Module/Addon'));
            const modules = transformedShips.filter(ship => ship.categories.includes('Module/Addon'));
            
            console.log(`✅ Transformed ${ships.length} ships and ${modules.length} modules`);
            
            return {
                ships,
                modules,
                metadata: {
                    source: 'UEX Corp API',
                    gameVersion: this.gameVersion,
                    scrapedAt: new Date().toISOString(),
                    totalCount: transformedShips.length,
                    shipsCount: ships.length,
                    modulesCount: modules.length
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
            const shipsFile = path.join(dataDir, 'ships_uex_corp.json');
            await fs.writeFile(shipsFile, JSON.stringify(data.ships, null, 2));
            console.log(`💾 Saved ${data.ships.length} ships to ${shipsFile}`);
            
            // Save modules data
            const modulesFile = path.join(dataDir, 'modules_uex_corp.json');
            await fs.writeFile(modulesFile, JSON.stringify(data.modules, null, 2));
            console.log(`💾 Saved ${data.modules.length} modules to ${modulesFile}`);
            
            // Save metadata
            const metadataFile = path.join(dataDir, 'uex_corp_metadata.json');
            await fs.writeFile(metadataFile, JSON.stringify(data.metadata, null, 2));
            console.log(`💾 Saved metadata to ${metadataFile}`);
            
            return {
                shipsFile,
                modulesFile,
                metadataFile
            };
        } catch (error) {
            console.error('❌ Failed to save files:', error.message);
            throw error;
        }
    }
}

// Export for use in other modules
module.exports = UEXCorpScraper;

// CLI usage
if (require.main === module) {
    async function main() {
        const scraper = new UEXCorpScraper();
        
        try {
            console.log('🚀 Starting UEX Corp scraper...');
            const data = await scraper.scrapeShips();
            await scraper.saveToFiles(data);
            
            console.log('\n✅ Scraping completed successfully!');
            console.log(`📊 Results:`);
            console.log(`   - Ships: ${data.ships.length}`);
            console.log(`   - Modules: ${data.modules.length}`);
            console.log(`   - Game Version: ${data.metadata.gameVersion}`);
            console.log(`   - Source: ${data.metadata.source}`);
            
        } catch (error) {
            console.error('❌ Scraping failed:', error.message);
            process.exit(1);
        }
    }
    
    main();
}
