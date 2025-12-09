import env from '../env/Env.js';
import loggerHelper from './logger.helper.js';
import pg from 'pg';

const isDatabaseConfigured = () => {
    return process.env.DB_HOST && 
           process.env.DB_USER && 
           process.env.DB_PASSWORD &&
           process.env.DB_NAME;
};

const { Pool } = pg;
const logger = loggerHelper.get('config/database.config.js');

let pool = null;

const getPool = () => {
     if (!isDatabaseConfigured()) {
        logger.info('Database not configured - template features disabled');
        return null;  
    }
    if (!pool) {
        
        pool = new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT, 10),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        pool.on('error', (err) => {
            logger.error('Unexpected database error:', err);
        });

         pool.on('connect', () => {
            logger.debug('Database connection established');
        });
    }
    
    return pool;
};

export default {
    getPool,
    isDatabaseConfigured
};