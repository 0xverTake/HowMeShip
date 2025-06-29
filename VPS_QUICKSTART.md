# 🚀 Démarrage rapide sur VPS Debian

Guide ultra-rapide pour déployer le bot Star Citizen Upgrade Navigator sur votre VPS Debian.

## ⚡ Installation en une commande

```bash
# Télécharger et exécuter le script d'installation
curl -sSL https://raw.githubusercontent.com/votre-repo/install.sh | bash
```

**OU** installation manuelle :

## 📋 Installation manuelle (5 minutes)

### 1. Connexion au VPS
```bash
ssh votre_utilisateur@votre_vps_ip
```

### 2. Installation des prérequis
```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Installation de PM2
sudo npm install -g pm2
```

### 3. Téléchargement du bot
```bash
# Cloner le projet
git clone https://github.com/votre-repo/star-citizen-upgrade-bot.git
cd star-citizen-upgrade-bot

# Installation des dépendances
npm install --production
```

### 4. Configuration
```bash
# Copier la configuration
cp .env.example .env

# Éditer la configuration
nano .env
```

Ajouter votre token Discord :
```env
DISCORD_TOKEN=votre_token_discord_ici
```

### 5. Test et démarrage
```bash
# Tester le bot
npm test

# Rendre les scripts exécutables
chmod +x *.sh

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration
pm2 save
pm2 startup
```

## 🎯 Vérification rapide

```bash
# Statut du bot
pm2 status

# Logs en temps réel
pm2 logs star-citizen-bot

# Monitoring
pm2 monit
```

## 🔧 Commandes essentielles

```bash
# Redémarrer le bot
pm2 restart star-citizen-bot

# Mettre à jour le bot
./update.sh

# Sauvegarder la base de données
./backup.sh

# Voir les logs
pm2 logs star-citizen-bot --lines 100
```

## 🤖 Configuration Discord

1. **Créer le bot** : https://discord.com/developers/applications
2. **Copier le token** dans `.env`
3. **Inviter le bot** avec les permissions :
   - `bot`
   - `applications.commands`
   - `Send Messages`
   - `Use Slash Commands`
   - `Embed Links`

## 📊 URLs d'invitation

Générer l'URL d'invitation dans Discord Developer Portal :
```
https://discord.com/api/oauth2/authorize?client_id=VOTRE_BOT_ID&permissions=2147485696&scope=bot%20applications.commands
```

## 🔒 Sécurité recommandée

```bash
# Créer un utilisateur dédié
sudo adduser botuser
sudo su - botuser

# Configurer le firewall
sudo ufw allow ssh
sudo ufw enable

# Permissions des fichiers
chmod 600 .env
chmod 755 *.js
```

## 📈 Monitoring avancé

```bash
# Installer htop pour le monitoring système
sudo apt install htop

# Voir l'utilisation des ressources
htop

# Espace disque
df -h

# Mémoire
free -h
```

## 🔄 Sauvegarde automatique

Ajouter au crontab pour des sauvegardes quotidiennes :
```bash
crontab -e
```

Ajouter :
```
0 2 * * * /home/votre_utilisateur/star-citizen-upgrade-bot/backup.sh
```

## 🆘 Dépannage express

### Bot ne démarre pas
```bash
# Vérifier les logs
pm2 logs star-citizen-bot

# Tester manuellement
node index.js

# Vérifier la config
cat .env
```

### Commandes Discord ne marchent pas
```bash
# Redémarrer le bot
pm2 restart star-citizen-bot

# Vérifier le token Discord
grep DISCORD_TOKEN .env
```

### Base de données corrompue
```bash
# Sauvegarder l'ancienne
mv database.sqlite database.sqlite.old

# Redémarrer (recrée la base)
pm2 restart star-citizen-bot
```

## 📱 Test des fonctionnalités

Une fois le bot en ligne, testez dans Discord :

1. `/help` - Doit afficher l'aide
2. `/ships` - Doit lister les vaisseaux
3. `/ships search:aurora` - Doit trouver les Aurora
4. `/upgrade from:Aurora MR to:Avenger Titan` - Doit trouver des upgrades
5. `/price ship:Aurora MR` - Doit afficher les prix

## 🎉 Félicitations !

Votre bot Star Citizen Upgrade Navigator est maintenant opérationnel 24/7 sur votre VPS !

### Prochaines étapes :
- [ ] Inviter le bot sur vos serveurs Discord
- [ ] Configurer les sauvegardes automatiques
- [ ] Surveiller les performances avec `pm2 monit`
- [ ] Personnaliser les couleurs et messages si souhaité

### Support :
- Logs : `pm2 logs star-citizen-bot`
- Statut : `pm2 status`
- Redémarrage : `pm2 restart star-citizen-bot`
- Mise à jour : `./update.sh`

**Le bot scrape automatiquement les prix toutes les 6 heures et fonctionne en continu !** 🚀
