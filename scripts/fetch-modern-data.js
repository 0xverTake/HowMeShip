/**
 * Modern Data Fetcher for Star Citizen 4.2
 * 
 * This script fetches data from multiple modern APIs that are actively maintained
 * and updated for Star Citizen 4.2.x
 */

const UEXCorpScraper = require('./uexCorpScraper');
const FleetYardsScraper = require('./fleetYardsScraper');
const fs = require('fs').promises;
const path = require('path');

class ModernDataFetcher {
    constructor() {
        this.scrapers = {
            uexcorp: new UEXCorpScraper(),
            fleetyards: new FleetYardsScraper()
        };
    }

    /**
     * Fetch data from all sources
     */
    async fetchAllData() {
        const results = {};
        const errors = [];

        console.log('🌟 Starting modern data fetch for Star Citizen 4.2...\n');

        // UEX Corp scraping
        try {
            console.log('📡 === UEX CORP SCRAPER ===');
            results.uexcorp = await this.scrapers.uexcorp.scrapeShips();
            console.log('✅ UEX Corp scraping completed successfully!\n');
        } catch (error) {
            console.error('❌ UEX Corp scraping failed:', error.message);
            errors.push({ source: 'UEX Corp', error: error.message });
        }

        // FleetYards scraping
        try {
            console.log('📡 === FLEETYARDS SCRAPER ===');
            results.fleetyards = await this.scrapers.fleetyards.scrapeModels();
            console.log('✅ FleetYards scraping completed successfully!\n');
        } catch (error) {
            console.error('❌ FleetYards scraping failed:', error.message);
            errors.push({ source: 'FleetYards', error: error.message });
        }

        return { results, errors };
    }

    /**
     * Merge data from multiple sources
     */
    mergeShipData(sources) {
        const mergedShips = new Map();
        const allShips = [];

        // Process each source
        Object.entries(sources).forEach(([sourceName, data]) => {
            if (!data || !data.ships) return;

            data.ships.forEach(ship => {
                const key = this.generateShipKey(ship);
                
                if (mergedShips.has(key)) {
                    // Merge with existing ship data
                    const existing = mergedShips.get(key);
                    const merged = this.mergeShipEntries(existing, ship, sourceName);
                    mergedShips.set(key, merged);
                } else {
                    // Add new ship
                    ship.sources = [sourceName];
                    ship.sourceData = { [sourceName]: ship };
                    mergedShips.set(key, ship);
                }
            });
        });

        return Array.from(mergedShips.values());
    }

    /**
     * Generate a unique key for ship identification
     */
    generateShipKey(ship) {
        // Use name + manufacturer as key, cleaned up
        const name = ship.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        const manufacturer = ship.manufacturer?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        return `${manufacturer}_${name}`;
    }

    /**
     * Merge two ship entries from different sources
     */
    mergeShipEntries(existing, newShip, sourceName) {
        const merged = { ...existing };
        
        // Track sources
        merged.sources = [...(existing.sources || []), sourceName];
        merged.sourceData = { 
            ...(existing.sourceData || {}), 
            [sourceName]: newShip 
        };

        // Merge specific fields (prefer more complete data)
        if (!merged.dimensions?.length && newShip.dimensions?.length) {
            merged.dimensions = newShip.dimensions;
        }
        
        if (!merged.mass && newShip.mass) {
            merged.mass = newShip.mass;
        }

        if (!merged.cargo?.scu && newShip.cargo?.scu) {
            merged.cargo = newShip.cargo;
        }

        // Merge categories/classifications
        if (newShip.categories) {
            merged.categories = [...new Set([
                ...(merged.categories || []),
                ...newShip.categories
            ])];
        }

        // Keep track of last updated
        if (newShip.dateModified && (!merged.dateModified || new Date(newShip.dateModified) > new Date(merged.dateModified))) {
            merged.lastUpdated = newShip.dateModified;
            merged.lastUpdatedSource = sourceName;
        }

        return merged;
    }

    /**
     * Generate comprehensive report
     */
    generateReport(data, errors) {
        const report = {
            timestamp: new Date().toISOString(),
            gameVersion: '4.2',
            summary: {
                totalSources: Object.keys(data).length,
                successfulSources: Object.keys(data).filter(key => data[key]).length,
                errors: errors.length
            },
            sources: {},
            errors
        };

        // Add source-specific stats
        Object.entries(data).forEach(([sourceName, sourceData]) => {
            if (sourceData) {
                report.sources[sourceName] = {
                    ships: sourceData.ships?.length || 0,
                    vehicles: sourceData.vehicles?.length || 0,
                    modules: sourceData.modules?.length || 0,
                    manufacturers: sourceData.manufacturers?.length || 0,
                    metadata: sourceData.metadata
                };
            }
        });

        return report;
    }

