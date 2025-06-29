const fs = require('fs');
const path = require('path');
const Database = require('../config/database');

/**
 * Script pour migrer les données UEX Corp complètes vers la base de données SQLite
 */
class EnhancedUexDataMigrator {
    constructor() {
        this.database = new Database();
    }

    /**
     * S'assurer que la base de données est initialisée
     */
    async ensureInitialized() {
        await this.database.ensureInitialized();
    }

    /**
     * Normalise un nom de vaisseau pour la recherche
     */
    normalizeName(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Charge les données UEX Corp
     */
    loadUexData() {
        try {
            const shipsPath = path.join(__dirname, '../data/ships_uex_corp.json');
            const ships = JSON.parse(fs.readFileSync(shipsPath, 'utf8'));
            
            console.log(`Chargé ${ships.length} vaisseaux depuis UEX Corp`);
            return ships;
        } catch (error) {
            console.error('Erreur lors du chargement des données UEX Corp:', error);
            throw error;
        }
    }

    /**
     * Crée la table ships étendue avec toutes les colonnes nécessaires
     */
    async createExtendedShipsTable() {
        await this.ensureInitialized();
        
        const sql = `
            CREATE TABLE IF NOT EXISTS ships_extended (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                full_name TEXT,
                normalized_name TEXT,
                manufacturer TEXT,
                manufacturer_name TEXT,
                slug TEXT,
                uuid TEXT UNIQUE,
                game_version TEXT,
                
                -- Dimensions
                length REAL,
                width REAL,
                height REAL,
                mass REAL,
                
                -- Équipage
                min_crew INTEGER,
                max_crew INTEGER,
                
                -- Fret
                cargo_capacity INTEGER,
                
                -- Carburant
                quantum_fuel REAL,
                hydrogen_fuel REAL,
                
                -- Catégories
                category TEXT,
                career TEXT,
                role TEXT,
                size TEXT,
                production_status TEXT,
                
                -- Landing pad
                landing_pad TEXT,
                
                -- Prix
                price_standalone INTEGER,
                price_warbond INTEGER,
                
                -- Performance
                scm_speed REAL,
                afterburner_speed REAL,
                pitch_max REAL,
                yaw_max REAL,
                roll_max REAL,
                
                -- Combat
                shield_hp INTEGER,
                hull_hp INTEGER,
                
                -- Store info
                store_available BOOLEAN,
                store_url TEXT,
                brochure_url TEXT,
                video_url TEXT,
                
                -- Metadata
                description TEXT,
                uex_id TEXT,
                date_added TEXT,
                date_modified TEXT,
                source TEXT,
                source_url TEXT,
                
                -- Images (JSON)
                images TEXT,
                
                -- Internal
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        return new Promise((resolve, reject) => {
            this.database.db.run(sql, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Table ships_extended créée');
                    resolve();
                }
            });
        });
    }

    /**
     * Migre un vaisseau UEX Corp vers la base de données
     */
    async migrateShip(ship) {
        await this.ensureInitialized();
        
        const sql = `
            INSERT OR REPLACE INTO ships_extended (
                name, full_name, normalized_name, manufacturer, manufacturer_name,
                slug, uuid, game_version,
                length, width, height, mass,
                min_crew, max_crew, cargo_capacity,
                quantum_fuel, hydrogen_fuel,
                category, landing_pad,
                store_available, store_url, brochure_url, video_url,
                description, uex_id, date_added, date_modified,
                source, source_url, images
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            ship.name || ship.fullName,
            ship.fullName || ship.name,
            this.normalizeName(ship.fullName || ship.name),
            ship.manufacturer,
            ship.manufacturer, // manufacturer_name same as manufacturer for UEX data
            ship.slug,
            ship.uuid,
            ship.gameVersion,
            
            // Dimensions
            ship.dimensions?.length,
            ship.dimensions?.width,
            ship.dimensions?.height,
            ship.mass,
            
            // Équipage
            ship.crew?.min,
            ship.crew?.max,
            ship.cargo?.scu,
            
            // Carburant
            ship.fuel?.quantum,
            ship.fuel?.hydrogen,
            
            // Catégorie principale
            ship.categories?.[0] || 'Unknown',
            ship.landingPad,
            
            // Store
            ship.store?.available || false,
            ship.store?.url,
            ship.store?.brochureUrl,
            ship.store?.videoUrl,
            
            // Metadata
            ship.description || null,
            ship.uuid, // Using UUID as UEX ID
            ship.dateAdded,
            ship.dateModified,
            ship.source || 'UEX Corp API',
            ship.sourceUrl || 'https://uexcorp.space/',
            
            // Images as JSON
            ship.store?.images ? JSON.stringify(ship.store.images) : null
        ];

        return new Promise((resolve, reject) => {
            this.database.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Met à jour la table ships originale pour compatibilité
     */
    async updateOriginalShipsTable() {
        await this.ensureInitialized();
        
        const sql = `
            INSERT OR REPLACE INTO ships (
                name, normalized_name, base_price, manufacturer, category
            )
            SELECT 
                full_name as name,
                normalized_name,
                price_standalone as base_price,
                manufacturer,
                category
            FROM ships_extended
        `;
        
        return new Promise((resolve, reject) => {
            this.database.db.run(sql, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Table ships mise à jour pour compatibilité');
                    resolve();
                }
            });
        });
    }

    /**
     * Met à jour le service de base de données pour utiliser la table étendue
     */
    async updateDatabaseService() {
        // Modifier la méthode getShipByName pour utiliser la table étendue
        this.database.getShipByNameExtended = function(name) {
            return new Promise((resolve, reject) => {
                const normalizedName = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
                
                const sql = `
                    SELECT * FROM ships_extended 
                    WHERE normalized_name LIKE ? 
                       OR name LIKE ? 
                       OR full_name LIKE ?
                    ORDER BY 
                        CASE 
                            WHEN normalized_name = ? THEN 1
                            WHEN normalized_name LIKE ? THEN 2
                            ELSE 3
                        END
                    LIMIT 1
                `;
                
                const searchTerm = `%${normalizedName}%`;
                
                this.db.get(sql, [searchTerm, searchTerm, searchTerm, normalizedName, `${normalizedName}%`], (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        // Parse JSON fields
                        if (row && row.images) {
                            try {
                                row.images = JSON.parse(row.images);
                            } catch (e) {
                                row.images = [];
                            }
                        }
                        resolve(row);
                    }
                });
            });
        };
    }

    /**
     * Execute la migration complète
     */
    async migrate() {
        try {
            console.log('🚀 Démarrage de la migration UEX Corp étendue...');
            
            // Créer la table étendue
            await this.createExtendedShipsTable();
            
            // Charger les données
            const ships = this.loadUexData();
            
            console.log(`📦 Migration de ${ships.length} vaisseaux...`);
            
            let migratedCount = 0;
            let errorCount = 0;
            
            for (const ship of ships) {
                try {
                    await this.migrateShip(ship);
                    migratedCount++;
                    
                    if (migratedCount % 50 === 0) {
                        console.log(`📊 ${migratedCount}/${ships.length} vaisseaux migrés...`);
                    }
                } catch (error) {
                    console.error(`❌ Erreur migration ${ship.name}:`, error.message);
                    errorCount++;
                }
            }
            
            // Mettre à jour la table originale pour compatibilité
            await this.updateOriginalShipsTable();
            
            // Mettre à jour le service de base de données
            await this.updateDatabaseService();
            
            console.log('✅ Migration terminée!');
            console.log(`📈 ${migratedCount} vaisseaux migrés avec succès`);
            console.log(`❌ ${errorCount} erreurs`);
            
            // Test avec le Polaris
            console.log('\n🧪 Test avec le Polaris...');
            const polaris = await this.database.getShipByNameExtended('Polaris');
            if (polaris) {
                console.log('✅ Polaris trouvé avec données complètes:');
                console.log(`   - Nom: ${polaris.full_name}`);
                console.log(`   - Dimensions: ${polaris.length}x${polaris.width}x${polaris.height}m`);
                console.log(`   - Équipage: ${polaris.min_crew}-${polaris.max_crew}`);
                console.log(`   - Fret: ${polaris.cargo_capacity} SCU`);
                console.log(`   - Images: ${polaris.images ? polaris.images.length : 0} disponibles`);
            } else {
                console.log('❌ Polaris non trouvé après migration');
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la migration:', error);
            throw error;
        }
    }
}

// Exécuter la migration si appelé directement
if (require.main === module) {
    const migrator = new EnhancedUexDataMigrator();
    migrator.migrate()
        .then(() => {
            console.log('🎉 Migration complétée avec succès!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Échec de la migration:', error);
            process.exit(1);
        });
}

module.exports = EnhancedUexDataMigrator;
