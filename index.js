require('dotenv').config();
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Importation des modules
const Database = require('./config/database');
const RSIScraper = require('./scrapers/rsiScraper');
const StarHangarScraper = require('./scrapers/starHangarScraper');
const SpaceFoundryScraper = require('./scrapers/spaceFoundryScraper');
const upgradePathfinder = require('./services/upgradePathfinder');
const priceAlertService = require('./services/priceAlertService');

// Création du client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Collection pour stocker les commandes
client.commands = new Collection();

// Variables globales
let database;
const scrapers = [];

// Fonction pour charger les commandes
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Commande chargée: ${command.data.name}`);
        } else {
            console.log(`⚠️ Commande ignorée (structure invalide): ${file}`);
        }
    }
}

// Fonction pour enregistrer les commandes slash
async function deployCommands() {
    const commands = [];
    
    client.commands.forEach(command => {
        commands.push(command.data.toJSON());
    });

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Déploiement des commandes slash...');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log('✅ Commandes slash déployées avec succès!');
    } catch (error) {
        console.error('❌ Erreur lors du déploiement des commandes:', error);
    }
}

// Fonction d'initialisation des scrapers
function initializeScrapers() {
    scrapers.push(new RSIScraper());
    scrapers.push(new StarHangarScraper());
    scrapers.push(new SpaceFoundryScraper());
    
    console.log(`✅ ${scrapers.length} scrapers initialisés`);
}

// Fonction de scraping automatique
async function runScrapers() {
    console.log('🔄 Début du scraping automatique...');
    
    for (const scraper of scrapers) {
        try {
            await scraper.scrape(database);
            console.log(`✅ Scraping terminé pour ${scraper.name}`);
        } catch (error) {
            console.error(`❌ Erreur lors du scraping de ${scraper.name}:`, error.message);
        }
        
        // Délai entre les scrapers pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('✅ Scraping automatique terminé');
}

// Événement: Bot prêt
client.once('ready', async () => {
    console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
    
    // Déployer les commandes slash
    await deployCommands();
    
    // Définir le statut du bot
    client.user.setActivity('Star Citizen Upgrades', { type: 'WATCHING' });
    
    // Lancer un premier scraping
    setTimeout(async () => {
        console.log('🔄 Premier scraping au démarrage...');
        await runScrapers();
    }, 5000);
});

// Événement: Interaction (commandes slash et boutons)
client.on('interactionCreate', async interaction => {
    // Gestion de l'autocomplétion
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        
        if (!command || !command.autocomplete) return;
        
        try {
            await command.autocomplete(interaction, database);
        } catch (error) {
            console.error('Erreur lors de l\'autocomplétion:', error);
        }
        return;
    }
    
    // Gestion des boutons
    if (interaction.isButton()) {
        try {
            // Essayer de trouver une commande qui peut gérer ce bouton
            for (const command of client.commands.values()) {
                if (command.handleButton && await command.handleButton(interaction)) {
                    return; // Bouton géré avec succès
                }
            }
            
            // Si aucune commande n'a géré le bouton
            console.log(`Bouton non géré: ${interaction.customId}`);
            
        } catch (error) {
            console.error('Erreur lors de la gestion du bouton:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Erreur lors du traitement de cette action.',
                    ephemeral: true
                });
            }
        }
        return;
    }
    
    // Gestion des commandes slash
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`Commande inconnue: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction, database);
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande:', error);
        
        const errorMessage = {
            content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Événement: Erreur
client.on('error', error => {
    console.error('Erreur Discord.js:', error);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', error => {
    console.error('Erreur non gérée:', error);
});

process.on('uncaughtException', error => {
    console.error('Exception non capturée:', error);
    process.exit(1);
});

// Fonction principale d'initialisation
async function main() {
    try {
        console.log('🚀 Démarrage du bot Star Citizen Upgrade Navigator...');
        
        // Vérifier les variables d'environnement
        if (!process.env.DISCORD_TOKEN) {
            throw new Error('DISCORD_TOKEN manquant dans les variables d\'environnement');
        }
        
        // Initialiser la base de données
        console.log('🔄 Initialisation de la base de données...');
        database = new Database();
        await database.init();
        
        // Charger les commandes
        console.log('🔄 Chargement des commandes...');
        loadCommands();
        
        // Initialiser les scrapers
        console.log('🔄 Initialisation des scrapers...');
        initializeScrapers();
        
        // Programmer le scraping automatique
        const scrapeInterval = process.env.SCRAPE_INTERVAL_HOURS || 6;
        console.log(`⏰ Scraping automatique programmé toutes les ${scrapeInterval} heures`);
        
        cron.schedule(`0 */${scrapeInterval} * * *`, async () => {
            console.log('⏰ Déclenchement du scraping automatique programmé');
            await runScrapers();
        });
        
        // Connecter le bot Discord
        console.log('🔄 Connexion à Discord...');
        await client.login(process.env.DISCORD_TOKEN);
        
        // Démarrer le service d'alertes de prix
        console.log('🔄 Démarrage du service d\'alertes de prix...');
        priceAlertService.startMonitoring(client, upgradePathfinder);
        
        // Nettoyer les anciennes alertes au démarrage
        priceAlertService.cleanupOldAlerts();
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        process.exit(1);
    }
}

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\n🔄 Arrêt du bot...');
    
    // Arrêter le service d'alertes
    priceAlertService.stopMonitoring();
    
    if (database) {
        database.close();
    }
    
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔄 Arrêt du bot (SIGTERM)...');
    
    // Arrêter le service d'alertes
    priceAlertService.stopMonitoring();
    
    if (database) {
        database.close();
    }
    
    client.destroy();
    process.exit(0);
});

// Démarrer l'application
main();
