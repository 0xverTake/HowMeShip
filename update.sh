#!/bin/bash

# Script de mise à jour du bot Star Citizen Upgrade Navigator
# Usage: ./update.sh

echo "🔄 Mise à jour du bot Star Citizen Upgrade Navigator..."

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 n'est pas installé. Installez-le avec: npm install -g pm2"
    exit 1
fi

# Vérifier si le bot est en cours d'exécution
if pm2 list | grep -q "star-citizen-bot"; then
    echo "⏸️  Arrêt du bot..."
    pm2 stop star-citizen-bot
else
    echo "ℹ️  Le bot n'est pas en cours d'exécution"
fi

# Sauvegarder la base de données si elle existe
if [ -f "database.sqlite" ]; then
    BACKUP_NAME="database_backup_$(date +%Y%m%d_%H%M%S).sqlite"
    echo "💾 Sauvegarde de la base de données: $BACKUP_NAME"
    cp database.sqlite "$BACKUP_NAME"
fi

# Récupérer les dernières modifications
echo "📥 Récupération des dernières modifications..."
if git pull origin main; then
    echo "✅ Code mis à jour avec succès"
else
    echo "⚠️  Erreur lors de la mise à jour du code"
    echo "Continuons avec les fichiers locaux..."
fi

# Installer/mettre à jour les dépendances
echo "📦 Installation des dépendances..."
if npm install --production; then
    echo "✅ Dépendances installées avec succès"
else
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

# Créer le dossier logs s'il n'existe pas
if [ ! -d "logs" ]; then
    echo "📁 Création du dossier logs..."
    mkdir logs
fi

# Redémarrer le bot
echo "🚀 Redémarrage du bot..."
if pm2 start ecosystem.config.js; then
    echo "✅ Bot redémarré avec succès"
else
    echo "❌ Erreur lors du redémarrage du bot"
    exit 1
fi

# Sauvegarder la configuration PM2
pm2 save

# Afficher le statut
echo ""
echo "📊 Statut du bot:"
pm2 status star-citizen-bot

echo ""
echo "🎉 Mise à jour terminée avec succès !"
echo "📝 Pour voir les logs: pm2 logs star-citizen-bot"
echo "📊 Pour voir les métriques: pm2 monit"
