# Scripts de Collecte de Données Star Citizen 4.2

Ce dossier contient des scripts pour télécharger et organiser toutes les données nécessaires pour le bot Discord HowMeShip, incluant les informations sur les vaisseaux, leurs images et les données de scrap/recyclage pour Star Citizen version 4.2.

## 🚀 Démarrage Rapide

Pour télécharger toutes les données en une seule commande :

```bash
node scripts/fetch-all-data.js
```

## 📋 Scripts Disponibles

### 1. `fetch-all-data.js` - Script Principal
**Recommandé** - Exécute tous les autres scripts dans le bon ordre.

```bash
node scripts/fetch-all-data.js
```

**Ce qu'il fait :**
- Vérifie les prérequis
- Exécute tous les scripts de collecte de données
- Affiche un résumé complet des données téléchargées
- Gère les erreurs et fournit des conseils de dépannage

### 2. `fetch-sc-ships-data.js` - Données des Vaisseaux
Télécharge les spécifications techniques complètes de tous les vaisseaux depuis le repository officiel StarCitizenWiki.

```bash
node scripts/fetch-sc-ships-data.js
```

**Sources de données :**
- Repository GitHub : `StarCitizenWiki/scunpacked-data`
- Version : 4.2.0-LIVE.9873572
- Format : JSON avec métadonnées complètes

**Fichiers générés :**
- `data/sc-ships-4.2/all-ships-4.2.json` - Données complètes consolidées
- `data/sc-ships-4.2/ships-index.json` - Index simplifié pour recherche rapide
- `data/sc-ships-4.2/*.json` - Fichiers individuels par vaisseau

### 3. `fetch-ship-images.js` - Images des Vaisseaux
Télécharge les images officielles des vaisseaux (thumbnails, profils, hangar).

```bash
node scripts/fetch-ship-images.js
```

**Sources d'images :**
- RSI Media CDN (images officielles)
- Community CDN (images communautaires)
- Types d'images : thumbnail, profile, hangar

**Fichiers générés :**
- `data/sc-ships-4.2/images/` - Dossier contenant toutes les images
- `data/sc-ships-4.2/images-index.json` - Index des images téléchargées
- `data/sc-ships-4.2/image-download-results.json` - Rapport détaillé

### 4. `fetch-scrap-data.js` - Données de Scrap/Recyclage
Génère des données estimées de recyclage basées sur les spécifications des vaisseaux.

```bash
node scripts/fetch-scrap-data.js
```

**Calculs basés sur :**
- Taille et masse du vaisseau
- Fabricant (qualité des matériaux)
- Rôle (complexité technologique)
- Santé/résistance

**Fichiers générés :**
- `data/sc-ships-4.2/scrap-data.json` - Données complètes de scrap
- `data/sc-ships-4.2/scrap-index.json` - Index trié par valeur

## 📁 Structure des Données Générées

```
data/sc-ships-4.2/
├── all-ships-4.2.json          # Données complètes de tous les vaisseaux
├── ships-index.json             # Index simplifié des vaisseaux
├── images-index.json            # Index des images téléchargées
├── image-download-results.json  # Rapport de téléchargement d'images
├── scrap-data.json             # Données complètes de scrap
├── scrap-index.json            # Index des valeurs de scrap
├── images/                     # Dossier des images
│   ├── aegs_avenger_titan_thumbnail.jpg
│   ├── aegs_avenger_titan_profile.jpg
│   └── ... (autres images)
└── *.json                      # Fichiers individuels par vaisseau
```

## 🔧 Prérequis

- **Node.js** version 14 ou supérieure
- **Connexion Internet** pour télécharger les données
- **Espace disque** : ~500 MB pour toutes les données et images

## 📊 Données Collectées

### Spécifications des Vaisseaux
- Nom, fabricant, rôle, carrière
- Dimensions (longueur, largeur, hauteur)
- Masse, capacité de cargo
- Équipage min/max
- Caractéristiques de vol (vitesse SCM, vitesse max)
- Points de vie (coque, boucliers)
- Armement et défenses
- Composants (moteurs, générateurs, etc.)

