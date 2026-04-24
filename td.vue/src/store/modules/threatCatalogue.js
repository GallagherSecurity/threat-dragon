import {
    THREAT_CATALOGUE_FETCH_ALL,
    THREAT_CATALOGUE_CLEAR,
    THREAT_CATALOGUE_CREATE,
    THREAT_CATALOGUE_UPDATE,
    THREAT_CATALOGUE_DELETE,
    THREAT_CATALOGUE_BOOTSTRAP,
    THREAT_CATALOGUE_SET_THREATS,
    THREAT_CATALOGUE_SET_STORE_STATUS,
    THREAT_CATALOGUE_FETCH_BY_ID,
    THREAT_CATALOGUE_EXPORT,
} from '@/store/actions/threatCatalogue';

import threatCatalogueApi from '@/service/api/threatCatalogueApi.js';
import save from '@/service/save.js';

const state = {
    threatCatalogue: [],
    contentStore: {
        status: null,   // null (READY) | 'NOT_CONFIGURED' | 'NOT_FOUND' | 'NOT_INITIALIZED'
        canWrite: false
    }
};

const actions = {
    [THREAT_CATALOGUE_BOOTSTRAP]: async ({ dispatch }) => {
        await threatCatalogueApi.bootstrapAsync();
        await dispatch(THREAT_CATALOGUE_FETCH_ALL);
    },

    [THREAT_CATALOGUE_FETCH_ALL]: async ({ commit }) => {
        try {
            const response = await threatCatalogueApi.fetchAllAsync();

            if (response.data.status) {
                commit(THREAT_CATALOGUE_SET_STORE_STATUS, {
                    status: response.data.status,
                    canWrite: response.data.canWrite
                });
                commit(THREAT_CATALOGUE_SET_THREATS, []);
            } else {
                commit(THREAT_CATALOGUE_SET_STORE_STATUS, { status: null, canWrite: true });
                commit(THREAT_CATALOGUE_SET_THREATS, response.data.catalogue);
            }
        } catch (error) {
            if (error.response?.status === 404) {
                commit(THREAT_CATALOGUE_SET_STORE_STATUS, { status: 'NOT_FOUND', canWrite: false });
                commit(THREAT_CATALOGUE_SET_THREATS, []);
            }
        }
    },

    [THREAT_CATALOGUE_CREATE]: async ({ dispatch }, threat) => {
        await threatCatalogueApi.createThreatAsync(threat);
        await dispatch(THREAT_CATALOGUE_FETCH_ALL);
    },

    [THREAT_CATALOGUE_UPDATE]: async ({ dispatch }, threat) => {
        await threatCatalogueApi.updateThreatAsync(threat);
        await dispatch(THREAT_CATALOGUE_FETCH_ALL);
    },

    [THREAT_CATALOGUE_DELETE]: async ({ dispatch }, id) => {
        await threatCatalogueApi.deleteThreatAsync(id);
        await dispatch(THREAT_CATALOGUE_FETCH_ALL);
    },

    [THREAT_CATALOGUE_FETCH_BY_ID]: async ({ commit }, id) => {
        const response = await threatCatalogueApi.fetchThreatContentAsync(id);
        return response.data;
    },

    [THREAT_CATALOGUE_EXPORT]: async (_, selectedThreats) => {
        const threatLibrary = [];
        for (const threat of selectedThreats) {
            const response = await threatCatalogueApi.fetchThreatContentAsync(threat.id);
            threatLibrary.push(response.data.content);
        }
        await save.threatLibrary({ threatLibrary }, 'threat-library.json');
    },

    [THREAT_CATALOGUE_CLEAR]: ({ commit }) => {
        commit(THREAT_CATALOGUE_CLEAR);
    }
};

const mutations = {
    [THREAT_CATALOGUE_SET_STORE_STATUS]: (state, { status, canWrite }) => {
        state.contentStore = {
            status: status || null,
            canWrite: canWrite || false
        };
    },

    [THREAT_CATALOGUE_SET_THREATS]: (state, threatCatalogue) => {
        state.threatCatalogue = threatCatalogue || [];
    },

    [THREAT_CATALOGUE_CLEAR]: (state) => {
        state.threatCatalogue = [];
        state.contentStore = { status: null, canWrite: false };
    }
};

const getters = {
    threatCatalogue: (state) => state.threatCatalogue,
    hasCatalogueThreats: (state) => state.threatCatalogue.length > 0,
    threatCatalogueStoreStatus: (state) => state.contentStore.status,
    canWriteThreatCatalogue: (state) => state.contentStore.canWrite
};

export default {
    state,
    actions,
    mutations,
    getters
};
