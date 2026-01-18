<template>
    <div></div>
</template>

<script>
import { mapState } from 'vuex';

import isElectron from 'is-electron';
import { getProviderType } from '@/service/provider/providers.js';
import tmActions from '@/store/actions/threatmodel.js';

export default {
    name: 'NewThreatModel',
    computed: mapState({
        providerType: (state) => getProviderType(state.provider.selected),
        version: (state) => state.packageBuildVersion,
        stashedModel: (state) => state.threatmodel.stash
    }),
    mounted() {
        let newTm;

        // Check if there's a stashed model (e.g., from demo selection)
        if (this.stashedModel && this.stashedModel !== '') {
            // Use the stashed demo model (already in state.data from SelectDemoModel)
            newTm = JSON.parse(this.stashedModel);
        } else {
            // Create a new blank threat model
            this.$store.dispatch(tmActions.clear);
            newTm = {
                version: this.version,
                summary: {
                    title: 'New Threat Model',
                    owner: '',
                    description: '',
                    id: 0
                },
                detail: {
                    contributors: [],
                    diagrams: [],
                    diagramTop: 0,
                    reviewer: '',
                    threatTop: 0
                }
            };
            this.$store.dispatch(tmActions.selected, newTm);
        }

        const params = Object.assign({}, this.$route.params, {
            threatmodel: newTm.summary.title
        });
        if (isElectron()) {
            // tell the desktop server that the model has changed
            window.electronAPI.modelOpened(newTm.summary.title);
        }
        if (this.providerType === 'local' || this.providerType === 'desktop') {
            this.$router.push({ name: `${this.providerType}ThreatModelEdit`, params });
        } else {
            this.$router.push({ name: `${this.providerType}ThreatModelCreate`, params });
        }
    }
};
</script>
