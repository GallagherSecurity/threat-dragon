import env from '../env/Env.js';
import loggerHelper from '../helpers/logger.helper.js';
import pg from 'pg';


const { Pool } = pg;
const logger = loggerHelper.get('config/database.config.js');

let pool = null;

const getPool = () => {
    if (!pool) {
        const config = env.get().config;
        
        pool = new Pool({
            host: config.DB_HOST,
            port: parseInt(config.DB_PORT, 10),
            database: config.DB_NAME,
            user: config.DB_USER,
            password: config.DB_PASSWORD,
            ssl: config.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        pool.on('error', (err) => {
            logger.error('Unexpected database error:', err);
        });
    }
    
    return pool;
};

export default {
    getPool
};