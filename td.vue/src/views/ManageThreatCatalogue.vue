<template>
    <b-container fluid>
        <b-row>
            <b-col>
                <b-jumbotron class="text-center">
                    <h4>{{ $t('threats.catalogue.manage') }}</h4>
                    <p class="lead">{{ $t('threats.catalogue.manageDescription') }}</p>
                </b-jumbotron>
            </b-col>
        </b-row>

        <!-- NOT_FOUND -->
        <b-row v-if="threatCatalogueStoreStatus === 'NOT_FOUND'">
            <b-col md="6" offset-md="3">
                <b-alert show variant="danger" class="text-center">
                    <h5>{{ $t('threats.catalogue.notFound') }}</h5>
                </b-alert>
            </b-col>
        </b-row>

        <!-- NOT_INITIALIZED -->
        <b-row v-else-if="threatCatalogueStoreStatus === 'NOT_INITIALIZED'">
            <b-col md="6" offset-md="3">
                <b-card class="text-center p-4">
                    <h4>{{ $t('threats.catalogue.notInitialized') }}</h4>
                    <p class="text-muted">{{ $t('threats.catalogue.bootstrapDescription') }}</p>
                    <b-button variant="primary" size="lg" :disabled="isBootstrapping" @click="handleBootstrap">
                        <b-spinner small v-if="isBootstrapping" class="mr-2"></b-spinner>
                        {{ isBootstrapping ? $t('threats.catalogue.actions.initialising') : $t('threats.catalogue.actions.initialise') }}
                    </b-button>
                </b-card>
            </b-col>
        </b-row>

        <!-- Normal -->
        <template v-else>
            <b-row v-if="!canWriteThreatCatalogue" class="mb-3">
                <b-col md="8" offset-md="2">
                    <b-alert show variant="warning">{{ $t('threats.catalogue.readOnly') }}</b-alert>
                </b-col>
            </b-row>

            <b-row>
                <b-col md="8" offset-md="2">
                    <b-button variant="primary" :disabled="!canWriteThreatCatalogue" @click="onAddClick" class="mr-2">
                        + {{ $t('threats.catalogue.addNew') }}
                    </b-button>
                    <b-button variant="secondary" :disabled="!canWriteThreatCatalogue" @click="onImportClick" class="mr-2">
                        {{ $t('threats.catalogue.import') }}
                    </b-button>
                    <b-button variant="secondary" :disabled="!selectedIds.length" @click="onExportClick" class="mr-2">
                        {{ $t('threats.catalogue.actions.exportSelected') }} ({{ selectedIds.length }})
                    </b-button>
                    <b-button
                        v-if="canWriteThreatCatalogue && filteredThreats.length"
                        variant="outline-secondary"
                        class="mr-2"
                        @click="toggleSelectAll"
                    >
                        {{ allFilteredSelected ? $t('threats.catalogue.deselectAll') : $t('threats.catalogue.selectAll') }}
                    </b-button>
                    <b-button
                        v-if="selectedIds.length > 0"
                        variant="danger"
                        @click="onBulkDeleteClick"
                    >
                        Delete Selected ({{ selectedIds.length }})
                    </b-button>
                </b-col>
            </b-row>

            <b-row class="mt-3">
                <b-col md="8" offset-md="2">
                    <b-form-row>
                        <b-col md="5">
                            <b-form-input v-model="searchQuery" :placeholder="$t('threats.catalogue.search')" />
                        </b-col>
                        <b-col md="3">
                            <select v-model="filterModelType" class="form-control custom-select" @change="filterType = ''">
                                <option v-for="opt in modelTypeOptions" :key="opt.value" :value="opt.value">{{ opt.text }}</option>
                            </select>
                        </b-col>
                        <b-col md="3">
                            <select v-model="filterType" class="form-control custom-select" :disabled="!filterModelType">
                                <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.text }}</option>
                            </select>
                        </b-col>
                        <b-col md="1" class="d-flex align-items-center">
                            <b-button v-show="isFiltering" variant="link" class="p-0 text-muted" @click="clearFilters" title="Clear filters">
                                &#x2715;
                            </b-button>
                        </b-col>
                    </b-form-row>
                    <small v-show="isFiltering" class="text-muted">
                        Showing {{ filteredThreats.length }} of {{ threatCatalogue.length }} threats
                    </small>
                    <small v-show="selectedIds.length" class="text-muted ml-3">
                        {{ selectedIds.length }} selected
                    </small>
                </b-col>
            </b-row>

            <b-row class="mt-3">
                <b-col md="8" offset-md="2">
                    <b-list-group v-if="paginatedThreats.length">
                        <b-list-group-item v-for="threat in paginatedThreats" :key="threat.id"
                            class="d-flex justify-content-between align-items-start">
                            <div v-if="canWriteThreatCatalogue" class="mr-3 d-flex align-items-center">
                                <input
                                    type="checkbox"
                                    :checked="selectedIds.includes(threat.id)"
                                    @change="toggleSelection(threat.id)"
                                />
                            </div>
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
                                    {{ $t('forms.edit') }}
                                </b-dropdown-item>
                                <b-dropdown-divider></b-dropdown-divider>
                                <b-dropdown-item variant="danger" :disabled="!canWriteThreatCatalogue"
                                    @click="onDeleteClick(threat)">
                                    {{ $t('forms.delete') }}
                                </b-dropdown-item>
                            </b-dropdown>
                        </b-list-group-item>
                    </b-list-group>
                    <b-alert v-else show variant="info">{{ emptyMessage }}</b-alert>

                    <div v-if="totalPages > 1" class="pagination mt-3">
                        <button @click="currentPage--" :disabled="currentPage === 1">{{ $t('threats.catalogue.previous') }}</button>
                        <button class="btn" :disabled="true">{{ currentPage }} / {{ totalPages }}</button>
                        <button @click="currentPage++" :disabled="currentPage === totalPages">{{ $t('threats.catalogue.next') }}</button>
                    </div>
                </b-col>
            </b-row>
        </template>

        <td-threat-catalogue-form ref="threatForm" />
    </b-container>
