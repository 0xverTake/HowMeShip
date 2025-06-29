const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const OUTPUT_DIR = './data/sc-ships-4.2';
const IMAGES_DIR = './data/sc-ships-4.2/images';
const SHIP_DATA_FILE = './data/sc-ships-4.2/ships-index.json';

// Sources d'images connues pour Star Citizen
const IMAGE_SOURCES = {
    // Star Citizen Wiki officiel
    wiki: 'https://starcitizen.tools/images/',
    // Repository d'images communautaires
    scdb: 'https://www.starship42.com/fleetview/images/',
    // Images officielles RSI
    rsi: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/',
    // Images de la communauté
    community: 'https://dto9r5vaiz7bu.cloudfront.net/ships/'
};

// Mapping des noms de vaisseaux vers les URLs d'images connues
const SHIP_IMAGE_MAPPING = {
    // Aegis Dynamics
    'AEGS_Avenger_Titan': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/avenger_titan_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Avenger_Titan_Piece_4_Promo_191125_CC_v002a.jpg',
        hangar: 'https://dto9r5vaiz7bu.cloudfront.net/ships/avenger_titan_hangar.jpg'
    },
    'AEGS_Avenger_Stalker': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/avenger_stalker_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Avenger_Stalker_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Avenger_Warlock': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/avenger_warlock_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Avenger_Warlock_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Gladius': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/gladius_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Gladius_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Sabre': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/sabre_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Sabre_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Eclipse': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/eclipse_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Eclipse_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Hammerhead': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/hammerhead_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Hammerhead_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Reclaimer': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/reclaimer_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Reclaimer_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Redeemer': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/redeemer_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Redeemer_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Retaliator': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/retaliator_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Retaliator_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Vanguard': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/vanguard_warden_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Vanguard_Warden_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Vanguard_Harbinger': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/vanguard_harbinger_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Vanguard_Harbinger_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Vanguard_Sentinel': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/vanguard_sentinel_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Vanguard_Sentinel_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'AEGS_Vanguard_Hoplite': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/vanguard_hoplite_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Vanguard_Hoplite_Piece_4_Promo_191125_CC_v002a.jpg'
    },

    // Anvil Aerospace
    'ANVL_Arrow': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/arrow_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Arrow_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ANVL_Carrack': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/carrack_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Carrack_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ANVL_C8_Pisces': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/pisces_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Pisces_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ANVL_Gladiator': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/gladiator_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Gladiator_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ANVL_Hawk': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/hawk_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Hawk_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ANVL_Hornet_F7C': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/hornet_f7c_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Hornet_F7C_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ANVL_Hornet_F7CM': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/hornet_f7cm_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Hornet_F7CM_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ANVL_Hurricane': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/hurricane_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Hurricane_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ANVL_Lightning_F8C': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/f8c_lightning_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/F8C_Lightning_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ANVL_Terrapin': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/terrapin_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Terrapin_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ANVL_Valkyrie': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/valkyrie_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Valkyrie_Piece_4_Promo_191125_CC_v002a.jpg'
    },

    // Drake Interplanetary
    'DRAK_Buccaneer': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/buccaneer_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Buccaneer_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'DRAK_Caterpillar': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/caterpillar_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Caterpillar_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'DRAK_Corsair': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/corsair_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Corsair_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'DRAK_Cutlass_Black': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/cutlass_black_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Cutlass_Black_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'DRAK_Cutlass_Blue': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/cutlass_blue_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Cutlass_Blue_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'DRAK_Cutlass_Red': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/cutlass_red_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Cutlass_Red_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'DRAK_Cutter': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/cutter_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Cutter_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'DRAK_Dragonfly': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/dragonfly_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Dragonfly_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'DRAK_Herald': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/herald_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Herald_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'DRAK_Vulture': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/vulture_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Vulture_Piece_4_Promo_191125_CC_v002a.jpg'
    },

    // MISC
    'MISC_Freelancer': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/freelancer_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Freelancer_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'MISC_Freelancer_DUR': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/freelancer_dur_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Freelancer_DUR_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'MISC_Freelancer_MAX': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/freelancer_max_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Freelancer_MAX_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'MISC_Freelancer_MIS': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/freelancer_mis_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Freelancer_MIS_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'MISC_Hull_A': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/hull_a_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Hull_A_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'MISC_Hull_C': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/hull_c_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Hull_C_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'MISC_Prospector': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/prospector_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Prospector_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'MISC_Reliant': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/reliant_kore_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Reliant_Kore_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'MISC_Starfarer': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/starfarer_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Starfarer_Piece_4_Promo_191125_CC_v002a.jpg'
    },

    // Origin Jumpworks
    'ORIG_100i': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/100i_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/100i_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ORIG_125a': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/125a_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/125a_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ORIG_135c': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/135c_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/135c_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ORIG_300i': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/300i_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/300i_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ORIG_315p': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/315p_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/315p_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ORIG_325a': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/325a_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/325a_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ORIG_350r': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/350r_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/350r_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ORIG_400i': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/400i_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/400i_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ORIG_600i': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/600i_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/600i_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ORIG_890Jump': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/890jump_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/890Jump_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'ORIG_M50': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/m50_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/M50_Piece_4_Promo_191125_CC_v002a.jpg'
    },

    // RSI
    'RSI_Aurora_CL': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/aurora_cl_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Aurora_CL_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Aurora_ES': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/aurora_es_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Aurora_ES_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Aurora_LN': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/aurora_ln_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Aurora_LN_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Aurora_LX': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/aurora_lx_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Aurora_LX_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Aurora_MR': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/aurora_mr_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Aurora_MR_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Constellation_Andromeda': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/constellation_andromeda_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Constellation_Andromeda_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Constellation_Aquila': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/constellation_aquila_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Constellation_Aquila_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Constellation_Phoenix': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/constellation_phoenix_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Constellation_Phoenix_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Constellation_Taurus': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/constellation_taurus_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Constellation_Taurus_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Mantis': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/mantis_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Mantis_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Polaris': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/polaris_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Polaris_Piece_4_Promo_191125_CC_v002a.jpg'
    },
    'RSI_Scorpius': {
        thumbnail: 'https://dto9r5vaiz7bu.cloudfront.net/ships/scorpius_storefront.jpg',
        profile: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Scorpius_Piece_4_Promo_191125_CC_v002a.jpg'
    }
};

