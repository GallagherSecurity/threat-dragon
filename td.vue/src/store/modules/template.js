import Vue from 'vue';

import isElectron from 'is-electron';
import { getProviderType } from '@/service/provider/providers';
import { providerTypes } from '@/service/provider/providerTypes';
import {
    TEMPLATE_FETCH_ALL,     // Fetch list from API
    TEMPLATE_FETCH_BY_ID,    // Fetch single template content
    TEMPLATE_SELECTED,       // Track which card user clicked
    TEMPLATE_CLEAR,          // Clear template state

    // Admin only
    TEMPLATE_CREATE,         // Import template (admin)
    TEMPLATE_UPDATE,         // Edit metadata (admin)
    TEMPLATE_DELETE         // Delete template (admin)
} from '@/store/actions/template';
import save from '@/service/save';
import threatmodelApi from '@/service/api/threatmodelApi';
import googleDriveApi from '@/service/api/googleDriveApi';
import { FOLDER_SELECTED } from '../actions/folder';

const state = {
    
  templates: [],           // List from API
  selectedTemplate: null,  // Which card user clicked
  loading: false

};
const actions = {}
const mutations = {};
const getters = {};
export default {
    actions,
    mutations,
    getters
};
