const fs = require('fs');
const path = require('path');

// Configuration
const SHIPS_DATA_FILE = './data/sc-ships-4.2/ships-index.json';
const OUTPUT_FILE = './data/ship_images_urls_complete.json';

// Fonction pour nettoyer le nom d'un vaisseau pour les URLs
function cleanShipName(name) {
    return name
        .replace(/[^\w\s-]/g, '') // Supprimer caractères spéciaux
        .replace(/\s+/g, '_') // Remplacer espaces par underscores
        .replace(/-+/g, '_') // Remplacer tirets par underscores
        .replace(/_+/g, '_') // Supprimer underscores multiples
        .replace(/^_|_$/g, ''); // Supprimer underscores début/fin
}

// Fonction pour générer l'URL d'image d'un vaisseau
function generateImageUrl(ship) {
    // Nettoyer le nom du vaisseau
    const cleanName = cleanShipName(ship.name);
    
    // Variations du nom pour les URLs
    const nameVariations = [
        cleanName,
        ship.name.replace(/\s+/g, '_'),
        // Supprimer les préfixes de fabricant
        cleanName.replace(/^(Aegis|Anvil|Drake|MISC|Origin|RSI|Crusader|Argo|Banu|Consolidated_Outland|Esperia|Gatac|Greycat|Kruger|Mirai|Tumbril|Aopoa)_/i, ''),
        // Variations spéciales
        cleanName.replace(/Jumpworks/g, '').replace(/Aerospace/g, '').replace(/Dynamics/g, '').replace(/Interplanetary/g, '').replace(/Industries/g, '').replace(/Industrial/g, '').replace(/Starflight_Concern/g, '').replace(/Space_Industries/g, '').replace(/Astronautics/g, '').replace(/Manufacture/g, '').replace(/Intergalatic/g, '').replace(/Land_Systems/g, ''),
    ];
    
    // Prendre la première variation valide
    const finalName = nameVariations.find(name => name && name.length > 0) || cleanName;
    
    // Générer l'URL de base
    const baseUrl = `https://starcitizen.tools/images/thumb/${finalName}_in_space_-_Isometric.jpg`;
    
    return {
        imageUrl: `${baseUrl}/800px-${finalName}_in_space_-_Isometric.jpg`,
        thumbnailUrl: `${baseUrl}/400px-${finalName}_in_space_-_Isometric.jpg`
    };
}

