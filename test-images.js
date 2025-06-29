const ShipImageScraper = require('./scrapers/images/shipImageScraper');
const shipDisplayService = require('./services/shipDisplayService');
const Database = require('./config/database');

async function testImageScraper() {
    console.log('🧪 Test du scraper d\'images et caractéristiques\n');

    try {
        // Initialiser la base de données
        console.log('1️⃣ Initialisation de la base de données...');
        const db = new Database();
        await db.init();
        console.log('✅ Base de données initialisée\n');

        // Test du scraper d'images
        console.log('2️⃣ Test du scraper d\'images...');
        const imageScraper = new ShipImageScraper();
        
        // Tester avec quelques vaisseaux populaires
        const testShips = ['Aurora MR', 'Cutlass Black', 'Avenger Titan'];
        
        for (const shipName of testShips) {
            console.log(`🔍 Test du scraping pour ${shipName}...`);
            
            try {
                const shipDetails = await imageScraper.scrapeShipDetails(shipName);
                
                if (shipDetails) {
                    console.log(`✅ Détails récupérés pour ${shipName}:`);
                    console.log(`   - Image: ${shipDetails.image ? '✅' : '❌'}`);
                    console.log(`   - Description: ${shipDetails.description ? '✅' : '❌'}`);
                    console.log(`   - Spécifications: ${Object.keys(shipDetails.specifications || {}).length} trouvées`);
                    console.log(`   - Fabricant: ${shipDetails.manufacturer || 'Non trouvé'}`);
                    console.log(`   - Catégorie: ${shipDetails.category || 'Non trouvée'}`);
                } else {
                    console.log(`❌ Aucun détail trouvé pour ${shipName}`);
                }
                
            } catch (error) {
                console.log(`❌ Erreur pour ${shipName}: ${error.message}`);
            }
            
            console.log(''); // Ligne vide pour la lisibilité
            
            // Délai entre les requêtes
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Test du service d'affichage
        console.log('3️⃣ Test du service d\'affichage...');
        
        // Créer un vaisseau de test fictif
        const testShip = {
            id: 1,
            name: 'Aurora MR',
            manufacturer: 'Roberts Space Industries',
            price: 25000,
            category: 'Starter'
        };
        
        console.log('🎨 Test de création d\'embed enrichi...');
        
        const embedData = await shipDisplayService.createShipEmbed(testShip, {
            showSpecs: true,
            showImage: true,
            showPrice: true,
            compact: false
        });
        
        console.log('✅ Embed créé avec succès:');
        console.log(`   - Embeds: ${embedData.embeds.length}`);
        console.log(`   - Fichiers attachés: ${embedData.files.length}`);
        
        if (embedData.embeds[0]) {
            const embed = embedData.embeds[0];
            console.log(`   - Titre: ${embed.data.title}`);
            console.log(`   - Champs: ${embed.data.fields?.length || 0}`);
            console.log(`   - Image: ${embed.data.image ? '✅' : '❌'}`);
        }

        // Test de comparaison
        console.log('\n4️⃣ Test de comparaison de vaisseaux...');
        
        const ship1 = {
            id: 1,
            name: 'Aurora MR',
            manufacturer: 'Roberts Space Industries',
            price: 25000,
            category: 'Starter'
        };
        
        const ship2 = {
            id: 2,
            name: 'Avenger Titan',
            manufacturer: 'Aegis Dynamics',
            price: 55000,
            category: 'Light Fighter'
        };
        
        console.log(`🔄 Comparaison ${ship1.name} vs ${ship2.name}...`);
        
        const comparisonData = await shipDisplayService.createComparisonEmbed(ship1, ship2);
        
        console.log('✅ Comparaison créée avec succès:');
        console.log(`   - Embeds: ${comparisonData.embeds.length}`);
        
        if (comparisonData.embeds[0]) {
            const embed = comparisonData.embeds[0];
            console.log(`   - Titre: ${embed.data.title}`);
            console.log(`   - Champs: ${embed.data.fields?.length || 0}`);
        }

        // Statistiques du scraper
        console.log('\n5️⃣ Statistiques du scraper...');
        const stats = imageScraper.getStats();
        console.log('📊 Statistiques:');
        console.log(`   - Vaisseaux en cache: ${stats.totalShips}`);
        console.log(`   - Avec images: ${stats.shipsWithImages}`);
        console.log(`   - Avec spécifications: ${stats.shipsWithSpecs}`);
        console.log(`   - Taille du cache: ${stats.cacheSize}`);

        console.log('\n🎉 Tous les tests sont terminés !');
        
        // Fermer la base de données
        db.close();

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error);
    }
}

// Fonction pour tester uniquement le scraping d'un vaisseau spécifique
async function testSingleShip(shipName) {
    console.log(`🧪 Test spécifique pour ${shipName}\n`);
    
    try {
        const imageScraper = new ShipImageScraper();
        
        console.log(`🔍 Scraping de ${shipName}...`);
        const shipDetails = await imageScraper.scrapeShipDetails(shipName);
        
        if (shipDetails) {
            console.log('✅ Détails récupérés:');
            console.log(JSON.stringify(shipDetails, null, 2));
        } else {
            console.log('❌ Aucun détail trouvé');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Fonction pour nettoyer le cache
async function cleanupCache() {
    console.log('🧹 Nettoyage du cache...');
    
    try {
        const imageScraper = new ShipImageScraper();
        imageScraper.cleanup(7); // Nettoyer les entrées de plus de 7 jours
        
        console.log('✅ Nettoyage terminé');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    }
}

// Exécution selon les arguments de ligne de commande
const args = process.argv.slice(2);

if (args.length > 0) {
    const command = args[0];
    
    switch (command) {
        case 'ship':
            if (args[1]) {
                testSingleShip(args[1]);
            } else {
                console.log('Usage: node test-images.js ship "Nom du vaisseau"');
            }
            break;
            
        case 'cleanup':
            cleanupCache();
            break;
            
        case 'help':
            console.log('Commandes disponibles:');
            console.log('  node test-images.js          - Lance tous les tests');
            console.log('  node test-images.js ship "Aurora MR"  - Teste un vaisseau spécifique');
            console.log('  node test-images.js cleanup  - Nettoie le cache');
            console.log('  node test-images.js help     - Affiche cette aide');
            break;
            
        default:
            console.log('Commande inconnue. Utilisez "help" pour voir les options.');
    }
} else {
    // Lancer tous les tests par défaut
    testImageScraper();
}
