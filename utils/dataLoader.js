const fs = require('fs');
const path = require('path');

class DataLoader {
    constructor() {
        // Priorité : fichier principal > fallback > données minimales intégrées
        this.dataPaths = [
            path.join(__dirname, '../data/sc-ships-4.2/all-ships-4.2.json'),
            path.join(__dirname, '../data/ships.json'),
            path.join(__dirname, '../data/ship_images.json')
        ];
        
        // Données de base en cas de problème avec tous les fichiers
        this.basicShipsData = [
            { name: "Aurora MR", manufacturer: "RSI", category: "Starter", price: 25 },
            { name: "Mustang Alpha", manufacturer: "Consolidated Outland", category: "Starter", price: 30 },
            { name: "Avenger Titan", manufacturer: "Aegis Dynamics", category: "Light Fighter", price: 70 },
            { name: "Cutlass Black", manufacturer: "Drake Interplanetary", category: "Medium Fighter", price: 115 },
            { name: "Freelancer", manufacturer: "MISC", category: "Multi-role", price: 125 },
            { name: "Constellation Andromeda", manufacturer: "RSI", category: "Large Multi-role", price: 240 }
        ];
    }

    async loadShipsData() {
        const ships = [];
        let dataLoaded = false;
        
        // Essayer chaque fichier dans l'ordre de priorité
        for (const filePath of this.dataPaths) {
            if (dataLoaded) break;
            
            try {
                if (fs.existsSync(filePath)) {
                    console.log(`📊 Tentative de chargement depuis: ${path.basename(filePath)}`);
                    const rawData = fs.readFileSync(filePath, 'utf8');
                    const shipsData = JSON.parse(rawData);
                    
                    const loadedShips = this.parseShipsData(shipsData);
                    if (loadedShips.length > 0) {
                        ships.push(...loadedShips);
                        console.log(`✅ ${ships.length} vaisseaux chargés depuis ${path.basename(filePath)}`);
                        dataLoaded = true;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Erreur lors du chargement de ${path.basename(filePath)}: ${error.message}`);
            }
        }
        
        // Si aucun fichier n'a fonctionné, utiliser les données de base
        if (!dataLoaded) {
            console.log('📊 Utilisation des données de base intégrées');
            ships.push(...this.basicShipsData);
        }
        
        return ships;
    }

    parseShipsData(shipsData) {
        const ships = [];
        
        try {
            if (Array.isArray(shipsData)) {
                // Format direct
                ships.push(...shipsData);
            } else if (shipsData.ships) {
                // Format avec propriété ships
                ships.push(...shipsData.ships);
            } else if (typeof shipsData === 'object') {
                // Format objet, convertir en array
                for (const [key, ship] of Object.entries(shipsData)) {
                    if (ship && typeof ship === 'object') {
                        ships.push({
                            name: ship.name || key,
                            manufacturer: ship.manufacturer || 'Unknown',
                            category: ship.category || ship.type || 'Ship',
                            price: ship.price || ship.pledge_cost || null,
                            ...ship
                        });
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors du parsing des données:', error.message);
        }
        
        return ships;
    }

    async populateDatabase(database) {
        console.log('🔄 Population de la base de données avec les données locales...');
        
        try {
            // S'assurer que la base de données est initialisée
            await database.ensureInitialized();
            
            const ships = await this.loadShipsData();
            let insertedCount = 0;
            
            for (const ship of ships) {
                try {
                    if (ship.name && ship.name.trim()) {
                        await database.insertShip(
                            ship.name.trim(),
                            ship.price || null,
                            ship.manufacturer || null,
                            ship.category || 'Ship'
                        );
                        insertedCount++;
                    }
                } catch (error) {
                    // Ignorer les erreurs de doublons (UNIQUE constraint)
                    if (!error.message.includes('UNIQUE constraint failed')) {
                        console.warn(`⚠️ Erreur insertion ${ship.name}:`, error.message);
                    }
                }
            }
            
            console.log(`✅ ${insertedCount} vaisseaux insérés/mis à jour dans la base de données`);
            return insertedCount;
            
        } catch (error) {
            console.error('❌ Erreur lors de la population de la base de données:', error.message);
            // Ne pas faire échouer tout le démarrage
            return 0;
        }
    }
}

module.exports = DataLoader;
