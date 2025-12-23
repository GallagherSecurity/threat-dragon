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
    TEMPLATE_SET_TEMPLATES,
    TEMPLATE_SET_PAGINATION,
    TEMPLATE_SET_SELECTED
} from '@/store/actions/template';

import { LOADER_STARTED, LOADER_FINISHED } from '@/store/actions/loader';
import templateApi from '@/service/api/templateApi.js';

const state = {
    templates: [],
    selectedTemplate: null,
    templateContext: null,
    filters: {
        search: '',
        tags: []
    },
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    }
};

const actions = {

    [TEMPLATE_SET_CONTEXT]: ({ commit }, templateId) => {
        commit(TEMPLATE_SET_CONTEXT, templateId);
    },
    [TEMPLATE_CLEAR_CONTEXT]: ({ commit }) => {
        commit(TEMPLATE_CLEAR_CONTEXT);
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
            commit(TEMPLATE_SET_TEMPLATES, response.data.templates);
            commit(TEMPLATE_SET_PAGINATION, response.data.pagination);
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
            search: filters.search || '',
            tags: filters.tags || []
        };
    },
    [TEMPLATE_SET_SELECTED]: (state, template) => {
        state.selectedTemplate = template;
    },
    [TEMPLATE_CLEAR]: (state) => {
        state.templates = [];
        state.selectedTemplate = null;
        state.filters = {
            search: '',
            tags: []
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
    templateContext: (state) => state.templateContext
};

export default {
    state,
    actions,
    mutations,
    getters
};