### Images des Vaisseaux
- **Thumbnail** : Image de présentation (storefront)
- **Profile** : Vue de profil haute qualité
- **Hangar** : Vue dans le hangar (si disponible)

### Données de Scrap/Recyclage
- Valeur totale estimée (en aUEC)
- Valeur par tonne
- Composition des matériaux :
  - Coque (Acier, Aluminium, Titane, Tungstène)
  - Électronique (Cuivre, Or, Argent, Terres rares)
  - Générateur (Uranium, Plutonium, Matériaux de fusion)
  - Armement (Acier, Tungstène, Alliages rares)
  - Divers (Plastiques, Céramiques, Composites)
- Informations de salvage :
  - Temps estimé de récupération
  - Vaisseau de salvage requis
  - Niveau de difficulté
  - Dangers potentiels
- Données de marché :
  - Niveau de demande
  - Volatilité des prix
  - Meilleurs marchés

## 🛠️ Utilisation dans HowMeShip

Ces données peuvent être intégrées dans votre bot Discord HowMeShip :

### 1. Charger les données
```javascript
const shipsData = require('./data/sc-ships-4.2/ships-index.json');
const scrapData = require('./data/sc-ships-4.2/scrap-index.json');
const imagesData = require('./data/sc-ships-4.2/images-index.json');
```

### 2. Recherche de vaisseaux
```javascript
function findShip(name) {
    return shipsData.find(ship => 
        ship.name.toLowerCase().includes(name.toLowerCase()) ||
        ship.className.toLowerCase().includes(name.toLowerCase())
    );
}
```

### 3. Affichage avec images
```javascript
function getShipImage(className, type = 'thumbnail') {
    const imageInfo = imagesData[className];
    if (imageInfo && imageInfo.images[type]) {
        return `./data/sc-ships-4.2/images/${imageInfo.images[type].filename}`;
    }
    return null;
}
```

### 4. Données de scrap
```javascript
function getScrapValue(className) {
    return scrapData.find(ship => ship.className === className);
}
```

## 🔄 Mise à Jour des Données

Pour mettre à jour les données avec les dernières informations :

```bash
# Supprimer les anciennes données (optionnel)
rm -rf data/sc-ships-4.2/

# Télécharger les nouvelles données
node scripts/fetch-all-data.js
```

## ⚠️ Notes Importantes

1. **Données de Scrap** : Les valeurs de scrap sont **estimées** basées sur les spécifications des vaisseaux. Elles ne reflètent pas les valeurs exactes du jeu.

2. **Images** : Certaines images peuvent ne pas être disponibles pour tous les vaisseaux. Le script télécharge ce qui est disponible.

3. **Versions** : Ces scripts sont optimisés pour Star Citizen 4.2. Pour d'autres versions, vous devrez peut-être ajuster les URLs et les noms de fichiers.

4. **Limites de taux** : Les scripts incluent des pauses pour éviter de surcharger les serveurs. Le téléchargement complet peut prendre plusieurs minutes.

## 🐛 Dépannage

### Erreur de connexion
```
Error: getaddrinfo ENOTFOUND
```
**Solution** : Vérifiez votre connexion Internet et réessayez.

### Fichiers manquants
```
Script manquant: scripts/fetch-*.js
```
**Solution** : Assurez-vous que tous les scripts sont présents dans le dossier `scripts/`.

### Erreur de permissions
```
Error: EACCES: permission denied
```
**Solution** : Vérifiez les permissions du dossier ou exécutez avec des privilèges appropriés.

### Images non téléchargées
**Solution** : Certaines URLs d'images peuvent être obsolètes. C'est normal, le script continue avec les images disponibles.

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez que Node.js est installé : `node --version`
2. Vérifiez votre connexion Internet
3. Consultez les logs d'erreur pour plus de détails
4. Essayez d'exécuter les scripts individuellement pour isoler le problème

## 📝 Licence

Ces scripts sont fournis pour usage personnel et éducatif. Les données Star Citizen appartiennent à Cloud Imperium Games.
