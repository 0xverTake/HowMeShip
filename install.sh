#!/bin/bash

# Script d'installation automatique du bot Star Citizen Upgrade Navigator
# Usage: curl -sSL https://raw.githubusercontent.com/votre-repo/install.sh | bash
# Ou: ./install.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 Installation du bot Star Citizen Upgrade Navigator"
echo "=================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher des messages colorés
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si on est sur Debian/Ubuntu
if ! command -v apt &> /dev/null; then
    print_error "Ce script est conçu pour Debian/Ubuntu. Utilisez le guide manuel pour d'autres distributions."
    exit 1
fi

print_status "Système détecté: $(lsb_release -d | cut -f2)"

# Mise à jour du système
print_status "Mise à jour du système..."
sudo apt update && sudo apt upgrade -y

# Installation de Node.js
print_status "Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    print_status "Installation de Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js installé: $(node --version)"
else
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_warning "Version de Node.js trop ancienne ($NODE_VERSION). Mise à jour recommandée."
    else
        print_success "Node.js déjà installé: $(node --version)"
    fi
fi

# Installation de Git
print_status "Vérification de Git..."
if ! command -v git &> /dev/null; then
    print_status "Installation de Git..."
    sudo apt install git -y
    print_success "Git installé"
else
    print_success "Git déjà installé: $(git --version)"
fi

# Installation de PM2
print_status "Vérification de PM2..."
if ! command -v pm2 &> /dev/null; then
    print_status "Installation de PM2..."
    sudo npm install -g pm2
    print_success "PM2 installé"
else
    print_success "PM2 déjà installé: $(pm2 --version)"
fi

# Demander le répertoire d'installation
echo ""
read -p "📁 Répertoire d'installation [~/star-citizen-bot]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-~/star-citizen-bot}
INSTALL_DIR=$(eval echo "$INSTALL_DIR")  # Expand ~ to home directory

# Créer le répertoire s'il n'existe pas
if [ ! -d "$INSTALL_DIR" ]; then
    print_status "Création du répertoire $INSTALL_DIR..."
    mkdir -p "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# Demander l'URL du repository
echo ""
read -p "🔗 URL du repository Git [laisser vide pour télécharger les fichiers]: " REPO_URL

if [ -n "$REPO_URL" ]; then
    # Cloner depuis Git
    print_status "Clonage du repository..."
    if [ -d ".git" ]; then
        print_status "Repository déjà cloné, mise à jour..."
        git pull
    else
        git clone "$REPO_URL" .
    fi
else
    # Télécharger les fichiers (si disponible via une URL)
    print_warning "Clonage Git non configuré. Assurez-vous que les fichiers du bot sont dans ce répertoire."
fi

# Installation des dépendances
if [ -f "package.json" ]; then
    print_status "Installation des dépendances Node.js..."
    npm install --production
    print_success "Dépendances installées"
else
    print_error "package.json non trouvé. Assurez-vous d'être dans le bon répertoire."
    exit 1
fi

# Configuration
print_status "Configuration du bot..."

# Copier le fichier .env si nécessaire
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    print_success "Fichier .env créé depuis .env.example"
fi

# Demander le token Discord
echo ""
echo "🤖 Configuration Discord"
echo "Pour obtenir un token Discord:"
echo "1. Allez sur https://discord.com/developers/applications"
echo "2. Créez une nouvelle application"
echo "3. Allez dans 'Bot' et créez un bot"
echo "4. Copiez le token"
echo ""

if [ -f ".env" ]; then
    CURRENT_TOKEN=$(grep "DISCORD_TOKEN=" .env | cut -d'=' -f2)
    if [ -n "$CURRENT_TOKEN" ] && [ "$CURRENT_TOKEN" != "votre_token_discord_ici" ]; then
        print_success "Token Discord déjà configuré"
    else
        read -p "🔑 Token Discord: " DISCORD_TOKEN
        if [ -n "$DISCORD_TOKEN" ]; then
            sed -i "s/DISCORD_TOKEN=.*/DISCORD_TOKEN=$DISCORD_TOKEN/" .env
            print_success "Token Discord configuré"
        else
            print_warning "Token Discord non configuré. Vous devrez l'ajouter manuellement dans .env"
        fi
    fi
fi

# Créer les dossiers nécessaires
print_status "Création des dossiers..."
mkdir -p logs backups
chmod +x *.sh 2>/dev/null || true

# Test du bot
print_status "Test du bot..."
if npm test; then
    print_success "Tests passés avec succès !"
else
    print_error "Les tests ont échoué. Vérifiez la configuration."
    exit 1
fi

# Configuration PM2
print_status "Configuration PM2..."
if pm2 list | grep -q "star-citizen-bot"; then
    print_status "Bot déjà configuré dans PM2, redémarrage..."
    pm2 restart star-citizen-bot
else
    print_status "Démarrage du bot avec PM2..."
    pm2 start ecosystem.config.js
fi

pm2 save
pm2 startup | grep "sudo" | bash || print_warning "Configuration du démarrage automatique échouée"

# Afficher le statut
echo ""
print_success "Installation terminée !"
echo ""
echo "📊 Statut du bot:"
pm2 status star-citizen-bot

echo ""
echo "🎯 Prochaines étapes:"
echo "1. Invitez le bot sur votre serveur Discord"
echo "2. Testez les commandes: /help, /ships, /upgrade"
echo "3. Configurez les sauvegardes automatiques si nécessaire"
echo ""
echo "📝 Commandes utiles:"
echo "  pm2 logs star-citizen-bot    # Voir les logs"
echo "  pm2 monit                    # Monitoring en temps réel"
echo "  pm2 restart star-citizen-bot # Redémarrer le bot"
echo "  ./update.sh                  # Mettre à jour le bot"
echo "  ./backup.sh                  # Sauvegarder la base de données"
echo ""
echo "📍 Répertoire d'installation: $INSTALL_DIR"
echo ""
print_success "Le bot Star Citizen Upgrade Navigator est maintenant opérationnel ! 🚀"
