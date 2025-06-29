#!/bin/bash

# Script de sauvegarde automatique pour le bot Star Citizen
# Usage: ./backup.sh
# Peut être ajouté au crontab pour des sauvegardes automatiques

echo "💾 Démarrage de la sauvegarde..."

# Créer le dossier de sauvegarde s'il n'existe pas
BACKUP_DIR="backups"
if [ ! -d "$BACKUP_DIR" ]; then
    echo "📁 Création du dossier de sauvegarde..."
    mkdir -p "$BACKUP_DIR"
fi

# Générer un nom de fichier avec timestamp
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/database_$DATE.sqlite"

# Sauvegarder la base de données si elle existe
if [ -f "database.sqlite" ]; then
    echo "💾 Sauvegarde de la base de données: $BACKUP_FILE"
    cp database.sqlite "$BACKUP_FILE"
    
    # Vérifier que la sauvegarde a réussi
    if [ -f "$BACKUP_FILE" ]; then
        echo "✅ Sauvegarde créée avec succès"
        
        # Afficher la taille du fichier
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "📊 Taille de la sauvegarde: $SIZE"
    else
        echo "❌ Erreur lors de la création de la sauvegarde"
        exit 1
    fi
else
    echo "⚠️  Aucune base de données trouvée (database.sqlite)"
    exit 1
fi

# Nettoyer les anciennes sauvegardes (garder seulement les 7 dernières)
echo "🧹 Nettoyage des anciennes sauvegardes..."
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/database_*.sqlite 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt 7 ]; then
    # Supprimer les sauvegardes les plus anciennes
    ls -t "$BACKUP_DIR"/database_*.sqlite | tail -n +8 | xargs rm -f
    DELETED=$((BACKUP_COUNT - 7))
    echo "🗑️  $DELETED ancienne(s) sauvegarde(s) supprimée(s)"
else
    echo "ℹ️  Aucune ancienne sauvegarde à supprimer ($BACKUP_COUNT/7)"
fi

# Afficher la liste des sauvegardes
echo ""
echo "📋 Sauvegardes disponibles:"
ls -lah "$BACKUP_DIR"/database_*.sqlite 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' | column -t

# Calculer l'espace total utilisé
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo ""
echo "💽 Espace total utilisé par les sauvegardes: $TOTAL_SIZE"

echo "✅ Sauvegarde terminée avec succès !"
