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
    THREAT_CATALOGUE_IMPORT,
} from '@/store/actions/threatCatalogue';

import { v4 as uuidv4 } from 'uuid';
import threatCatalogueApi from '@/service/api/threatCatalogueApi.js';
import save from '@/service/save.js';

const state = {
    threatCatalogue: [],
    contentStore: {
        status: null,   // null (READY) | 'NOT_CONFIGURED' | 'NOT_FOUND' | 'NOT_INITIALIZED'
        canWrite: false,
        sha: null
    }
};

const actions = {
    [THREAT_CATALOGUE_BOOTSTRAP]: async ({ dispatch }) => {
        await threatCatalogueApi.bootstrapAsync();
        await dispatch(THREAT_CATALOGUE_FETCH_ALL);
    },

    [THREAT_CATALOGUE_FETCH_ALL]: async ({ commit, state }) => {
        try {
            const response = await threatCatalogueApi.fetchAllAsync(state.contentStore.sha);

            if (response.data.unchanged) return;

            if (response.data.status) {
                commit(THREAT_CATALOGUE_SET_STORE_STATUS, { status: response.data.status, canWrite: response.data.canWrite, sha: null });
                commit(THREAT_CATALOGUE_SET_THREATS, []);
            } else {
                commit(THREAT_CATALOGUE_SET_STORE_STATUS, { status: null, canWrite: true, sha: response.data.sha });
                commit(THREAT_CATALOGUE_SET_THREATS, response.data.catalogue);
            }
        } catch (error) {
            if (error.response?.status === 404) {
                commit(THREAT_CATALOGUE_SET_STORE_STATUS, { status: 'NOT_FOUND', canWrite: false, sha: null });
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
        const ids = selectedThreats.map(t => t.id);
        const response = await threatCatalogueApi.fetchBulkThreatContentAsync(ids);
        await save.threatLibrary({ threatLibrary: response.data.contents }, 'threat-library.json');
    },

    [THREAT_CATALOGUE_IMPORT]: async ({ dispatch }, threatLibrary) => {
        const processed = threatLibrary.map(({ id, threatRef, ...rest }) => ({
            ...rest,
            id: uuidv4(),
            threatRef: uuidv4()
        }));
        await threatCatalogueApi.importThreatLibraryAsync(processed);
        await dispatch(THREAT_CATALOGUE_FETCH_ALL);
    },

    [THREAT_CATALOGUE_CLEAR]: ({ commit }) => {
        commit(THREAT_CATALOGUE_CLEAR);
    }
};

const mutations = {
    [THREAT_CATALOGUE_SET_STORE_STATUS]: (state, { status, canWrite, sha }) => {
        state.contentStore = {
            status: status || null,
            canWrite: canWrite || false,
            sha: sha || null
        };
    },

    [THREAT_CATALOGUE_SET_THREATS]: (state, threatCatalogue) => {
        state.threatCatalogue = threatCatalogue || [];
    },

    [THREAT_CATALOGUE_CLEAR]: (state) => {
        state.threatCatalogue = [];
        state.contentStore = { status: null, canWrite: false, sha: null };
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
