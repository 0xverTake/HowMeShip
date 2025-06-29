# 🔄 Commande `/upgrade` - Upgrade Navigator

## ✨ Nouvelle Fonctionnalité

La commande `/upgrade` utilise l'API du site **upgrade-navigator.com** pour trouver les chemins d'upgrade entre deux vaisseaux avec les **prix en temps réel**.

## 🎯 Utilisation

```bash
/upgrade from:Aurora to:Avenger stores:all
```

### Paramètres :

- **`from`** : Vaisseau de départ (avec autocomplétion)
- **`to`** : Vaisseau de destination (avec autocomplétion)  
- **`stores`** : Magasins à inclure (optionnel)

### Options de magasins :

- **`all`** : Tous les magasins (par défaut)
- **`star-hangar`** : Star-Hangar uniquement (marché gris)
- **`rsi`** : RSI Pledge Store uniquement (officiel)
- **`space-foundry`** : Space Foundry uniquement
- **`star-hangar,rsi`** : Combinaison optimale

## 🎮 Exemples d'utilisation

```bash
# Upgrade basique
/upgrade from:Aurora to:Avenger

# Upgrade avec magasin spécifique
/upgrade from:Mustang to:Cutlass stores:star-hangar

# Upgrade haut de gamme
/upgrade from:Constellation to:Hammerhead stores:all
```

## 🔄 Fonctionnalités

### ✅ Ce que fait la commande :

1. **Validation** : Vérifie que les vaisseaux existent dans notre base UEX Corp
2. **Connexion API** : Se connecte à upgrade-navigator.com
3. **Recherche ID** : Trouve les IDs correspondants sur le site
4. **Récupération** : Obtient les chemins d'upgrade avec prix
5. **Affichage** : Présente les résultats dans un embed Discord

### 📊 Informations affichées :

- **Vaisseaux** : Détails complets des vaisseaux (fabricant, catégorie, équipage)
- **Prix** : Prix en temps réel depuis les magasins
- **Chemins** : Différentes options d'upgrade disponibles
- **Magasins** : Comparaison entre Star-Hangar, RSI, Space Foundry
- **Lien direct** : Vers la page upgrade-navigator.com

## 🛠️ Architecture technique

### Intégration avec l'existant :

- **Base UEX Corp** : Utilise nos données de vaisseaux pour la validation
- **Autocomplétion** : Même système que les autres commandes
- **API Upgrade Navigator** : Interface déjà créée dans `scrapers/upgradeNavigatorAPI.js`

### Gestion des erreurs :

- **Vaisseaux manquants** : Message d'erreur clair
- **API indisponible** : Fallback gracieux
- **Timeout** : Gestion des délais d'attente

## 🔍 Comparaison avec l'existant

| Fonctionnalité | `/upgrade` | `/upgrade-alert` | `/compare` |
|----------------|------------|------------------|------------|
| **Prix temps réel** | ✅ | ✅ | ❌ |
| **Magasins multiples** | ✅ | ✅ | ❌ |
| **Chemins d'upgrade** | ✅ | ✅ | ❌ |
| **Notifications** | ❌ | ✅ | ❌ |
| **Comparaison specs** | ❌ | ❌ | ✅ |

## 🎯 Prochaines améliorations

1. **Menu interactif** : Changement de magasins en temps réel
2. **Historique** : Suivi des prix dans le temps
3. **Favoris** : Sauvegarder les chemins d'upgrade populaires
4. **Notifications** : Intégration avec le système d'alertes

## 🚀 Commandes disponibles

Maintenant, votre bot a **7 commandes** :

1. **`/ship`** - Recherche de vaisseau
2. **`/ships`** - Liste des vaisseaux
3. **`/compare`** - Comparaison de vaisseaux
4. **`/upgrade`** - **🆕 Chemins d'upgrade temps réel**
5. **`/upgrade-alert`** - Alertes de prix
6. **`/guides`** - Guides auto-mis à jour
7. **`/help`** - Aide

---

**Le bot est maintenant un Upgrade Navigator complet !** 🎉