// Fonction pour télécharger une image
function downloadImage(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else if (response.statusCode === 302 || response.statusCode === 301) {
                // Redirection
                downloadImage(response.headers.location, outputPath)
                    .then(resolve)
                    .catch(reject);
            } else {
                reject(new Error(`HTTP ${response.statusCode}: ${url}`));
            }
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Fonction pour nettoyer le nom de fichier
function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}

async function main() {
    console.log('🖼️  Début du téléchargement des images de vaisseaux...');
    
    // Créer les dossiers d'images
    if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }
    
    // Charger les données des vaisseaux
    let shipsData = [];
    if (fs.existsSync(SHIP_DATA_FILE)) {
        shipsData = JSON.parse(fs.readFileSync(SHIP_DATA_FILE, 'utf8'));
    } else {
        console.log('⚠️  Fichier des données de vaisseaux non trouvé. Exécutez d\'abord fetch-sc-ships-data.js');
        return;
    }
    
    const imageResults = {};
    let successCount = 0;
    let errorCount = 0;
    
    for (const ship of shipsData) {
        const shipKey = ship.className;
        const sanitizedName = sanitizeFilename(ship.className);
        
        console.log(`🚢 Traitement: ${ship.name} (${shipKey})`);
        
        imageResults[shipKey] = {
            name: ship.name,
            manufacturer: ship.manufacturer,
            images: {},
            errors: []
        };
        
        // Vérifier si nous avons des URLs d'images pour ce vaisseau
        if (SHIP_IMAGE_MAPPING[shipKey]) {
            const imageUrls = SHIP_IMAGE_MAPPING[shipKey];
            
            for (const [imageType, url] of Object.entries(imageUrls)) {
                try {
                    const extension = path.extname(url) || '.jpg';
                    const filename = `${sanitizedName}_${imageType}${extension}`;
                    const outputPath = path.join(IMAGES_DIR, filename);
                    
                    console.log(`  📥 ${imageType}: ${filename}`);
                    
                    await downloadImage(url, outputPath);
                    
                    imageResults[shipKey].images[imageType] = {
                        filename: filename,
                        path: outputPath,
                        url: url,
                        downloaded: true
                    };
                    
                    successCount++;
                    
                } catch (error) {
                    console.error(`    ❌ Erreur ${imageType}:`, error.message);
                    imageResults[shipKey].errors.push({
                        type: imageType,
                        url: url,
                        error: error.message
                    });
                    errorCount++;
                }
                
                // Petite pause entre les téléchargements
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } else {
            console.log(`  ⚠️  Aucune image mappée pour ${shipKey}`);
            imageResults[shipKey].errors.push({
                type: 'mapping',
                error: 'Aucune URL d\'image définie pour ce vaisseau'
            });
        }
        
        // Pause entre les vaisseaux
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Sauvegarder les résultats
    const resultsFile = path.join(OUTPUT_DIR, 'image-download-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(imageResults, null, 2));
    
    // Créer un index des images téléchargées
    const imageIndex = {};
    for (const [shipKey, result] of Object.entries(imageResults)) {
        if (Object.keys(result.images).length > 0) {
            imageIndex[shipKey] = {
                name: result.name,
                manufacturer: result.manufacturer,
                images: result.images
            };
        }
    }
    
    const indexFile = path.join(OUTPUT_DIR, 'images-index.json');
    fs.writeFileSync(indexFile, JSON.stringify(imageIndex, null, 2));
    
    console.log(`\n✅ Téléchargement des images terminé !`);
    console.log(`📊 Statistiques:`);
    console.log(`   - Images téléchargées: ${successCount}`);
    console.log(`   - Erreurs: ${errorCount}`);
    console.log(`   - Vaisseaux avec images: ${Object.keys(imageIndex).length}`);
    console.log(`   - Total vaisseaux traités: ${shipsData.length}`);
    console.log(`\n📁 Fichiers générés:`);
    console.log(`   - ${resultsFile} (résultats détaillés)`);
    console.log(`   - ${indexFile} (index des images)`);
    console.log(`   - ${IMAGES_DIR}/ (images téléchargées)`);
    
    // Afficher quelques statistiques sur les images
    const imageTypes = {};
    for (const result of Object.values(imageResults)) {
        for (const imageType of Object.keys(result.images)) {
            imageTypes[imageType] = (imageTypes[imageType] || 0) + 1;
        }
    }
    
    console.log(`\n📈 Types d'images téléchargées:`);
    for (const [type, count] of Object.entries(imageTypes)) {
        console.log(`   - ${type}: ${count} images`);
    }
}

main().catch(console.error);
