import { repoExistsAsync } from './client.js';

import mitigationCatalogue from './mitigationCatalogue.js';
import standards from './standards.js';
import templates from './templates.js';
import threatCatalogue from './threatCatalogue.js';
import threatModels from './threatModels.js';

export default {
    ...threatModels,
    repoExistsAsync,
    ...templates,
    ...threatCatalogue,
    ...standards,
    ...mitigationCatalogue
};
