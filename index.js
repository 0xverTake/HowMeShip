require('dotenv').config();
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Importation des modules
const Database = require('./config/database');
const UpgradePriceService = require('./services/upgradePriceService');

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
let upgradePriceService;

// Variables pour les statistiques du bot
let botStats = {
    status: 'starting',
    uptime: 0,
    memory: 0,
    cpu: 0,
    lastRestart: new Date(),
    alertsActive: 0,
    upgradesCalculated: 0,
    cacheHitRate: '0%'
};

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

// Fonction d'initialisation des services
function initializeServices() {
    upgradePriceService = new UpgradePriceService();
    console.log('✅ Services d\'alertes d\'upgrades initialisés');
}

// Fonction de vérification des données UEX Corp
async function checkUEXData() {
    console.log('🔄 Vérification des données UEX Corp...');
    
    try {
        const shipCount = await database.getShipCount();
        console.log(`📊 Nombre de vaisseaux en base: ${shipCount}`);
        
        if (shipCount === 0) {
            console.log('⚠️ Base de données vide - Veuillez exécuter la migration UEX Corp');
            console.log('💡 Utilisez: node scripts/migrate-uex-data.js');
        } else {
            console.log('✅ Données UEX Corp disponibles');
        }
        
        return shipCount > 0;
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des données:', error.message);
        return false;
    }
}

// Événement: Bot prêt
client.once('ready', async () => {
    console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
    
    // Déployer les commandes slash
    await deployCommands();
    
    // Définir le statut du bot
    client.user.setActivity('Star Citizen Upgrades | UEX Corp Data', { type: 'WATCHING' });
    
    // Vérifier les données UEX Corp
    const hasData = await checkUEXData();
    
    if (hasData) {
        // Démarrer le service d'alertes d'upgrades
        console.log('🔄 Démarrage du service d\'alertes d\'upgrades...');
        await upgradePriceService.startAlertService(client, 30); // Vérification toutes les 30 minutes
    } else {
        console.log('⚠️ Service d\'alertes non démarré - Données manquantes');
    }
    
    // Initialiser les statistiques du bot
    updateBotStatistics();
    
    // Mettre à jour les statistiques toutes les minutes
    setInterval(updateBotStatistics, 60000);
    
    console.log('🌐 Interface web disponible sur http://localhost:3001/dashboard');
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
    
    // Gestion des menus de sélection
    if (interaction.isStringSelectMenu()) {
        try {
            // Essayer de trouver une commande qui peut gérer ce menu
            for (const command of client.commands.values()) {
                if (command.handleSelectMenu && await command.handleSelectMenu(interaction)) {
                    return; // Menu géré avec succès
                }
            }
            
            // Si aucune commande n'a géré le menu
            console.log(`Menu non géré: ${interaction.customId}`);
            
        } catch (error) {
            console.error('Erreur lors de la gestion du menu:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Erreur lors du traitement de cette sélection.',
                    ephemeral: true
                });
            }
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
        
        // Incrémenter le compteur d'upgrades pour certaines commandes
        if (['upgrade', 'compare', 'ship'].includes(interaction.commandName)) {
            incrementUpgradeCount();
        }
        
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
        
        // Initialiser les services
        console.log('🔄 Initialisation des services...');
        initializeServices();
        
        // Programmer les vérifications périodiques des alertes (toutes les heures)
        console.log('⏰ Programmation des vérifications d\'alertes...');
        
        cron.schedule('0 * * * *', async () => {
            console.log('⏰ Vérification automatique des alertes d\'upgrades');
            if (upgradePriceService) {
                await upgradePriceService.checkAlerts(client);
            }
        });
        
        // Connecter le bot Discord
        console.log('🔄 Connexion à Discord...');
        await client.login(process.env.DISCORD_TOKEN);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        process.exit(1);
    }
}

// Fonction pour mettre à jour les statistiques du bot
function updateBotStatistics() {
    const now = Date.now();
    const memUsage = process.memoryUsage();
    
    botStats = {
        status: 'online',
        uptime: Math.floor((now - client.readyTimestamp) / 1000),
        memory: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        cpu: process.cpuUsage(),
        lastRestart: botStats.lastRestart,
        alertsActive: botStats.alertsActive,
        upgradesCalculated: botStats.upgradesCalculated,
        cacheHitRate: botStats.cacheHitRate
    };
}

// Fonction pour incrémenter le compteur d'upgrades
function incrementUpgradeCount() {
    botStats.upgradesCalculated++;
    updateBotStatistics();
}

// Fonction pour mettre à jour le nombre d'alertes actives
function updateAlertCount(count) {
    botStats.alertsActive = count;
    updateBotStatistics();
}

// Fonction pour mettre à jour le taux de cache hit
function updateCacheHitRate(rate) {
    botStats.cacheHitRate = rate;
    updateBotStatistics();
}

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\n🔄 Arrêt du bot...');
    
    if (database) {
        database.close();
    }
    
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔄 Arrêt du bot (SIGTERM)...');
    
    if (database) {
        database.close();
    }
    
    client.destroy();
    process.exit(0);
});

// Démarrer l'application
main();
