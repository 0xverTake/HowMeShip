const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const SCRIPTS_DIR = './scripts';
const OUTPUT_DIR = './data/sc-ships-4.2';

// Scripts à exécuter dans l'ordre
const SCRIPTS = [
    {
        name: 'fetch-sc-ships-data.js',
        description: 'Téléchargement des données de vaisseaux Star Citizen 4.2',
        emoji: '🚀'
    },
    {
        name: 'fetch-ship-images.js',
        description: 'Téléchargement des images de vaisseaux',
        emoji: '🖼️'
    },
    {
        name: 'fetch-scrap-data.js',
        description: 'Génération des données de scrap/recyclage',
        emoji: '♻️'
    }
];

// Fonction pour exécuter un script Node.js
function runScript(scriptPath) {
    return new Promise((resolve, reject) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Exécution: ${scriptPath}`);
        console.log(`${'='.repeat(60)}\n`);
        
        const child = spawn('node', [scriptPath], {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ ${scriptPath} terminé avec succès\n`);
                resolve();
            } else {
                console.error(`\n❌ ${scriptPath} a échoué avec le code ${code}\n`);
                reject(new Error(`Script failed with code ${code}`));
            }
        });
        
        child.on('error', (error) => {
            console.error(`\n❌ Erreur lors de l'exécution de ${scriptPath}:`, error.message);
            reject(error);
        });
    });
}

// Fonction pour vérifier les prérequis
function checkPrerequisites() {
    console.log('🔍 Vérification des prérequis...\n');
    
    // Vérifier que Node.js est disponible
    try {
        const nodeVersion = process.version;
        console.log(`✅ Node.js version: ${nodeVersion}`);
    } catch (error) {
        console.error('❌ Node.js non trouvé');
        return false;
    }
    
    // Vérifier que les scripts existent
    for (const script of SCRIPTS) {
        const scriptPath = path.join(SCRIPTS_DIR, script.name);
        if (!fs.existsSync(scriptPath)) {
            console.error(`❌ Script manquant: ${scriptPath}`);
            return false;
        }
        console.log(`✅ Script trouvé: ${script.name}`);
    }
    
    // Créer le dossier de sortie si nécessaire
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`✅ Dossier de sortie créé: ${OUTPUT_DIR}`);
    } else {
        console.log(`✅ Dossier de sortie existe: ${OUTPUT_DIR}`);
    }
    
    console.log('\n✅ Tous les prérequis sont satisfaits\n');
    return true;
}

