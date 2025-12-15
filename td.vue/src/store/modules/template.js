import {
    TEMPLATE_FETCH_ALL,
    TEMPLATE_FETCH_BY_ID,
    TEMPLATE_SET_FILTERS,
    TEMPLATE_CLEAR
} from '@/store/actions/template';

import { LOADER_STARTED, LOADER_FINISHED } from '@/store/actions/loader';
import templateApi from '@/service/api/templateApi.js';

const state = {
    templates: [],
    selectedTemplate: null,
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
    [TEMPLATE_FETCH_ALL]: async ({ commit, state, dispatch }) => {
        dispatch(LOADER_STARTED);
        
        try {
            const response = await templateApi.fetchAllAsync(state.filters, state.pagination);
            commit('SET_TEMPLATES', response.data.templates);
            commit('SET_PAGINATION', response.data.pagination);
        } finally {
            dispatch(LOADER_FINISHED);
        }
    },

    [TEMPLATE_FETCH_BY_ID]: async ({ commit }, templateId) => {
        const response = await templateApi.fetchByIdAsync(templateId);
        commit('SET_SELECTED_TEMPLATE', response.data);
        return response.data;
    },

    [TEMPLATE_CLEAR]: ({ commit }) => {
        commit('CLEAR_TEMPLATES');
    },

    [TEMPLATE_SET_FILTERS]: ({ commit, dispatch }, filters) => {
        commit('SET_FILTERS', filters);
        dispatch(TEMPLATE_FETCH_ALL);  // Auto-refresh with new filters
    },
};

const mutations = {
    'SET_TEMPLATES': (state, templates) => {
        state.templates = templates || [];
    },
    
    'SET_PAGINATION': (state, pagination) => {
        state.pagination = {
            page: pagination.page || 1,
            limit: pagination.limit || 20,
            total: pagination.total || 0,
            totalPages: pagination.totalPages || 0
        };
    },
    
    'SET_FILTERS': (state, filters) => {
        state.filters = {
            search: filters.search || '',
            tags: filters.tags || []
        };
    },
    
    'SET_SELECTED_TEMPLATE': (state, template) => {
        state.selectedTemplate = template;
    },
    
    'CLEAR_TEMPLATES': (state) => {
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
    totalTemplates: (state) => state.pagination.total
};

export default {
    state,
    actions,
    mutations,
    getters
};