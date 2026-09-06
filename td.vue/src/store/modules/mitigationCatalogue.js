import {
    MITIGATION_CATALOGUE_FETCH_ALL,
    MITIGATION_CATALOGUE_CLEAR,
    MITIGATION_CATALOGUE_CREATE,
    MITIGATION_CATALOGUE_UPDATE,
    MITIGATION_CATALOGUE_DELETE,
    MITIGATION_CATALOGUE_BULK_DELETE,
    MITIGATION_CATALOGUE_BOOTSTRAP,
    MITIGATION_CATALOGUE_SET_MITIGATIONS,
    MITIGATION_CATALOGUE_SET_STORE_STATUS,
    MITIGATION_CATALOGUE_FETCH_BY_ID,
    MITIGATION_CATALOGUE_EXPORT,
    MITIGATION_CATALOGUE_IMPORT,
} from '@/store/actions/mitigationCatalogue';

import { v4 as uuidv4 } from 'uuid';
import mitigationCatalogueApi from '@/service/api/mitigationCatalogueApi.js';
import save from '@/service/save.js';

const state = {
    mitigationCatalogue: [],
    contentStore: {
        status: null,   // null (READY) | 'NOT_CONFIGURED' | 'NOT_FOUND' | 'NOT_INITIALIZED'
        canWrite: false,
        sha: null
    }
};

const actions = {
    [MITIGATION_CATALOGUE_BOOTSTRAP]: async ({ dispatch }) => {
        await mitigationCatalogueApi.bootstrapAsync();
        await dispatch(MITIGATION_CATALOGUE_FETCH_ALL);
    },

    [MITIGATION_CATALOGUE_FETCH_ALL]: async ({ commit, state }) => {
        try {
            const response = await mitigationCatalogueApi.fetchAllAsync(state.contentStore.sha);

            if (response.data.unchanged) return;

            if (response.data.status) {
                commit(MITIGATION_CATALOGUE_SET_STORE_STATUS, { status: response.data.status, canWrite: response.data.canWrite, sha: null });
                commit(MITIGATION_CATALOGUE_SET_MITIGATIONS, []);
            } else {
                commit(MITIGATION_CATALOGUE_SET_STORE_STATUS, { status: null, canWrite: response.data.canWrite || false, sha: response.data.sha });
                commit(MITIGATION_CATALOGUE_SET_MITIGATIONS, response.data.catalogue);
            }
        } catch (error) {
            if (error.response?.status === 404) {
                commit(MITIGATION_CATALOGUE_SET_STORE_STATUS, { status: 'NOT_FOUND', canWrite: false, sha: null });
                commit(MITIGATION_CATALOGUE_SET_MITIGATIONS, []);
            }
        }
    },

    [MITIGATION_CATALOGUE_CREATE]: async ({ dispatch }, mitigation) => {
        await mitigationCatalogueApi.createMitigationAsync(mitigation);
        await dispatch(MITIGATION_CATALOGUE_FETCH_ALL);
    },

    [MITIGATION_CATALOGUE_UPDATE]: async ({ dispatch }, mitigation) => {
        await mitigationCatalogueApi.updateMitigationAsync(mitigation);
        await dispatch(MITIGATION_CATALOGUE_FETCH_ALL);
    },

    [MITIGATION_CATALOGUE_DELETE]: async ({ dispatch }, id) => {
        await mitigationCatalogueApi.deleteMitigationAsync(id);
        await dispatch(MITIGATION_CATALOGUE_FETCH_ALL);
    },

    [MITIGATION_CATALOGUE_BULK_DELETE]: async ({ dispatch }, ids) => {
        await mitigationCatalogueApi.bulkDeleteMitigationsAsync(ids);
        await dispatch(MITIGATION_CATALOGUE_FETCH_ALL);
    },

    [MITIGATION_CATALOGUE_FETCH_BY_ID]: async (_, id) => {
        const response = await mitigationCatalogueApi.fetchMitigationContentAsync(id);
        return response.data;
    },

    [MITIGATION_CATALOGUE_EXPORT]: async (_, ids) => {
        const response = await mitigationCatalogueApi.fetchBulkMitigationContentAsync(ids);
        await save.mitigationLibrary({ mitigationLibrary: response.data.contents }, 'mitigation-library.json');
    },

    [MITIGATION_CATALOGUE_IMPORT]: async ({ dispatch }, mitigationLibrary) => {
        const processed = mitigationLibrary.map(mitigation => ({ ...mitigation, id: uuidv4() }));
        const response = await mitigationCatalogueApi.importMitigationLibraryAsync(processed);
        await dispatch(MITIGATION_CATALOGUE_FETCH_ALL);
        return response.results;
    },

    [MITIGATION_CATALOGUE_CLEAR]: ({ commit }) => {
        commit(MITIGATION_CATALOGUE_CLEAR);
    }
};

const mutations = {
    [MITIGATION_CATALOGUE_SET_STORE_STATUS]: (state, { status, canWrite, sha }) => {
        state.contentStore = {
            status: status || null,
            canWrite: canWrite || false,
            sha: sha || null
        };
    },

    [MITIGATION_CATALOGUE_SET_MITIGATIONS]: (state, mitigationCatalogue) => {
        state.mitigationCatalogue = mitigationCatalogue || [];
    },

    [MITIGATION_CATALOGUE_CLEAR]: (state) => {
        state.mitigationCatalogue = [];
        state.contentStore = { status: null, canWrite: false, sha: null };
    }
};

const getters = {
    mitigationCatalogue: (state) => state.mitigationCatalogue,
    hasCatalogueMitigations: (state) => state.mitigationCatalogue.length > 0,
    mitigationCatalogueStoreStatus: (state) => state.contentStore.status,
    canWriteMitigationCatalogue: (state) => state.contentStore.canWrite
};

export default {
    state,
    actions,
    mutations,
    getters
};
