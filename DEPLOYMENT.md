# 🚀 Déploiement sur VPS Debian

Ce guide vous explique comment déployer le bot Star Citizen Upgrade Navigator sur votre VPS Debian.

## 📋 Prérequis

### 1. Accès au VPS
```bash
ssh votre_utilisateur@votre_vps_ip
```

### 2. Mise à jour du système
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Installation de Node.js
```bash
# Installer Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

### 4. Installation de Git
```bash
sudo apt install git -y
```

### 5. Installation de PM2 (gestionnaire de processus)
```bash
sudo npm install -g pm2
```

## 📦 Déploiement du bot

### 1. Cloner le projet
```bash
# Aller dans le répertoire home
cd ~

# Cloner le projet (remplacez par votre repository)
git clone https://github.com/votre-username/star-citizen-upgrade-bot.git
cd star-citizen-upgrade-bot
```

### 2. Installation des dépendances
```bash
npm install --production
```

### 3. Configuration
```bash
# Copier le fichier de configuration
cp .env.example .env

# Éditer la configuration
nano .env
```

Ajoutez votre token Discord :
```env
DISCORD_TOKEN=votre_token_discord_ici
DATABASE_PATH=./database.sqlite
SCRAPE_INTERVAL_HOURS=6
```

### 4. Test du bot
```bash
npm test
```

Si tout fonctionne, vous devriez voir :
```
🎉 Tous les tests sont passés avec succès !
```

### 5. Démarrage avec PM2
```bash
# Démarrer le bot avec PM2
pm2 start index.js --name "star-citizen-bot"

# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs star-citizen-bot
```

## 🔧 Configuration PM2

### 1. Fichier de configuration PM2
Créez un fichier `ecosystem.config.js` :

```bash
nano ecosystem.config.js
```

Contenu :
```javascript
module.exports = {
  apps: [{
    name: 'star-citizen-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 2. Créer le dossier de logs
```bash
mkdir logs
```

### 3. Démarrer avec la configuration
```bash
pm2 start ecosystem.config.js
```

### 4. Sauvegarder la configuration PM2
```bash
pm2 save
pm2 startup
```

Suivez les instructions affichées pour configurer le démarrage automatique.

## 🔒 Sécurité

### 1. Créer un utilisateur dédié
```bash
# Créer un utilisateur pour le bot
sudo adduser botuser

# Changer vers cet utilisateur
sudo su - botuser

# Répéter les étapes de déploiement
```

### 2. Configuration du firewall
```bash
# Installer UFW si pas déjà fait
sudo apt install ufw -y

# Autoriser SSH
sudo ufw allow ssh

# Autoriser HTTP/HTTPS si nécessaire
sudo ufw allow 80
sudo ufw allow 443

# Activer le firewall
sudo ufw enable
```

### 3. Permissions des fichiers
```bash
# Définir les bonnes permissions
chmod 600 .env
chmod 755 index.js
```

## 📊 Monitoring

### 1. Commandes PM2 utiles
```bash
# Voir le statut
pm2 status

# Voir les logs en temps réel
pm2 logs star-citizen-bot --lines 50

# Redémarrer le bot
pm2 restart star-citizen-bot

# Arrêter le bot
pm2 stop star-citizen-bot

# Supprimer le bot de PM2
pm2 delete star-citizen-bot

# Voir les métriques
pm2 monit
```

### 2. Logs du système
```bash
# Voir les logs du bot
tail -f logs/combined.log

# Voir les erreurs
tail -f logs/err.log
```

## 🔄 Mise à jour

### 1. Script de mise à jour
Créez un fichier `update.sh` :

```bash
nano update.sh
```

Contenu :
```bash
#!/bin/bash
echo "🔄 Mise à jour du bot Star Citizen..."

# Arrêter le bot
pm2 stop star-citizen-bot

# Sauvegarder la base de données
cp database.sqlite database.sqlite.backup

# Récupérer les dernières modifications
git pull origin main

# Installer les nouvelles dépendances
npm install --production

# Redémarrer le bot
pm2 start star-citizen-bot

echo "✅ Mise à jour terminée !"
```

Rendre le script exécutable :
```bash
chmod +x update.sh
```

### 2. Utilisation
```bash
./update.sh
```

## 🔧 Dépannage

### 1. Le bot ne démarre pas
```bash
# Vérifier les logs
pm2 logs star-citizen-bot

# Vérifier la configuration
cat .env

# Tester manuellement
node index.js
```

### 2. Problèmes de permissions
```bash
# Vérifier les permissions
ls -la

# Corriger si nécessaire
chmod 755 index.js
chmod 600 .env
```

### 3. Problèmes de base de données
```bash
# Supprimer la base de données corrompue
rm database.sqlite

# Redémarrer le bot (il recréera la base)
pm2 restart star-citizen-bot
```

### 4. Problèmes de mémoire
```bash
# Vérifier l'utilisation mémoire
pm2 monit

# Augmenter la limite si nécessaire
pm2 delete star-citizen-bot
pm2 start index.js --name "star-citizen-bot" --max-memory-restart 2G
```

## 📈 Optimisations

### 1. Configuration Nginx (optionnel)
Si vous voulez ajouter une interface web plus tard :

```bash
sudo apt install nginx -y
```

### 2. Sauvegarde automatique
Créez un script de sauvegarde :

```bash
nano backup.sh
```

Contenu :
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp database.sqlite backups/database_$DATE.sqlite
# Garder seulement les 7 dernières sauvegardes
ls -t backups/database_*.sqlite | tail -n +8 | xargs rm -f
```

Ajouter au crontab :
```bash
crontab -e
```

Ajouter :
```
0 2 * * * /home/botuser/star-citizen-upgrade-bot/backup.sh
```

## ✅ Vérification finale

1. **Bot en ligne** : `pm2 status` doit montrer "online"
2. **Discord** : Le bot doit apparaître en ligne sur Discord
3. **Commandes** : Tester `/help` sur Discord
4. **Logs** : `pm2 logs` ne doit pas montrer d'erreurs
5. **Auto-restart** : `pm2 save` et `pm2 startup` configurés

## 🆘 Support

En cas de problème :
1. Vérifiez les logs : `pm2 logs star-citizen-bot`
2. Testez manuellement : `node index.js`
3. Vérifiez la configuration : `cat .env`
4. Redémarrez : `pm2 restart star-citizen-bot`

Le bot devrait maintenant fonctionner 24/7 sur votre VPS Debian ! 🚀
