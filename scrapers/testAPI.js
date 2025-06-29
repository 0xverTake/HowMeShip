const UpgradeNavigatorAPI = require('./upgradeNavigatorAPI');

async function testAPI() {
    console.log('🧪 TEST SIMPLE DE L\'API');
    console.log('='.repeat(30));
    
    const api = new UpgradeNavigatorAPI();
    
    try {
        // Test 1: Vaisseaux
        console.log('1. Test vaisseaux...');
        const ships = await api.getShips();
        console.log(`Résultat: ${ships.length} vaisseaux`);
        
        if (ships.length > 0) {
            console.log('Premier vaisseau:', ships[0]);
        }
        
        // Test 2: Magasins
        console.log('2. Test magasins...');
        const stores = await api.getStores();
        console.log(`Résultat: ${stores.length} magasins`);
        console.log('Magasins:', stores);
        
        // Test 3: Stats
        console.log('3. Stats API...');
        const stats = api.getStats();
        console.log('Stats:', stats);
        
        console.log('✅ Tests terminés avec succès!');
        
    } catch (error) {
        console.log('❌ Erreur:', error.message);
    }
}

testAPI();
