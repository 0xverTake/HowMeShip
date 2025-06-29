# 🚀 Services d'Alertes d'Upgrades - Guide d'Activation

## ✅ Services Ajoutés

1. **`services/upgradePriceService.js`** - Service principal pour les alertes d'upgrades
2. **`commands/upgradeAlertCommand.js`** - Commande Discord `/upgrade-alert`
3. **`scrapers/upgradeNavigatorAPI.js`** - Interface avec l'API Upgrade Navigator
4. **`index.js`** - Fichier principal mis à jour

## 🔧 Modifications Apportées

### Dans `index.js` :
- ✅ Remplacement des anciens services obsolètes
- ✅ Ajout du service `UpgradePriceService`
- ✅ Démarrage automatique des alertes toutes les 30 minutes
- ✅ Vérification périodique des prix par cron job

### Nouvelles fonctionnalités :
- ✅ Surveillance des prix sur Star-Hangar, RSI, Space Foundry
- ✅ Alertes par DM Discord quand le prix cible est atteint
- ✅ Historique des prix en base de données
- ✅ Gestion complète des alertes par utilisateur

## 📋 Commandes Disponibles

```bash
# Créer une alerte
/upgrade-alert create from:Aurora to:Avenger max_price:25 stores:star-hangar,rsi

# Lister ses alertes
/upgrade-alert list

# Supprimer une alerte
/upgrade-alert delete alert_id:1

# Vérifier un prix immédiatement
/upgrade-alert check from:100i to:125a
```

## 🏪 Magasins Supportés

- **Star-Hangar** : Marché gris avec prix réduits
- **RSI Pledge Store** : Magasin officiel
- **Space Foundry** : Magasin alternatif

## 🔄 Comment ça fonctionne

1. **Utilisateur crée une alerte** : `/upgrade-alert create from:Ship1 to:Ship2 max_price:100`
2. **Bot surveille automatiquement** : Vérification toutes les 30 minutes
3. **Prix détecté** : Quand le prix ≤ seuil, envoi d'un DM
4. **Historique sauvegardé** : Tous les prix sont enregistrés

## 🚀 Démarrage du Bot

Le bot est maintenant configuré pour démarrer automatiquement les services d'alertes :

```bash
node index.js
```

Le bot va :
1. ✅ Charger les commandes (5 commandes disponibles)
2. ✅ Initialiser le service d'alertes
3. ✅ Démarrer la surveillance automatique (30 min)
4. ✅ Programmer les vérifications par cron job

## 📊 Base de Données

Nouvelles tables créées automatiquement :
- **`upgrade_alerts`** : Alertes des utilisateurs
- **`price_history`** : Historique des prix

## 🎯 Prêt à l'Utilisation

Le bot est maintenant prêt avec :
- ✅ Données UEX Corp (242 vaisseaux)
- ✅ Service d'alertes d'upgrades
- ✅ Surveillance automatique des prix
- ✅ Notifications Discord par DM
- ✅ Commandes slash intégrées

**Pour démarrer le bot :** `node index.js`