    /**
     * Save all data and reports
     */
    async saveAllData(data, mergedShips, report) {
        const dataDir = path.resolve(__dirname, '../data');
        await fs.mkdir(dataDir, { recursive: true });

        const files = {};

        try {
            // Save individual source data
            for (const [sourceName, sourceData] of Object.entries(data)) {
                if (sourceData) {
                    await this.scrapers[sourceName].saveToFiles(sourceData, '../data');
                }
            }

            // Save merged ships data
            const mergedFile = path.join(dataDir, 'ships_merged_4.2.json');
            await fs.writeFile(mergedFile, JSON.stringify(mergedShips, null, 2));
            files.merged = mergedFile;
            console.log(`💾 Saved ${mergedShips.length} merged ships to ${mergedFile}`);

            // Save comprehensive report
            const reportFile = path.join(dataDir, 'fetch_report_4.2.json');
            await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
            files.report = reportFile;
            console.log(`📊 Saved comprehensive report to ${reportFile}`);

            // Save summary for quick access
            const summaryFile = path.join(dataDir, 'ships_summary_4.2.json');
            const summary = {
                totalShips: mergedShips.length,
                lastUpdated: new Date().toISOString(),
                gameVersion: '4.2',
                sources: Object.keys(data).filter(key => data[key]),
                topManufacturers: this.getTopManufacturers(mergedShips),
                shipsByCategory: this.groupShipsByCategory(mergedShips)
            };
            await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
            files.summary = summaryFile;
            console.log(`📋 Saved summary to ${summaryFile}`);

            return files;
        } catch (error) {
            console.error('❌ Failed to save data:', error.message);
            throw error;
        }
    }

    /**
     * Get top manufacturers by ship count
     */
    getTopManufacturers(ships) {
        const manufacturerCounts = {};
        
        ships.forEach(ship => {
            const mfg = ship.manufacturer || 'Unknown';
            manufacturerCounts[mfg] = (manufacturerCounts[mfg] || 0) + 1;
        });

        return Object.entries(manufacturerCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));
    }

    /**
     * Group ships by category
     */
    groupShipsByCategory(ships) {
        const categoryCounts = {};
        
        ships.forEach(ship => {
            const categories = ship.categories || ['Unknown'];
            categories.forEach(category => {
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            });
        });

        return Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([name, count]) => ({ name, count }));
    }

    /**
     * Main execution function
     */
    async run() {
        try {
            console.log('🚀 MODERN STAR CITIZEN 4.2 DATA FETCHER');
            console.log('==========================================\n');

            // Fetch data from all sources
            const { results, errors } = await this.fetchAllData();

            // Merge ship data
            console.log('🔄 Merging ship data from all sources...');
            const mergedShips = this.mergeShipData(results);
            console.log(`✅ Merged ${mergedShips.length} unique ships\n`);

            // Generate report
            const report = this.generateReport(results, errors);

            // Save everything
            console.log('💾 Saving all data...');
            const files = await this.saveAllData(results, mergedShips, report);

            // Final summary
            console.log('\n🎉 DATA FETCH COMPLETED SUCCESSFULLY!');
            console.log('=====================================');
            console.log(`📊 Total Ships: ${mergedShips.length}`);
            console.log(`🔗 Sources Used: ${Object.keys(results).filter(key => results[key]).join(', ')}`);
            console.log(`❌ Errors: ${errors.length}`);
            
            if (errors.length > 0) {
                console.log('\n⚠️ Errors encountered:');
                errors.forEach(error => {
                    console.log(`   - ${error.source}: ${error.error}`);
                });
            }

            console.log('\n📁 Files generated:');
            Object.entries(files).forEach(([type, filePath]) => {
                console.log(`   - ${type}: ${path.basename(filePath)}`);
            });

            return {
                success: true,
                ships: mergedShips,
                report,
                files
            };

        } catch (error) {
            console.error('💥 FATAL ERROR:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// CLI usage
if (require.main === module) {
    const fetcher = new ModernDataFetcher();
    fetcher.run();
}

module.exports = ModernDataFetcher;
