const axios = require('axios');

class SCUnpackedAPI {
    constructor() {
        this.baseURL = 'https://scunpacked.com/api';
        this.headers = {
            'User-Agent': 'HowMeShip-Bot/1.0',
            'Accept': 'application/json'
        };
    }

    /**
     * Récupère tous les vaisseaux depuis SCUnpacked
     */
    async getShips() {
        try {
            console.log('[SCUnpacked] Récupération des vaisseaux...');
            
            // SCUnpacked a souvent des endpoints comme /ships ou /vehicles
            const endpoints = ['/ships', '/vehicles', '/ship-matrix'];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await axios.get(`${this.baseURL}${endpoint}`, {
                        headers: this.headers,
                        timeout: 10000
                    });

                    if (response.data && Array.isArray(response.data)) {
                        console.log(`[SCUnpacked] ${response.data.length} vaisseaux trouvés via ${endpoint}`);
                        return this.parseShips(response.data);
                    }
                } catch (endpointError) {
                    console.log(`[SCUnpacked] Endpoint ${endpoint} non disponible`);
                }
            }

            return [];
        } catch (error) {
            console.error('[SCUnpacked] Erreur générale:', error.message);
            return [];
        }
    }

    /**
     * Formate les données des vaisseaux
     */
    parseShips(ships) {
        return ships.map(ship => {
            // SCUnpacked peut avoir différents formats selon l'endpoint
            const name = ship.name || ship.Name || ship.displayName || ship.Display_Name;
            const manufacturer = ship.manufacturer || ship.Manufacturer || 
                               (ship.manufacturerName || ship.manufacturer_name || 'Unknown');
            
            return {
                name: name,
                manufacturer: manufacturer,
                category: ship.category || ship.Category || ship.vehicle_type || ship.type || 'Unknown',
                description: ship.description || ship.Description || '',
                price: this.parsePrice(ship.price || ship.Price || ship.store_price || 0),
                focus: ship.focus || ship.Focus || ship.role || ship.Role || '',
                size: ship.size || ship.Size || ship.vehicle_size || 'Unknown',
                crew_min: parseInt(ship.crew_min || ship.min_crew || ship.MinCrew || 1),
                crew_max: parseInt(ship.crew_max || ship.max_crew || ship.MaxCrew || 1),
                cargo: parseInt(ship.cargo || ship.Cargo || ship.cargo_capacity || 0),
                length: parseFloat(ship.length || ship.Length || 0),
                beam: parseFloat(ship.beam || ship.Beam || ship.width || ship.Width || 0),
                height: parseFloat(ship.height || ship.Height || 0),
                mass: parseFloat(ship.mass || ship.Mass || 0),
                specifications: this.buildSpecifications(ship),
                source: 'SCUnpacked',
                last_updated: new Date().toISOString()
            };
        }).filter(ship => ship.name && ship.name.trim() !== '');
    }

    /**
     * Parse le prix depuis différents formats
     */
    parsePrice(price) {
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
            const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
            return isNaN(numericPrice) ? 0 : numericPrice;
        }
        return 0;
    }

    /**
     * Construit les spécifications techniques
     */
    buildSpecifications(ship) {
        const specs = {};
        
        // Dimensions
        if (ship.length || ship.Length) specs.Length = `${ship.length || ship.Length}m`;
        if (ship.beam || ship.Beam || ship.width || ship.Width) {
            specs.Beam = `${ship.beam || ship.Beam || ship.width || ship.Width}m`;
        }
        if (ship.height || ship.Height) specs.Height = `${ship.height || ship.Height}m`;
        if (ship.mass || ship.Mass) specs.Mass = `${ship.mass || ship.Mass}kg`;

        // Performance
        if (ship.crew_max || ship.MaxCrew) {
            const minCrew = ship.crew_min || ship.MinCrew || 1;
            const maxCrew = ship.crew_max || ship.MaxCrew;
            specs.Crew = minCrew === maxCrew ? `${maxCrew}` : `${minCrew}-${maxCrew}`;
        }
        if (ship.cargo || ship.Cargo) specs.Cargo = `${ship.cargo || ship.Cargo} SCU`;
        
        // Vitesse
        if (ship.scm_speed || ship.SCMSpeed) specs['SCM Speed'] = `${ship.scm_speed || ship.SCMSpeed} m/s`;
        if (ship.afterburner_speed || ship.AfterburnerSpeed) {
            specs['Afterburner Speed'] = `${ship.afterburner_speed || ship.AfterburnerSpeed} m/s`;
        }

        return JSON.stringify(specs);
    }

    /**
     * Test de connectivité
     */
    async testConnection() {
        try {
            const response = await axios.get('https://scunpacked.com', {
                timeout: 5000,
                headers: this.headers
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}

module.exports = SCUnpackedAPI;
