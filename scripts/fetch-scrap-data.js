const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const OUTPUT_DIR = './data/sc-ships-4.2';
const SHIP_DATA_FILE = './data/sc-ships-4.2/ships-index.json';

// Sources de données de scrap connues
const SCRAP_SOURCES = {
    // API communautaire pour les données de scrap
    scdb: 'https://api.scdb.com/v1/ships/',
    // Données de la communauté
    community: 'https://api.starcitizen-api.com/v1/ships/',
    // Repository GitHub avec données de scrap
    github: 'https://raw.githubusercontent.com/StarCitizenWiki/scunpacked-data/master/'
};

// Données de scrap estimées basées sur la taille et le type de vaisseau
const SCRAP_ESTIMATES = {
    // Facteurs de base par taille de vaisseau
    sizeFactors: {
        1: { base: 100, multiplier: 1.0 },    // Petits vaisseaux
        2: { base: 500, multiplier: 1.5 },    // Vaisseaux moyens
        3: { base: 2000, multiplier: 2.0 },   // Gros vaisseaux
        4: { base: 8000, multiplier: 3.0 },   // Très gros vaisseaux
        5: { base: 20000, multiplier: 4.0 }   // Capitaux
    },
    
    // Facteurs par fabricant (qualité des matériaux)
    manufacturerFactors: {
        'Aegis Dynamics': 1.2,      // Militaire, matériaux de qualité
        'Anvil Aerospace': 1.3,     // Militaire premium
        'Origin Jumpworks': 1.5,    // Luxe, matériaux rares
        'RSI': 1.1,                 // Standard militaire
        'MISC': 1.0,                // Standard commercial
        'Drake Interplanetary': 0.8, // Économique
        'Consolidated Outland': 0.9, // Budget
        'Argo Astronautics': 0.7,   // Industriel basique
        'Greycat Industrial': 0.6,  // Véhicules terrestres
        'Tumbril Land Systems': 0.7, // Véhicules militaires terrestres
        'Crusader Industries': 1.1,  // Qualité commerciale
        'Mirai': 1.4,               // Technologie avancée
        'Gatac Manufacture': 1.3,   // Alien tech premium
        'Esperia': 1.6,             // Répliques alien rares
        'Banu': 1.8,                // Technologie alien authentique
        'Vanduul': 2.0,             // Technologie alien de guerre
        'Xi\'an': 1.9               // Technologie alien avancée
    },
    
    // Facteurs par rôle (complexité technologique)
    roleFactors: {
        'Fighter': 1.0,
        'Interceptor': 1.1,
        'Heavy Fighter': 1.2,
        'Bomber': 1.3,
        'Stealth Fighter': 1.5,
        'Courier': 0.9,
        'Light Freight': 0.8,
        'Medium Freight': 0.9,
        'Heavy Freight': 1.0,
        'Exploration': 1.2,
        'Mining': 1.1,
        'Salvage': 1.3,
        'Medical': 1.4,
        'Refueling': 1.1,
        'Repair': 1.2,
        'Racing': 1.3,
        'Luxury': 1.6,
        'Gunship': 1.4,
        'Corvette': 1.5,
        'Frigate': 1.6,
        'Destroyer': 1.8,
        'Capital': 2.0
    }
};

// Matériaux de scrap par composant
const SCRAP_MATERIALS = {
    hull: {
        materials: ['Steel', 'Aluminum', 'Titanium', 'Tungsten'],
        basePercentage: 0.4 // 40% du scrap total
    },
    electronics: {
        materials: ['Copper', 'Gold', 'Silver', 'Rare Earth Elements'],
        basePercentage: 0.25 // 25% du scrap total
    },
    powerPlant: {
        materials: ['Uranium', 'Plutonium', 'Fusion Materials'],
        basePercentage: 0.15 // 15% du scrap total
    },
    weapons: {
        materials: ['Steel', 'Tungsten', 'Rare Alloys'],
        basePercentage: 0.1 // 10% du scrap total
    },
    misc: {
        materials: ['Plastics', 'Ceramics', 'Composite Materials'],
        basePercentage: 0.1 // 10% du scrap total
    }
};

