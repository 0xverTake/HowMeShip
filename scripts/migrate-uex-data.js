const fs = require('fs');
const path = require('path');
const Database = require('../config/database');

/**
 * Script pour migrer les données UEX Corp vers la base de données SQLite
 */
class UexDataMigrator {
    constructor() {
        this.database = Database.getInstance();
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
            const modulesPath = path.join(__dirname, '../data/modules_uex_corp.json');
            
            const ships = JSON.parse(fs.readFileSync(shipsPath, 'utf8'));
            const modules = JSON.parse(fs.readFileSync(modulesPath, 'utf8'));
            
            console.log(`Chargé ${ships.length} vaisseaux et ${modules.length} modules depuis UEX Corp`);
            
            return { ships, modules };
        } catch (error) {
            console.error('Erreur lors du chargement des données UEX Corp:', error);
            throw error;
        }
    }

    /**
     * Vide la table ships avant migration
     */
    async clearShipsTable() {
        return new Promise((resolve, reject) => {
            this.database.db.run('DELETE FROM ships', (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Table ships vidée');
                    resolve();
                }
            });
        });
    }

    /**
     * Insère un vaisseau dans la base de données
     */
    async insertShip(ship) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO ships 
                (name, normalized_name, base_price, manufacturer, category, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            // Extraire le prix depuis le store ou mettre null
            let basePrice = null;
            if (ship.store && ship.store.price) {
                basePrice = ship.store.price;
            }
            
            // Déterminer la catégorie principale
            let category = 'Unknown';
            if (ship.categories && ship.categories.length > 0) {
                // Prendre la première catégorie qui n'est pas "Spaceship"
                category = ship.categories.find(cat => cat !== 'Spaceship') || ship.categories[0];
            }
            
            const values = [
                ship.fullName || ship.name,
                this.normalizeName(ship.fullName || ship.name),
                basePrice,
                ship.manufacturer,
                category
            ];
            
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
     * Migre tous les vaisseaux UEX Corp
     */
    async migrateShips(ships) {
        console.log('Début de la migration des vaisseaux...');
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const ship of ships) {
            try {
                await this.insertShip(ship);
                successCount++;
                
                if (successCount % 50 === 0) {
                    console.log(`Migré ${successCount}/${ships.length} vaisseaux...`);
                }
            } catch (error) {
                console.error(`Erreur lors de l'insertion de ${ship.name}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`Migration terminée: ${successCount} succès, ${errorCount} erreurs`);
        return { successCount, errorCount };
    }

    /**
     * Exécute la migration complète
     */
    async migrate() {
        try {
            console.log('Initialisation de la base de données...');
            await this.database.ensureInitialized();
            
            console.log('Chargement des données UEX Corp...');
            const { ships, modules } = this.loadUexData();
            
            console.log('Vidage de l\'ancienne table ships...');
            await this.clearShipsTable();
            
            console.log('Migration des nouveaux vaisseaux...');
            const result = await this.migrateShips(ships);
            
            // Vérification finale
            const shipCount = await this.database.getShipCount();
            console.log(`\n=== MIGRATION TERMINÉE ===`);
            console.log(`Vaisseaux en base: ${shipCount}`);
            console.log(`Succès: ${result.successCount}`);
            console.log(`Erreurs: ${result.errorCount}`);
            
            return result;
        } catch (error) {
            console.error('Erreur lors de la migration:', error);
            throw error;
        }
    }
}

// Exécution si appelé directement
if (require.main === module) {
    const migrator = new UexDataMigrator();
    migrator.migrate()
        .then(() => {
            console.log('Migration réussie !');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Échec de la migration:', error);
            process.exit(1);
        });
}

module.exports = UexDataMigrator;
