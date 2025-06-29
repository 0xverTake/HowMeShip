# 🚀 Guide de démarrage rapide

## 1. Créer un bot Discord

1. Allez sur https://discord.com/developers/applications
2. Cliquez sur "New Application"
3. Donnez un nom à votre application (ex: "Star Citizen Upgrade Navigator")
4. Allez dans l'onglet "Bot"
5. Cliquez sur "Add Bot"
6. Copiez le token du bot

## 2. Configuration

1. Copiez le fichier `.env.example` vers `.env`:
```bash
cp .env.example .env
```

2. Éditez le fichier `.env` et ajoutez votre token Discord:
```env
DISCORD_TOKEN=votre_token_discord_ici
```

## 3. Installation des dépendances

```bash
npm install
```

## 4. Test du bot

```bash
npm test
```

Si tout fonctionne, vous devriez voir:
```
🎉 Tous les tests sont passés avec succès !
```

## 5. Inviter le bot sur votre serveur

1. Dans Discord Developer Portal, allez dans "OAuth2" > "URL Generator"
2. Sélectionnez les scopes:
   - ✅ `bot`
   - ✅ `applications.commands`

3. Sélectionnez les permissions du bot:
   - ✅ `Send Messages`
   - ✅ `Use Slash Commands`
   - ✅ `Embed Links`
   - ✅ `Read Message History`

4. Copiez l'URL générée et ouvrez-la dans votre navigateur
5. Sélectionnez votre serveur et autorisez le bot

## 6. Démarrer le bot

```bash
npm start
```

Vous devriez voir:
```
🤖 Bot connecté en tant que VotreBot#1234
✅ Commandes slash déployées avec succès!
```

## 7. Tester les commandes

Dans Discord, tapez `/` et vous devriez voir les commandes du bot:
- `/help` - Affiche l'aide
- `/ships` - Liste les vaisseaux
- `/upgrade` - Trouve des upgrades
- `/price` - Affiche les prix

## 🔧 Commandes utiles

### Développement
```bash
npm run dev  # Démarre avec auto-reload
```

### Production
```bash
npm start    # Démarre le bot
```

### Test
```bash
npm test     # Lance les tests
```

## 📊 Vérification du fonctionnement

1. **Test de base**: `/help` - Doit afficher l'aide
2. **Test des vaisseaux**: `/ships` - Doit lister les vaisseaux
3. **Test de recherche**: `/ships search:aurora` - Doit trouver l'Aurora
4. **Test d'upgrade**: `/upgrade from:Aurora MR to:Avenger Titan` - Doit trouver des upgrades
5. **Test de prix**: `/price ship:Aurora MR` - Doit afficher les prix

## ⚠️ Résolution de problèmes

### Le bot ne se connecte pas
- Vérifiez que le token Discord est correct dans `.env`
- Vérifiez que le bot est activé dans Discord Developer Portal

### Les commandes n'apparaissent pas
- Attendez quelques minutes (les commandes slash peuvent prendre du temps à se synchroniser)
- Redémarrez Discord
- Vérifiez que le bot a les bonnes permissions

### Erreurs de base de données
- Supprimez le fichier `database.sqlite` et relancez le bot
- Vérifiez les permissions d'écriture dans le dossier

### Erreurs de scraping
- Les scrapers peuvent échouer si les sites changent leur structure
- C'est normal, le bot utilise des données de base en attendant

## 🎯 Prochaines étapes

1. **Personnalisation**: Modifiez les couleurs et messages dans les commandes
2. **Nouveaux scrapers**: Ajoutez d'autres sites de vente
3. **Fonctionnalités**: Ajoutez des alertes de prix, favoris, etc.
4. **Déploiement**: Hébergez le bot sur un serveur pour qu'il fonctionne 24/7

## 📞 Support

Si vous rencontrez des problèmes:
1. Consultez les logs du bot
2. Vérifiez la documentation Discord.js
3. Ouvrez une issue sur GitHub
