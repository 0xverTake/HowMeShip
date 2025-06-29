const Database = require('../config/database');

/**
 * Test de l'autocomplétion avec les nouvelles données
 */
async function testAutocomplete() {
    try {
        const database = Database.getInstance();
        await database.ensureInitialized();
        
        console.log('=== TEST AUTOCOMPLÉTION ===\n');
        
        // Test de recherches courantes
        const testQueries = [
            'aurora',
            'cutlass',
            'hornet',
            'freelancer',
            'constellation',
            'avenger',
            'gladius',
            'sabre',
            'vanguard',
            'carrack'
        ];
        
        for (const query of testQueries) {
            console.log(`Recherche: "${query}"`);
            const results = await database.searchShips(query, 10);
            
            if (results.length > 0) {
                console.log(`  Trouvé ${results.length} résultat(s):`);
                results.forEach((ship, index) => {
                    console.log(`    ${index + 1}. ${ship.name}`);
                });
            } else {
                console.log(`  Aucun résultat trouvé`);
            }
            console.log('');
        }
        
        // Statistiques globales
        const totalShips = await database.getShipCount();
        console.log(`\n=== STATISTIQUES ===`);
        console.log(`Total vaisseaux en base: ${totalShips}`);
        
        // Test de quelques vaisseaux spécifiques
        console.log(`\n=== VAISSEAUX SPÉCIFIQUES ===`);
        const specificTests = ['Avenger Titan', 'Cutlass Black', 'Aurora MR'];
        
        for (const shipName of specificTests) {
            const ship = await database.getShipByName(shipName);
            if (ship) {
                console.log(`✓ ${shipName}: Trouvé (${ship.manufacturer})`);
            } else {
                console.log(`✗ ${shipName}: Non trouvé`);
            }
        }
        
        console.log('\n=== TEST TERMINÉ ===');
        
    } catch (error) {
        console.error('Erreur lors du test:', error);
    }
}

if (require.main === module) {
    testAutocomplete();
}

module.exports = testAutocomplete;
