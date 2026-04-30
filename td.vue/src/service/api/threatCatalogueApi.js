import api from './api.js';

const resource = '/api/threats/catalogue';

const encodeUrlComponents = (...uriComponents) => {
    return uriComponents.map(uriComponent => encodeURIComponent(uriComponent));
};

const fetchAllAsync = (sha) => {
    const params = sha ? `?sha=${encodeURIComponent(sha)}` : '';
    return api.getAsync(`${resource}${params}`);
};

const createThreatAsync = (threat) => {
    return api.postAsync(`${resource}`, threat);
};

const updateThreatAsync = (threat) => {
    const [encodedId] = encodeUrlComponents(threat.id);
    return api.putAsync(`${resource}/${encodedId}`, threat);
};

const deleteThreatAsync = (id) => {
    const [encodedId] = encodeUrlComponents(id);
    return api.deleteAsync(`${resource}/${encodedId}`);
};

const fetchThreatContentAsync = (id) => {
    const [encodedId] = encodeUrlComponents(id);
    return api.getAsync(`${resource}/${encodedId}/content`);
};

const bootstrapAsync = () => {
    return api.postAsync(`${resource}/bootstrap`);
};

const fetchBulkThreatContentAsync = (ids) => {
    return api.postAsync(`${resource}/content/bulk`, { ids });
};

const importThreatLibraryAsync = (threatLibrary) => {
    return api.postAsync(`${resource}/import`, { threatLibrary });
};

export default {
    fetchAllAsync,
    createThreatAsync,
    updateThreatAsync,
    deleteThreatAsync,
    fetchThreatContentAsync,
    fetchBulkThreatContentAsync,
    bootstrapAsync,
    importThreatLibraryAsync
};