</template>

<script>
import { mapGetters } from 'vuex';
import tcActions from '@/store/actions/threatCatalogue.js';
import schema from '@/service/schema/ajv.js';
import TdThreatCatalogueForm from '@/components/ThreatCatalogueForm.vue';

export default {
    name: 'ManageThreatCatalogue',
    components: { TdThreatCatalogueForm },
    data() {
        return {
            isBootstrapping: false,
            searchQuery: '',
            filterModelType: '',
            filterType: '',
            selectedIds: [],
            currentPage: 1,
            pageSize: 15
        };
    },
    computed: {
        ...mapGetters(['threatCatalogue', 'threatCatalogueStoreStatus', 'canWriteThreatCatalogue']),
        modelTypeOptions() {
            const types = [...new Set(this.threatCatalogue.map(t => t.modelType).filter(Boolean))].sort();
            return [{ value: '', text: this.$t('threats.catalogue.allFrameworks') }, ...types.map(t => ({ value: t, text: t }))];
        },
        typeOptions() {
            const source = this.filterModelType
                ? this.threatCatalogue.filter(t => t.modelType === this.filterModelType)
                : this.threatCatalogue;
            const types = [...new Set(source.map(t => t.type).filter(Boolean))].sort();
            return [{ value: '', text: this.$t('threats.catalogue.allTypes') }, ...types.map(t => ({ value: t, text: t }))];
        },
        isFiltering() {
            return !!(this.searchQuery || this.filterModelType || this.filterType);
        },
        emptyMessage() {
            return this.isFiltering ? this.$t('threats.catalogue.noResults') : this.$t('threats.catalogue.noThreats');
        },
        allFilteredSelected() {
            return this.paginatedThreats.length > 0 &&
                this.paginatedThreats.every(t => this.selectedIds.includes(t.id));
        },
        paginatedThreats() {
            const start = (this.currentPage - 1) * this.pageSize;
            return this.filteredThreats.slice(start, start + this.pageSize);
        },
        totalPages() {
            return Math.ceil(this.filteredThreats.length / this.pageSize) || 1;
        },
        filteredThreats() {
            let threats = this.threatCatalogue;
            if (this.filterModelType) {
                threats = threats.filter(t => t.modelType === this.filterModelType);
            }
            if (this.filterType) {
                threats = threats.filter(t => t.type === this.filterType);
            }
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                threats = threats.filter(t =>
                    (t.title || '').toLowerCase().includes(q) ||
                    (t.briefDescription || '').toLowerCase().includes(q) ||
                    (t.tags || []).some(tag => tag.toLowerCase().includes(q))
                );
            }
            return threats;
        }
    },
    watch: {
        filteredThreats() {
            this.currentPage = 1;
        }
    },
    mounted() {
        this.$store.dispatch(tcActions.fetchAll);
    },
    methods: {
        clearFilters() {
            this.searchQuery = '';
            this.filterModelType = '';
            this.filterType = '';
        },
        async handleBootstrap() {
            this.isBootstrapping = true;
            try {
                await this.$store.dispatch(tcActions.bootstrap);
                this.$toast.success(this.$t('threats.catalogue.prompts.initialiseSuccess'));
            } catch (e) {
                console.error('Bootstrap failed:', e);
                this.$toast.error(this.$t('threats.catalogue.errors.initialiseFailed'));
            } finally {
                this.isBootstrapping = false;
            }
        },
        onAddClick() {
            this.$refs.threatForm.showModal();
        },
        async onEditClick(threat) {
            try {
                const response = await this.$store.dispatch(tcActions.fetchById, threat.id);
                this.$refs.threatForm.showModal({ id: threat.id, ...response.content });
            } catch (e) {
                console.error('Failed to load threat:', e);
                this.$toast.error(this.$t('threats.catalogue.errors.updateFailed'));
            }
        },

        async onExportClick() {
            try {
                await this.$store.dispatch(tcActions.export, [...this.selectedIds]);
                this.$toast.success(this.$t('threats.catalogue.prompts.exportSuccess'));
            } catch (e) {
                console.error('Export failed:', e);
                this.$toast.error(this.$t('threats.catalogue.errors.exportFailed'));
            }
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
                this.$toast.error(this.$t('threats.catalogue.errors.filePickerUnsupported'));
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
                const results = await this.$store.dispatch(tcActions.import, libraryData.threatLibrary);
                const msg = `${results.created} threat${results.created !== 1 ? 's' : ''} added, ${results.skipped} skipped`;
                this.$toast.success(msg);
            } catch (e) {
                console.error('Import failed:', e);
                this.$toast.error(this.$t('threats.catalogue.errors.importFailed'));
            }
        },
        toggleSelectAll() {
            if (this.allFilteredSelected) {
                const pageIds = this.paginatedThreats.map(t => t.id);
                this.selectedIds = this.selectedIds.filter(id => !pageIds.includes(id));
            } else {
                const toAdd = this.paginatedThreats.map(t => t.id).filter(id => !this.selectedIds.includes(id));
                this.selectedIds = [...this.selectedIds, ...toAdd];
            }
        },
        toggleSelection(id) {
            const idx = this.selectedIds.indexOf(id);
            if (idx === -1) {
                this.selectedIds.push(id);
            } else {
                this.selectedIds.splice(idx, 1);
            }
        },
        async onDeleteClick(threat) {
            const confirmed = await this.$bvModal.msgBoxConfirm(
                `Delete "${threat.title}"? This cannot be undone.`,
                { title: this.$t('threats.catalogue.deleteTitle'), okVariant: 'danger', okTitle: this.$t('forms.delete'), cancelTitle: this.$t('forms.cancel'), centered: true }
            );
            if (confirmed) {
                try {
                    await this.$store.dispatch(tcActions.delete, threat.id);
                    this.$toast.success(this.$t('threats.catalogue.prompts.deleteSuccess'));
                } catch (e) {
                    console.error('Delete failed:', e);
                    this.$toast.error(this.$t('threats.catalogue.errors.deleteFailed'));
                }
            }
        },
        async onBulkDeleteClick() {
            const count = this.selectedIds.length;
            const confirmed = await this.$bvModal.msgBoxConfirm(
                `Delete ${count} selected threat${count > 1 ? 's' : ''}? This cannot be undone.`,
                { title: this.$t('threats.catalogue.deleteBulkTitle'), okVariant: 'danger', okTitle: this.$t('forms.delete'), cancelTitle: this.$t('forms.cancel'), centered: true }
            );
            if (confirmed) {
                try {
                    await this.$store.dispatch(tcActions.bulkDelete, [...this.selectedIds]);
                    this.$toast.success(this.$t('threats.catalogue.prompts.deleteSuccess'));
                    this.selectedIds = [];
                } catch (e) {
                    console.error('Bulk delete failed:', e);
                    this.$toast.error(this.$t('threats.catalogue.errors.deleteFailed'));
                }
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
