import api from './api.js';

const resource = '/api/standards';

const fetchAllAsync = () => {
    return api.getAsync(resource);
};

const createStandardAsync = (standard) => {
    return api.postAsync(resource, standard);
};

const deleteStandardAsync = (id) => {
    return api.deleteAsync(`${resource}/${encodeURIComponent(id)}`);
};

export default {
    fetchAllAsync,
    createStandardAsync,
    deleteStandardAsync
};