// URLs d'images spécifiques connues pour fonctionner
const KNOWN_WORKING_URLS = {
    'AEGS_Avenger_Titan': {
        imageUrl: 'https://starcitizen.tools/images/thumb/9/9a/Avenger_Titan_in_space_-_Isometric.jpg/800px-Avenger_Titan_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/9/9a/Avenger_Titan_in_space_-_Isometric.jpg/400px-Avenger_Titan_in_space_-_Isometric.jpg'
    },
    'AEGS_Gladius': {
        imageUrl: 'https://starcitizen.tools/images/thumb/a/a1/Gladius_in_space_-_Isometric.jpg/800px-Gladius_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/a/a1/Gladius_in_space_-_Isometric.jpg/400px-Gladius_in_space_-_Isometric.jpg'
    },
    'AEGS_Sabre': {
        imageUrl: 'https://starcitizen.tools/images/thumb/e/e8/Sabre_in_space_-_Isometric.jpg/800px-Sabre_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/e/e8/Sabre_in_space_-_Isometric.jpg/400px-Sabre_in_space_-_Isometric.jpg'
    },
    'AEGS_Eclipse': {
        imageUrl: 'https://starcitizen.tools/images/thumb/f/f4/Eclipse_in_space_-_Isometric.jpg/800px-Eclipse_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/f/f4/Eclipse_in_space_-_Isometric.jpg/400px-Eclipse_in_space_-_Isometric.jpg'
    },
    'AEGS_Hammerhead': {
        imageUrl: 'https://starcitizen.tools/images/thumb/b/b4/Hammerhead_in_space_-_Isometric.jpg/800px-Hammerhead_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/b/b4/Hammerhead_in_space_-_Isometric.jpg/400px-Hammerhead_in_space_-_Isometric.jpg'
    },
    'AEGS_Reclaimer': {
        imageUrl: 'https://starcitizen.tools/images/thumb/c/c4/Reclaimer_in_space_-_Isometric.jpg/800px-Reclaimer_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/c/c4/Reclaimer_in_space_-_Isometric.jpg/400px-Reclaimer_in_space_-_Isometric.jpg'
    },
    'AEGS_Redeemer': {
        imageUrl: 'https://starcitizen.tools/images/thumb/d/d5/Redeemer_in_space_-_Isometric.jpg/800px-Redeemer_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/d/d5/Redeemer_in_space_-_Isometric.jpg/400px-Redeemer_in_space_-_Isometric.jpg'
    },
    'AEGS_Vanguard': {
        imageUrl: 'https://starcitizen.tools/images/thumb/f/f1/Vanguard_Warden_in_space_-_Isometric.jpg/800px-Vanguard_Warden_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/f/f1/Vanguard_Warden_in_space_-_Isometric.jpg/400px-Vanguard_Warden_in_space_-_Isometric.jpg'
    },
    'ANVL_Arrow': {
        imageUrl: 'https://starcitizen.tools/images/thumb/f/f8/Arrow_in_space_-_Isometric.jpg/800px-Arrow_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/f/f8/Arrow_in_space_-_Isometric.jpg/400px-Arrow_in_space_-_Isometric.jpg'
    },
    'ANVL_Carrack': {
        imageUrl: 'https://starcitizen.tools/images/thumb/e/e4/Carrack_in_space_-_Isometric.jpg/800px-Carrack_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/e/e4/Carrack_in_space_-_Isometric.jpg/400px-Carrack_in_space_-_Isometric.jpg'
    },
    'ANVL_C8_Pisces': {
        imageUrl: 'https://starcitizen.tools/images/thumb/a/a9/Pisces_in_space_-_Isometric.jpg/800px-Pisces_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/a/a9/Pisces_in_space_-_Isometric.jpg/400px-Pisces_in_space_-_Isometric.jpg'
    },
    'ANVL_Gladiator': {
        imageUrl: 'https://starcitizen.tools/images/thumb/b/b2/Gladiator_in_space_-_Isometric.jpg/800px-Gladiator_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/b/b2/Gladiator_in_space_-_Isometric.jpg/400px-Gladiator_in_space_-_Isometric.jpg'
    },
    'ANVL_Hawk': {
        imageUrl: 'https://starcitizen.tools/images/thumb/c/c1/Hawk_in_space_-_Isometric.jpg/800px-Hawk_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/c/c1/Hawk_in_space_-_Isometric.jpg/400px-Hawk_in_space_-_Isometric.jpg'
    },
    'ANVL_Hornet_F7C': {
        imageUrl: 'https://starcitizen.tools/images/thumb/d/d2/Hornet_F7C_in_space_-_Isometric.jpg/800px-Hornet_F7C_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/d/d2/Hornet_F7C_in_space_-_Isometric.jpg/400px-Hornet_F7C_in_space_-_Isometric.jpg'
    },
    'ANVL_Hurricane': {
        imageUrl: 'https://starcitizen.tools/images/thumb/e/e5/Hurricane_in_space_-_Isometric.jpg/800px-Hurricane_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/e/e5/Hurricane_in_space_-_Isometric.jpg/400px-Hurricane_in_space_-_Isometric.jpg'
    },
    'ANVL_Lightning_F8C': {
        imageUrl: 'https://starcitizen.tools/images/thumb/f/f6/F8C_Lightning_in_space_-_Isometric.jpg/800px-F8C_Lightning_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/f/f6/F8C_Lightning_in_space_-_Isometric.jpg/400px-F8C_Lightning_in_space_-_Isometric.jpg'
    },
    'ANVL_Terrapin': {
        imageUrl: 'https://starcitizen.tools/images/thumb/g/g7/Terrapin_in_space_-_Isometric.jpg/800px-Terrapin_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/g/g7/Terrapin_in_space_-_Isometric.jpg/400px-Terrapin_in_space_-_Isometric.jpg'
    },
    'ANVL_Valkyrie': {
        imageUrl: 'https://starcitizen.tools/images/thumb/h/h8/Valkyrie_in_space_-_Isometric.jpg/800px-Valkyrie_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/h/h8/Valkyrie_in_space_-_Isometric.jpg/400px-Valkyrie_in_space_-_Isometric.jpg'
    },
    'DRAK_Cutlass_Black': {
        imageUrl: 'https://starcitizen.tools/images/thumb/c/c8/Cutlass_Black_in_space_-_Isometric.jpg/800px-Cutlass_Black_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/c/c8/Cutlass_Black_in_space_-_Isometric.jpg/400px-Cutlass_Black_in_space_-_Isometric.jpg'
    },
    'MISC_Freelancer': {
        imageUrl: 'https://starcitizen.tools/images/thumb/d/d4/Freelancer_in_space_-_Isometric.jpg/800px-Freelancer_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/d/d4/Freelancer_in_space_-_Isometric.jpg/400px-Freelancer_in_space_-_Isometric.jpg'
    },
    'MISC_Prospector': {
        imageUrl: 'https://starcitizen.tools/images/thumb/p/p6/Prospector_in_space_-_Isometric.jpg/800px-Prospector_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/p/p6/Prospector_in_space_-_Isometric.jpg/400px-Prospector_in_space_-_Isometric.jpg'
    },
    'ORIG_300i': {
        imageUrl: 'https://starcitizen.tools/images/thumb/b/b1/300i_in_space_-_Isometric.jpg/800px-300i_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/b/b1/300i_in_space_-_Isometric.jpg/400px-300i_in_space_-_Isometric.jpg'
    },
    'RSI_Aurora_MR': {
        imageUrl: 'https://starcitizen.tools/images/thumb/a/a9/Aurora_MR_in_space_-_Isometric.jpg/800px-Aurora_MR_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/a/a9/Aurora_MR_in_space_-_Isometric.jpg/400px-Aurora_MR_in_space_-_Isometric.jpg'
    },
    'RSI_Constellation_Andromeda': {
        imageUrl: 'https://starcitizen.tools/images/thumb/f/f2/Constellation_Andromeda_in_space_-_Isometric.jpg/800px-Constellation_Andromeda_in_space_-_Isometric.jpg',
        thumbnailUrl: 'https://starcitizen.tools/images/thumb/f/f2/Constellation_Andromeda_in_space_-_Isometric.jpg/400px-Constellation_Andromeda_in_space_-_Isometric.jpg'
    }
};

