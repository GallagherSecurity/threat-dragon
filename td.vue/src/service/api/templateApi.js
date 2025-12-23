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

/**
 * Imports a template by splitting metadata and content
 * @param {Object} templateMetadata - Template metadata object
 * @param {Object} templateContent - Template model content
 * @returns {Promise}
 */
const importTemplateAsync = (template) => {
    return api.postAsync(`${resource}/import`, 
        template
    );
};

/**
 * Updates a template's metadata (name, description, tags)
 * @param {Object} template - Template object with id, name, description, tags
 * @returns {Promise}
 */
const updateTemplateAsync = (template) => {
    const [ encodedId ] = encodeUrlComponents(template.id);
    return api.putAsync(`${resource}/${encodedId}`, {
        name: template.name,
        description: template.description,
        tags: template.tags
    });
};

/**
 * Deletes a template by its id
 * @param {String} id - The id GUID of the template to delete
 * @returns {Promise}
 */
const deleteTemplateAsync = (id) => {
    return api.deleteAsync(`${resource}/${id}`);  // No body, just URL
};

const fetchModelByIdAsync = (templateId) => {
    const [ encodedId ] = encodeUrlComponents(templateId);
    return api.getAsync(`${resource}/${encodedId}/content`);
};


export default {
    fetchAllAsync,
    fetchByIdAsync,
    importTemplateAsync,
    updateTemplateAsync,
    deleteTemplateAsync,
    fetchModelByIdAsync

};