// Fonction pour afficher un résumé final
function displaySummary() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 RÉSUMÉ FINAL');
    console.log(`${'='.repeat(60)}\n`);
    
    // Vérifier les fichiers générés
    const expectedFiles = [
        'all-ships-4.2.json',
        'ships-index.json',
        'images-index.json',
        'image-download-results.json',
        'scrap-data.json',
        'scrap-index.json'
    ];
    
    console.log('📁 Fichiers générés:');
    for (const file of expectedFiles) {
        const filePath = path.join(OUTPUT_DIR, file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            console.log(`   ✅ ${file} (${sizeKB} KB)`);
        } else {
            console.log(`   ❌ ${file} (manquant)`);
        }
    }
    
    // Vérifier le dossier d'images
    const imagesDir = path.join(OUTPUT_DIR, 'images');
    if (fs.existsSync(imagesDir)) {
        const imageFiles = fs.readdirSync(imagesDir);
        console.log(`\n🖼️  Images téléchargées: ${imageFiles.length} fichiers`);
        
        if (imageFiles.length > 0) {
            console.log('   Exemples:');
            imageFiles.slice(0, 5).forEach(file => {
                console.log(`   - ${file}`);
            });
            if (imageFiles.length > 5) {
                console.log(`   ... et ${imageFiles.length - 5} autres`);
            }
        }
    }
    
    // Afficher des statistiques si possible
    try {
        const shipsIndexPath = path.join(OUTPUT_DIR, 'ships-index.json');
        if (fs.existsSync(shipsIndexPath)) {
            const shipsIndex = JSON.parse(fs.readFileSync(shipsIndexPath, 'utf8'));
            console.log(`\n📈 Statistiques des vaisseaux:`);
            console.log(`   - Total vaisseaux: ${shipsIndex.length}`);
            
            // Compter par fabricant
            const manufacturers = {};
            shipsIndex.forEach(ship => {
                const mfg = ship.manufacturer || 'Unknown';
                manufacturers[mfg] = (manufacturers[mfg] || 0) + 1;
            });
            
            console.log(`   - Fabricants: ${Object.keys(manufacturers).length}`);
            const topManufacturers = Object.entries(manufacturers)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
            
            console.log('   - Top fabricants:');
            topManufacturers.forEach(([mfg, count]) => {
                console.log(`     * ${mfg}: ${count} vaisseaux`);
            });
        }
        
        const scrapIndexPath = path.join(OUTPUT_DIR, 'scrap-index.json');
        if (fs.existsSync(scrapIndexPath)) {
            const scrapIndex = JSON.parse(fs.readFileSync(scrapIndexPath, 'utf8'));
            const totalValue = scrapIndex.reduce((sum, ship) => sum + ship.totalScrapValue, 0);
            const avgValue = Math.round(totalValue / scrapIndex.length);
            
            console.log(`\n♻️  Statistiques de scrap:`);
            console.log(`   - Valeur totale: ${totalValue.toLocaleString()} aUEC`);
            console.log(`   - Valeur moyenne: ${avgValue.toLocaleString()} aUEC`);
            console.log(`   - Vaisseau le plus rentable: ${scrapIndex[0].name} (${scrapIndex[0].totalScrapValue.toLocaleString()} aUEC)`);
        }
        
    } catch (error) {
        console.log('\n⚠️  Impossible de lire les statistiques détaillées');
    }
    
    console.log(`\n🎉 Processus terminé avec succès !`);
    console.log(`📂 Tous les fichiers sont disponibles dans: ${OUTPUT_DIR}`);
    console.log(`\n💡 Vous pouvez maintenant utiliser ces données dans votre bot Discord HowMeShip`);
}

// Fonction principale
async function main() {
    console.log('🚀 STAR CITIZEN 4.2 - COLLECTEUR DE DONNÉES COMPLET');
    console.log('=' .repeat(60));
    console.log('Ce script va télécharger toutes les données nécessaires pour HowMeShip:');
    console.log('• Données des vaisseaux (spécifications techniques)');
    console.log('• Images des vaisseaux (thumbnails, profils, hangar)');
    console.log('• Données de scrap/recyclage (valeurs, matériaux)');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    try {
        // Vérifier les prérequis
        if (!checkPrerequisites()) {
            process.exit(1);
        }
        
        // Exécuter chaque script dans l'ordre
        for (let i = 0; i < SCRIPTS.length; i++) {
            const script = SCRIPTS[i];
            const scriptPath = path.join(SCRIPTS_DIR, script.name);
            
            console.log(`\n${script.emoji} Étape ${i + 1}/${SCRIPTS.length}: ${script.description}`);
            console.log(`⏱️  Début: ${new Date().toLocaleTimeString()}`);
            
            const stepStartTime = Date.now();
            await runScript(scriptPath);
            const stepDuration = Math.round((Date.now() - stepStartTime) / 1000);
            
            console.log(`✅ Étape ${i + 1} terminée en ${stepDuration}s`);
        }
        
        // Afficher le résumé final
        displaySummary();
        
        const totalDuration = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n⏱️  Durée totale: ${totalDuration}s`);
        
    } catch (error) {
        console.error('\n❌ Erreur lors de l\'exécution:', error.message);
        console.log('\n🔧 Conseils de dépannage:');
        console.log('• Vérifiez votre connexion internet');
        console.log('• Assurez-vous que Node.js est installé');
        console.log('• Vérifiez que tous les scripts sont présents');
        console.log('• Essayez d\'exécuter les scripts individuellement');
        process.exit(1);
    }
}

// Gestion des signaux pour un arrêt propre
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Arrêt demandé par l\'utilisateur (Ctrl+C)');
    console.log('🛑 Arrêt en cours...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Arrêt demandé par le système');
    console.log('🛑 Arrêt en cours...');
    process.exit(0);
});

// Exécuter le script principal
main();
