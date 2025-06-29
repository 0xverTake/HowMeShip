require('dotenv').config();
const Database = require('./config/database');
const RSIScraper = require('./scrapers/rsiScraper');

async function testBot() {
    console.log('🧪 Test du bot Star Citizen Upgrade Navigator\n');
    
    try {
        // Test 1: Base de données
        console.log('1️⃣ Test de la base de données...');
        const database = new Database();
        await database.init();
        console.log('✅ Base de données initialisée avec succès\n');
        
        // Test 2: Insertion de vaisseaux de test
        console.log('2️⃣ Test d\'insertion de vaisseaux...');
        await database.insertShip('Aurora MR', 25, 'RSI', 'Starter');
        await database.insertShip('Mustang Alpha', 30, 'Consolidated Outland', 'Starter');
        await database.insertShip('Avenger Titan', 70, 'Aegis Dynamics', 'Fighter');
        console.log('✅ Vaisseaux de test insérés\n');
        
        // Test 3: Recherche de vaisseaux
        console.log('3️⃣ Test de recherche de vaisseaux...');
        const ships = await database.searchShips('aurora');
        console.log(`✅ Trouvé ${ships.length} vaisseau(x) avec "aurora":`);
        ships.forEach(ship => {
            console.log(`   - ${ship.name} (${ship.manufacturer}) - $${ship.base_price}`);
        });
        console.log('');
        
        // Test 4: Insertion d'upgrades de test
        console.log('4️⃣ Test d\'insertion d\'upgrades...');
        const auroraShip = await database.getShipByName('Aurora MR');
        const avengerShip = await database.getShipByName('Avenger Titan');
        
        if (auroraShip && avengerShip) {
            await database.insertUpgrade(
                auroraShip.id, 
                avengerShip.id, 
                'RSI', 
                45, 
                'USD', 
                'Available', 
                'https://robertsspaceindustries.com/pledge/Upgrades/Aurora-MR-To-Avenger-Titan-Upgrade'
            );
            console.log('✅ Upgrade de test inséré (Aurora MR -> Avenger Titan)\n');
        }
        
        // Test 5: Recherche d'upgrades
        console.log('5️⃣ Test de recherche d\'upgrades...');
        if (auroraShip && avengerShip) {
            const upgrades = await database.getUpgrades(auroraShip.id, avengerShip.id);
            console.log(`✅ Trouvé ${upgrades.length} upgrade(s):`);
            upgrades.forEach(upgrade => {
                console.log(`   - ${upgrade.from_ship_name} -> ${upgrade.to_ship_name}: $${upgrade.price} (${upgrade.store})`);
            });
            console.log('');
        }
        
        // Test 6: Scraper RSI (test basique)
        console.log('6️⃣ Test du scraper RSI...');
        const rsiScraper = new RSIScraper();
        const knownShips = rsiScraper.getKnownShips();
        console.log(`✅ Scraper RSI initialisé avec ${knownShips.length} vaisseaux connus\n`);
        
        // Test 7: Insertion des vaisseaux connus
        console.log('7️⃣ Test d\'insertion des vaisseaux connus...');
        for (const ship of knownShips.slice(0, 5)) { // Limiter à 5 pour le test
            await database.insertShip(ship.name, ship.price, ship.manufacturer, ship.category);
        }
        console.log('✅ 5 premiers vaisseaux connus insérés\n');
        
        // Test 8: Statistiques finales
        console.log('8️⃣ Statistiques finales...');
        const allShips = await database.getAllShips();
        console.log(`✅ Total de vaisseaux en base: ${allShips.length}`);
        
        const manufacturers = [...new Set(allShips.map(s => s.manufacturer).filter(Boolean))];
        console.log(`✅ Fabricants: ${manufacturers.join(', ')}`);
        
        const categories = [...new Set(allShips.map(s => s.category).filter(Boolean))];
        console.log(`✅ Catégories: ${categories.join(', ')}\n`);
        
        // Fermer la base de données
        database.close();
        
        console.log('🎉 Tous les tests sont passés avec succès !');
        console.log('\n📋 Prochaines étapes:');
        console.log('1. Créer un bot Discord sur https://discord.com/developers/applications');
        console.log('2. Copier le token dans le fichier .env');
        console.log('3. Inviter le bot sur votre serveur');
        console.log('4. Lancer le bot avec: npm start');
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
        process.exit(1);
    }
}

// Lancer les tests
testBot();