// Fonction pour calculer la valeur de scrap estimée
function calculateScrapValue(ship) {
    const size = ship.size || 1;
    const manufacturer = ship.manufacturer || 'Unknown';
    const role = ship.role || 'Fighter';
    const mass = ship.mass || 10000;
    const health = ship.health || 1000;
    
    // Facteur de base selon la taille
    const sizeData = SCRAP_ESTIMATES.sizeFactors[size] || SCRAP_ESTIMATES.sizeFactors[1];
    let baseValue = sizeData.base;
    
    // Ajustement selon la masse (plus lourd = plus de matériaux)
    const massMultiplier = Math.log10(mass / 1000) * 0.5 + 1;
    baseValue *= massMultiplier;
    
    // Ajustement selon la santé (plus résistant = meilleurs matériaux)
    const healthMultiplier = Math.log10(health / 100) * 0.3 + 1;
    baseValue *= healthMultiplier;
    
    // Facteur fabricant
    const manufacturerFactor = SCRAP_ESTIMATES.manufacturerFactors[manufacturer] || 1.0;
    baseValue *= manufacturerFactor;
    
    // Facteur rôle
    const roleFactor = SCRAP_ESTIMATES.roleFactors[role] || 1.0;
    baseValue *= roleFactor;
    
    return Math.round(baseValue);
}

// Fonction pour générer la composition des matériaux de scrap
function generateScrapComposition(ship, totalValue) {
    const composition = {};
    
    for (const [component, data] of Object.entries(SCRAP_MATERIALS)) {
        const componentValue = Math.round(totalValue * data.basePercentage);
        const materialsPerComponent = Math.ceil(data.materials.length * Math.random() * 0.7 + 0.3);
        
        composition[component] = {
            totalValue: componentValue,
            materials: {}
        };
        
        // Distribuer la valeur entre les matériaux du composant
        const selectedMaterials = data.materials
            .sort(() => 0.5 - Math.random())
            .slice(0, materialsPerComponent);
        
        let remainingValue = componentValue;
        selectedMaterials.forEach((material, index) => {
            if (index === selectedMaterials.length - 1) {
                // Dernier matériau prend le reste
                composition[component].materials[material] = remainingValue;
            } else {
                const materialValue = Math.round(remainingValue * (Math.random() * 0.4 + 0.2));
                composition[component].materials[material] = materialValue;
                remainingValue -= materialValue;
            }
        });
    }
    
    return composition;
}

