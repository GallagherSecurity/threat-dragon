import {
    TEMPLATE_FETCH_ALL,
    TEMPLATE_SET_FILTERS,
    TEMPLATE_CLEAR,
    TEMPLATE_CREATE,
    TEMPLATE_UPDATE,
    TEMPLATE_DELETE,
    TEMPLATE_FETCH_MODEL_BY_ID,
    TEMPLATE_SET_CONTEXT,
    TEMPLATE_CLEAR_CONTEXT,
    TEMPLATE_SET_LOCAL_DATA,
    TEMPLATE_CLEAR_LOCAL_DATA,
    TEMPLATE_SET_TEMPLATES,
    TEMPLATE_SET_PAGINATION,
    TEMPLATE_SET_SELECTED,
    TEMPLATE_SET_CONTENT_REPO_STATUS,
    TEMPLATE_BOOTSTRAP
} from '@/store/actions/template';

import { LOADER_STARTED, LOADER_FINISHED } from '@/store/actions/loader';
import templateApi from '@/service/api/templateApi.js';

const state = {
    templates: [],
    selectedTemplate: null,
    templateContext: null,
    localTemplateData: null,  // Stores full template model from local file import
    contentRepo: {
        status: null,        // null (initialized & working) | 'NOT_CONFIGURED' | 'REPO_NOT_FOUND' | 'NOT_INITIALIZED'
        canInitialize: false,
        repoName: null,      // Only populated for 'REPO_NOT_FOUND' scenario
    },
    filters: {
        search: ''
    },
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    }
};

const actions = {

    [TEMPLATE_BOOTSTRAP]: async ({ dispatch }) => {
    dispatch(LOADER_STARTED);
    
    try {
        await templateApi.bootstrapAsync();
        
        // After successful bootstrap, refresh template list
        await dispatch(TEMPLATE_FETCH_ALL);
        
        return { success: true };
    } catch (error) {
        throw error; // Let component handle the error
    } finally {
        dispatch(LOADER_FINISHED);
    }
},

    [TEMPLATE_SET_CONTEXT]: ({ commit }, templateId) => {
        commit(TEMPLATE_SET_CONTEXT, templateId);
    },
    [TEMPLATE_CLEAR_CONTEXT]: ({ commit }) => {
        commit(TEMPLATE_CLEAR_CONTEXT);
    },

    [TEMPLATE_SET_LOCAL_DATA]: ({ commit }, templateData) => {
        commit(TEMPLATE_SET_LOCAL_DATA, templateData);
    },
    [TEMPLATE_CLEAR_LOCAL_DATA]: ({ commit }) => {
        commit(TEMPLATE_CLEAR_LOCAL_DATA);
    },



    [TEMPLATE_CREATE]: async ({ dispatch }, { template }) => {
        dispatch(LOADER_STARTED);
        try {
            await templateApi.importTemplateAsync(template);
            // Refresh the template list after creation
            dispatch(TEMPLATE_FETCH_ALL);
        } finally {
            dispatch(LOADER_FINISHED);
        }
    },
    [TEMPLATE_UPDATE]: async ({ dispatch }, templateMetadata) => {
        dispatch(LOADER_STARTED);
        try {
            await templateApi.updateTemplateAsync(templateMetadata);
            // Refresh the template list after update
            dispatch(TEMPLATE_FETCH_ALL);
        } finally {
            dispatch(LOADER_FINISHED);
        }
    },
    [TEMPLATE_DELETE]: async ({ dispatch }, id) => {
        dispatch(LOADER_STARTED);
        try {
            await templateApi.deleteTemplateAsync(id);
            // Refresh the template list after deletion
            dispatch(TEMPLATE_FETCH_ALL);
        } finally {
            dispatch(LOADER_FINISHED);
        }
    },
   [TEMPLATE_FETCH_ALL]: async ({ commit, state, dispatch }) => {
    dispatch(LOADER_STARTED);

    try {
        const response = await templateApi.fetchAllAsync(state.filters, state.pagination);

        // Handle special statuses (NOT_CONFIGURED, NOT_INITIALIZED)
        if (response.data.repoStatus) {
            commit(TEMPLATE_SET_CONTENT_REPO_STATUS, {
                status: response.data.repoStatus,
                canInitialize: response.data.canInitialize,
                repoName: null
            });
            commit(TEMPLATE_SET_TEMPLATES, []);
            commit(TEMPLATE_SET_PAGINATION, {
                page: 1,
                limit: state.pagination.limit,
                total: 0,
                totalPages: 0
            });
        } else {
            // Normal operation
            commit(TEMPLATE_SET_CONTENT_REPO_STATUS, {
                status: null,
                canInitialize: false,
                repoName: null
            });
            commit(TEMPLATE_SET_TEMPLATES, response.data.templates);
            commit(TEMPLATE_SET_PAGINATION, response.data.pagination);
        }
    } catch (error) {
        // Handle 404 (REPO_NOT_FOUND) - it's a STATE, not an error
        if (error.response?.status === 404) {
            const errorDetails = error.response.data?.details || '';
            const repoMatch = errorDetails.match(/Template repository '([^']+)'/);

            commit(TEMPLATE_SET_CONTENT_REPO_STATUS, {
                status: 'REPO_NOT_FOUND',
                canInitialize: false,
                repoName: repoMatch ? repoMatch[1] : null
            });
            console.log('Template repository not found:', repoMatch ? repoMatch[1] : 'unknown');
            commit(TEMPLATE_SET_TEMPLATES, []);
            commit(TEMPLATE_SET_PAGINATION, {
                page: 1,
                limit: state.pagination.limit,
                total: 0,
                totalPages: 0
            });
        } 
    } finally {
        dispatch(LOADER_FINISHED);
    }
},

    [TEMPLATE_FETCH_MODEL_BY_ID]: async ({ commit }, templateId) => {

        const response = await templateApi.fetchModelByIdAsync(templateId);
        commit(TEMPLATE_SET_SELECTED, response.data);
        return response.data;
    },

    [TEMPLATE_CLEAR]: ({ commit }) => {
        commit(TEMPLATE_CLEAR);
    },

    [TEMPLATE_SET_FILTERS]: ({ commit, dispatch }, filters) => {
        commit(TEMPLATE_SET_FILTERS, filters);
        dispatch(TEMPLATE_FETCH_ALL);  // Auto-refresh with new filters
    },
};

