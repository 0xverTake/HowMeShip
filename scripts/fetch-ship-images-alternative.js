const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const OUTPUT_DIR = './data/sc-ships-4.2';
const IMAGES_DIR = './data/sc-ships-4.2/images';
const SHIP_DATA_FILE = './data/sc-ships-4.2/ships-index.json';

// Sources d'images alternatives plus fiables
const IMAGE_SOURCES = {
    // Star Citizen Wiki - plus fiable
    wiki: 'https://starcitizen.tools/images/',
    // API SCDB - communauté
    scdb: 'https://api.scdb.com/v1/ships/',
    // Starship42 - galerie communautaire
    starship42: 'https://www.starship42.com/fleetview/',
    // GitHub repository d'images
    github: 'https://raw.githubusercontent.com/StarCitizenWiki/wiki/master/images/'
};

// Mapping alternatif basé sur les noms réels des vaisseaux
const ALTERNATIVE_IMAGE_MAPPING = {
    // Utilisation de noms génériques plus susceptibles de fonctionner
    'AEGS_Avenger_Titan': {
        wiki: 'https://starcitizen.tools/images/thumb/9/9a/Avenger_Titan_in_space.jpg/800px-Avenger_Titan_in_space.jpg',
        fallback: 'https://robertsspaceindustries.com/media/b9ka4ohfxyb1kr/source/Avenger_Titan_Piece_02.jpg'
    },
    'AEGS_Gladius': {
        wiki: 'https://starcitizen.tools/images/thumb/a/a1/Gladius_in_space.jpg/800px-Gladius_in_space.jpg',
        fallback: 'https://robertsspaceindustries.com/media/i2s0u1odgd6llr/source/Gladius_Piece_02.jpg'
    },
    'ANVL_Arrow': {
        wiki: 'https://starcitizen.tools/images/thumb/f/f8/Arrow_in_space.jpg/800px-Arrow_in_space.jpg',
        fallback: 'https://robertsspaceindustries.com/media/qjkqzogdqnl8kr/source/Arrow_Piece_02.jpg'
    },
    'ANVL_Carrack': {
        wiki: 'https://starcitizen.tools/images/thumb/e/e4/Carrack_in_space.jpg/800px-Carrack_in_space.jpg',
        fallback: 'https://robertsspaceindustries.com/media/z2d0u6d1uo6llr/source/Carrack_Piece_02.jpg'
    },
    'DRAK_Cutlass_Black': {
        wiki: 'https://starcitizen.tools/images/thumb/c/c8/Cutlass_Black_in_space.jpg/800px-Cutlass_Black_in_space.jpg',
        fallback: 'https://robertsspaceindustries.com/media/1c1bbbu36lfllr/source/Cutlass_Black_Piece_02.jpg'
    },
    'MISC_Freelancer': {
        wiki: 'https://starcitizen.tools/images/thumb/d/d4/Freelancer_in_space.jpg/800px-Freelancer_in_space.jpg',
        fallback: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Freelancer_Piece_02.jpg'
    },
    'ORIG_300i': {
        wiki: 'https://starcitizen.tools/images/thumb/b/b1/300i_in_space.jpg/800px-300i_in_space.jpg',
        fallback: 'https://robertsspaceindustries.com/media/1c1bbbu36lfllr/source/300i_Piece_02.jpg'
    },
    'RSI_Aurora_MR': {
        wiki: 'https://starcitizen.tools/images/thumb/a/a9/Aurora_MR_in_space.jpg/800px-Aurora_MR_in_space.jpg',
        fallback: 'https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/Aurora_MR_Piece_02.jpg'
    },
    'RSI_Constellation_Andromeda': {
        wiki: 'https://starcitizen.tools/images/thumb/f/f2/Constellation_Andromeda_in_space.jpg/800px-Constellation_Andromeda_in_space.jpg',
        fallback: 'https://robertsspaceindustries.com/media/1c1bbbu36lfllr/source/Constellation_Andromeda_Piece_02.jpg'
    }
};

