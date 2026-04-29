<template>
    <b-container fluid>
        <b-row>
            <b-col>
                <b-jumbotron class="text-center">
                    <h4>Manage Threat Catalogue</h4>
                    <p class="lead">Create and manage reusable threats for your organisation.</p>
                </b-jumbotron>
            </b-col>
        </b-row>

        <!-- NOT_FOUND -->
        <b-row v-if="threatCatalogueStoreStatus === 'NOT_FOUND'">
            <b-col md="6" offset-md="3">
                <b-alert show variant="danger" class="text-center">
                    <h5>Threat catalogue repository not found.</h5>
                </b-alert>
            </b-col>
        </b-row>

        <!-- NOT_INITIALIZED -->
        <b-row v-else-if="threatCatalogueStoreStatus === 'NOT_INITIALIZED'">
            <b-col md="6" offset-md="3">
                <b-card class="text-center p-4">
                    <h4>Threat catalogue not initialised</h4>
                    <p class="text-muted">Initialise the catalogue to start managing reusable threats.</p>
                    <b-button variant="primary" size="lg" :disabled="isBootstrapping" @click="handleBootstrap">
                        <b-spinner small v-if="isBootstrapping" class="mr-2"></b-spinner>
                        {{ isBootstrapping ? 'Initialising...' : 'Initialise Catalogue' }}
                    </b-button>
                </b-card>
            </b-col>
        </b-row>

        <!-- Normal -->
        <template v-else>
            <b-row v-if="!canWriteThreatCatalogue" class="mb-3">
                <b-col md="8" offset-md="2">
                    <b-alert show variant="warning">You have read-only access to the threat catalogue.</b-alert>
                </b-col>
            </b-row>

            <b-row>
                <b-col md="8" offset-md="2">
                    <b-button variant="primary" :disabled="!canWriteThreatCatalogue" @click="onAddClick" class="mr-2">
                        + Add Threat
                    </b-button>
                    <b-button variant="secondary" :disabled="!canWriteThreatCatalogue" @click="onImportClick" class="mr-2">
                        Import Threats
                    </b-button>
                    <b-button variant="secondary" :disabled="!threatCatalogue.length" @click="onExportClick">
                        Export Threats
                    </b-button>
                </b-col>
            </b-row>

            <b-row class="mt-3">
                <b-col md="8" offset-md="2">
                    <b-list-group v-if="threatCatalogue.length">
                        <b-list-group-item v-for="threat in threatCatalogue" :key="threat.id"
                            class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div>
                                    <strong>{{ threat.title }}</strong>
                                    <b-badge variant="secondary" class="ml-2">{{ threat.modelType }}</b-badge>
                                    <b-badge variant="info" class="ml-1">{{ threat.type }}</b-badge>
                                </div>
                                <div class="text-muted small mt-1">{{ threat.briefDescription }}</div>
                                <div v-if="threat.tags && threat.tags.length" class="mt-1">
                                    <b-badge v-for="tag in threat.tags" :key="tag" variant="primary" class="mr-1">
                                        {{ tag }}
                                    </b-badge>
                                </div>
                            </div>
                            <b-dropdown right variant="link" class="template-actions">
                                <template #button-content>&#8942;</template>
                                <b-dropdown-item :disabled="!canWriteThreatCatalogue" @click="onEditClick(threat)">
                                    Edit
                                </b-dropdown-item>
                                <b-dropdown-divider></b-dropdown-divider>
                                <b-dropdown-item variant="danger" :disabled="!canWriteThreatCatalogue"
                                    @click="onDeleteClick(threat)">
                                    Delete
                                </b-dropdown-item>
                            </b-dropdown>
                        </b-list-group-item>
                    </b-list-group>
                    <b-alert v-else show variant="info">No threats in the catalogue yet.</b-alert>
                </b-col>
            </b-row>
        </template>

        <td-threat-catalogue-form ref="threatForm" />
        <td-threat-catalogue-export ref="exportModal" />
    </b-container>
</template>

<script>
import { mapGetters } from 'vuex';
import tcActions from '@/store/actions/threatCatalogue.js';
import schema from '@/service/schema/ajv.js';
import TdThreatCatalogueForm from '@/components/ThreatCatalogueForm.vue';
import TdThreatCatalogueExport from '@/components/ThreatCatalogueExport.vue';

export default {
    name: 'ManageThreatCatalogue',
    components: { TdThreatCatalogueForm, TdThreatCatalogueExport },
    data() {
        return {
            isBootstrapping: false
        };
    },
    computed: {
        ...mapGetters(['threatCatalogue', 'threatCatalogueStoreStatus', 'canWriteThreatCatalogue'])
    },
    mounted() {
        this.$store.dispatch(tcActions.fetchAll);
    },
    methods: {
        async handleBootstrap() {
            this.isBootstrapping = true;
            try {
                await this.$store.dispatch(tcActions.bootstrap);
            } finally {
                this.isBootstrapping = false;
            }
        },
        onAddClick() {
            this.$refs.threatForm.showModal();
        },
        async onEditClick(threat) {
    const response = await this.$store.dispatch(tcActions.fetchById, threat.id);
    const fullThreat = { id: threat.id, threatRef: threat.threatRef, ...response.content };
    this.$refs.threatForm.showModal(fullThreat);
},

        onExportClick() {
            this.$refs.exportModal.showModal();
        },
        async onImportClick() {
            if ('showOpenFilePicker' in window) {
                try {
                    const [handle] = await window.showOpenFilePicker({
                        types: [{ description: 'Threat Library Files', accept: { 'application/json': ['.json'] } }],
                        multiple: false
                    });
                    const file = await handle.getFile();
                    await this.importThreatLibrary(file);
                } catch (e) {
                    // user cancelled — benign
                    console.warn('File picker cancelled');
                }
            } else {
                this.$toast.error('File picker not supported on this browser');
            }
        },
        async importThreatLibrary(file) {
            let libraryData;
            try {
                const text = await file.text();
                libraryData = JSON.parse(text);
            } catch (e) {
                this.$toast.error(this.$t('threats.catalogue.errors.invalidJson'));
                console.error('JSON parse error:', e);
                return;
            }

            const validation = schema.validateThreatLibraryFormat(libraryData);
            if (!validation.valid) {
                console.warn('Threat library validation failed:', validation.errors);
                this.$toast.error(this.$t('threats.catalogue.errors.invalidLibrary'));
                return;
            }

            try {
                await this.$store.dispatch(tcActions.import, libraryData.threatLibrary);
                this.$toast.success(this.$t('threats.catalogue.prompts.importSuccess'));
            } catch (e) {
                console.error('Import failed:', e);
                this.$toast.error(this.$t('threats.catalogue.errors.importFailed'));
            }
        },
        async onDeleteClick(threat) {
            const confirmed = await this.$bvModal.msgBoxConfirm(
                `Delete "${threat.title}"? This cannot be undone.`,
                { title: 'Delete Threat', okVariant: 'danger', okTitle: 'Delete', cancelTitle: 'Cancel', centered: true }
            );
            if (confirmed) {
                await this.$store.dispatch(tcActions.delete, threat.id);
            }
        }
    }
};
</script>

<style scoped>
.template-actions>>>.btn::after,
.template-actions>>>.dropdown-toggle::after {
    display: none !important;
}
</style>