const mutations = {
    [TEMPLATE_SET_CONTEXT]: (state, templateId) => {
        state.templateContext = templateId;
    },

    [TEMPLATE_CLEAR_CONTEXT]: (state) => {
        state.templateContext = null;
    },

    [TEMPLATE_SET_LOCAL_DATA]: (state, templateData) => {
        state.localTemplateData = templateData;
    },

    [TEMPLATE_CLEAR_LOCAL_DATA]: (state) => {
        state.localTemplateData = null;
    },

    [TEMPLATE_SET_CONTENT_REPO_STATUS]: (state, { status, canInitialize, repoName }) => {
        state.contentRepo = {
            status: status || null,
            canInitialize: canInitialize || false,
            repoName: repoName || null
        };
    },

    [TEMPLATE_SET_TEMPLATES]: (state, templates) => {
        state.templates = templates || [];
    },
    [TEMPLATE_SET_PAGINATION]: (state, pagination) => {
        state.pagination = {
            page: pagination.page || 1,
            limit: pagination.limit || 20,
            total: pagination.total || 0,
            totalPages: pagination.totalPages || 0
        };
    },
    [TEMPLATE_SET_FILTERS]: (state, filters) => {
        state.filters = {
            search: filters.search || ''
        };
    },
    [TEMPLATE_SET_SELECTED]: (state, template) => {
        state.selectedTemplate = template;
    },
    [TEMPLATE_CLEAR]: (state) => {
        state.templates = [];
        state.selectedTemplate = null;
        state.localTemplateData = null;
        state.contentRepo = {
            status: null,
            canInitialize: false,
            repoName: null
        };
        state.filters = {
            search: ''
        };
        state.pagination = {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0
        };
    }
};

const getters = {
    templates: (state) => state.templates,
    selectedTemplate: (state) => state.selectedTemplate,
    filters: (state) => state.filters,
    pagination: (state) => state.pagination,
    hasTemplates: (state) => state.templates.length > 0,
    totalTemplates: (state) => state.pagination.total,
    templateContext: (state) => state.templateContext,
    localTemplateData: (state) => state.localTemplateData,
    contentRepoStatus: (state) => state.contentRepo.status,
    canInitializeRepo: (state) => state.contentRepo.canInitialize,
    contentRepoName: (state) => state.contentRepo.repoName
};

export default {
    state,
    actions,
    mutations,
    getters
};