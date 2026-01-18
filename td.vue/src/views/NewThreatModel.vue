<template>
    <div></div>
</template>

<script>
import { mapState } from 'vuex';

import isElectron from 'is-electron';
import { getProviderType } from '@/service/provider/providers.js';
import tmActions from '@/store/actions/threatmodel.js';
import templateActions from '@/store/actions/template.js';

export default {
    name: 'NewThreatModel',
    computed: mapState({
        providerType: (state) => getProviderType(state.provider.selected),
        version: (state) => state.packageBuildVersion,
        templateContext: (state) => state.template.templateContext,
        localTemplateData: (state) => state.template.localTemplateData
    }),
    async mounted() {
        this.$store.dispatch(tmActions.clear);
        let newTm;

        // Priority 1: Check for local template data (imported from file)
        if (this.localTemplateData) {
            try {
                // Load template directly (no backend call needed)
                newTm = await this.$store.dispatch(tmActions.templateLoad, {
                    templateData: this.localTemplateData
                });

                // Clear local template data after use
                this.$store.dispatch(templateActions.clearLocalTemplateData);
            } catch (error) {
                console.error('Error loading local template:', error);
                this.$toast.error('Failed to load local template');
                newTm = this.createBlankModel();
            }
        }
        // Priority 2: Check for remote template context (from gallery)
        else if (this.templateContext) {
            try {
                // Fetch the full template data (backend gets content from separate file)
                const templateData = await this.$store.dispatch(
                    templateActions.fetchModelById,
                    this.templateContext
                );

                // templateData.content contains the actual model from the content file
                // Load and convert template to model (regenerates IDs)
                newTm = await this.$store.dispatch(tmActions.templateLoad, {
                    templateData: templateData.content
                });

                // Clear template context after use
                this.$store.dispatch(templateActions.clearTemplateContext);
            } catch (error) {
                console.error('Error loading template:', error);
                this.$toast.error('Failed to load template');
                newTm = this.createBlankModel();
            }
        }
        // Priority 3: Create blank model
        else {
            newTm = this.createBlankModel();
        }

        this.$store.dispatch(tmActions.selected, newTm);
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
    },
    methods: {
        createBlankModel() {
            return {
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
        }
    }
};
</script>