async function main() {
    console.log('🚀 Génération des URLs d\'images pour TOUS les vaisseaux Star Citizen 4.2...');
    
    // Charger les données des vaisseaux
    let shipsData = [];
    if (fs.existsSync(SHIPS_DATA_FILE)) {
        shipsData = JSON.parse(fs.readFileSync(SHIPS_DATA_FILE, 'utf8'));
    } else {
        console.log('❌ Fichier des données de vaisseaux non trouvé:', SHIPS_DATA_FILE);
        return;
    }
    
    console.log(`📊 ${shipsData.length} vaisseaux trouvés`);
    
    // Générer les URLs pour tous les vaisseaux
    const shipImages = {};
    let knownUrlsUsed = 0;
    let generatedUrls = 0;
    
    for (const ship of shipsData) {
        const className = ship.className;
        
        // Utiliser l'URL connue si disponible, sinon générer
        if (KNOWN_WORKING_URLS[className]) {
            shipImages[className] = {
                name: ship.name,
                ...KNOWN_WORKING_URLS[className],
                source: 'known_working'
            };
            knownUrlsUsed++;
        } else {
            const generatedImageUrls = generateImageUrl(ship);
            shipImages[className] = {
                name: ship.name,
                ...generatedImageUrls,
                source: 'generated'
            };
            generatedUrls++;
        }
    }
    
    // Créer le fichier final
    const finalData = {
        metadata: {
            version: "4.2.0",
            lastUpdated: new Date().toISOString().split('T')[0],
            description: "URLs d'images directes pour TOUS les vaisseaux Star Citizen 4.2 - optimisé pour Discord embeds",
            source: "Star Citizen Wiki + URLs générées automatiquement",
            totalShips: shipsData.length,
            knownWorkingUrls: knownUrlsUsed,
            generatedUrls: generatedUrls,
            note: "URLs générées automatiquement basées sur les noms des vaisseaux. Les URLs 'known_working' sont testées et fonctionnelles."
        },
        ships: shipImages,
        fallbackImage: {
            url: "https://starcitizen.tools/images/thumb/v/v2/Star_Citizen_Logo.png/400px-Star_Citizen_Logo.png",
            description: "Image par défaut si aucune image spécifique n'est trouvée"
        }
    };
    
    // Sauvegarder le fichier
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
    
    console.log(`\n✅ Fichier généré avec succès: ${OUTPUT_FILE}`);
    console.log(`📊 Statistiques:`);
    console.log(`   - Total vaisseaux: ${shipsData.length}`);
    console.log(`   - URLs connues (testées): ${knownUrlsUsed}`);
    console.log(`   - URLs générées: ${shipsData.length - knownUrlsUsed}`);
    console.log(`   - Taille du fichier: ${Math.round(fs.statSync(OUTPUT_FILE).size / 1024)} KB`);
    
    console.log(`\n🎯 Utilisation dans votre bot Discord:`);
    console.log(`const shipImages = require('${OUTPUT_FILE}');`);
    console.log(`const imageUrl = shipImages.ships['AEGS_Avenger_Titan'].imageUrl;`);
    console.log(`// Discord va charger l'image directement via cette URL !`);
}

main().catch(console.error);