// Fonction pour télécharger des données JSON depuis une URL
function downloadJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    console.log('♻️  Début de la génération des données de scrap...');
    
    // Charger les données des vaisseaux
    let shipsData = [];
    if (fs.existsSync(SHIP_DATA_FILE)) {
        shipsData = JSON.parse(fs.readFileSync(SHIP_DATA_FILE, 'utf8'));
    } else {
        console.log('⚠️  Fichier des données de vaisseaux non trouvé. Exécutez d\'abord fetch-sc-ships-data.js');
        return;
    }
    
    const scrapData = {};
    let processedCount = 0;
    
    for (const ship of shipsData) {
        console.log(`🔧 Traitement: ${ship.name}`);
        
        // Calculer la valeur de scrap estimée
        const totalScrapValue = calculateScrapValue(ship);
        
        // Générer la composition des matériaux
        const composition = generateScrapComposition(ship, totalScrapValue);
        
        // Calculer des statistiques additionnelles
        const scrapInfo = {
            shipName: ship.name,
            className: ship.className,
            manufacturer: ship.manufacturer,
            size: ship.size,
            role: ship.role,
            mass: ship.mass,
            health: ship.health,
            scrapValue: {
                total: totalScrapValue,
                perTon: ship.mass ? Math.round(totalScrapValue / (ship.mass / 1000)) : 0,
                currency: 'aUEC' // Alpha United Earth Credits
            },
            composition: composition,
            salvageInfo: {
                estimatedSalvageTime: Math.round(totalScrapValue / 100), // minutes
                requiredSalvageShip: ship.size <= 2 ? 'Vulture' : ship.size <= 4 ? 'Reclaimer' : 'Multiple Reclaimers',
                difficulty: ship.size <= 1 ? 'Easy' : ship.size <= 3 ? 'Medium' : 'Hard',
                hazards: generateHazards(ship)
            },
            marketData: {
                demandLevel: Math.random() > 0.5 ? 'High' : 'Medium',
                priceVolatility: Math.random() > 0.7 ? 'High' : 'Low',
                bestMarkets: generateBestMarkets(ship)
            },
            lastUpdated: new Date().toISOString(),
            dataSource: 'Estimated based on ship specifications'
        };
        
        scrapData[ship.className] = scrapInfo;
        processedCount++;
    }
    
    // Sauvegarder les données de scrap
    const scrapFile = path.join(OUTPUT_DIR, 'scrap-data.json');
    fs.writeFileSync(scrapFile, JSON.stringify(scrapData, null, 2));
    
    // Créer un index simplifié pour les valeurs de scrap
    const scrapIndex = Object.values(scrapData).map(ship => ({
        className: ship.className,
        name: ship.shipName,
        manufacturer: ship.manufacturer,
        totalScrapValue: ship.scrapValue.total,
        scrapPerTon: ship.scrapValue.perTon,
        salvageTime: ship.salvageInfo.estimatedSalvageTime,
        difficulty: ship.salvageInfo.difficulty
    })).sort((a, b) => b.totalScrapValue - a.totalScrapValue);
    
    const indexFile = path.join(OUTPUT_DIR, 'scrap-index.json');
    fs.writeFileSync(indexFile, JSON.stringify(scrapIndex, null, 2));
    
    // Générer des statistiques
    const totalScrapValue = Object.values(scrapData).reduce((sum, ship) => sum + ship.scrapValue.total, 0);
    const avgScrapValue = Math.round(totalScrapValue / processedCount);
    const topScrapShips = scrapIndex.slice(0, 10);
    
    console.log(`\n✅ Génération des données de scrap terminée !`);
    console.log(`📊 Statistiques:`);
    console.log(`   - Vaisseaux traités: ${processedCount}`);
    console.log(`   - Valeur totale de scrap: ${totalScrapValue.toLocaleString()} aUEC`);
    console.log(`   - Valeur moyenne: ${avgScrapValue.toLocaleString()} aUEC`);
    console.log(`\n📁 Fichiers générés:`);
    console.log(`   - ${scrapFile} (données complètes)`);
    console.log(`   - ${indexFile} (index simplifié)`);
    
    console.log(`\n🏆 Top 5 vaisseaux par valeur de scrap:`);
    topScrapShips.slice(0, 5).forEach((ship, index) => {
        console.log(`   ${index + 1}. ${ship.name} - ${ship.totalScrapValue.toLocaleString()} aUEC`);
    });
}

// Fonction pour générer des dangers de salvage
function generateHazards(ship) {
    const hazards = [];
    
    if (ship.size >= 3) hazards.push('Structural Collapse Risk');
    if (ship.role && ship.role.includes('Fighter')) hazards.push('Unexploded Ordnance');
    if (ship.role && ship.role.includes('Mining')) hazards.push('Toxic Materials');
    if (ship.manufacturer === 'Aegis Dynamics') hazards.push('Military Encryption');
    if (ship.size >= 4) hazards.push('Radiation Exposure');
    
    return hazards.length > 0 ? hazards : ['Standard Salvage Risks'];
}

// Fonction pour générer les meilleurs marchés
function generateBestMarkets(ship) {
    const markets = [
        'Area18 - ArcCorp',
        'Lorville - Hurston',
        'New Babbage - microTech',
        'Orison - Crusader',
        'Port Olisar - Crusader',
        'Grim HEX - Yela',
        'Levski - Delamar'
    ];
    
    // Sélectionner 2-3 marchés aléatoirement
    return markets.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 2);
}

main().catch(console.error);
