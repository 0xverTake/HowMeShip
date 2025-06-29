# 🚀 Guide d'Installation Rapide - HowMeShip

Ce guide vous permettra d'installer et configurer le bot Discord HowMeShip en quelques minutes.

## 📋 Prérequis

- **Node.js 18+** : [Télécharger ici](https://nodejs.org/)
- **Git** : [Télécharger ici](https://git-scm.com/)
- **Compte Discord Developer** : [Portal Discord](https://discord.com/developers/applications)

## 🔧 Installation

### 1. Cloner le projet
```bash
git clone https://github.com/votre-repo/HowMeShip.git
cd HowMeShip
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Créer un bot Discord

1. Aller sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquer sur "New Application"
3. Donner un nom à votre application (ex: "HowMeShip")
4. Aller dans l'onglet "Bot"
5. Cliquer sur "Add Bot"
6. Copier le token du bot

### 4. Configurer les variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env
nano .env  # ou votre éditeur préféré
```

Remplacer `your_discord_bot_token_here` par votre token Discord :
```env
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWx
```

### 5. Inviter le bot sur votre serveur

1. Dans le Discord Developer Portal, aller dans "OAuth2" > "URL Generator"
2. Sélectionner les scopes :
   - `bot`
   - `applications.commands`
3. Sélectionner les permissions :
   - `Send Messages`
   - `Use Slash Commands`
   - `Send Messages in Threads`
   - `Embed Links`
   - `Read Message History`
4. Copier l'URL générée et l'ouvrir dans votre navigateur
5. Sélectionner votre serveur et autoriser le bot

### 6. Tester l'installation

```bash
npm test
```

Vous devriez voir :
```
🎉 Tous les tests sont passés avec succès !
```

### 7. Démarrer le bot

```bash
npm start
```

Vous devriez voir :
```
🤖 Bot connecté en tant que HowMeShip#1234
✅ Commandes slash déployées avec succès!
🚀 Démarrage du service d'alertes de prix...
```

## 🎮 Premier Test

Dans votre serveur Discord, tapez :
```
/upgrade from:Aurora MR to:Cutlass Black
```

Le bot devrait répondre avec une analyse complète des chemins d'upgrade !

## 🔧 Configuration Avancée

### Variables d'environnement optionnelles

```env
# Fréquence de scraping (en heures)
SCRAPE_INTERVAL_HOURS=6

# Intervalle de vérification des alertes (en minutes)
ALERT_CHECK_INTERVAL_MINUTES=30

# Nombre maximum d'alertes par utilisateur
MAX_ALERTS_PER_USER=10

# Délai entre les requêtes de scraping (en ms)
SCRAPER_DELAY_MS=2000

# Timeout des requêtes (en ms)
SCRAPER_TIMEOUT_MS=30000

# Nombre de tentatives en cas d'échec
SCRAPER_RETRY_COUNT=3

# Mode debug
DEBUG=true
LOG_LEVEL=debug
```

### URLs personnalisées des magasins

Si vous voulez utiliser des URLs spécifiques :
```env
RSI_BASE_URL=https://robertsspaceindustries.com
STAR_HANGAR_BASE_URL=https://star-hangar.com
SPACE_FOUNDRY_BASE_URL=https://spacefoundry.com
```

## 🐛 Résolution de Problèmes

### Le bot ne se connecte pas
- Vérifiez que le token Discord est correct
- Assurez-vous que le bot est activé dans le Developer Portal

### Erreur "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erreur de permissions Discord
- Vérifiez que le bot a les bonnes permissions sur votre serveur
- Re-générez le lien d'invitation avec les bonnes permissions

### Les commandes slash n'apparaissent pas
- Attendez quelques minutes (peut prendre jusqu'à 1 heure)
- Redémarrez Discord
- Vérifiez les logs du bot pour des erreurs

### Erreur de base de données
```bash
rm -rf data/ships.db
npm test
```

## 📊 Monitoring

### Logs du bot
Les logs sont affichés dans la console. Pour un monitoring avancé :

```bash
# Avec PM2 (recommandé pour la production)
npm install -g pm2
pm2 start index.js --name "howmeship"
pm2 logs howmeship
```

### Statistiques des alertes
Utilisez la commande `/alert stats` (admin uniquement) pour voir :
- Nombre d'alertes actives
- Utilisateurs uniques
- Taux de déclenchement

## 🔄 Mise à Jour

```bash
git pull origin main
npm install
npm test
npm start
```

## 🆘 Support

### Problèmes courants

**Q: Le scraping ne fonctionne pas**
R: Vérifiez votre connexion internet et les URLs des magasins

**Q: Les alertes ne se déclenchent pas**
R: Vérifiez que le service d'alertes est démarré dans les logs

**Q: Erreur "Rate limited"**
R: Augmentez `SCRAPER_DELAY_MS` dans votre `.env`

### Obtenir de l'aide

1. **GitHub Issues** : [Créer un issue](https://github.com/votre-repo/HowMeShip/issues)
2. **Discord** : Rejoignez notre serveur de support
3. **Documentation** : Consultez le README.md complet

## 🎯 Prochaines Étapes

Une fois le bot installé :

1. **Testez les commandes** : Essayez `/upgrade` et `/alert`
2. **Configurez les alertes** : Créez vos premières alertes de prix
3. **Invitez des amis** : Partagez le bot avec votre organisation
4. **Personnalisez** : Ajustez la configuration selon vos besoins

---

**Félicitations ! 🎉 Votre bot HowMeShip est maintenant opérationnel !**

Pour toute question, n'hésitez pas à consulter la documentation complète ou à nous contacter.
