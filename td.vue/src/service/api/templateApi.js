import api from './api.js';

const resource = '/api/templates';

/**
 * Gets all template metadata (paginated and filterable)
 * @param {Object} filters - { search, tags, sortBy, sortOrder }
 * @param {Object} pagination - { page, limit }
 * @returns {Promise}
 */
const fetchAllAsync = (filters = {}, pagination = {}) => {
    const params = {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        ...filters
    };
    
    // Convert tags array to comma-separated string if provided
    if (filters.tags && Array.isArray(filters.tags)) {
        params.tags = filters.tags.join(',');
    }
    
    return api.getAsync(`${resource}/metadata`, { params });
};

/**
 * Gets a single template by ID (metadata + content)
 * @param {String} templateId
 * @returns {Promise}
 */
const fetchByIdAsync = (templateId) => {
    return api.getAsync(`${resource}/${templateId}`);
};

/**
 * Creates a new template
 * @param {Object} templateData - { name, description, tags, content }
 * @returns {Promise}
 */
const createAsync = (templateData) => {
    return api.postAsync(resource, templateData);
};

/**
 * Updates an existing template
 * @param {String} templateId
 * @param {Object} templateData - { name, description, tags, content }
 * @returns {Promise}
 */
const updateAsync = (templateId, templateData) => {
    return api.putAsync(`${resource}/${templateId}`, templateData);
};

/**
 * Deletes a template (soft delete)
 * @param {String} templateId
 * @returns {Promise}
 */
const deleteAsync = (templateId) => {
    return api.deleteAsync(`${resource}/${templateId}`);
};

export default {
    fetchAllAsync,
    fetchByIdAsync,
    createAsync,
    updateAsync,
    deleteAsync
};