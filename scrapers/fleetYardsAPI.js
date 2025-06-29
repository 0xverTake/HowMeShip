const axios = require('axios');

class FleetYardsAPI {
    constructor() {
        this.baseURL = 'https://api.fleetyards.net/v1';
        this.headers = {
            'User-Agent': 'HowMeShip-Bot/1.0',
            'Accept': 'application/json'
        };
    }

    /**
     * Récupère tous les vaisseaux depuis FleetYards API
     */
    async getShips() {
        try {
            console.log('[FleetYards] Récupération des vaisseaux...');
            
            const response = await axios.get(`${this.baseURL}/models`, {
                headers: this.headers,
                params: {
                    per_page: 500 // Maximum par page
                }
            });

            if (response.data && response.data.length > 0) {
                console.log(`[FleetYards] ${response.data.length} vaisseaux récupérés`);
                return this.parseShips(response.data);
            }

            return [];
        } catch (error) {
            console.error('[FleetYards] Erreur lors de la récupération:', error.message);
            return [];
        }
    }

    /**
     * Formate les données des vaisseaux
     */
    parseShips(ships) {
        return ships.map(ship => ({
            name: ship.name,
            manufacturer: ship.manufacturer?.name || 'Unknown',
            category: ship.classification || 'Unknown',
            description: ship.description || '',
            price: ship.price || 0,
            focus: ship.focus || ship.role || '',
            size: ship.size || 'Unknown',
            crew_min: ship.crew_min || 1,
            crew_max: ship.crew_max || 1,
            cargo: ship.cargo || 0,
            length: ship.length || 0,
            beam: ship.beam || 0,
            height: ship.height || 0,
            mass: ship.mass || 0,
            specifications: JSON.stringify({
                length: ship.length ? `${ship.length}m` : null,
                beam: ship.beam ? `${ship.beam}m` : null,
                height: ship.height ? `${ship.height}m` : null,
                mass: ship.mass ? `${ship.mass}kg` : null,
                crew: ship.crew_max ? `${ship.crew_min}-${ship.crew_max}` : null,
                cargo: ship.cargo ? `${ship.cargo} SCU` : null,
                speed: ship.scm_speed ? `${ship.scm_speed} m/s` : null
            }),
            image_url: ship.store_image?.large || ship.store_image?.medium || null,
            source: 'FleetYards',
            last_updated: new Date().toISOString()
        })).filter(ship => ship.name && ship.name.trim() !== '');
    }

    /**
     * Récupère les détails d'un vaisseau spécifique
     */
    async getShipDetails(shipId) {
        try {
            const response = await axios.get(`${this.baseURL}/models/${shipId}`, {
                headers: this.headers
            });

            return response.data;
        } catch (error) {
            console.error(`[FleetYards] Erreur détails ${shipId}:`, error.message);
            return null;
        }
    }

    /**
     * Recherche des vaisseaux par nom
     */
    async searchShips(query) {
        try {
            const response = await axios.get(`${this.baseURL}/models`, {
                headers: this.headers,
                params: {
                    q: query,
                    per_page: 25
                }
            });

            return this.parseShips(response.data || []);
        } catch (error) {
            console.error('[FleetYards] Erreur recherche:', error.message);
            return [];
        }
    }
}

module.exports = FleetYardsAPI;
