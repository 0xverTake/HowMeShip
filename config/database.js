const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.initPromise = null;
    }

    static getInstance() {
        if (!Database._instance) {
            Database._instance = new Database();
        }
        return Database._instance;
    }

    // Méthode pour s'assurer que l'instance est initialisée
    async ensureInitialized() {
        if (this.isInitialized) {
            return this;
        }
        
        if (!this.initPromise) {
            this.initPromise = this.init();
        }
        
        await this.initPromise;
        return this;
    }

    async init() {
        if (this.isInitialized) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const dbPath = process.env.DATABASE_PATH || './database.sqlite';
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Erreur lors de l\'ouverture de la base de données:', err);
                    this.isInitialized = false;
                    reject(err);
                } else {
                    console.log('Base de données SQLite connectée');
                    this.createTables()
                        .then(() => {
                            this.isInitialized = true;
                            resolve();
                        })
                        .catch(reject);
                }
            });
        });
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const createShipsTable = `
                CREATE TABLE IF NOT EXISTS ships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    normalized_name TEXT NOT NULL,
                    base_price REAL,
                    manufacturer TEXT,
                    category TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createUpgradesTable = `
                CREATE TABLE IF NOT EXISTS upgrades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    from_ship_id INTEGER,
                    to_ship_id INTEGER,
                    store TEXT NOT NULL,
                    price REAL NOT NULL,
                    currency TEXT DEFAULT 'USD',
                    availability TEXT,
                    url TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (from_ship_id) REFERENCES ships (id),
                    FOREIGN KEY (to_ship_id) REFERENCES ships (id)
                )
            `;

            const createPriceHistoryTable = `
                CREATE TABLE IF NOT EXISTS price_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    upgrade_id INTEGER,
                    price REAL NOT NULL,
                    currency TEXT DEFAULT 'USD',
                    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (upgrade_id) REFERENCES upgrades (id)
                )
            `;

            this.db.serialize(() => {
                this.db.run(createShipsTable);
                this.db.run(createUpgradesTable);
                this.db.run(createPriceHistoryTable, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Tables créées avec succès');
                        resolve();
                    }
                });
            });
        });
    }

    async insertShip(name, basePrice = null, manufacturer = null, category = null) {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de données non initialisée'));
                return;
            }
            const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const sql = `
                INSERT OR REPLACE INTO ships (name, normalized_name, base_price, manufacturer, category, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            this.db.run(sql, [name, normalizedName, basePrice, manufacturer, category], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async getShipByName(name) {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de données non initialisée'));
                return;
            }
            const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const sql = `SELECT * FROM ships WHERE normalized_name = ? OR name LIKE ?`;
            this.db.get(sql, [normalizedName, `%${name}%`], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getShipCount() {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de données non initialisée'));
                return;
            }
            const sql = 'SELECT COUNT(*) as count FROM ships';
            this.db.get(sql, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }

    async getShipById(id) {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de données non initialisée'));
                return;
            }
            const sql = 'SELECT * FROM ships WHERE id = ?';
            this.db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getAllShips() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM ships ORDER BY name`;
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async insertUpgrade(fromShipId, toShipId, store, price, currency = 'USD', availability = null, url = null) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO upgrades 
                (from_ship_id, to_ship_id, store, price, currency, availability, url, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            this.db.run(sql, [fromShipId, toShipId, store, price, currency, availability, url], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async getUpgrades(fromShipId, toShipId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT u.*, 
                       s1.name as from_ship_name,
                       s2.name as to_ship_name
                FROM upgrades u
                JOIN ships s1 ON u.from_ship_id = s1.id
                JOIN ships s2 ON u.to_ship_id = s2.id
                WHERE u.from_ship_id = ? AND u.to_ship_id = ?
                ORDER BY u.price ASC
            `;
            this.db.all(sql, [fromShipId, toShipId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async searchShips(query, limit = 25) {
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de données non initialisée'));
                return;
            }
            const sql = `
                SELECT DISTINCT name 
                FROM ships 
                WHERE LOWER(name) LIKE LOWER(?) 
                ORDER BY name 
                LIMIT ?
            `;
            this.db.all(sql, [`%${query}%`, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getUpgradesToShip(toShipId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT u.*, 
                       s1.name as from_ship_name,
                       s2.name as to_ship_name
                FROM upgrades u
                JOIN ships s1 ON u.from_ship_id = s1.id
                JOIN ships s2 ON u.to_ship_id = s2.id
                WHERE u.to_ship_id = ?
                ORDER BY u.price ASC
            `;
            this.db.all(sql, [toShipId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getUpgradesFromShip(fromShipId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT u.*, 
                       s1.name as from_ship_name,
                       s2.name as to_ship_name
                FROM upgrades u
                JOIN ships s1 ON u.from_ship_id = s1.id
                JOIN ships s2 ON u.to_ship_id = s2.id
                WHERE u.from_ship_id = ?
                ORDER BY u.price ASC
            `;
            this.db.all(sql, [fromShipId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Erreur lors de la fermeture de la base de données:', err);
                } else {
                    console.log('Base de données fermée');
                }
            });
        }
    }
}

module.exports = Database;
