import api from './api.js';

const resource = '/api/mitigations/catalogue';

const encodeUrlComponents = (...uriComponents) => {
    return uriComponents.map(uriComponent => encodeURIComponent(uriComponent));
};

const fetchAllAsync = (sha) => {
    const params = sha ? `?sha=${encodeURIComponent(sha)}` : '';
    return api.getAsync(`${resource}${params}`);
};

const createMitigationAsync = (mitigation) => {
    return api.postAsync(`${resource}`, mitigation);
};

const updateMitigationAsync = (mitigation) => {
    const [encodedId] = encodeUrlComponents(mitigation.id);
    return api.putAsync(`${resource}/${encodedId}`, mitigation);
};

const deleteMitigationAsync = (id) => {
    const [encodedId] = encodeUrlComponents(id);
    return api.deleteAsync(`${resource}/${encodedId}`);
};

const fetchMitigationContentAsync = (id) => {
    const [encodedId] = encodeUrlComponents(id);
    return api.getAsync(`${resource}/${encodedId}/content`);
};

const bootstrapAsync = () => {
    return api.postAsync(`${resource}/bootstrap`);
};

const fetchBulkMitigationContentAsync = (ids) => {
    return api.postAsync(`${resource}/content/bulk`, { ids });
};

const importMitigationLibraryAsync = (mitigationLibrary) => {
    return api.postAsync(`${resource}/import`, { mitigationLibrary });
};

const bulkDeleteMitigationsAsync = (ids) => {
    return api.deleteAsync(`${resource}/bulk`, { data: { ids } });
};

export default {
    fetchAllAsync,
    createMitigationAsync,
    updateMitigationAsync,
    deleteMitigationAsync,
    bulkDeleteMitigationsAsync,
    fetchMitigationContentAsync,
    fetchBulkMitigationContentAsync,
    bootstrapAsync,
    importMitigationLibraryAsync
};
