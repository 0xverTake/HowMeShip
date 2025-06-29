#!/bin/bash

echo "🚀 Déploiement du bot HowMeShip sur VPS..."

# Créer le répertoire si nécessaire
mkdir -p /opt/howmeship

# Aller dans le répertoire
cd /opt/howmeship

# Sauvegarder la base de données existante si elle existe
if [ -f "database.sqlite" ]; then
    echo "💾 Sauvegarde de la base de données..."
    cp database.sqlite database.sqlite.backup.$(date +%Y%m%d_%H%M%S)
fi

# Sauvegarder le fichier .env s'il existe
if [ -f ".env" ]; then
    echo "🔐 Sauvegarde du fichier .env..."
    cp .env .env.backup
fi

# Extraire la nouvelle version
echo "📦 Extraction des fichiers..."
tar -xzf /root/howmeship.tar.gz

# Restaurer le fichier .env
if [ -f ".env.backup" ]; then
    echo "🔐 Restauration du fichier .env..."
    mv .env.backup .env
fi

# Installer les dépendances
echo "📚 Installation des dépendances..."
npm install --production

# Redémarrer le service avec PM2
echo "🔄 Redémarrage du service..."
pm2 stop howmeship 2>/dev/null || true
pm2 delete howmeship 2>/dev/null || true
pm2 start ecosystem.config.js

# Afficher le statut
echo "📊 Statut du service:"
pm2 status

echo "✅ Déploiement terminé !"
echo "🌐 Le bot HowMeShip est maintenant en ligne"
