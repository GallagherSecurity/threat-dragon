import {
    STANDARDS_FETCH,
    STANDARDS_SET,
    STANDARDS_CLEAR,
    STANDARDS_CREATE,
    STANDARDS_DELETE,
    STANDARDS_BOOTSTRAP
} from '@/store/actions/standards';
import standardsApi from '@/service/api/standardsApi.js';

const state = {
    all: [],
    status: null, // null (READY) | 'NOT_CONFIGURED' | 'NOT_FOUND' | 'NOT_INITIALIZED' | 'ERROR'
    canWrite: false
};

const actions = {
    [STANDARDS_BOOTSTRAP]: async ({ dispatch }) => {
        await standardsApi.bootstrapAsync();
        await dispatch(STANDARDS_FETCH);
    },

    [STANDARDS_FETCH]: async ({ commit }) => {
        try {
            const response = await standardsApi.fetchAllAsync();
            commit(STANDARDS_SET, {
                standards: response.data.standards || [],
                status: response.data.status || null,
                canWrite: response.data.canWrite || false
            });
        } catch (error) {
            console.error('Failed to fetch standards:', error);
            commit(STANDARDS_SET, { standards: [], status: 'ERROR', canWrite: false });
        }
    },

    [STANDARDS_CREATE]: async ({ dispatch }, name) => {
        await standardsApi.createStandardAsync({ name });
        await dispatch(STANDARDS_FETCH);
    },

    [STANDARDS_DELETE]: async ({ dispatch }, id) => {
        const response = await standardsApi.deleteStandardAsync(id);
        await dispatch(STANDARDS_FETCH);
        return response.mitigationsUpdated;
    },

    [STANDARDS_CLEAR]: ({ commit }) => {
        commit(STANDARDS_CLEAR);
    }
};

const mutations = {
    [STANDARDS_SET]: (state, { standards, status, canWrite }) => {
        state.all = standards;
        state.status = status;
        state.canWrite = canWrite;
    },
    [STANDARDS_CLEAR]: (state) => {
        state.all = [];
        state.status = null;
        state.canWrite = false;
    }
};

const getters = {
    allStandards: (state) => state.all,
    standardsStatus: (state) => state.status,
    canWriteStandards: (state) => state.canWrite,
    // NOT_INITIALIZED still counts as loaded: no standards file yet means no standards exist
    standardsLoaded: (state) => state.status === null || state.status === 'NOT_INITIALIZED'
};

export default {
    state,
    actions,
    mutations,
    getters
};
