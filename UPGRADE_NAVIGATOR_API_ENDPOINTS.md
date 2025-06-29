# 🚀 Upgrade Navigator API - Documentation Complète

## 📋 Table des Matières
- [Endpoints Découverts](#endpoints-découverts)
- [Configuration API](#configuration-api)
- [Endpoints Fonctionnels](#endpoints-fonctionnels)
- [Exemples d'Utilisation](#exemples-dutilisation)
- [Structures de Données](#structures-de-données)
- [Guide d'Implémentation](#guide-dimplémentation)

---

## 🔗 Endpoints Découverts

### **Configuration API du Site**
```javascript
const apiConfig = {
    shipsUrl: "/ajax/getShips",
    itemsUrl: "/ajax/getPath"
};
```

### **Endpoints Principaux**

| Endpoint | Méthode | Statut | Description |
|----------|---------|---------|-------------|
| `/ajax/getShips` | GET | ✅ **FONCTIONNEL** | Récupère tous les vaisseaux |
| `/ajax/getStores` | GET | ✅ **FONCTIONNEL** | Récupère les magasins |
| `/ajax/getPath` | POST | ⚠️ **À TESTER** | Calcule le chemin d'upgrade |

### **Endpoints Testés**

#### ✅ **Fonctionnels**
- **`GET /ajax/getShips`**
  - Retourne: JSON Array de 229 vaisseaux
  - Format: `[{id, name, price, image, listPrice, description}, ...]`
  - Status: 200 OK

- **`GET /ajax/getStores`** 
  - Retourne: HTML des magasins
  - Format: `<div id="1" class="un-filter-item active"><p>Star-Hangar</p></div>`
  - Status: 200 OK

#### ❌ **Non Fonctionnels**
- `/ajax/getUpgrades` - 404
- `/ajax/getUpgradePaths` - 404
- `/ajax/calculateUpgrade` - 404
- `/ajax/findBestPath` - 404
- `/ajax/getPricing` - 404
- `/api/ccu` - 404
- `/api/upgrade-chains` - 404

---

## 📊 Structures de Données

### **Vaisseau (Ship)**
```json
{
  "id": 1,
  "price": "$0.00",
  "image": "/shipImage/display/1",
  "name": "100i",
  "listPrice": 50,
  "description": ""
}
```

### **Magasin (Store)**
```html
<div id="1" class="un-filter-item active">
    <p>Star-Hangar</p>
</div>
<div id="2" class="un-filter-item active">
    <p>RSI Pledge-Store</p>
</div>
<div id="3" class="un-filter-item">
    <p>Space Foundry</p>
</div>
```

**Structure Parsée:**
```json
{
  "id": 1,
  "name": "Star-Hangar",
  "active": true
}
```

---

## 🧪 Exemples d'Utilisation

### **1. Récupérer tous les vaisseaux**
```javascript
const response = await axios.get('https://upgrade-navigator.com/ajax/getShips', {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    }
});

// Retourne un tableau de 229 vaisseaux
console.log(response.data.length); // 229
console.log(response.data[0]); // {id: 1, name: "100i", ...}
```

### **2. Récupérer les magasins**
```javascript
const response = await axios.get('https://upgrade-navigator.com/ajax/getStores', {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
});

// Parser le HTML pour extraire les magasins
const storeMatches = response.data.match(/<div id="(\\d+)" class="un-filter-item[^"]*">\\s*<p>([^<]+)<\\/p>/g);
const stores = storeMatches.map(match => {
    const idMatch = match.match(/id="(\\d+)"/);
    const nameMatch = match.match(/<p>([^<]+)<\\/p>/);
    return {
        id: parseInt(idMatch[1]),
        name: nameMatch[1],
        active: match.includes('active')
    };
});
```

### **3. Calculer un chemin d'upgrade (à tester)**
```javascript
const formData = new URLSearchParams();
formData.append('from', '1');  // ID du vaisseau de départ
formData.append('to', '2');    // ID du vaisseau de destination
formData.append('stores', '1,2,3'); // IDs des magasins

const response = await axios.post('https://upgrade-navigator.com/ajax/getPath', formData, {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
});
```

---

## 🛠️ Guide d'Implémentation

### **Headers Requis**
```javascript
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'en-US,en;q=0.9'
};

// Pour les requêtes POST
const postHeaders = {
    ...headers,
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Requested-With': 'XMLHttpRequest'
};
```

### **Gestion des Erreurs**
```javascript
try {
    const response = await axios.get(url, { headers, timeout: 10000 });
    return response.data;
} catch (error) {
    if (error.response) {
        console.log(`Erreur ${error.response.status}: ${error.response.statusText}`);
    } else {
        console.log(`Erreur réseau: ${error.message}`);
    }
    return null;
}
```

### **Parsing des Magasins**
```javascript
function parseStores(html) {
    const regex = /<div id="(\\d+)" class="un-filter-item([^"]*)">[\\s]*<p>([^<]+)<\\/p>/g;
    const stores = [];
    let match;
    
    while ((match = regex.exec(html)) !== null) {
        stores.push({
            id: parseInt(match[1]),
            name: match[3].trim(),
            active: match[2].includes('active')
        });
    }
    
    return stores;
}
```

---

## 🔍 Analyse du Comportement

### **Workflow du Site**
1. **Chargement initial** : Récupère la liste des vaisseaux via `/ajax/getShips`
2. **Sélection des magasins** : Affiche les magasins via `/ajax/getStores`
3. **Recherche d'upgrade** : Utilise `/ajax/getPath` avec les paramètres:
   - `from`: ID du vaisseau de départ
   - `to`: ID du vaisseau de destination  
   - `stores`: Liste des magasins (ex: "1,2,3")

### **Points Clés**
- ✅ **229 vaisseaux** disponibles avec IDs numériques
- ✅ **3 magasins** : Star-Hangar (1), RSI (2), Space Foundry (3)
- ⚠️ **Endpoint principal** (`/ajax/getPath`) à confirmer
- 🔄 **Fallback** : Utiliser des données statiques si l'API échoue

---

## 📋 TODO - Tests à Effectuer

### **Tests Prioritaires**
1. **POST `/ajax/getPath`** avec paramètres valides
2. **Validation** des IDs de vaisseaux (1-229)
3. **Test des combinaisons** de magasins
4. **Gestion des timeouts** et erreurs réseau

### **Tests Secondaires**
- Autres endpoints potentiels (`/ajax/search`, `/ajax/getPrice`)
- Headers additionnels (Referer, etc.)
- Authentification/session si nécessaire

---

## 🎯 Conclusion

### **API Viable ✅**
- Récupération des vaisseaux : **CONFIRMÉ**
- Récupération des magasins : **CONFIRMÉ**  
- Calcul d'upgrades : **À CONFIRMER**

### **Recommandations**
1. **Implémenter** la récupération des vaisseaux/magasins
2. **Tester** l'endpoint `/ajax/getPath` avec des vrais paramètres
3. **Créer un fallback** pour les cas d'échec
4. **Ajouter du cache** pour éviter trop de requêtes

---

*Dernière mise à jour : 29 juin 2025*
