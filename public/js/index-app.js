// HowMeShip - Interface Big Bang cosmique
// Simulation de la naissance de l'univers avec effets spectaculaires

class BigBangInterface {
    constructor() {
        this.isExploding = false;
        this.energyParticles = [];
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.createNewbornStars();
            this.startEnergyParticles();
            this.initCursor();
            this.initEvents();
            
            // Démarrer l'animation d'introduction
            setTimeout(() => {
                this.startUniverseFormation();
            }, 1000);
        });
    }

    // Créer les étoiles qui naissent progressivement
    createNewbornStars() {
        const starsContainer = document.getElementById('newborn-stars');
        const numStars = 200;
        
        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.className = 'newborn-star';
            
            // Position aléatoire
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            
            // Taille aléatoire
            const size = 1 + Math.random() * 3;
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            
            // Type d'étoile aléatoire
            const starType = Math.random();
            if (starType < 0.6) {
                star.classList.add('star-white');
            } else if (starType < 0.8) {
                star.classList.add('star-blue');
            } else {
                star.classList.add('star-red');
            }
            
            // Délai d'apparition aléatoire
            star.style.animationDelay = Math.random() * 10 + 's';
            
            starsContainer.appendChild(star);
        }
    }

    // Créer des particules d'énergie qui s'échappent du centre
    createEnergyParticle() {
        const particle = document.createElement('div');
        particle.className = 'energy-particle';
        
        // Position de départ au centre
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.transform = 'translate(-50%, -50%)';
        
        // Couleur aléatoire énergétique
        const colors = [
            'rgba(255, 255, 255, 1)',
            'rgba(255, 200, 100, 1)',
            'rgba(255, 150, 50, 1)',
            'rgba(255, 100, 150, 1)',
            'rgba(150, 100, 255, 1)',
            'rgba(100, 200, 255, 1)'
        ];
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        particle.style.boxShadow = `0 0 10px ${color}`;
        
        document.body.appendChild(particle);
        
        // Animation de la particule
        const angle = Math.random() * Math.PI * 2;
        const distance = 300 + Math.random() * 500;
        const duration = 2000 + Math.random() * 3000;
        
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance;
        
        particle.animate([
            {
                transform: 'translate(-50%, -50%) scale(0)',
                opacity: 1
            },
            {
                transform: 'translate(-50%, -50%) scale(1)',
                opacity: 1
            },
            {
                transform: `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.5)`,
                opacity: 0.8
            },
            {
                transform: `translate(calc(-50% + ${endX * 1.5}px), calc(-50% + ${endY * 1.5}px)) scale(0)`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'ease-out'
        }).onfinish = () => particle.remove();
    }

    // Démarrer la génération continue de particules d'énergie
    startEnergyParticles() {
        setInterval(() => {
            if (!this.isExploding) {
                this.createEnergyParticle();
            }
        }, 100);
    }

    // Créer des ondes de choc supplémentaires
    createShockWave() {
        const wave = document.createElement('div');
        wave.className = 'shock-wave';
        wave.style.position = 'absolute';
        wave.style.top = '50%';
        wave.style.left = '50%';
        wave.style.transform = 'translate(-50%, -50%)';
        wave.style.border = '2px solid rgba(255, 200, 100, 0.8)';
        wave.style.borderRadius = '50%';
        wave.style.width = '10px';
        wave.style.height = '10px';
        wave.style.pointerEvents = 'none';
        wave.style.zIndex = '15';
        
        document.body.appendChild(wave);
        
        wave.animate([
            {
                width: '10px',
                height: '10px',
                opacity: 1,
                borderWidth: '3px'
            },
            {
                width: '300px',
                height: '300px',
                opacity: 0.5,
                borderWidth: '2px'
            },
            {
                width: '800px',
                height: '800px',
                opacity: 0,
                borderWidth: '1px'
            }
        ], {
            duration: 3000,
            easing: 'ease-out'
        }).onfinish = () => wave.remove();
    }

    // Animation de formation de l'univers
    startUniverseFormation() {
        // Créer des ondes de choc périodiques
        setInterval(() => {
            if (!this.isExploding) {
                this.createShockWave();
            }
        }, 2000);
    }

    // Initialiser le curseur cosmique
    initCursor() {
        document.addEventListener('mousemove', (e) => {
            let cursor = document.querySelector('.cosmic-cursor');
            if (!cursor) {
                cursor = document.createElement('div');
                cursor.className = 'cosmic-cursor';
                document.body.appendChild(cursor);
            }
            
            cursor.style.left = (e.clientX - 10) + 'px';
            cursor.style.top = (e.clientY - 10) + 'px';
        });
    }

    // Effet d'explosion cosmique du Big Bang
    triggerBigBangExplosion() {
        if (this.isExploding) return;
        
        this.isExploding = true;
        
        const explosion = document.getElementById('big-bang-explosion');
        const fade = document.getElementById('universe-fade');
        const center = document.getElementById('big-bang-center');
        
        // Masquer le point central
        center.style.opacity = '0';
        
        // Démarrer l'explosion
        explosion.classList.add('active');
        
        // Créer une rafale de particules d'énergie
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createEnergyParticle();
            }, i * 20);
        }
        
        // Créer des ondes de choc multiples
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.createShockWave();
            }, i * 200);
        }
        
        // Commencer le fade après l'explosion
        setTimeout(() => {
            fade.classList.add('active');
            
            // Naviguer vers le dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 3000);
        }, 2000);
    }

    // Créer des étoiles filantes occasionnelles
    createShootingStar() {
        const star = document.createElement('div');
        star.style.cssText = `
            position: fixed;
            width: 2px;
            height: 2px;
            background: linear-gradient(45deg, 
                rgba(255, 255, 255, 1) 0%,
                rgba(255, 200, 100, 0.8) 50%,
                transparent 100%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 20;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
        `;
        
        // Position de départ aléatoire
        const side = Math.floor(Math.random() * 4);
        let startX, startY, endX, endY;
        
        switch(side) {
            case 0: // Haut
                startX = Math.random() * window.innerWidth;
                startY = -10;
                endX = startX + (Math.random() * 200 - 100);
                endY = window.innerHeight + 10;
                break;
            case 1: // Droite
                startX = window.innerWidth + 10;
                startY = Math.random() * window.innerHeight;
                endX = -10;
                endY = startY + (Math.random() * 200 - 100);
                break;
            case 2: // Bas
                startX = Math.random() * window.innerWidth;
                startY = window.innerHeight + 10;
                endX = startX + (Math.random() * 200 - 100);
                endY = -10;
                break;
            case 3: // Gauche
                startX = -10;
                startY = Math.random() * window.innerHeight;
                endX = window.innerWidth + 10;
                endY = startY + (Math.random() * 200 - 100);
                break;
        }
        
        star.style.left = startX + 'px';
        star.style.top = startY + 'px';
        
        document.body.appendChild(star);
        
        star.animate([
            { 
                left: startX + 'px',
                top: startY + 'px',
                opacity: 0
            },
            { 
                left: startX + 'px',
                top: startY + 'px',
                opacity: 1
            },
            { 
                left: endX + 'px',
                top: endY + 'px',
                opacity: 0
            }
        ], {
            duration: 1500 + Math.random() * 1000,
            easing: 'ease-out'
        }).onfinish = () => star.remove();
    }

    // Initialiser les événements
    initEvents() {
        // Clic sur le centre du Big Bang
        document.getElementById('big-bang-center').addEventListener('click', () => {
            this.triggerBigBangExplosion();
        });
        
        // Touche Entrée ou Espace
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                this.triggerBigBangExplosion();
            }
        });
        
        // Étoiles filantes périodiques
        setInterval(() => {
            if (!this.isExploding && Math.random() < 0.3) {
                this.createShootingStar();
            }
        }, 3000);
        
        // Effet hover sur le centre
        const center = document.getElementById('big-bang-center');
        center.addEventListener('mouseenter', () => {
            // Créer quelques particules supplémentaires au hover
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.createEnergyParticle();
                }, i * 50);
            }
        });
    }
}

// Initialiser l'interface Big Bang
const bigBangInterface = new BigBangInterface();
