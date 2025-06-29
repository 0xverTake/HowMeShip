# 🚀 Star Citizen Upgrade Navigator Bot

Un bot Discord avancé pour Star Citizen qui permet de trouver les meilleurs chemins d'upgrades entre vaisseaux avec des prix en temps réel, des images et des caractéristiques détaillées.

## ✨ Fonctionnalités

### 🔍 Recherche d'Upgrades
- **Chemins d'upgrade optimisés** : Trouve les meilleurs chemins entre deux vaisseaux
- **Prix en temps réel** : Scraping automatique des prix depuis RSI, Star-Hangar et Space-Foundry
- **Analyse multi-étapes** : Support des upgrades en plusieurs étapes pour économiser de l'argent
- **Alertes de prix** : Notifications automatiques quand les prix baissent

### 🖼️ Affichage Enrichi
- **Images de vaisseaux** : Affichage automatique des images officielles RSI
- **Spécifications détaillées** : Dimensions, performance, armement, etc.
- **Embeds Discord riches** : Interface utilisateur moderne et intuitive
- **Comparaisons visuelles** : Compare deux vaisseaux côte à côte

### 🏪 Support Multi-Magasins
- **RSI Store** : Magasin officiel Roberts Space Industries
- **Star-Hangar** : Marché secondaire populaire
- **Space-Foundry** : Plateforme de trading communautaire

### 🤖 Commandes Discord

#### `/upgrade from:[vaisseau] to:[vaisseau]`
Trouve les meilleurs chemins d'upgrade entre deux vaisseaux.

**Options :**
- `stores` : Choisir les magasins à inclure
- `max_steps` : Nombre maximum d'étapes (1-5)
- `alert_price` : Créer une alerte de prix

**Exemple :**
```
/upgrade from:Aurora MR to:Cutlass Black stores:all max_steps:3
```

#### `/ship name:[vaisseau]`
Affiche les détails complets d'un vaisseau avec image et caractéristiques.

**Options :**
- `compact` : Affichage compact
- `no_image` : Masquer l'image

**Exemple :**
```
/ship name:Avenger Titan
```

#### `/compare ship1:[vaisseau] ship2:[vaisseau]`
Compare deux vaisseaux avec leurs caractéristiques détaillées.

**Exemple :**
```
/compare ship1:Aurora MR ship2:Avenger Titan
```

#### `/search query:[terme]`
Recherche des vaisseaux par nom, fabricant ou catégorie.

**Options :**
- `category` : Filtrer par catégorie
- `manufacturer` : Filtrer par fabricant
- `max_price` : Prix maximum

#### `/alerts`
Gère vos alertes de prix personnalisées.

**Sous-commandes :**
- `list` : Voir toutes vos alertes
- `remove` : Supprimer une alerte

#### `/stats`
Affiche les statistiques du bot et des données.

## 🛠️ Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Un token de bot Discord

### 1. Cloner le projet
```bash
git clone <repository-url>
cd HowMeShip
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration
Copiez `.env.example` vers `.env` et configurez :

```env
# Discord
DISCORD_TOKEN=votre_token_discord
DISCORD_CLIENT_ID=votre_client_id

# Base de données
DATABASE_PATH=./data/database.sqlite

# Scraping
SCRAPE_INTERVAL_HOURS=6
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36

# Alertes
ALERT_CHECK_INTERVAL_MINUTES=30
MAX_ALERTS_PER_USER=10

