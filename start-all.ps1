# Script de démarrage HowMeShip
Write-Host "🚀 Démarrage de HowMeShip..." -ForegroundColor Cyan
Write-Host ""

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "index.js")) {
    Write-Host "❌ Erreur: Fichier index.js non trouvé. Assurez-vous d'être dans le répertoire HowMeShip." -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour continuer..."
    exit 1
}

# Tuer les anciens processus Node.js
Write-Host "🧹 Nettoyage des anciens processus..." -ForegroundColor Yellow
try {
    taskkill /F /IM node.exe /T 2>$null
    Start-Sleep 2
} catch {
    # Ignorer si aucun processus à tuer
}

# Démarrer le serveur web en arrière-plan
Write-Host "🌐 Démarrage du serveur web..." -ForegroundColor Yellow
$webProcess = Start-Process -FilePath "node" -ArgumentList "web-panel.js" -WindowStyle Hidden -PassThru
Start-Sleep 3

# Vérifier que le serveur web fonctionne
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Serveur web démarré sur http://localhost:3001" -ForegroundColor Green
    Write-Host "📊 Dashboard disponible sur: http://localhost:3001/dashboard" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors du démarrage du serveur web" -ForegroundColor Red
}

Write-Host ""
Write-Host "🤖 Démarrage du bot Discord..." -ForegroundColor Yellow
Write-Host "Appuyez sur Ctrl+C pour arrêter tous les services" -ForegroundColor Gray
Write-Host ""

# Fonction de nettoyage
function Cleanup {
    Write-Host ""
    Write-Host "🛑 Arrêt des services..." -ForegroundColor Yellow
    
    # Arrêter le serveur web
    if ($webProcess -and !$webProcess.HasExited) {
        try {
            Stop-Process -Id $webProcess.Id -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Serveur web arrêté" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Serveur web déjà arrêté" -ForegroundColor Yellow
        }
    }
    
    # Tuer tous les processus Node.js restants
    try {
        taskkill /F /IM node.exe /T 2>$null
        Write-Host "✅ Tous les processus Node.js arrêtés" -ForegroundColor Green
    } catch {
        # Ignorer les erreurs
    }
    
    Write-Host ""
    Write-Host "👋 HowMeShip arrêté proprement." -ForegroundColor Gray
}

# Gérer Ctrl+C
try {
    # Démarrer le bot Discord (bloquant)
    node index.js
} catch {
    Write-Host "❌ Erreur lors du démarrage du bot" -ForegroundColor Red
} finally {
    Cleanup
}

Read-Host "Appuyez sur Entrée pour continuer..."
