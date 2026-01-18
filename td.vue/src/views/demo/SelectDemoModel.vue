<template>
    <b-container fluid>
        <b-row>
            <b-col>
                <b-jumbotron class="text-center">
                    <h4>
                        {{ $t('demo.select') }}
                    </h4>
                </b-jumbotron>
            </b-col>
        </b-row>
        <b-row>
            <b-col md=6 offset=3>
                <b-list-group>
                    <b-list-group-item
                        v-for="(model, idx) in models"
                        :key="idx"
                        href="javascript:void(0)"
                        @click="onModelClick(model)"
                        :data-model-name="model.name"
                    >{{ model.name }}</b-list-group-item>
                </b-list-group>
            </b-col>
        </b-row>
    </b-container>
</template>

<script>
import { mapState } from 'vuex';
import demo from '@/service/demo/index.js';
import isElectron from 'is-electron';
import tmActions from '@/store/actions/threatmodel.js';
import schema from '@/service/schema/ajv';
import tmBom from '@/service/migration/tmBom/tmBom';
import { getProviderType } from '@/service/provider/providers';
import { providerTypes } from '@/service/provider/providerTypes';

export default {
    name: 'SelectDemoModel',
    data() {
        return {
            models: demo.models
        };
    },
    computed: {
        ...mapState({
            selectedProvider: state => state.provider.selected
        }),
        providerType() {
            return getProviderType(this.selectedProvider);
        }
    },
    mounted() {
        this.$store.dispatch(tmActions.clear);
    },
    methods: {
        async onModelClick(model) {
            // Normalize model data (handle TmBom format)
            let modelData;
            if (schema.isTmBom(model.model)) {
                modelData = tmBom.read(model.model);
            } else {
                modelData = model.model;
            }

            if (isElectron()) {
                // tell any electron server that the model has changed
                window.electronAPI.modelOpened(model.name);
            }

            // Fork: Different flow based on provider type
            if (this.providerType === providerTypes.git) {
                // Git providers (github/gitlab/bitbucket): Store data and navigate through repo/branch selection
                await this.$store.dispatch(tmActions.stash, modelData);

                this.$router.push({
                    name: `${this.providerType}Repository`,
                    params: { provider: this.selectedProvider },
                    query: { action: 'create' }
                });
            } else if (this.providerType === providerTypes.local || this.providerType === providerTypes.desktop) {
                // Local/Desktop: Direct load and route (no repo/branch needed)
                const newTm = await this.$store.dispatch(tmActions.templateLoad, {
                    templateData: modelData
                });

                const params = { threatmodel: newTm.summary.title };
                this.$router.push({ name: `${this.selectedProvider}ThreatModelEdit`, params });
            } else if (this.providerType === providerTypes.google) {
                // Google: Similar to local, direct load and route
                const newTm = await this.$store.dispatch(tmActions.templateLoad, {
                    templateData: modelData
                });

                const params = { threatmodel: newTm.summary.title };
                this.$router.push({ name: `${this.selectedProvider}ThreatModelEdit`, params });
            } else {
                console.error('Unknown provider type:', this.providerType);
                this.$toast.error('Unsupported provider type');
            }
        }
    }
};

</script>
