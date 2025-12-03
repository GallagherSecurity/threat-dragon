import { Env } from './Env.js';

class DatabaseEnv extends Env {
    constructor () {
        super('Database');
    }

    get prefix () {
        return 'DB_';
    }

    get properties () {
        return [
            { key: 'HOST', required: false, defaultValue: 'localhost' },
            { key: 'PORT', required: false, defaultValue: 5432 },
            { key: 'NAME', required: false, defaultValue: 'threatdragon' },
            { key: 'USER', required: false, defaultValue: 'threatdragon_user' },
            { key: 'PASSWORD', required: false, defaultValue: 'dev_password' },
            { key: 'SSL', required: false, defaultValue: false }
        ];
    }
}

export default DatabaseEnv;