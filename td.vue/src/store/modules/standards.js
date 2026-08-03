import { STANDARDS_FETCH, STANDARDS_SET, STANDARDS_CLEAR } from '@/store/actions/standards';
import standardsApi from '@/service/api/standardsApi.js';

const state = {
    all: []
};

const actions = {
    [STANDARDS_FETCH]: async ({ commit }) => {
        try {
            const response = await standardsApi.fetchAllAsync();
            commit(STANDARDS_SET, response.data.standards || []);
        } catch (error) {
            console.error('Failed to fetch standards:', error);
            commit(STANDARDS_SET, []);
        }
    },

    [STANDARDS_CLEAR]: ({ commit }) => {
        commit(STANDARDS_CLEAR);
    }
};

const mutations = {
    [STANDARDS_SET]: (state, standards) => {
        state.all = standards;
    },
    [STANDARDS_CLEAR]: (state) => {
        state.all = [];
    }
};

const getters = {
    allStandards: (state) => state.all
};

export default {
    state,
    actions,
    mutations,
    getters
};
