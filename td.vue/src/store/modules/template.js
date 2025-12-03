import Vue from 'vue';
import templateApi from '@/service/api/templateApi.js';
import {
    TEMPLATE_FETCH_ALL,
    TEMPLATE_FETCH_BY_ID,
    TEMPLATE_CREATE,
    TEMPLATE_UPDATE,
    TEMPLATE_DELETE,
    TEMPLATE_SET_FILTERS
} from '@/store/actions/template.js';

const state = {
    all: [],
    selected: null,
    loading: false,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    },
    filters: {
        search: '',
        tags: [],
        sortBy: 'created_at',
        sortOrder: 'desc'
    }
};

const actions = {
    [TEMPLATE_FETCH_ALL]: async ({ commit, state }) => {
        console.debug('Fetch all templates action');
        commit('SET_LOADING', true);
        try {
            const response = await templateApi.fetchAllAsync(state.filters, state.pagination);
            commit('SET_TEMPLATES', response.data);
            commit('SET_PAGINATION', response.pagination);
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        } finally {
            commit('SET_LOADING', false);
        }
    },

    [TEMPLATE_FETCH_BY_ID]: async ({ commit }, templateId) => {
        console.debug('Fetch template by ID action:', templateId);
        commit('SET_LOADING', true);
        try {
            const response = await templateApi.fetchByIdAsync(templateId);
            commit('SET_SELECTED_TEMPLATE', response);
            return response;
        } catch (error) {
            console.error('Error fetching template:', error);
            throw error;
        } finally {
            commit('SET_LOADING', false);
        }
    },

    [TEMPLATE_CREATE]: async ({ dispatch }, templateData) => {
        console.debug('Create template action');
        try {
            const response = await templateApi.createAsync(templateData);
            await dispatch(TEMPLATE_FETCH_ALL); // Refresh list
            return response;
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    },

    [TEMPLATE_UPDATE]: async ({ dispatch }, { id, data }) => {
        console.debug('Update template action:', id);
        try {
            const response = await templateApi.updateAsync(id, data);
            await dispatch(TEMPLATE_FETCH_ALL); // Refresh list
            return response;
        } catch (error) {
            console.error('Error updating template:', error);
            throw error;
        }
    },

    [TEMPLATE_DELETE]: async ({ dispatch }, templateId) => {
        console.debug('Delete template action:', templateId);
        try {
            await templateApi.deleteAsync(templateId);
            await dispatch(TEMPLATE_FETCH_ALL); // Refresh list
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    },

    [TEMPLATE_SET_FILTERS]: ({ commit, dispatch }, filters) => {
        console.debug('Set template filters:', filters);
        commit('SET_FILTERS', filters);
        dispatch(TEMPLATE_FETCH_ALL);
    }
};

const mutations = {
    SET_LOADING: (state, loading) => {
        state.loading = loading;
    },

    SET_TEMPLATES: (state, templates) => {
        state.all.length = 0;
        templates.forEach((template, idx) => Vue.set(state.all, idx, template));
    },

    SET_SELECTED_TEMPLATE: (state, template) => {
        Vue.set(state, 'selected', template);
    },

    SET_PAGINATION: (state, pagination) => {
        Vue.set(state, 'pagination', pagination);
    },

    SET_FILTERS: (state, filters) => {
        Vue.set(state, 'filters', { ...state.filters, ...filters });
    },

    CLEAR_SELECTED: (state) => {
        state.selected = null;
    }
};

const getters = {
    templates: (state) => state.all,
    selectedTemplate: (state) => state.selected,
    isLoading: (state) => state.loading,
    pagination: (state) => state.pagination,
    filters: (state) => state.filters
};

export default {
    state,
    actions,
    mutations,
    getters
};