// Fonction pour télécharger une image avec gestion des erreurs améliorée
function downloadImage(url, outputPath, retries = 3) {
    return new Promise((resolve, reject) => {
        const attempt = (attemptsLeft) => {
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
                    file.close();
                    fs.unlinkSync(outputPath); // Supprimer le fichier vide
                    downloadImage(response.headers.location, outputPath, attemptsLeft)
                        .then(resolve)
                        .catch(reject);
                } else {
                    file.close();
                    fs.unlinkSync(outputPath); // Supprimer le fichier vide
                    
                    if (attemptsLeft > 0) {
                        console.log(`    🔄 Nouvelle tentative (${attemptsLeft} restantes)...`);
                        setTimeout(() => attempt(attemptsLeft - 1), 1000);
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
                    }
                }
            }).on('error', (err) => {
                file.close();
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath); // Supprimer le fichier vide
                }
                
                if (attemptsLeft > 0) {
                    console.log(`    🔄 Nouvelle tentative après erreur (${attemptsLeft} restantes)...`);
                    setTimeout(() => attempt(attemptsLeft - 1), 1000);
                } else {
                    reject(err);
                }
            });
        };
        
        attempt(retries);
    });
}

// Fonction pour générer des URLs d'images alternatives
function generateImageUrls(ship) {
    const urls = [];
    const shipName = ship.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const className = ship.className.toLowerCase();
    
    // URLs basées sur le nom du vaisseau
    urls.push(`https://starcitizen.tools/images/thumb/${shipName}_in_space.jpg/800px-${shipName}_in_space.jpg`);
    urls.push(`https://starcitizen.tools/images/thumb/${shipName}.jpg/800px-${shipName}.jpg`);
    
    // URLs basées sur le className
    urls.push(`https://starcitizen.tools/images/thumb/${className}_in_space.jpg/800px-${className}_in_space.jpg`);
    urls.push(`https://starcitizen.tools/images/thumb/${className}.jpg/800px-${className}.jpg`);
    
    // URLs génériques RSI
    const rsiName = ship.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    urls.push(`https://robertsspaceindustries.com/media/dwbf2req4gz8gr/source/${rsiName}_piece_02.jpg`);
    urls.push(`https://robertsspaceindustries.com/media/1c1bbbu36lfllr/source/${rsiName}_piece_02.jpg`);
    
    return urls;
}

// Fonction pour rechercher des images via l'API Star Citizen Wiki
async function searchWikiImages(shipName) {
    return new Promise((resolve) => {
        const searchQuery = encodeURIComponent(shipName);
        const apiUrl = `https://starcitizen.tools/api.php?action=query&list=search&srsearch=${searchQuery}&format=json&srlimit=5`;
        
        https.get(apiUrl, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const images = [];
                    
                    if (result.query && result.query.search) {
                        result.query.search.forEach(page => {
                            if (page.title.toLowerCase().includes(shipName.toLowerCase())) {
                                // Construire l'URL de l'image basée sur le titre de la page
                                const imageUrl = `https://starcitizen.tools/images/thumb/${page.title.replace(/\s+/g, '_')}.jpg/800px-${page.title.replace(/\s+/g, '_')}.jpg`;
                                images.push(imageUrl);
                            }
                        });
                    }
                    
                    resolve(images);
                } catch (error) {
                    resolve([]);
                }
            });
        }).on('error', () => {
            resolve([]);
        });
    });
}