# Cache
CACHE_DURATION_HOURS=24
MAX_CACHE_SIZE_MB=100
```

### 4. Lancer le bot
```bash
npm start
```

## 🧪 Tests

### Test complet du système
```bash
node test-images.js
```

### Test d'un vaisseau spécifique
```bash
node test-images.js ship "Aurora MR"
```

### Nettoyage du cache
```bash
node test-images.js cleanup
```

## 📁 Structure du Projet

```
HowMeShip/
├── commands/           # Commandes Discord
│   ├── upgradeCommand.js
│   ├── shipCommand.js
│   ├── compareCommand.js
│   ├── searchCommand.js
│   └── alertsCommand.js
├── scrapers/           # Scrapers de données
│   ├── images/
│   │   └── shipImageScraper.js
│   ├── rsiScraper.js
│   ├── starHangarScraper.js
│   └── spaceFoundryScraper.js
├── services/           # Services métier
│   ├── upgradePathfinder.js
│   ├── priceAlertService.js
│   └── shipDisplayService.js
├── config/             # Configuration
│   └── database.js
├── data/               # Données et cache
│   ├── ship_images.json
│   ├── images/
│   └── database.sqlite
└── utils/              # Utilitaires
    └── shipsLoader.js
```

## 🎨 Fonctionnalités Avancées

### Système d'Images Intelligent
- **Cache local** : Images téléchargées et stockées localement
- **Fallback statique** : Base de données d'images prédéfinies
- **Optimisation** : Compression et redimensionnement automatique

### Algorithme d'Upgrade
- **Analyse de coût** : Calcul du coût total avec économies potentielles
- **Évaluation des risques** : Score de risque basé sur la disponibilité
- **Optimisation temporelle** : Estimation du temps nécessaire

### Système d'Alertes
- **Surveillance continue** : Vérification automatique des prix
- **Notifications intelligentes** : Alertes uniquement pour les bonnes affaires
- **Gestion utilisateur** : Limite et nettoyage automatique

## 🔧 Configuration Avancée

### Personnalisation des Scrapers
Modifiez les paramètres dans `config/scrapers.json` :

```json
{
  "rsi": {
    "enabled": true,
    "baseUrl": "https://robertsspaceindustries.com",
    "rateLimit": 2000
  },
  "starHangar": {
    "enabled": true,
    "baseUrl": "https://star-hangar.com",
    "rateLimit": 3000
  }
}
```

### Optimisation des Performances
- **Cache Redis** : Pour les déploiements à grande échelle
- **Base de données PostgreSQL** : Alternative à SQLite
- **Load balancing** : Support multi-instance

## 📊 Monitoring

### Logs
Les logs sont organisés par niveau :
- `INFO` : Opérations normales
- `WARN` : Problèmes non critiques
- `ERROR` : Erreurs nécessitant attention

### Métriques
- Nombre de requêtes par minute
- Taux de succès des scrapers
- Temps de réponse moyen
- Utilisation mémoire

## 🚀 Déploiement

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Heroku
```bash
heroku create your-bot-name
heroku config:set DISCORD_TOKEN=your_token
git push heroku main
```

### VPS/Serveur Dédié
```bash
# Avec PM2
npm install -g pm2
pm2 start index.js --name "star-citizen-bot"
pm2 startup
pm2 save
```

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Changelog

### v2.0.0 - Système d'Images et Caractéristiques
- ✨ Ajout du scraper d'images RSI
- ✨ Service d'affichage enrichi avec embeds
- ✨ Commande `/ship` avec détails complets
- ✨ Commande `/compare` pour comparer les vaisseaux
- ✨ Système de cache intelligent pour les images
- 🐛 Corrections diverses et optimisations

### v1.0.0 - Version Initiale
- ✨ Système de recherche d'upgrades
- ✨ Scrapers multi-magasins
- ✨ Alertes de prix
- ✨ Commandes Discord de base

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## ⚠️ Avertissement

Ce bot est un projet communautaire non officiel. Il n'est pas affilié à Cloud Imperium Games ou Roberts Space Industries. Utilisez-le de manière responsable et respectez les conditions d'utilisation des sites web scrapés.

## 🆘 Support

- **Issues GitHub** : Pour les bugs et demandes de fonctionnalités
- **Discord** : Rejoignez notre serveur communautaire
- **Documentation** : Wiki complet disponible

---

**Fait avec ❤️ pour la communauté Star Citizen**
