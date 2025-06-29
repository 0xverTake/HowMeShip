@echo off
echo 🚀 Upload du bot HowMeShip vers le VPS...
echo.

REM Créer une archive du projet (exclure node_modules et fichiers temporaires)
echo 📦 Création de l'archive...
tar -czf howmeship.tar.gz --exclude=node_modules --exclude=database.sqlite --exclude=.git --exclude=*.log --exclude=*.tmp .

REM Upload vers le VPS
echo 📤 Upload vers le VPS...
scp howmeship.tar.gz root@31.97.157.154:/root/

REM Se connecter au VPS et déployer
echo 🔧 Déploiement sur le VPS...
ssh root@31.97.157.154 "cd /root && tar -xzf howmeship.tar.gz -C /opt/howmeship/ && cd /opt/howmeship && npm install && pm2 restart howmeship || pm2 start ecosystem.config.js"

REM Nettoyer l'archive locale
del howmeship.tar.gz

echo ✅ Déploiement terminé !
echo 🌐 Votre bot est maintenant en ligne sur le VPS
pause