async function main() {
    console.log('🖼️  Début du téléchargement alternatif des images de vaisseaux...');
    
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
    
    // Prendre seulement les 20 premiers vaisseaux pour le test
    const testShips = shipsData.slice(0, 20);
    
    for (const ship of testShips) {
        const shipKey = ship.className;
        const sanitizedName = ship.className.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        
        console.log(`🚢 Recherche d'images pour: ${ship.name} (${shipKey})`);
        
        imageResults[shipKey] = {
            name: ship.name,
            manufacturer: ship.manufacturer,
            images: {},
            errors: [],
            searchAttempts: []
        };
        
        let imageFound = false;
        
        // 1. Essayer les mappings prédéfinis
        if (ALTERNATIVE_IMAGE_MAPPING[shipKey]) {
            console.log('  📋 Utilisation du mapping prédéfini...');
            const mapping = ALTERNATIVE_IMAGE_MAPPING[shipKey];
            
            for (const [type, url] of Object.entries(mapping)) {
                try {
                    const filename = `${sanitizedName}_${type}.jpg`;
                    const outputPath = path.join(IMAGES_DIR, filename);
                    
                    console.log(`    📥 Tentative ${type}: ${filename}`);
                    await downloadImage(url, outputPath);
                    
                    imageResults[shipKey].images[type] = {
                        filename: filename,
                        path: outputPath,
                        url: url,
                        downloaded: true,
                        source: 'predefined_mapping'
                    };
                    
                    successCount++;
                    imageFound = true;
                    console.log(`    ✅ ${type} téléchargé avec succès`);
                    break; // Une image suffit pour le test
                    
                } catch (error) {
                    console.log(`    ❌ Échec ${type}: ${error.message}`);
                    imageResults[shipKey].errors.push({
                        type: type,
                        url: url,
                        error: error.message,
                        source: 'predefined_mapping'
                    });
                }
            }
        }
        
        // 2. Si pas d'image trouvée, essayer les URLs générées
        if (!imageFound) {
            console.log('  🔍 Génération d\'URLs alternatives...');
            const generatedUrls = generateImageUrls(ship);
            
            for (let i = 0; i < Math.min(3, generatedUrls.length); i++) {
                const url = generatedUrls[i];
                try {
                    const filename = `${sanitizedName}_generated_${i}.jpg`;
                    const outputPath = path.join(IMAGES_DIR, filename);
                    
                    console.log(`    📥 Tentative générée ${i + 1}: ${filename}`);
                    await downloadImage(url, outputPath);
                    
                    imageResults[shipKey].images[`generated_${i}`] = {
                        filename: filename,
                        path: outputPath,
                        url: url,
                        downloaded: true,
                        source: 'generated_url'
                    };
                    
                    successCount++;
                    imageFound = true;
                    console.log(`    ✅ Image générée ${i + 1} téléchargée avec succès`);
                    break;
                    
                } catch (error) {
                    console.log(`    ❌ Échec URL générée ${i + 1}: ${error.message}`);
                    imageResults[shipKey].errors.push({
                        type: `generated_${i}`,
                        url: url,
                        error: error.message,
                        source: 'generated_url'
                    });
                }
            }
        }
        
        // 3. Si toujours pas d'image, essayer la recherche Wiki
        if (!imageFound) {
            console.log('  🔎 Recherche sur Star Citizen Wiki...');
            try {
                const wikiImages = await searchWikiImages(ship.name);
                imageResults[shipKey].searchAttempts.push({
                    source: 'wiki_search',
                    query: ship.name,
                    results: wikiImages.length
                });
                
                if (wikiImages.length > 0) {
                    const url = wikiImages[0];
                    const filename = `${sanitizedName}_wiki_search.jpg`;
                    const outputPath = path.join(IMAGES_DIR, filename);
                    
                    console.log(`    📥 Tentative Wiki: ${filename}`);
                    await downloadImage(url, outputPath);
                    
                    imageResults[shipKey].images.wiki_search = {
                        filename: filename,
                        path: outputPath,
                        url: url,
                        downloaded: true,
                        source: 'wiki_search'
                    };
                    
                    successCount++;
                    imageFound = true;
                    console.log(`    ✅ Image Wiki téléchargée avec succès`);
                } else {
                    console.log('    ⚠️  Aucun résultat de recherche Wiki');
                }
            } catch (error) {
                console.log(`    ❌ Erreur recherche Wiki: ${error.message}`);
                imageResults[shipKey].errors.push({
                    type: 'wiki_search',
                    error: error.message,
                    source: 'wiki_search'
                });
            }
        }
        
        if (!imageFound) {
            console.log(`  ❌ Aucune image trouvée pour ${ship.name}`);
            errorCount++;
        }
        
        // Pause entre les vaisseaux
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Sauvegarder les résultats
    const resultsFile = path.join(OUTPUT_DIR, 'alternative-image-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(imageResults, null, 2));
    
    console.log(`\n✅ Recherche alternative d'images terminée !`);
    console.log(`📊 Statistiques (${testShips.length} vaisseaux testés):`);
    console.log(`   - Images téléchargées: ${successCount}`);
    console.log(`   - Vaisseaux sans image: ${errorCount}`);
    console.log(`   - Taux de succès: ${Math.round((successCount / testShips.length) * 100)}%`);
    console.log(`\n📁 Fichier de résultats: ${resultsFile}`);
    
    if (successCount > 0) {
        console.log(`\n🎉 ${successCount} images trouvées ! Vous pouvez adapter ce script pour tous les vaisseaux.`);
        console.log(`💡 Conseil: Examinez les URLs qui fonctionnent pour créer de meilleurs patterns.`);
    }
}

main().catch(console.error);
