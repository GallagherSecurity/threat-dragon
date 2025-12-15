import api from './api.js';

const resource = '/api/templates';

const encodeUrlComponents = (...uriComponents) => {
    return uriComponents.map(uriComponent => encodeURIComponent(uriComponent));
};

/**
 * Gets the list of available templates with optional filtering and pagination
 * @param {Object} filters - Search filters (e.g. search query, tags)
 * @param {Object} pagination - Pagination options (page, limit)
 * @returns {Promise}
 */
const fetchAllAsync = (filters = {}, pagination = {}) => {
    // Construct query parameters matching the style of 'reposAsync'
    const params = {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        searchQuery: filters.search || '',
        tags: filters.tags || []
    };

    return api.getAsync(`${resource}`, { params });
};

/**
 * Gets the detailed content of a specific template
 * @param {String} templateId - The GUID/filename of the template
 * @returns {Promise}
 */
const fetchByIdAsync = (templateId) => {
    const [ encodedTemplateId ] = encodeUrlComponents(templateId);
    return api.getAsync(`${resource}/${encodedTemplateId}`);
};

export default {
    fetchAllAsync,
    fetchByIdAsync
};